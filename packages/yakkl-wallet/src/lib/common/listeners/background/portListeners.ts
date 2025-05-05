import { YAKKL_DAPP, YAKKL_ETH, YAKKL_EXTERNAL, YAKKL_INTERNAL, YAKKL_PROVIDER_EIP6963, YAKKL_SPLASH } from "$lib/common/constants";
import { handleLockDown } from "$lib/common/handlers";
import type { YakklCurrentlySelected } from "$lib/common/interfaces";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from "$lib/common/storage";
import { setIconUnlock } from "$lib/utilities/utilities";
import type { Runtime } from "webextension-polyfill";
import { showDappPopup, showPopup } from "$lib/extensions/chrome/ui";
import { estimateGas, getBlock } from "$lib/extensions/chrome/legacy";
import { supportedChainId } from "$lib/common/utils";
import { onPortInternalListener } from "$lib/common/listeners/ui/portListeners";
import { onEthereumListener } from "$lib/common/listeners/background/backgroundListeners";
import { onEIP6963PortListener } from "$lib/extensions/chrome/eip-6963";
import { onDappListener } from "$lib/extensions/chrome/dapp";
import browser from "webextension-polyfill";
import { log } from "$lib/plugins/Logger";
import { addDAppActivity } from '../../activities/dapp-activity';
import type { DAppActivity } from '../../activities/dapp-activity';

export interface RequestState {
  data: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  timestamp: number;
  requiresApproval: boolean;
}

// Active requests
export let requestsExternal = new Map<string, RequestState>();

// Function to clear all external requests
export function clearAllExternalRequests() {
  requestsExternal.clear();
  completedRequestsHistory.clear();
}

// Completed requests history (cleared after 5 minutes)
const completedRequestsHistory = new Map<string, RequestState>();
const HISTORY_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cleanup function for completed requests
function cleanupRequest(requestId: string) {
  const request = requestsExternal.get(requestId);
  if (request) {
    // Always remove from active requests
    requestsExternal.delete(requestId);

    // Only move to history if completed and not rejected
    if (request.status === 'completed') {
      completedRequestsHistory.set(requestId, request);
    }
  }
}

