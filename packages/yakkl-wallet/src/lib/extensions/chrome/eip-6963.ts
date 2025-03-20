// eip-6963.ts

import { log } from "$lib/plugins/Logger";
import type { Runtime } from "webextension-polyfill";
import { ProviderRpcError } from "$lib/common";
import { showDappPopup } from "$lib/extensions/chrome/ui";
import type { EIP6963Request, EIP6963Response, EIP6963YakklEvent } from '$lib/plugins/providers/network/ethereum_provider/eip-types';
import browser from "webextension-polyfill";
import { isPermissionValid } from "$lib/permissions/handlers";
import { initializePermissions } from "$lib/permissions";
import { getBlock } from './legacy';
import type { Block, BlockTag } from 'alchemy-sdk';
import type { YakklCurrentlySelected } from '../../common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, YAKKL_PROVIDER_EIP6963 } from '$lib/common/constants';
import { KeyManager } from '$lib/plugins/KeyManager';

// Import estimateGas from legacy.ts
// const { estimateGas } = await import('./legacy');

type RuntimePort = Runtime.Port;

// Map to track active connections
const eip6963Ports = new Map<string, RuntimePort>();

// Store external requests
const requestsExternal = new Map<string, {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  method: string;
  params: any[];
  timestamp: number;
}>();

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
        sendResponse({ success: false, error: 'Invalid message format' });
        return Promise.resolve(); // Return a Promise instead of false
      }

      if (message.action === 'resolveEIP6963Request') {
        log.debug('Resolving EIP-6963 request from popup', false, {
          requestId: message.requestId,
          result: message.result
        });

        const success = resolveEIP6963Request(message.requestId, message.result);
        sendResponse({ success });
        return true; // Keep this return true
      }
      else if (message.action === 'rejectEIP6963Request') {
        log.debug('Rejecting EIP-6963 request from popup', false, {
          requestId: message.requestId,
          error: message.error
        });

        const success = rejectEIP6963Request(message.requestId, message.error);
        sendResponse({ success });
        return true; // Keep this return true
      }

      // Default case - respond with error and return a Promise
      sendResponse({ success: false, error: 'Unknown action' });
      return Promise.resolve();
    } catch (error) {
      log.error('Error handling EIP-6963 message', false, error);
      sendResponse({ success: false, error: String(error) });
      return Promise.resolve(); // Return a Promise for error case
    }
  });
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
    setInterval(() => {
      const now = Date.now();
      for (const [id, request] of requestsExternal.entries()) {
        if (now - request.timestamp > REQUEST_TIMEOUT) {
          log.warn(`Request timed out: ${request.method}`, false, { id, params: request.params });
          request.reject(new ProviderRpcError(4999, 'Request timeout'));
          requestsExternal.delete(id);
        }
      }
    }, 10000); // Check every 10 seconds

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
async function handleEstimateGas(chainId: number, params: any[]): Promise<unknown | undefined> {
  return await estimateGas(params, undefined);
}

// Core EIP-1193 read methods
const readMethods: Record<string, (params: any[], chainId?: number) => Promise<unknown>> = {
  'eth_chainId': async () => {
    // ... existing code ...
  },
  'eth_getBlockByNumber': async (params: any[], chainId?: number) => {
    if (!chainId) {
      throw new ProviderRpcError(4100, 'Chain ID not available');
    }
    try {
      return await getBlock(chainId, params[0], undefined);
    } catch (error) {
      log.error('Error in eth_getBlockByNumber', false, error);
      throw new ProviderRpcError(4200, error instanceof Error ? error.message : 'Failed to fetch block');
    }
  },
  // ... existing code ...
};

// List of methods that don't require approval
const noApprovalMethods = [
  'eth_chainId',
  'net_version',
  'eth_accounts',
  'eth_getBlockByNumber',
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getCode',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getLogs'
];

