import { log } from '$lib/managers/Logger';
import type { Runtime } from 'webextension-polyfill';
import { ProviderRpcError } from '$lib/common';
import browser from 'webextension-polyfill';
import { safePortPostMessage } from '$lib/common/safePortMessaging';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { initializePermissions } from '$lib/permissions';
import { createSafeMessageHandler } from '$lib/common/messageChannelValidator';
import {
	getBlock,
	getLatestBlock,
	getGasPrice,
	getBalance,
	getCode,
	getNonce,
	getTransactionReceipt,
	getTransaction,
	getLogs
} from './legacy';
import type { Block, BlockTag } from 'alchemy-sdk';
import type { YakklCurrentlySelected } from '$lib/common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, YAKKL_PROVIDER_EIP6963 } from '$lib/common/constants';
// import { KeyManager } from '$lib/managers/KeyManager';
import { estimateGas as estimateGasLegacy } from './legacy';
import { requestManager } from './requestManager';
// import type { PendingRequestData } from '$lib/common/interfaces';
// import { activeTabBackgroundStore } from '$lib/common/stores';
// import { get } from 'svelte/store';
// import { extractSecureDomain } from '$lib/common/security';
// import {
// 	getAddressesForDomain,
// 	getDomainForRequestId,
// 	revokeDomainConnection,
// 	verifyDomainConnected
// } from './verifyDomainConnectedBackground';
// import type { BackgroundPendingRequest } from './background';
// import { isReadMethod, isWriteMethod, isSimulationMethod } from './methodClassification';
// import { handleReadOnlyRequest } from '$lib/common/listeners/background/readMethodHandler';
// import { handleSimulationRequest } from '$lib/common/listeners/background/simulationMethodHandler';
// import { handleWriteRequest } from '$lib/common/listeners/background/writeMethodHandler';
// import { sendErrorResponse } from './errorResponseHandler';
// import { MessageAnalyzer } from './messageAnalyzer';
import { showPopupForMethod } from '$lib/managers/DAppPopupManager';

export { requestManager };

type RuntimePort = Runtime.Port;

// Define the interface for our request data
interface RequestsExternalData {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  method: string;
  params: any[];
  timestamp: number;
}

// Create our own requestsExternal Map with the correct type
const requestsExternal = new Map<string, RequestsExternalData>();

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
    if (request?.origin) return request.origin;
    if (sender?.url) return new URL(sender.url).origin;
    if (sender?.tab?.url) return new URL(sender.tab.url).origin;
    return '';
  } catch (error) {
    log.error('Error getting request origin:', false, error);
    return '';
  }
}

// Add this function to handle messages with proper typing
function setupMessageListener() {
  const safeEIP6963Handler = createSafeMessageHandler(
    async (message: unknown, sender: Runtime.MessageSender) => {
      log.warn('Received message', false, message);
      log.warn('Sender', false, sender);

      // Type guard to check if message has the expected structure
      const isEIP6963Message = (msg: any): msg is EIP6963Message => {
        return msg &&
          typeof msg === 'object' &&
          typeof msg.action === 'string' &&
          typeof msg.requestId === 'string';
      };

      if (!isEIP6963Message(message)) {
        log.debug('Received non-EIP6963 message', false, message);
        // Return undefined to let other listeners handle this message
        return undefined;
      }

      if (message.action === 'resolveEIP6963Request') {
        log.debug('Resolving EIP-6963 request from popup', false, {
          requestId: message.requestId,
          result: message.result
        });

        const success = resolveEIP6963Request(message.requestId, message.result);
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          result: success,
          requestId: message.requestId
        };
      }
      else if (message.action === 'rejectEIP6963Request') {
        log.debug('Rejecting EIP-6963 request from popup', false, {
          requestId: message.requestId,
          error: message.error
        });

        const success = rejectEIP6963Request(message.requestId, message.error);
        return {
          type: 'YAKKL_RESPONSE:EIP6963',
          result: success,
          requestId: message.requestId,
          error: message.error
        };
      }

      // Default case - respond with error
      return {
        type: 'YAKKL_RESPONSE:EIP6963',
        error: {
          code: 4200,
          message: 'Unknown action'
        }
      };
    },
    {
      timeout: 25000,
      logPrefix: 'EIP6963'
    }
  );

  browser.runtime.onMessage.addListener(safeEIP6963Handler as any);
}

