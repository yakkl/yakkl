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
// import { KeyManager } from '$lib/plugins/KeyManager';
import { estimateGas as estimateGasLegacy } from './legacy';
import { requestManager } from './requestManager';
import type { PendingRequestData } from '$lib/common/interfaces';
import { activeTabBackgroundStore } from "$lib/common/stores";
import { get } from 'svelte/store';
import { extractSecureDomain } from "$lib/common/security";
import { verifyDomainConnected } from "$lib/extensions/chrome/verifyDomainConnected";
import { getSafeUUID } from "$lib/common/uuid";
import type { BackgroundPendingRequest } from "./background";

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

// Add to existing listeners in backgroundListeners.ts
export async function onEIP6963MessageListener(
  message: any,
  sender: Runtime.MessageSender
): Promise<any> {
  try {
    // Type guard to check for EIP-6963 message
    const isEIP6963Message = (msg: any): msg is EIP6963Message =>
      msg &&
      typeof msg === 'object' &&
      typeof msg.action === 'string' &&
      typeof msg.requestId === 'string';

    if (!isEIP6963Message(message)) {
      // Let other handlers try to process it
      log.info('EIP6963 - onMessage - not an EIP6963 message so passing through', false, {message});
      return undefined; // Return undefined to let the message pass through
    }

    log.info('Received EIP6963 message', false, message);

    if (message.action === 'resolveEIP6963Request') {
      const success = resolveEIP6963Request(message.requestId, message.result);
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        result: success,
        requestId: message.requestId
      };
    }

    if (message.action === 'rejectEIP6963Request') {
      const success = rejectEIP6963Request(message.requestId, message.error);
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        result: success,
        requestId: message.requestId,
        error: message.error
      };
    }

    // If we got here but message is EIP-6963, still respond with an error
    throw new Error('Unknown EIP6963 action');

  } catch (error) {
    log.error('Error handling EIP-6963 message', false, error);
    return {
      type: 'YAKKL_RESPONSE:EIP6963',
      error: {
        code: 4200,
        message: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

export function initializeEIP6963() {
  if (!browser) return;

  try {
    // Initialize the permissions system
    initializePermissions();

    browser.runtime.onConnect.addListener((port: RuntimePort) => {
      if (port.name !== YAKKL_PROVIDER_EIP6963) return;

      const portId = `eip6963_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      eip6963Ports.set(portId, port);

      // Use the exported onEIP6963Listener directly
      port.onMessage.addListener(async (message: unknown) => {
        await onEIP6963PortListener(message, port);
      });

      port.onDisconnect.addListener(() => {
        eip6963Ports.delete(portId);

        if (browser.runtime.lastError) {
          log.error('EIP-6963 port error on disconnect', false, browser.runtime.lastError);
        }
      });
    });

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
export const READONLY_METHODS = [
  // Account and Address Methods
  'eth_accounts',
  'eth_coinbase',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_getTransactionCount',

  // Block Methods
  'eth_blockNumber',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getBlockTransactionCountByHash',
  'eth_getBlockTransactionCountByNumber',
  'eth_getUncleByBlockHashAndIndex',
  'eth_getUncleByBlockNumberAndIndex',
  'eth_getUncleCountByBlockHash',
  'eth_getUncleCountByBlockNumber',

  // Chain and Network Methods
  'eth_chainId',
  'net_version',
  'eth_protocolVersion',

  // Compiler Methods
  'eth_compileLLL',
  'eth_compileSerpent',
  'eth_compileSolidity',
  'eth_getCompilers',

  // Filter Methods
  'eth_getFilterChanges',
  'eth_getFilterLogs',
  'eth_getLogs',
  'eth_newBlockFilter',
  'eth_newFilter',
  'eth_newPendingTransactionFilter',
  'eth_uninstallFilter',

  // Gas and Mining Methods
  'eth_gasPrice',
  'eth_hashrate',
  'eth_mining',

  // Transaction Methods
  'eth_getTransactionByBlockHashAndIndex',
  'eth_getTransactionByBlockNumberAndIndex',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',

  // Work Methods
  'eth_getWork',
  'eth_submitHashrate',
  'eth_submitWork',

  // State Methods
  'eth_syncing'
];

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

// Helper function to handle getBlockByNumber
async function getCurrentlySelectedBlockByNumber(blockNumber: string, fullTx: boolean, requestId?: string): Promise<any> {
  try {
    const shortcuts = await getCurrentlySelectedData(requestId);
    const block = await getBlock(shortcuts.chainId, blockNumber, fullTx ? true : false);
    return block;
  } catch (error) {
    log.error('Error getting block by number:', false, {
      error,
      blockNumber,
      requestId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to handle write methods that require approval
export async function handleWriteMethod(method: string, port: Runtime.Port, params: any[] = [], requestId?: string): Promise<any> {
  try {
    switch (method) {
      case 'eth_requestAccounts':
        return await handleRequestAccounts(port, requestId);
      case 'eth_sendTransaction':
        return await handleSendTransaction(port, params, requestId);
      case 'eth_sign':
        return await handleSign(port, params, requestId);
      case 'personal_sign':
        return await handlePersonalSign(port, params, requestId);
      case 'eth_signTypedData_v4':
        return await handleSignTypedDataV4(port, params, requestId);
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

// Primary EIP-6963 Port Listener
export async function onEIP6963PortListener(message: unknown, port: Runtime.Port) {
  const { id, method, params = [], requiresApproval } = message as {
    id: number;
    method: string;
    params?: any[];
    requiresApproval?: boolean;
  };

  try {
    let result: any;

    // Check if method is read-only
    if (READONLY_METHODS.includes(method as typeof READONLY_METHODS[number])) {
      result = await handleReadOnlyMethod(method, params, id.toString());
    } else {
      // Handle write methods that require approval
      result = await handleWriteMethod(method, port, params, id.toString());
    }

    // Send success response
    port.postMessage({
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      result
    });

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
export async function getCurrentlySelectedData(requestId?: string) {
  try {
    const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);

    log.info('getCurrentlySelectedData', false, { result });

    const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;

    log.info('getCurrentlySelectedData', false, { yakklCurrentlySelected });
    if (!yakklCurrentlySelected?.shortcuts) {
      throw new ProviderRpcError(4100, 'Wallet shortcuts not initialized');
    }

    return yakklCurrentlySelected.shortcuts;
  } catch (error) {
    log.error('Error getting currently selected data', false, error);
    throw new ProviderRpcError(4100, 'Error getting currently selected data');
  }
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
  return await getBlock(shortcuts.chainId, hash, fullTx ? true : false);
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

export async function handleSign(port: Runtime.Port, params: any[], requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_sign', params, port, requestId) as Promise<string>;
}

export async function handlePersonalSign(port: Runtime.Port, params: any[], requestId?: string): Promise<string> {
  log.info('handlePersonalSign - 542', false, { port, params, requestId });
  return showEIP6963Popup('personal_sign', params, port, requestId) as Promise<string>;
}

export async function handleSignTypedDataV4(port: Runtime.Port, params: any[], requestId?: string): Promise<string> {
  return showEIP6963Popup('eth_signTypedData_v4', params, port, requestId) as Promise<string>;
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
  requestId?: string,
  pinnedLocation: string = 'M'
): Promise<any> {
  // Use the provided request ID or throw an error if none provided
  if (!requestId) {
    throw new Error('Request ID is required for EIP-6963 popup');
  }

  // Check if we already have a pending request with this ID
  const existingRequest = requestManager.getRequest(requestId);
  if (existingRequest) {
    log.info(`Reusing existing request for ID: ${requestId}`, false, { method });
    return new Promise<any>((resolve, reject) => {
      existingRequest.resolve = resolve;
      existingRequest.reject = reject;
    });
  }

  // Check for duplicate requests with the same method and params
  const activeRequests = requestManager.getActiveRequests();
  const duplicateRequest = activeRequests.find(req =>
    req.data.method === method &&
    JSON.stringify(req.data.params) === JSON.stringify(params) &&
    req.data.timestamp > Date.now() - 5000 // Only consider requests from the last 5 seconds
  );

  if (duplicateRequest) {
    log.info(`Found duplicate request for method: ${method}`, false, {
      originalId: duplicateRequest.data.id,
      newId: requestId
    });
    return new Promise<any>((resolve, reject) => {
      duplicateRequest.resolve = resolve;
      duplicateRequest.reject = reject;
    });
  }

  // Show popup
  const activeTab = get(activeTabBackgroundStore);
  const url = activeTab?.url || '';
  const domain = url ? extractSecureDomain(url) : 'NO DOMAIN - NOT ALLOWED';

  // Ensure params is an array and contains the correct data
  const requestParams = Array.isArray(params) ? params : [params];

  log.debug('----------- EIP-6963: Request params: ------------', false, {
    requestParams: requestParams,
    method: method,
    params: params
  });

  const requestData: PendingRequestData = {
    id: requestId,
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
        message: requestParams && requestParams.length > 0 ? String(requestParams[0]) : 'Not Available'
      }
    }
  };

  // Create a new request with proper resolve/reject handlers
  const request: BackgroundPendingRequest = {
    resolve: (result) => {
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: requestId,
        method,
        result
      });
    },
    reject: (error) => {
      port.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        jsonrpc: '2.0',
        id: requestId,
        method,
        error: {
          code: -32603,
          message: error?.message || 'Internal error'
        }
      });
    },
    port: port as Runtime.Port,
    data: requestData
  };

  // Add request to request manager
  requestManager.addRequest(requestId, request);

  // Show popup based on method
  let popupUrl = `/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`;

  // Show the popup
  showDappPopup(popupUrl, requestId, method, 'M');

  // Return a promise that resolves when the user approves or rejects
  return new Promise<any>((resolve, reject) => {
    const request = requestManager.getRequest(requestId);
    if (request) {
      request.resolve = resolve;
      request.reject = reject;
    }
  });
}