// Cleanup expired history entries
function cleanupExpiredHistory() {
  const now = Date.now();
  for (const [requestId, request] of completedRequestsHistory.entries()) {
    if (now - request.timestamp > HISTORY_EXPIRY) {
      completedRequestsHistory.delete(requestId);
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupExpiredHistory, HISTORY_EXPIRY);

const browser_ext = browser;

type RuntimePort = Runtime.Port;

const portsExternal = new Map();
let portsDapp: RuntimePort[] = [];
let portsInternal: RuntimePort[] = [];

// Port Listeners...

// This section registers when the content and background services are connected.
export async function onPortConnectListener(port: RuntimePort) {
  try {
    if (!port) {
      throw "Port was undefined for onConnect.";
    }

    if (port.sender && port.sender.tab && port.name === YAKKL_EXTERNAL) {
      portsExternal.set(port.sender.tab.id, port);
    }
    else if (port.name === YAKKL_DAPP ) {
      if (!portsDapp.includes(port)) {
        portsDapp.push(port);
      }
    } else {
      if (!portsInternal.includes(port)) {
        portsInternal.push(port);
      }
    }

    // May want to revist this and simplify
    if (!port.onDisconnect.hasListener(onPortDisconnectListener)) {
      port.onDisconnect.addListener(onPortDisconnectListener);
    }

    switch (port.name) {
      case "yakkl":
        await setIconUnlock();
        break;
      case YAKKL_SPLASH: // NOTE: As of version 1.5.3, this is not used but may be used in the future
        //@ts-ignore
        if (!port.onMessage.hasListener(onPopupLaunchListener)) {
          //@ts-ignore
          port.onMessage.addListener(onPopupLaunchListener);
        }
        break;
      case YAKKL_INTERNAL:
        // Now find out the message payload
        //@ts-ignore
        if (!port.onMessage.hasListener(onPortInternalListener)) {
          //@ts-ignore
          port.onMessage.addListener(onPortInternalListener);
        }
        break;
      case YAKKL_EXTERNAL:
        // Now find out the message payload
        //@ts-ignore
        if (!port.onMessage.hasListener(onPortExternalListener)) {
          //@ts-ignore
          port.onMessage.addListener(onPortExternalListener);
        }
        break;
      case YAKKL_ETH:
        //@ts-ignore
        if (!port.onMessage.hasListener(onEthereumListener)) {
          //@ts-ignore
          port.onMessage.addListener(onEthereumListener);
        }
      break;
      case YAKKL_DAPP:
        //@ts-ignore
        if (!port.onMessage.hasListener(onDappListener)) {
          //@ts-ignore
          port.onMessage.addListener(onDappListener);
        }
      break;
      case YAKKL_PROVIDER_EIP6963:
        if (!port.onMessage.hasListener(onEIP6963PortListener)) {
          //@ts-ignore
          port.onMessage.addListener(onEIP6963PortListener);
        }
      break;
      default:
        log.info(`Message ${port.name} is not recognized. Passing through to the next listener.`, false, port);
        break;
    }
  } catch(error) {
    log.error("onPortConnectListener:", false, error);
  }
}

export async function onPortDisconnectListener(port: RuntimePort): Promise<void> {
  if (!browser_ext) return;
  try {
    if (browser_ext.runtime?.lastError) {
      log.error('Background - portListeners - lastError', false, browser_ext.runtime.lastError);
    }
    if (port) {
      if (port.name === "yakkl") {
        await handleLockDown();
        port.disconnect();
        port.onDisconnect.removeListener(onPortDisconnectListener);
        port = null;
        return;
      }

      if (port.sender && port.sender.tab && port.name === YAKKL_EXTERNAL) {
        portsExternal.delete(port.sender.tab.id);
      }
      else if (port.name === YAKKL_DAPP ) {
        const index = portsDapp.indexOf(port);
        if (index !== -1) {
          portsDapp.splice(index, 1);
        }
      } else {
        const index = portsInternal.indexOf(port);
        if (index !== -1) {
          portsInternal.splice(index, 1);
        }
      }
    }
  } catch (error) {
    log.error('onDisconnectListener:', false, error);
  }
}

//@ts-ignore
export async function onPortExternalListener(event, sender): Promise<void> {
  let activity: DAppActivity | null = null;

  // Get the port from the sender's tab ID
  const port = portsExternal.get(sender?.tab?.id);
  if (!port) {
    log.error('No port found for sender', false, { sender });
    return;
  }

  if (!sender || !sender.tab) {
    log.error('Invalid sender in onPortExternalListener', false, sender);
    return;
  }

  if (event.method && event.id) {
    let yakklCurrentlySelected;
    let error = false;
    const externalData = event;
    externalData.sender = sender;

    // NOTE: Later, this should be moved to a function that gets the api key based on the chainId and network
    const apiKey = process.env.ALCHEMY_API_KEY_PROD ||
                  process.env.VITE_ALCHEMY_API_KEY_PROD ||
                  import.meta.env.VITE_ALCHEMY_API_KEY_PROD;

    // Track the activity
    activity = {
      id: event.id,
      timestamp: Date.now(),
      method: event.method,
      status: 'pending',
      domain: sender.url || 'unknown',
      params: event.params
    };

    yakklCurrentlySelected = await getObjectFromLocalStorage("yakklCurrentlySelected") as YakklCurrentlySelected;
    if (!yakklCurrentlySelected || yakklCurrentlySelected.shortcuts?.accountName?.trim().length === 0 || yakklCurrentlySelected.shortcuts?.address?.trim().length === 0) {
      if (error) return;
      if (!error) {
        error = true;
        // Update activity status
        if (activity) {
          activity.status = 'rejected';
          activity.error = {
            code: 4100,
            message: 'Account not initialized'
          };
          await addDAppActivity(activity);
        }

        requestsExternal.set(event.id, {
          data: 'It appears that your currently selected account in Yakkl has not been set or initialized...',
          status: 'rejected',
          timestamp: Date.now(),
          requiresApproval: false
        });

        await showPopupForMethod('warning', event.id);
        return;
      }
    }

    // Determine if request requires approval
    const requiresApproval = event.method === 'eth_requestAccounts' ||
      event.method === 'wallet_requestPermissions' ||
      event.method === 'eth_sendTransaction' ||
      event.method === 'eth_signTransaction' ||
      event.method === 'eth_estimateGas' ||
      event.method === 'eth_signTypedData_v4' ||
      event.method === 'personal_sign';

    // Store request with appropriate state
    requestsExternal.set(event.id, {
      data: externalData,
      status: requiresApproval ? 'pending' : 'completed',
      timestamp: Date.now(),
      requiresApproval
    });

    await addDAppActivity(activity);

    switch(event.method) {
      case 'eth_requestAccounts':
      case 'wallet_requestPermissions':
        try {
          const { showEIP6963Popup } = await import('../../../extensions/chrome/eip-6963');
          await showEIP6963Popup(event.method, event.params || [], port, event.id);
        } catch (error) {
          log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
          await showPopupForMethod(event.method, event.id);
        }
        break;
      case 'eth_sendTransaction':
        try {
          const { showEIP6963Popup } = await import('../../../extensions/chrome/eip-6963');
          await showEIP6963Popup(event.method, event.params || [], port, event.id);
        } catch (error) {
          log.error('Error using EIP-6963 implementation for eth_sendTransaction:', false, error);
          await showPopupForMethod(event.method, event.id);
        }
        break;
      case 'eth_signTypedData_v4':
      case 'personal_sign':
        try {
          const { showEIP6963Popup } = await import('../../../extensions/chrome/eip-6963');
          await showEIP6963Popup(event.method, event.params || [], port, event.id);
        } catch (error) {
          log.error('Error using EIP-6963 implementation for eth_signTypedData_v4, personal_sign:', false, error);
          await showPopupForMethod(event.method, event.id);
        }
        break;
      case 'eth_estimateGas':
        if (yakklCurrentlySelected?.shortcuts?.chainId) {
          const response = await estimateGas(yakklCurrentlySelected.shortcuts.chainId, event.params, apiKey);
          sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: response});

          // Update activity status
          if (activity) {
            activity.status = 'completed';
            activity.result = response;
            await addDAppActivity(activity);
          }

          // Mark request as completed
          const request = requestsExternal.get(event.id);
          if (request) {
            request.status = 'completed';
            cleanupRequest(event.id);
          }
        }
        break;
      case 'eth_getBlockByNumber':
        if (yakklCurrentlySelected?.shortcuts?.chainId) {
          const block = event?.params[0] ?? 'latest';
          let value;
          getBlock(yakklCurrentlySelected.shortcuts.chainId, block, apiKey).then(result => {
            value = result;
            sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: value});
            // Mark request as completed
            const request = requestsExternal.get(event.id);
            if (request) {
              request.status = 'completed';
              cleanupRequest(event.id);
            }
          });
        }
        break;
      case 'wallet_addEthereumChain':
        sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: null});
        // Mark request as completed
        const addChainRequest = requestsExternal.get(event.id);
        if (addChainRequest) {
          addChainRequest.status = 'completed';
          cleanupRequest(event.id);
        }
        break;
      case 'wallet_switchEthereumChain':
        {
          let value = null;
          if (event?.params?.length > 0) {
            const chainId: number = event.params[0];
            const supported = supportedChainId(chainId);
            if (supported) {
              yakklCurrentlySelected = await getObjectFromLocalStorage("yakklCurrentlySelected") as YakklCurrentlySelected;
              if (yakklCurrentlySelected?.shortcuts?.chainId) {
                value = yakklCurrentlySelected.shortcuts.chainId === chainId ? null : chainId;
                if (value) {
                  yakklCurrentlySelected.shortcuts.chainId = chainId;
                  await setObjectInLocalStorage('yakklCurrentlySelected', yakklCurrentlySelected);
                }
              }
            }
          }
          sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: value});
          // Mark request as completed
          const switchChainRequest = requestsExternal.get(event.id);
          if (switchChainRequest) {
            switchChainRequest.status = 'completed';
            cleanupRequest(event.id);
          }
        }
        break;
      case 'eth_chainId':
        yakklCurrentlySelected = await getObjectFromLocalStorage("yakklCurrentlySelected") as YakklCurrentlySelected;
        if (yakklCurrentlySelected?.shortcuts?.chainId) {
          const value = yakklCurrentlySelected.shortcuts.chainId;
          sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: value});
        } else {
          sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: 1}); // Default to mainnet
        }
        // Mark request as completed
        const chainIdRequest = requestsExternal.get(event.id);
        if (chainIdRequest) {
          chainIdRequest.status = 'completed';
          cleanupRequest(event.id);
        }
        break;
      case 'net_version':
        yakklCurrentlySelected = await getObjectFromLocalStorage("yakklCurrentlySelected") as YakklCurrentlySelected;
        if (yakklCurrentlySelected?.shortcuts?.chainId) {
          const value = yakklCurrentlySelected.shortcuts.chainId.toString();
          sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', result: value});
        }
        // Mark request as completed
        const request = requestsExternal.get(event.id);
        if (request) {
          request.status = 'completed';
          cleanupRequest(event.id);
        }
        break;
      default:
        break;
    }
  } else {
    sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', error: {code: 4200, message: 'The requested method is not supported by this Ethereum provider.'}});

    // Update activity status
    if (activity) {
      activity.status = 'rejected';
      activity.error = {
        code: 4200,
        message: 'The requested method is not supported by this Ethereum provider.'
      };
      await addDAppActivity(activity);
    }

    // Mark request as rejected
    const request = requestsExternal.get(event.id);
    if (request) {
      request.status = 'rejected';
      cleanupRequest(event.id);
    }
  }
}

