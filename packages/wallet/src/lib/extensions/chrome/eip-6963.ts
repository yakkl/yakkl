// eip-6963.ts

import { log } from "$lib/plugins/Logger";
import type { Runtime } from "webextension-polyfill";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from "$lib/common/storage";
import type { YakklCurrentlySelected } from "$lib/common/interfaces";
import { ProviderRpcError, STORAGE_YAKKL_CURRENTLY_SELECTED } from "$lib/common";
import { showDappPopup } from "$lib/extensions/chrome/ui";
import type { EIP6963Event, EIP6963Request, EIP6963Response } from "$lib/plugins/providers/network/ethereum_provider/EthereumProviderTypes";
import browser from "webextension-polyfill";
import { handleAccountsRequest, isPermissionValid } from "$lib/permissions/handlers";
import { initializePermissions } from "$lib/permissions";

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

    browser.runtime.onConnect.addListener((port: RuntimePort) => {
      if (port.name !== 'YAKKL_PROVIDER_EIP6963') return;

      const portId = `eip6963_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      eip6963Ports.set(portId, port);

      log.debug('EIP-6963 port connected', false, { portId });

      port.onMessage.addListener((message: unknown) => {
        const typedMessage = message as EIP6963Request;
        if (!typedMessage || typeof typedMessage !== 'object' || typedMessage.type !== 'YAKKL_REQUEST:EIP6963') {
          log.error('Invalid message format', false, message);
          return;
        }

        const { id, method, params } = typedMessage;

        log.debug('Processing EIP-6963 request', false, { id, method, params });

        // Store the request details and timestamp
        const requestId = id;

        // Process the request
        handleEIP6963Request(method, params)
          .then((result) => {
            log.debug('EIP-6963 request succeeded', false, { id, method, result });

            // Send the response back
            const response: EIP6963Response = {
              id,
              result,
              method,
              type: 'YAKKL_RESPONSE:EIP6963'
            };

            // Check if port is still connected
            if (port.sender) {
              port.postMessage(response);
            } else {
              log.warn('Port disconnected, cannot send response', false, { id, method });
            }
          })
          .catch((error) => {
            log.error('EIP-6963 request error', false, { id, method, error });

            // Format the error appropriately
            let errorMessage = error instanceof Error ? error.message : String(error);
            let errorCode = error instanceof ProviderRpcError ? error.code : -32603; // Internal error by default

            port.postMessage({
              id,
              error: {
                code: errorCode,
                message: errorMessage
              },
              method,
              type: 'YAKKL_RESPONSE:EIP6963'
            } as unknown as EIP6963Response);
          });
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

async function handleEIP6963Request(method: string, params: any[], requestContext?: any): Promise<any> {
  try {
    // Default chain ID (mainnet)
    const defaultChainId = 1;

    log.debug('EIP-6963 request', false, { method, params });

    // Get origin from the request context
    const origin = getRequestOrigin(requestContext);

    // Handle account-related methods using the permission system
  if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
    return await handleAccountsRequest(method, origin);
  }
    // Get current wallet state
    const currentlySelected = await getObjectFromLocalStorage<YakklCurrentlySelected>(STORAGE_YAKKL_CURRENTLY_SELECTED);

    log.debug('currentlyselected', false, currentlySelected);

    const chainId = currentlySelected.shortcuts.chainId || defaultChainId;
    const account = currentlySelected.shortcuts.address;

    log.debug('Current wallet state', false, {
      hasCurrentlySelected: !!currentlySelected,
      hasAddress: !!(currentlySelected?.shortcuts?.address),
      chainId: currentlySelected?.shortcuts?.chainId
    });

    // Check if wallet is locked or not initialized
    if (!currentlySelected || !currentlySelected.shortcuts?.address) {
      if (method === 'eth_chainId') {
        // Default to mainnet if no active wallet
        return `0x${defaultChainId.toString(16)}`;
      }

      if (method === 'eth_accounts') {
        // Return empty array if no account selected
        return [];
      }

      if (method === 'eth_requestAccounts') {
        // For requestAccounts, show the popup to allow user to unlock/select account
        return await showEIP6963Approval(method, params);
      }

      throw new ProviderRpcError(4100, 'Wallet is locked or not initialized. Please open the wallet extension.');
    }

    // For other methods that require permission, check if the origin has valid permission
    if (['eth_sendTransaction', 'eth_signTypedData_v3', 'eth_signTypedData_v4', 'personal_sign'].includes(method)) {
      const hasPermission = await isPermissionValid(origin);
      if (!hasPermission) {
        throw new ProviderRpcError(4100, 'No permission to access accounts on this origin');
      }
    }

    // Handle methods
    switch (method) {
      case 'eth_accounts':
        return account ? [account] : [];

      case 'eth_requestAccounts':
        // For requestAccounts, we should prompt the user
        if (!account) {
          return await showEIP6963Approval(method, params);
        }
        return [account];

      case 'eth_chainId':
        return `0x${chainId.toString(16)}`;

      case 'net_version':
        // Return chain ID as decimal string
        return chainId.toString();

      case 'eth_sendTransaction':
        // This requires user interaction through a popup
        return await showEIP6963Popup(method, params);

      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'personal_sign':
        return await showEIP6963Popup(method, params);

      case 'wallet_switchEthereumChain':
        try {
          const newChainId = parseInt(params[0].chainId, 16);
          // Update the current chain ID
          if (currentlySelected.shortcuts) {
            currentlySelected.shortcuts.chainId = newChainId;

            // Update the network object too if available
            if (currentlySelected.shortcuts.networks) {
              const newNetwork = currentlySelected.shortcuts.networks.find(n => n.chainId === newChainId);
              if (newNetwork) {
                currentlySelected.shortcuts.network = newNetwork;
              }
            }

            await setObjectInLocalStorage("yakklCurrentlySelected", currentlySelected);
            // Broadcast chain change to all connected providers
            broadcastToEIP6963Ports('chainChanged', `0x${newChainId.toString(16)}`);
            return null;
          }
          throw new ProviderRpcError(4902, 'Cannot switch chain, wallet not initialized');
        } catch (error) {
          // If there's an error parsing chainId or something else
          log.error('Error in wallet_switchEthereumChain', false, error);
          throw new ProviderRpcError(4901, 'Failed to switch chain');
        }

      case 'wallet_addEthereumChain':
        // Implement chain adding logic
        return await showEIP6963Popup(method, params);

      case 'eth_getBlockByNumber':
      case 'eth_getBlockByHash':
      case 'eth_estimateGas':
      case 'eth_call':
      case 'eth_getBalance':
      case 'eth_getTransactionCount':
      case 'eth_gasPrice':
      case 'eth_getTransactionReceipt':
        // These methods don't require user interaction, forward to the network
        try {
          // If you have a direct way to forward these to your node/RPC, implement it here
          // For example, if you want to forward directly to an RPC endpoint:
          // return await forwardRequestToRPC(method, params, chainId);

          // Or handle via a popup that just shows the request is happening
          return await showEIP6963Popup(method, params);
        } catch (error) {
          log.error(`Error handling RPC method ${method}`, false, error);
          throw new ProviderRpcError(4200, `Error processing method: ${method}`);
        }

      default:
        throw new ProviderRpcError(4200, `Method ${method} not supported`);
    }
  } catch (error) {
    log.error('Error handling EIP-6963 request', false, error);
    throw error;
  }
}

// Function to broadcast to all connected EIP-6963 ports
export function broadcastToEIP6963Ports(event: string, data: any) {
  eip6963Ports.forEach(port => {
    try {
      const message: EIP6963Event = {
        type: 'YAKKL_EVENT:EIP6963',
        event,
        data
      };

      if (port.sender) { // Check if the port is still connected
        port.postMessage(message);
      }
    } catch (e) {
      log.error('Failed to broadcast to EIP-6963 port', false, e);
    }
  });
}

// Function to show the EIP-6963 approval popup
// In showEIP6963Approval function in eip-6963.ts
async function showEIP6963Approval(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Generate a unique request ID
      const requestId = `eip6963_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      log.debug('Showing EIP-6963 approval popup', false, { requestId, method, params });

      // Store the request callbacks
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

      showDappPopup(popupUrl);

      // Add a fallback timeout (your current implementation already has this in the periodic check)
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
      const requestId = `eip6963_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
export function resolveEIP6963Request(requestId: string, result: any) {
  const request = requestsExternal.get(requestId);
  if (request) {
    log.debug('Resolving EIP-6963 request', false, {
      requestId,
      method: request.method,
      result
    });

    request.resolve(result);
    requestsExternal.delete(requestId);

    // If the result includes accounts and it's an eth_requestAccounts or eth_accounts
    if ((request.method === 'eth_requestAccounts' || request.method === 'eth_accounts') &&
        Array.isArray(result) && result.length > 0) {

      // Broadcast accountsChanged event
      broadcastToEIP6963Ports('accountsChanged', result);

      // Also broadcast connect event with chainId
      broadcastToEIP6963Ports('connect', { chainId: '0x1' }); // Use actual chainId here
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
export function onEIP6963Listener(message: unknown, port: Runtime.Port) {
  const typedMessage = message as EIP6963Request;
  if (!typedMessage || typeof typedMessage !== 'object' || typedMessage.type !== 'YAKKL_REQUEST:EIP6963') {
    log.error('Invalid message format in onEIP6963Listener', false, message);
    return;
  }

  const { id, method, params } = typedMessage;

  log.debug('Processing EIP-6963 request via legacy listener', false, { id, method, params });

  // Process the request
  handleEIP6963Request(method, params)
    .then((result) => {
      log.debug('EIP-6963 request succeeded via legacy listener', false, { id, method, result });

      // Send the response back
      const response: EIP6963Response = {
        id,
        result,
        method,
        type: 'YAKKL_RESPONSE:EIP6963'
      };

      // Check if port is still connected
      if (port.sender) {
        port.postMessage(response);
      } else {
        log.warn('Port disconnected, cannot send response', false, { id, method });
      }
    })
    .catch((error) => {
      log.error('EIP-6963 request error via legacy listener', false, { id, method, error });

      // Format the error appropriately
      let errorMessage = error instanceof Error ? error.message : String(error);
      let errorCode = error instanceof ProviderRpcError ? error.code : -32603; // Internal error by default

      port.postMessage({
        id,
        error: {
          code: errorCode,
          message: errorMessage
        },
        method,
        type: 'YAKKL_RESPONSE:EIP6963'
      } as unknown as EIP6963Response);
    });
}