export function initializeEIP6963() {
  if (!browser) return;

  try {
    setupMessageListener();

    // Initialize the permissions system
    initializePermissions();

    log.info('initializeEIP6963 - browser.runtime.onConnect', false);

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

    log.info('EIP-6963 handler initialized');
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
export async function handleReadOnlyMethod(method: string, params: any[] = []): Promise<any> {
  try {
    switch (method) {
      case 'eth_chainId':
        return await getCurrentlySelectedChainId();
      case 'eth_accounts':
        return await getCurrentlySelectedAccounts();
      case 'net_version':
        return await getCurrentlySelectedNetworkVersion();
      case 'eth_blockNumber':
        return await getCurrentlySelectedBlockNumber();
      case 'eth_getBalance':
        return await getCurrentlySelectedBalance(params[0]);
      case 'eth_getCode':
        return await getCurrentlySelectedCode(params[0]);
      case 'eth_getStorageAt':
        return await getCurrentlySelectedStorageAt(params[0], params[1]);
      case 'eth_getTransactionCount':
        return await getCurrentlySelectedTransactionCount(params[0]);
      case 'eth_gasPrice':
        return await getCurrentlySelectedGasPrice();
      case 'eth_getBlockByHash':
        return await getCurrentlySelectedBlockByHash(params[0], params[1]);
      case 'eth_getBlockByNumber':
        return await getCurrentlySelectedBlockByNumber(params[0], params[1]);
      case 'eth_getTransactionByHash':
        return await getCurrentlySelectedTransactionByHash(params[0]);
      case 'eth_getTransactionReceipt':
        return await getCurrentlySelectedTransactionReceipt(params[0]);
      case 'eth_getLogs':
        return await getCurrentlySelectedLogs(params[0]);
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

// eth_requestAccounts is in write methods but it's special
// Function to handle write methods that require approval
export async function handleWriteMethod(method: string, params: any[] = []): Promise<any> {
  try {
    switch (method) {
      case 'eth_requestAccounts':
        return await handleRequestAccounts(params[0], params[1]);
      case 'eth_sendTransaction':
        return await handleSendTransaction(params[0]);
      case 'eth_sign':
        return await handleSign(params[0], params[1]);
      case 'personal_sign':
        return await handlePersonalSign(params[0], params[1]);
      case 'eth_signTypedData_v3':
        return await handleSignTypedDataV3(params[0], params[1]);
      case 'eth_signTypedData_v4':
        return await handleSignTypedDataV4(params[0], params[1]);
      case 'wallet_addEthereumChain':
        return await handleAddEthereumChain(params[0]);
      case 'wallet_switchEthereumChain':
        return await handleSwitchEthereumChain(params[0]);
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
      id,
      method,
      params,
      requiresApproval,
      timestamp: new Date().toISOString()
    });

    let result: any;

    // Check if method is read-only
    if (READONLY_METHODS.includes(method as typeof READONLY_METHODS[number])) {
      result = await handleReadOnlyMethod(method, params);
    } else {
      // Handle write methods that require approval
      result = await handleWriteMethod(method, params);
    }

    // Send success response safely
    safePortPostMessage(port, {
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      result
    }, {
      context: 'eip6963-success',
      onError: (error) => {
        log.warn('[EIP6963] Failed to send success response:', false, { 
          requestId: id,
          method,
          error: error instanceof Error ? error.message : error 
        });
      }
    });

  } catch (error) {
    log.error('Request failed', false, {
      error,
      method,
      timestamp: new Date().toISOString()
    });

    // Send error response safely
    safePortPostMessage(port, {
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      method,
      error: {
        code: error instanceof ProviderRpcError ? error.code : 4200,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }, {
      context: 'eip6963-error',
      onError: (sendError) => {
        log.warn('[EIP6963] Failed to send error response:', false, { 
          requestId: id,
          method,
          originalError: error instanceof Error ? error.message : error,
          sendError: sendError instanceof Error ? sendError.message : sendError 
        });
      }
    });
  }
}

async function switchEthereumChain(params: any[]): Promise<null> {
  try {
    const newChainId = parseInt(params[0].chainId, 16);
    // Update chain through appropriate mechanism
    broadcastToEIP6963Ports('chainChanged', `0x${newChainId.toString(16)}`);
    return null;
  } catch (error) {
    log.error('Error in wallet_switchEthereumChain', false, error);
    throw new ProviderRpcError(4901, 'Failed to switch chain');
  }
}

async function addEthereumChain(params: any[]): Promise<null> {
  return await showEIP6963Popup('wallet_addEthereumChain', params);
}

async function getBlockByNumber(params: any[]): Promise<any> {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
  if (!yakklCurrentlySelected?.shortcuts?.chainId) {
    throw new ProviderRpcError(4100, 'Wallet not initialized');
  }
  return await showEIP6963Popup('eth_getBlockByNumber', params);
}

async function estimateGas(params: any[], apiKey: string): Promise<any> {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
  if (!yakklCurrentlySelected?.shortcuts?.chainId) {
    throw new ProviderRpcError(4100, 'Wallet not initialized');
  }
  return await showEIP6963Popup('eth_estimateGas', params);
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
        return params.length === 3 && typeof params[0] === 'string' && typeof params[1] === 'string';
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



async function getCurrentlySelectedStorageAt(address: string, position: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  return await getCode(shortcuts.chainId, address); // Implement actual storage getter
}

async function getCurrentlySelectedTransactionCount(address: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  const nonce = await getNonce(shortcuts.chainId, address);
  return nonce.toString();
}

async function getCurrentlySelectedGasPrice(): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  const gasPrice = await getGasPrice(shortcuts.chainId);
  return gasPrice.toString();
}

async function getCurrentlySelectedBlockByHash(hash: string, fullTx: boolean): Promise<any> {
  const shortcuts = await getCurrentlySelectedData();
  return await getBlock(shortcuts.chainId, hash, fullTx ? true : false);
}

async function getCurrentlySelectedBlockByNumber(blockNumber: string, fullTx: boolean): Promise<any> {
  const shortcuts = await getCurrentlySelectedData();
  return await getBlock(shortcuts.chainId, blockNumber, fullTx ? true : false);
}

async function getCurrentlySelectedTransactionByHash(hash: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData();
  return await getTransaction(shortcuts.chainId, hash);
}

async function getCurrentlySelectedTransactionReceipt(hash: string): Promise<any> {
  const shortcuts = await getCurrentlySelectedData();
  return await getTransactionReceipt(shortcuts.chainId, hash);
}

async function getCurrentlySelectedLogs(params: any): Promise<any> {
  const shortcuts = await getCurrentlySelectedData();
  return await getLogs(shortcuts.chainId, params);
}

// Write method handlers
export async function handleSendTransaction(params: any): Promise<string> {
  return await showEIP6963Popup('eth_sendTransaction', [params]);
}

export async function handleRequestAccounts(port: Runtime.Port, requestId: string): Promise<string[]> {
  log.warn('Requesting accounts', false, { method: 'eth_requestAccounts', params: [] });

  return await showEIP6963Popup('eth_requestAccounts', [port, requestId]);
}

export async function handleSign(address: string, message: string): Promise<string> {
  return await showEIP6963Popup('eth_sign', [address, message]);
}

export async function handlePersonalSign(message: string, address: string): Promise<string> {
  return await showEIP6963Popup('personal_sign', [message, address]);
}

export async function handleSignTypedDataV3(address: string, typedData: string): Promise<string> {
  return await showEIP6963Popup('eth_signTypedData_v3', [address, typedData]);
}

export async function handleSignTypedDataV4(address: string, typedData: string): Promise<string> {
  return await showEIP6963Popup('eth_signTypedData_v4', [address, typedData]);
}

export async function handleAddEthereumChain(params: any): Promise<null> {
  return await showEIP6963Popup('wallet_addEthereumChain', [params]);
}

export async function handleSwitchEthereumChain(params: any): Promise<null> {
  return await showEIP6963Popup('wallet_switchEthereumChain', [params]);
}

// Request handling functions
export function resolveEIP6963Request(requestId: string, result: any): boolean {
  const request = requestsExternal.get(requestId);
  if (!request) {
    log.warn('No request found for ID:', false, requestId);
    return false;
  }

  request.resolve(result);
  requestsExternal.delete(requestId);
  return true;
}

export function rejectEIP6963Request(requestId: string, error: any): boolean {
  const request = requestsExternal.get(requestId);
  if (!request) {
    log.warn('No request found for ID:', false, requestId);
    return false;
  }

  request.reject(error);
  requestsExternal.delete(requestId);
  return true;
}

// Event broadcasting function
export function broadcastToEIP6963Ports(event: string, data: any): void {
  eip6963Ports.forEach(port => {
    try {
      if (port.sender) {
        safePortPostMessage(port, {
          type: 'YAKKL_EVENT:EIP6963',
          event,
          data
        }, {
          context: `eip6963-broadcast-${event}`,
          onError: (error) => {
            log.warn('[EIP6963] Failed to broadcast event:', false, { 
              event,
              portName: port.name,
              error: error instanceof Error ? error.message : error 
            });
          }
        });
      }
    } catch (error) {
      log.error('Error broadcasting to port', false, error);
    }
  });
}

export async function showEIP6963Popup(method: string, params: any[]): Promise<any> {
  // Generate a unique request ID using the ID generator
  const requestId = generateEipId();

  // Check if we already have an active request for this method and params
  const requestKey = `${method}_${JSON.stringify(params)}`;
  const existingRequest = activeRequests.get(requestKey);

  if (existingRequest) {
    log.debug('Reusing existing request', false, { method, params, requestId: existingRequest.timestamp });
    return existingRequest.promise;
  }

  // Create new promise for this request
  const promise = new Promise((resolve, reject) => {
    try {
      // Store the request callbacks
      requestsExternal.set(requestId, {
        resolve,
        reject,
        method,
        params,
        timestamp: Date.now()
      });

      log.warn('Showing EIP-6963 popup', false, { method, params, requestId });

      // Show the appropriate popup based on the method
      if (method === 'eth_sendTransaction') {
        showDappPopup(`/dapp/popups/transactions.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else if (['eth_signTypedData_v3', 'eth_signTypedData_v4', 'personal_sign'].includes(method)) {
        showDappPopup(`/dapp/popups/sign.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else if (method === 'wallet_addEthereumChain' || method === 'wallet_switchEthereumChain') {
        showDappPopup(`/dapp/popups/network.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else {
        // eth_requestAccounts is special and falls through to here
        showDappPopup(`/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`);
      }
    } catch (error) {
      log.error(`Error showing EIP-6963 popup for ${method}`, false, error);
      reject(new ProviderRpcError(4001, 'User rejected the request'));
    }
  });

  // Store the active request
  activeRequests.set(requestKey, {
    timestamp: Date.now(),
    promise
  });

  return promise;
}


// Add these missing function implementations:

async function getCurrentlySelectedChainId(): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  return `0x${shortcuts.chainId.toString(16)}`;
}

async function getCurrentlySelectedAccounts(): Promise<string[]> {
  const shortcuts = await getCurrentlySelectedData();
  return [shortcuts.address];
}

async function getCurrentlySelectedNetworkVersion(): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  return shortcuts.chainId.toString();
}

async function getCurrentlySelectedBlockNumber(): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  const block = await getLatestBlock(shortcuts.chainId);
  return `0x${block.number.toString(16)}`;
}

async function getCurrentlySelectedBalance(address: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  const balance = await getBalance(shortcuts.chainId, address);
  return `0x${balance.toString()}`;
}

async function getCurrentlySelectedCode(address: string): Promise<string> {
  const shortcuts = await getCurrentlySelectedData();
  return await getCode(shortcuts.chainId, address);
}

async function getCurrentlySelectedData(): Promise<YakklCurrentlySelected['shortcuts']> {
  const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
  const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
  if (!yakklCurrentlySelected?.shortcuts) {
    throw new ProviderRpcError(4100, 'Wallet not initialized');
  }
  return yakklCurrentlySelected.shortcuts;
}

function generateEipId(): string {
  return `eip-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function showDappPopup(url: string): void {
  showPopupForMethod(url, 'eip6963');
}