// Modify handleEIP6963Request to handle read-only methods directly
async function handleEIP6963Request(method: string, params: any[], requestContext?: any): Promise<any> {
  try {
    log.warn('Handling EIP6963 request', false, { method, params });

    // Get current wallet state
    const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
    const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;

    if (!yakklCurrentlySelected) {
      throw new ProviderRpcError(4100, 'Wallet not initialized');
    }

    // Handle methods that don't require approval
    if (noApprovalMethods.includes(method)) {
      switch (method) {
        case 'eth_chainId':
          return `0x${yakklCurrentlySelected.shortcuts.chainId.toString(16)}`;
        case 'net_version':
          return yakklCurrentlySelected.shortcuts.chainId.toString();
        case 'eth_accounts':
          return yakklCurrentlySelected.shortcuts.address ? [yakklCurrentlySelected.shortcuts.address] : [];
        case 'eth_getBlockByNumber':
          try {
            // Get API key (will return empty string if not found)
            const apiKey = KeyManager.getInstance().getKey('INFURA_API_KEY') || '';

            // Only use API key if it's not empty
            const keyToUse = apiKey && apiKey !== '' ? apiKey : undefined;

            // Call getBlock with API key if available, undefined otherwise
            return await getBlock(yakklCurrentlySelected.shortcuts.chainId, params[0], keyToUse);
          } catch (error) {
            log.error('Error in eth_getBlockByNumber', false, error);
            throw new ProviderRpcError(4200, error instanceof Error ? error.message : 'Failed to fetch block');
          }
        default:
          // For other no-approval methods, still show popup for now
          return await showEIP6963Popup(method, params);
      }
    }

    // For methods requiring approval, show popup
    return await showEIP6963Popup(method, params);

  } catch (error) {
    log.error('Error in handleEIP6963Request', false, {
      error,
      method,
      params,
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    if (error instanceof ProviderRpcError) {
      throw error;
    }

    throw new ProviderRpcError(
      EIP1193_ERRORS.INTERNAL_ERROR.code,
      error instanceof Error ? error.message : EIP1193_ERRORS.INTERNAL_ERROR.message
    );
  }
}

// Helper function to check wallet connection and permissions
async function checkPermissionAndConnection(yakklCurrentlySelected: YakklCurrentlySelected): Promise<void> {
  if (!yakklCurrentlySelected || yakklCurrentlySelected.shortcuts.isLocked) {
    throw new ProviderRpcError(4100, 'Wallet is locked or not initialized');
  }

  const origin = getRequestOrigin();
  const hasPermission = await isPermissionValid(origin);
  if (!hasPermission) {
    throw new ProviderRpcError(4100, 'No permission to access accounts on this origin');
  }
}

// Update broadcastToEIP6963Ports to handle standard events
export function broadcastToEIP6963Ports(event: string, data: any) {
  eip6963Ports.forEach(port => {
    try {
      // Standardize events according to EIP-1193
      const message: EIP6963YakklEvent = {
        type: 'YAKKL_EVENT:EIP6963',
        event,
        data
      };

      if (port.sender) {
        port.postMessage(message);
        log.debug('Broadcasted event to EIP-6963 port', false, { event, data });

        // Handle special cases for chain changes
        if (event === 'chainChanged') {
          // Emit connect event with new chain
          port.postMessage({
            type: 'YAKKL_EVENT:EIP6963',
            event: 'connect',
            data: { chainId: data }
          });
        }
      }
    } catch (e) {
      log.error('Failed to broadcast to EIP-6963 port', false, e);
      // Emit disconnect event on error
      if (port.sender) {
        port.postMessage({
          type: 'YAKKL_EVENT:EIP6963',
          event: 'disconnect',
          data: { code: 4900, message: 'Disconnected' }
        });
      }
    }
  });
}

// Function to show the EIP-6963 approval popup
async function showEIP6963Approval(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Generate a unique request ID
      const requestId = `eip6963_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      log.debug('Showing EIP-6963 approval popup', false, { requestId, method, params });

      // Store the request callbacks with the current timestamp
      requestsExternal.set(requestId, {
        resolve,
        reject,
        method,
        params,
        timestamp: Date.now()
      });

      // Show the appropriate popup with additional debugging
      const popupUrl = `/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`;
      log.debug('Opening popup with URL', false, popupUrl);

      // Get current wallet state
      browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED).then(result => {
        const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
        if (yakklCurrentlySelected?.shortcuts?.address) {
          // If we already have an address, resolve immediately
          log.debug('Already have an address, resolving immediately', false, {
            address: yakklCurrentlySelected.shortcuts.address
          });
          resolve([yakklCurrentlySelected.shortcuts.address]);
          requestsExternal.delete(requestId);
        } else {
          // Otherwise show the popup
          showDappPopup(popupUrl).catch(error => {
            log.error('Error showing popup', false, error);
            reject(new ProviderRpcError(4001, 'Failed to show approval popup'));
          });
        }
      }).catch(error => {
        log.error('Error getting wallet state', false, error);
        reject(new ProviderRpcError(4100, 'Failed to get wallet state'));
      });

    } catch (error) {
      log.error('Error showing EIP-6963 approval popup', false, error);
      reject(new ProviderRpcError(4001, 'User rejected the request'));
    }
  });
}

// Function to show the EIP-6963 popup based on the method
async function showEIP6963Popup(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Generate a unique request ID
      const requestId = `eip6963_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      // Store the request callbacks with the current timestamp
      requestsExternal.set(requestId, {
        resolve,
        reject,
        method,
        params,
        timestamp: Date.now()
      });

      // Show the appropriate popup based on the method
      if (method === 'eth_sendTransaction') {
        showDappPopup(`/dapp/popups/transactions.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else if (['eth_signTypedData_v3', 'eth_signTypedData_v4', 'personal_sign'].includes(method)) {
        showDappPopup(`/dapp/popups/sign.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else if (method === 'wallet_addEthereumChain' || method === 'wallet_switchEthereumChain') {
        showDappPopup(`/dapp/popups/network.html?requestId=${requestId}&source=eip6963&method=${method}`);
      } else {
        // For other methods that don't need user interaction but need to be processed
        showDappPopup(`/dapp/popups/request.html?requestId=${requestId}&source=eip6963&method=${method}`);
      }
    } catch (error) {
      log.error(`Error showing EIP-6963 popup for ${method}`, false, error);
      reject(new ProviderRpcError(4001, 'User rejected the request'));
    }
  });
}

// Export the requests map for access from other modules (for handling popup responses)
export function getEIP6963RequestsMap() {
  return requestsExternal;
}

// Function to resolve an EIP-6963 request (called from the popup)
export async function resolveEIP6963Request(requestId: string, result: any) {
  const request = requestsExternal.get(requestId);
  if (request) {
    log.debug('Resolving EIP-6963 request', false, {
      requestId,
      method: request.method,
      result
    });

    request.resolve(result);
    requestsExternal.delete(requestId);

    // Handle state change events
    switch (request.method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        if (Array.isArray(result) && result.length > 0) {
          const currentState = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
          const yakklCurrentlySelected = currentState[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
          broadcastToEIP6963Ports('accountsChanged', result);
          broadcastToEIP6963Ports('connect', {
            chainId: `0x${yakklCurrentlySelected.shortcuts.chainId.toString(16)}`
          });
        }
        break;

      case 'wallet_switchEthereumChain':
        if (result === null) { // Successful chain switch
          const currentState = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
          const yakklCurrentlySelected = currentState[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
          const chainIdHex = `0x${yakklCurrentlySelected.shortcuts.chainId.toString(16)}`;
          broadcastToEIP6963Ports('chainChanged', chainIdHex);
        }
        break;

      case 'wallet_addEthereumChain':
        if (result === null) { // Successful chain add
          const currentState = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
          const yakklCurrentlySelected = currentState[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
          const chainIdHex = `0x${yakklCurrentlySelected.shortcuts.chainId.toString(16)}`;
          broadcastToEIP6963Ports('chainChanged', chainIdHex);
        }
        break;
    }

    return true;
  }

  log.warn('Request not found', false, { requestId });
  return false;
}

// Function to reject an EIP-6963 request (called from the popup)
export function rejectEIP6963Request(requestId: string, error: any) {
  try {
    const request = requestsExternal.get(requestId);
    if (request) {
      log.debug('Rejecting EIP-6963 request', false, {
        requestId,
        method: request.method,
        error
      });

      // Format the error as a ProviderRpcError
      const errorObj = error instanceof Error ? error :
        (typeof error === 'object' ? error : { message: String(error) });

      const providerError = new ProviderRpcError(
        errorObj.code || 4001,
        errorObj.message || 'User rejected the request'
      );

      request.reject(providerError);
      requestsExternal.delete(requestId);

      return true;
    }

    log.warn('Request not found for rejection', false, { requestId });
    return false;
  } catch (error) {
    log.error('Error rejecting EIP-6963 request', false, error);
    return false;
  }
}

// Function to handle EIP-6963 port messages
export async function onEIP6963Listener(message: unknown, port: Runtime.Port) {
  log.warn('onEIP6963Listener received message:', false, message);

  if (!message || typeof message !== 'object') {
    log.error('Invalid message format', false, message);
    return;
  }

  const { id, method, params } = message as { id: number; method: string; params?: any[] };

  try {
    const result = await handleEIP6963Request(method, params || []);
    log.warn('handleEIP6963Request result:', false, { result, method });

    if (!port.sender) {
      log.error('Port disconnected, cannot send response');
      return;
    }

    // For provider methods that should return raw values
    if (['eth_accounts', 'eth_chainId', 'eth_requestAccounts', 'net_version'].includes(method)) {
      log.debug('Sending raw provider response:', false, { method, result });
      port.postMessage(result);
      return;
    }

    // For error responses
    if (result instanceof Error || (result && 'code' in result && 'message' in result)) {
      log.debug('Sending error response:', false, result);
      port.postMessage({ error: result });
      return;
    }

    // For standard responses
    port.postMessage({
      type: 'YAKKL_RESPONSE:EIP6963',
      id,
      result
    });
    log.debug('Response sent successfully:', false, { id, result });

  } catch (error) {
    log.error('Request failed', false, { error, method });
    const errorResponse = {
      code: error instanceof ProviderRpcError ? error.code : 4001,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };

    if (port.sender) {
      port.postMessage({ error: errorResponse });
    }
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

