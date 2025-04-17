// eip-6963.ts

import { log } from "$lib/plugins/Logger";
import type { Runtime } from "webextension-polyfill";
import { ProviderRpcError } from "$lib/common";
import { showDappPopup } from "$lib/extensions/chrome/ui";
import browser from "webextension-polyfill";
import { initializePermissions } from "$lib/permissions";
import { getBlock, getLatestBlock, ethCall, getGasPrice, getBalance, getCode, getNonce, getTransactionReceipt, getTransaction, getLogs } from './legacy';
import type { Block, BlockTag } from 'alchemy-sdk';
import type { YakklCurrentlySelected } from '../../common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, YAKKL_PROVIDER_EIP6963 } from '$lib/common/constants';
import { KeyManager } from '$lib/plugins/KeyManager';
import { estimateGas as estimateGasLegacy } from './legacy';
import { requestManager } from './requestManager';
import type { PendingRequestData } from '$lib/common/interfaces';
import { activeTabBackgroundStore } from "$lib/common/stores";
import { get } from 'svelte/store';
import { extractSecureDomain } from "$lib/common/security";
import { verifyDomainConnected } from "$lib/extensions/chrome/verifyDomainConnected";

export { requestManager };

type RuntimePort = Runtime.Port;

// Map to track active connections
const eip6963Ports = new Map<string, RuntimePort>();

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