// Has to check the method here too since this function gets called from different places
// This can be refactored for specific popup types instead of the original use of a splash screen
export async function onPopupLaunchListener(m: { popup: string; }, p: { postMessage: ( arg0: { popup: string; } ) => void; }) {
  try {
    if (!browser_ext) return;

    // try/catch should catch if m or p are undefined
    if (m.popup && m.popup === "YAKKL: Splash") {
      await browser_ext.storage.session.get('windowId').then(async (result) => {
        let windowId: number | undefined = undefined;

        if (result) {
          windowId = result.windowId as number;
        }

        if (windowId) {
          browser_ext.windows.get(windowId).then(async (_result) => {
            browser_ext.windows.update(windowId, {focused: true}).then(() => {
              // result not currently used
            }).catch((error) => {log.error(error)});

            p.postMessage({popup: "YAKKL: Launched"}); // Goes to +page@popup.svelte
            return;
          }).catch(async () => {
            showPopup('');
            p.postMessage({popup: "YAKKL: Launched"});
          });
        } else {
          // TBD - Maybe look for any existing popup windows before creating a new one...
          // Maybe register a popup
          showPopup('');
          p.postMessage({popup: "YAKKL: Launched"});
        }
      });
    }
  } catch (error) {
    log.error('onPopupLaunchListener:', false, error);
  }
}

async function showPopupForMethod(method: string, requestId: string, pinnedLocation: string = 'M') {
  await showDappPopup(`/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`, requestId, method, pinnedLocation);
}