interface EIP6963Message {
  action: string;
  requestId: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Add before the handleEIP6963Request function
type PermissionlessMethod = () => Promise<unknown> | unknown;
type PermissionRequiredMethod = () => Promise<unknown>;

interface PermissionlessMethods {
  [key: string]: PermissionlessMethod;
}

interface PermissionRequiredMethods {
  [key: string]: PermissionRequiredMethod;
}

// Add before handleEIP6963Request
const EIP1193_ERRORS = {
  USER_REJECTED: { code: 4001, message: 'User rejected the request' },
  UNAUTHORIZED: { code: 4100, message: 'Unauthorized' },
  UNSUPPORTED_METHOD: { code: 4200, message: 'Method not supported' },
  DISCONNECTED: { code: 4900, message: 'Disconnected' },
  CHAIN_DISCONNECTED: { code: 4901, message: 'Chain disconnected' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid parameters' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
};

// State management
let currentChainId: string = '0x1';  // Default to mainnet
let currentAccounts: string[] = [];
let currentNetworkVersion: string | null = null;

// Track active requests to prevent duplicates
const activeRequests = new Map<string, {
  timestamp: number;
  promise: Promise<any>;
}>();

// Clean up old requests every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [requestId, request] of activeRequests.entries()) {
    if (now - request.timestamp > 5 * 60 * 1000) {
      activeRequests.delete(requestId);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get the origin from a request
 * This needs to be implemented based on how your extension receives requests
 */
function getRequestOrigin(request?: any, sender?: browser.Runtime.MessageSender): string {
  try {
    // If we have a sender with a URL, extract the origin
    if (sender && sender.url) {
      return new URL(sender.url).origin;
    }

    // If request contains origin information
    if (request && request.origin) {
      return request.origin;
    }

    // If request contains metadata with domain
    if (request && request.metaDataParams && request.metaDataParams.domain) {
      // Ensure it's a proper origin with protocol
      const domain = request.metaDataParams.domain;
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        return domain;
      }
      return `https://${domain}`;
    }

    // Default to a placeholder if we can't determine the origin
    log.warn('Could not determine request origin, using placeholder', false, { request, sender });
    return 'unknown-origin';
  } catch (error) {
    log.error('Error getting request origin', false, error);
    return 'unknown-origin';
  }
}

// Add this function to handle messages with proper typing
function setupMessageListener() {
  browser.runtime.onMessage.addListener((
    message: unknown,
    sender: Runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): true | Promise<unknown> => {
    try {
      log.warn('Received message', false, message);
      log.warn('Sender', false, sender);
      log.warn('Send response', false, sendResponse);

      // Type guard to check if message has the expected structure
      const isEIP6963Message = (msg: any): msg is EIP6963Message => {
        return msg &&
          typeof msg === 'object' &&
          typeof msg.action === 'string' &&
          typeof msg.requestId === 'string';
      };

      if (!isEIP6963Message(message)) {
        log.debug('Received non-EIP6963 message', false, message);
        sendResponse({
          type: 'YAKKL_RESPONSE:EIP6963',
          error: {
            code: 4200,
            message: 'Invalid message format'
          }
        });
        return true;
      }

      if (message.action === 'resolveEIP6963Request') {
        log.debug('Resolving EIP-6963 request from popup', false, {
          requestId: message.requestId,
          result: message.result
        });

        const success = resolveEIP6963Request(message.requestId, message.result);
        sendResponse({
          type: 'YAKKL_RESPONSE:EIP6963',
          result: success,
          requestId: message.requestId
        });
        return true;
      }
      else if (message.action === 'rejectEIP6963Request') {
        log.debug('Rejecting EIP-6963 request from popup', false, {
          requestId: message.requestId,
          error: message.error
        });

        const success = rejectEIP6963Request(message.requestId, message.error);
        sendResponse({
          type: 'YAKKL_RESPONSE:EIP6963',
          result: success,
          requestId: message.requestId,
          error: message.error
        });
        return true;
      }

      // Default case - respond with error
      sendResponse({
        type: 'YAKKL_RESPONSE:EIP6963',
        error: {
          code: 4200,
          message: 'Unknown action'
        }
      });
      return true;
    } catch (error) {
      log.error('Error handling EIP-6963 message', false, error);
      sendResponse({
        type: 'YAKKL_RESPONSE:EIP6963',
        error: {
          code: 4200,
          message: error instanceof Error ? error.message : String(error)
        }
      });
      return true;
    }
  });
}

export function initializeEIP6963() {
  if (!browser) return;

  try {
    setupMessageListener();

    // Initialize the permissions system
    initializePermissions();

    log.info('initializeEIP6963 - browser.runtime.onConnect', false, {});

    browser.runtime.onConnect.addListener((port: RuntimePort) => {
      if (port.name !== YAKKL_PROVIDER_EIP6963) return;

      const portId = `eip6963_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      eip6963Ports.set(portId, port);

      log.warn('EIP-6963 port connected', false, { portId });

      // Use the exported onEIP6963Listener directly
      port.onMessage.addListener(async (message: unknown) => {
        log.debug('Received message in EIP-6963 port', false, { message, portId });
        await onEIP6963Listener(message, port);
      });

      port.onDisconnect.addListener(() => {
        log.debug('EIP-6963 port disconnected', false, { portId });
        eip6963Ports.delete(portId);

        if (browser.runtime.lastError) {
          log.error('EIP-6963 port error on disconnect', false, browser.runtime.lastError);
        }
      });
    });

    // Set up a periodic check for timed-out requests
    // setInterval(() => {
    //   const now = Date.now();
    //   for (const [id, request] of requestsExternal.entries()) {
    //     if (now - request.timestamp > REQUEST_TIMEOUT) {
    //       log.warn(`Request timed out: ${request.method}`, false, {
    //         id,
    //         params: request.params,
    //         timestamp: new Date().toISOString()
    //       });

    //       // Create a properly formatted error response
    //       const errorResponse = {
    //         type: 'YAKKL_RESPONSE:EIP6963',
    //         id,
    //         error: {
    //           code: 4999,
    //           message: 'Request timeout'
    //         }
    //       };

    //       // Find the port to send the error response
    //       for (const port of eip6963Ports.values()) {
    //         if (port.sender) {
    //           log.debug('Sending timeout error response:', false, {
    //             errorResponse,
    //             timestamp: new Date().toISOString()
    //           });
    //           port.postMessage(errorResponse);
    //           break;
    //         }
    //       }

    //       request.reject(new ProviderRpcError(4999, 'Request timeout'));
    //       requestsExternal.delete(id);
    //     }
    //   }
    // }, 10000); // Check every 10 seconds

    log.info('EIP-6963 handler initialized', false, {});
  } catch (error) {
    log.error('Failed to initialize EIP-6963 handler', true, error);
  }
}

// Helper function to handle getBlock
async function handleGetBlock(chainId: number, block: BlockTag | Promise<BlockTag>): Promise<Block | undefined> {
  return await getBlock(chainId, block, undefined);
}

// Helper function to handle estimateGas
async function handleEstimateGas(chainId: any, params: any[]): Promise<unknown | undefined> {
  return await estimateGasLegacy(chainId, params[0]);
}

// Define read-only methods that don't require approval
const READONLY_METHODS = [
  'eth_chainId',
  'eth_accounts',
  'net_version',
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',
  'eth_protocolVersion',
  'eth_syncing',
  'eth_coinbase',
  'eth_mining',
  'eth_hashrate',
  'eth_gasPrice',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getTransactionByHash',
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionReceipt',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getCompilers',
  'eth_compileLLL',
  'eth_compileSolidity',
  'eth_compileSerpent',
  'eth_newFilter',
  'eth_newBlockFilter',
  'eth_newPendingTransactionFilter',
  'eth_uninstallFilter',
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_getWork',
  'eth_submitWork',
  'eth_submitHashrate'
] as const;

// Function to handle read-only methods
export async function handleReadOnlyMethod(method: string, params: any[] = [], requestId?: string): Promise<any> {
  try {
    switch (method) {
      case 'eth_chainId':
        return await getCurrentlySelectedChainId(requestId);
      case 'eth_accounts':
        return await getCurrentlySelectedAccounts(requestId);
      case 'net_version':
        return await getCurrentlySelectedNetworkVersion(requestId);
      case 'eth_blockNumber':
        return await getCurrentlySelectedBlockNumber(requestId);
      case 'eth_getBalance':
        return await getCurrentlySelectedBalance(params[0], requestId);
      case 'eth_getCode':
        return await getCurrentlySelectedCode(params[0], requestId);
      case 'eth_getStorageAt':
        return await getCurrentlySelectedStorageAt(params[0], params[1], requestId);
      case 'eth_getTransactionCount':
        return await getCurrentlySelectedTransactionCount(params[0], requestId);
      case 'eth_gasPrice':
        return await getCurrentlySelectedGasPrice(requestId);
      case 'eth_getBlockByHash':
        return await getCurrentlySelectedBlockByHash(params[0], params[1], requestId);
      case 'eth_getBlockByNumber':
        return await getCurrentlySelectedBlockByNumber(params[0], params[1], requestId);
      case 'eth_getTransactionByHash':
        return await getCurrentlySelectedTransactionByHash(params[0], requestId);
      case 'eth_getTransactionReceipt':
        return await getCurrentlySelectedTransactionReceipt(params[0], requestId);
      case 'eth_getLogs':
        return await getCurrentlySelectedLogs(params[0], requestId);
      default:
        throw new ProviderRpcError(4200, `Method ${method} not supported`);
    }
  } catch (error) {
    log.error('Error handling read-only method:', false, {
      method,
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to handle write methods that require approval
export async function handleWriteMethod(method: string, params: any[] = [], requestId?: string): Promise<any> {
  try {
    switch (method) {
      case 'eth_requestAccounts':
        return await handleRequestAccounts(params[0], requestId);
      case 'eth_sendTransaction':
        return await handleSendTransaction(params[0], params[1], requestId);
      case 'eth_sign':
        return await handleSign(params[0], params[1], params[2], requestId);
      case 'personal_sign':
        return await handlePersonalSign(params[0], params[1], requestId);
      case 'eth_signTypedData_v3':
        return await handleSignTypedDataV3(params[0], params[1], params[2], requestId);
      case 'eth_signTypedData_v4':
        return await handleSignTypedDataV4(params[0], params[1], params[2], requestId);
      case 'wallet_addEthereumChain':
        return await handleAddEthereumChain(params[0], params[1], requestId);
      case 'wallet_switchEthereumChain':
        return await handleSwitchEthereumChain(params[0], params[1], requestId);
      default:
        throw new ProviderRpcError(4200, `Method ${method} not supported`);
    }
  } catch (error) {
    log.error('Error handling write method:', false, {
      method,
      error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Main EIP-6963 listener
export async function onEIP6963Listener(message: unknown, port: Runtime.Port) {
  const { id, method, params = [], requiresApproval } = message as {
    id: number;
    method: string;
    params?: any[];
    requiresApproval?: boolean;
  };

  try {
    log.debug('Processing request in background:', false, {
      requestId: id,
      method,
      params,
      requiresApproval,
      timestamp: new Date().toISOString()
    });

    let result: any;

    // Check if method is read-only
    if (READONLY_METHODS.includes(method as typeof READONLY_METHODS[number])) {
      result = await handleReadOnlyMethod(method, params, id.toString());
    } else {
      // Handle write methods that require approval
      result = await handleWriteMethod(method, params, id.toString());
    }

    // Send success response
    port.postMessage({
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      result
    });

    log.info('EIP-6963 request approved', false, { requestId: id, method, result });
  } catch (error) {
    log.error('Request failed', false, {
      error,
      method,
      timestamp: new Date().toISOString()
    });

    // Send error response
    port.postMessage({
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      error: {
        code: error instanceof ProviderRpcError ? error.code : 4200,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }
    });

    log.info('EIP-6963 request rejected', false, { requestId: id, method, error });
  }
}

async function switchEthereumChain(params: any, requestId?: string): Promise<null> {
  try {
    const newChainId = parseInt(params[0].chainId, 16);
    // Update chain through appropriate mechanism
    broadcastToEIP6963Ports('chainChanged', `0x${newChainId.toString(16)}`, requestId);
    return null;
  } catch (error) {
    log.error('Error in wallet_switchEthereumChain', false, error);
    throw new ProviderRpcError(4901, 'Failed to switch chain');
  }
}

async function addEthereumChain(params: any, port: Runtime.Port, requestId?: string): Promise<null> {
  return await showEIP6963Popup('wallet_addEthereumChain', params, port, requestId) as null;
}

async function getBlockByNumber(params: any, port: Runtime.Port, requestId?: string): Promise<any> {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
  if (!yakklCurrentlySelected?.shortcuts?.chainId) {
    throw new ProviderRpcError(4100, 'Wallet not initialized');
  }
  return await showEIP6963Popup('eth_getBlockByNumber', params, port, requestId);
}

async function estimateGas(params: any, apiKey: string, port: Runtime.Port, requestId?: string): Promise<any> {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
  if (!yakklCurrentlySelected?.shortcuts?.chainId) {
    throw new ProviderRpcError(4100, 'Wallet not initialized');
  }
  return await showEIP6963Popup('eth_estimateGas', params, port, requestId);
}

// Add parameter validation
function validateParams(method: string, params: any[]): boolean {
  try {
    switch (method) {
      case 'eth_sendTransaction':
        return params.length === 1 && typeof params[0] === 'object';
      case 'eth_sign':
        return params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string';
      case 'personal_sign':
        return params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string';
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData_v3':
        return params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string';
      case 'wallet_switchEthereumChain':
        return params.length === 1 && typeof params[0] === 'object' && typeof params[0].chainId === 'string';
      case 'wallet_addEthereumChain':
        return params.length === 1 && typeof params[0] === 'object' && typeof params[0].chainId === 'string';
      // Add more method validations as needed
      default:
        return true; // Default to true for methods without specific validation
    }
  } catch (error) {
    log.error('Parameter validation error', false, { method, params, error });
    return false;
  }
}

// Helper functions to get data from currentlySelected.shortcuts
async function getCurrentlySelectedData(requestId?: string) {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;

  if (!yakklCurrentlySelected?.shortcuts) {
    throw new ProviderRpcError(4100, 'Wallet shortcuts not initialized');
  }

  return yakklCurrentlySelected.shortcuts;
}

// Read-only method handlers
async function getCurrentlySelectedChainId(requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return `0x${shortcuts.chainId.toString(16)}`;
}

async function getCurrentlySelectedAccounts(requestId?: string): Promise<string[]> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return shortcuts.address ? [shortcuts.address] : [];
}

async function getCurrentlySelectedNetworkVersion(requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return shortcuts.chainId.toString();
}

async function getCurrentlySelectedBlockNumber(requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  const block = await getLatestBlock(shortcuts.chainId);
  return block.number.toString();
}

async function getCurrentlySelectedBalance(address: string, requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  const balance = await getBalance(shortcuts.chainId, address);
  return balance.toString();
}

async function getCurrentlySelectedCode(address: string, requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getCode(shortcuts.chainId, address);
}

async function getCurrentlySelectedStorageAt(address: string, position: string, requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getCode(shortcuts.chainId, address); // Implement actual storage getter
}

async function getCurrentlySelectedTransactionCount(address: string, requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  const nonce = await getNonce(shortcuts.chainId, address);
  return nonce.toString();
}

async function getCurrentlySelectedGasPrice(requestId?: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  const gasPrice = await getGasPrice(shortcuts.chainId);
  return gasPrice.toString();
}

async function getCurrentlySelectedBlockByHash(hash: string, fullTx: boolean, requestId?: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getBlock(shortcuts.chainId, hash, fullTx ? 'true' : 'false');
}

async function getCurrentlySelectedBlockByNumber(blockNumber: string, fullTx: boolean, requestId?: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getBlock(shortcuts.chainId, blockNumber, fullTx ? 'true' : 'false');
}

async function getCurrentlySelectedTransactionByHash(hash: string, requestId?: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getTransaction(shortcuts.chainId, hash);
}

async function getCurrentlySelectedTransactionReceipt(hash: string, requestId?: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getTransactionReceipt(shortcuts.chainId, hash);
}

async function getCurrentlySelectedLogs(params: any, requestId?: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData(requestId);
  return await getLogs(shortcuts.chainId, params);
}

// Write method handlers
export async function handleSendTransaction(port: Runtime.Port, params: any[], requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_sendTransaction', params, port, requestId) as Promise<string>;
}

export async function handleRequestAccounts(port: Runtime.Port, requestId?: string): Promise<string[]> {
  log.warn('Requesting accounts', false, { method: 'eth_requestAccounts', requestId });
  return showEIP6963Popup('eth_requestAccounts', [], port, requestId) as Promise<string[]>;
}

export async function handleSign(address: string, message: string, port: Runtime.Port, requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_sign', [address, message], port, requestId) as Promise<string>;
}

export async function handlePersonalSign(port: Runtime.Port, params: any[], requestId?: string): Promise<string> {
  return showEIP6963Popup('personal_sign', params, port, requestId) as Promise<string>;
}

export async function handleSignTypedDataV3(address: string, typedData: string, port: Runtime.Port, requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_signTypedData_v3', [address, typedData], port, requestId) as Promise<string>;
}

export async function handleSignTypedDataV4(address: string, typedData: string, port: Runtime.Port, requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_signTypedData_v4', [address, typedData], port, requestId) as Promise<string>;
}

export async function handleAddEthereumChain(port: Runtime.Port, params: any[], requestId?: string): Promise<null> {
  return showEIP6963Popup('wallet_addEthereumChain', params, port, requestId) as null;
}

export async function handleSwitchEthereumChain(port: Runtime.Port, params: any[], requestId?: string): Promise<null> {
  return showEIP6963Popup('wallet_switchEthereumChain', params, port, requestId) as null;
}

// Request handling functions
export function resolveEIP6963Request(requestId: string, result: any): void {
  const request = requestManager.getRequest(requestId);
  if (request) {
    request.resolve(result);
    requestManager.removeRequest(requestId);
  }
}

export function rejectEIP6963Request(requestId: string, error: any): void {
  const request = requestManager.getRequest(requestId);
  if (request) {
    request.reject(error);
    requestManager.removeRequest(requestId);
  }
}

// Event broadcasting function
export function broadcastToEIP6963Ports(event: string, data: any, requestId?: string): void {
  eip6963Ports.forEach(port => {
    try {
      if (port.sender) {
        port.postMessage({
          type: 'YAKKL_EVENT:EIP6963',
          event,
          data
        });
      }
    } catch (error) {
      log.error('Error broadcasting to port', false, error);
    }
  });
}

export async function showEIP6963Popup(
  method: string,
  params: any[],
  port: RuntimePort,
  requestId?: string
): Promise<any> {
  // Clear any existing requests to prevent duplicates
  const eipId = requestId || crypto.randomUUID();
  log.info(`Showing EIP-6963 popup for method: ${method}`, false, { requestId: eipId });

  // Check if we already have a pending request with this ID
  const existingRequest = requestManager.getRequest(eipId);
  if (existingRequest) {
    log.info(`Reusing existing request for ID: ${eipId}`, false, {});
    return new Promise<any>((resolve, reject) => {
      existingRequest.resolve = resolve;
      existingRequest.reject = reject;
    });
  }

  const activeTab = get(activeTabBackgroundStore);
  const url = activeTab?.url || '';
  const domain = url ? extractSecureDomain(url) : 'NO DOMAIN - NOT ALLOWED';

  // Ensure params is an array and contains the correct data
  const requestParams = Array.isArray(params) ? params : [params];

  // For personal_sign, ensure we have the correct parameter order: [message, address]
  if (method === 'personal_sign') {
    if (requestParams.length === 1) {
      // If only one param is provided, it should be the message
      // We need both message and address, so this is an invalid request
      throw new Error('personal_sign requires both message and address parameters');
    }
    // If two params are provided, they should be in the order [message, address]
    // We don't modify them as the dapp provides the correct address to sign with
  }

  const requestData: PendingRequestData = {
    id: eipId,
    method,
    params: requestParams,
    timestamp: Date.now(),
    requiresApproval: true,
    metaData: {
      method: method,
      params: requestParams,
      metaData: {
        domain: domain,
        isConnected: await verifyDomainConnected(domain),
        icon: activeTab?.favIconUrl || '/images/failIcon48x48.png',
        title: activeTab?.title || 'Not Available',
        origin: url,
        message: method === 'personal_sign' ? String(requestParams[0]) : 'Not Available'
      }
    }
  };

  // Add the request to the request manager
  requestManager.addRequest(eipId, {
    resolve: (result) => {
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: eipId,
        result
      });
    },
    reject: (error) => {
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: eipId,
        error: {
          code: -32603,
          message: error?.message || 'Internal error'
        }
      });
    },
    port: port as Runtime.Port,
    data: requestData
  });

  requestId = eipId;
  // Show popup based on method
  let popupUrl = `/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`;

  log.info('Showing popup', false, { requestId: eipId, method, popupUrl });

  // Show the popup
  showDappPopup(popupUrl);

  // Return a promise that resolves when the user approves or rejects
  return new Promise<any>((resolve, reject) => {
    const request = requestManager.getRequest(eipId);
    if (request) {
      request.resolve = resolve;
      request.reject = reject;
    }
  });
}

