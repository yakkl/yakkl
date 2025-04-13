import { YAKKL_DAPP, YAKKL_ETH, YAKKL_EXTERNAL, YAKKL_INTERNAL, YAKKL_PROVIDER_EIP6963, YAKKL_SPLASH } from "$lib/common/constants";
import { handleLockDown } from "$lib/common/handlers";
import type { YakklCurrentlySelected } from "$lib/common/interfaces";
import { getObjectFromLocalStorage, setObjectInLocalStorage } from "$lib/common/storage";
import { checkDomain } from "$lib/extensions/chrome/database";
import { setIconUnlock } from "$lib/utilities/utilities";
import type { Runtime } from "webextension-polyfill";
import { showDappPopup, showPopup } from "$lib/extensions/chrome/ui";
import { estimateGas, getBlock } from "$lib/extensions/chrome/legacy";
import { supportedChainId } from "$lib/common/utils";
import { onPortInternalListener } from "$lib/common/listeners/ui/portListeners";
import { onEthereumListener } from "$lib/common/listeners/background/backgroundListeners";
import { onEIP6963Listener } from "$lib/extensions/chrome/eip-6963";
import { onDappListener } from "$lib/extensions/chrome/dapp";
import browser from "webextension-polyfill";
import { log } from "$lib/plugins/Logger";
import { addDAppActivity } from '../../interfaces/dapp-activity';
import type { DAppActivity } from '../../interfaces/dapp-activity';

interface RequestState {
  data: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  timestamp: number;
  requiresApproval: boolean;
}

// Active requests
export let requestsExternal = new Map<string, RequestState>();

// Function to clear all external requests
export function clearAllExternalRequests() {
  log.info('Clearing all external requests', false, {
    count: requestsExternal.size,
    requests: Array.from(requestsExternal.entries())
  });
  requestsExternal.clear();
  completedRequestsHistory.clear();
}

// Completed requests history (cleared after 5 minutes)
const completedRequestsHistory = new Map<string, RequestState>();
const HISTORY_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cleanup function for completed requests
function cleanupRequest(id: string) {
  const request = requestsExternal.get(id);
  if (request) {
    // Always remove from active requests
    requestsExternal.delete(id);

    // Only move to history if completed and not rejected
    if (request.status === 'completed') {
      completedRequestsHistory.set(id, request);
    }
  }
}

// Cleanup expired history entries
function cleanupExpiredHistory() {
  const now = Date.now();
  for (const [id, request] of completedRequestsHistory.entries()) {
    if (now - request.timestamp > HISTORY_EXPIRY) {
      completedRequestsHistory.delete(id);
    }
  }
}

// Set up periodic cleanup
setInterval(cleanupExpiredHistory, 60000); // Run every minute

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

    log.info('onPortConnectListener - port', false, port);

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

    // TBD - NOTE: May want to move to .sendMessage for sending popup launch messages!!!!!!!
    // May want to revist this and simplify
    if (!port.onDisconnect.hasListener(onPortDisconnectListener)) {
      port.onDisconnect.addListener(onPortDisconnectListener);
    }

    switch (port.name) {
      case "yakkl":
        await setIconUnlock();
        break;
      case YAKKL_SPLASH:
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
        log.info('onPortConnectListener - YAKKL_PROVIDER_EIP6963', false, port);
        if (!port.onMessage.hasListener(onEIP6963Listener)) {
          //@ts-ignore
          port.onMessage.addListener(onEIP6963Listener);
        }
      break;
      default:
        log.info(`Message ${port.name} is not recognized.`, false, port);
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
        port.onDisconnect.removeListener(onPortDisconnectListener);
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

  try {
    if (!browser_ext) return;
    if (!sender || !sender.postMessage) {
      log.error('Invalid sender in onPortExternalListener', false, sender);
      return;
    }

    if (event.method && event.id) {
      let yakklCurrentlySelected;
      let error = false;
      const externalData = event;
      externalData.sender = sender;

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
      const requiresApproval = event.method === 'eth_requestAccounts' || event.method === 'wallet_requestPermissions';

      // Store request with appropriate state
      requestsExternal.set(event.id, {
        data: externalData,
        status: requiresApproval ? 'pending' : 'completed',
        timestamp: Date.now(),
        requiresApproval
      });

      // Add initial activity record
      if (activity) {
        await addDAppActivity(activity);
      }

      if (externalData?.metaDataParams) {
        switch (event.method) {
          case 'eth_sendTransaction':
          case 'eth_estimateGas':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4':
          case 'personal_sign':
          case 'wallet_addEthereumChain':
            break;
        }
      }

      switch(event.method) {
        case 'eth_requestAccounts':
        case 'wallet_requestPermissions':
          log.info('eth_requestAccounts - 6963 (portListener):', false, event);

          try {
            const { showEIP6963Popup } = await import('../../../extensions/chrome/eip-6963');
            await showEIP6963Popup(event.method, event.params || [], event.id);
          } catch (error) {
            log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
            await showPopupForMethod('approve', event.id);
          }
          break;
        case 'eth_sendTransaction':
          try {
            const { showEIP6963Popup } = await import('../../../extensions/chrome/eip-6963');
            await showEIP6963Popup(event.method, event.params || [], event.id);
          } catch (error) {
            log.error('Error using EIP-6963 implementation for eth_sendTransaction:', false, error);
            await showPopupForMethod('transactions', event.id);
          }
          break;
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
        case 'personal_sign':
          await showPopupForMethod('sign', event.id);
          break;
        case 'eth_estimateGas':
          if (yakklCurrentlySelected?.shortcuts?.chainId) {
            const response = await estimateGas(yakklCurrentlySelected.shortcuts.chainId, event.params, process.env.VITE_ALCHEMY_API_KEY_PROD);
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
            getBlock(yakklCurrentlySelected.shortcuts.chainId, block, process.env.VITE_ALCHEMY_API_KEY_PROD).then(result => {
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
  } catch (error) {
    if (sender && typeof sender.postMessage === 'function') {
      sender.postMessage({id: event.id, method: event.method, type: 'YAKKL_RESPONSE', error: {code: -1, message: error}});

      // Update activity status
      if (activity) {
        activity.status = 'rejected';
        activity.error = {
          code: -1,
          message: error instanceof Error ? error.message : String(error)
        };
        await addDAppActivity(activity);
      }

      // Mark request as rejected
      const request = requestsExternal.get(event.id);
      if (request) {
        request.status = 'rejected';
        cleanupRequest(event.id);
      }
    } else {
      log.error('Cannot send error response - port is invalid', false, error);
    }
  }
}

// Has to check the method here too since this function gets called from different places
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

type PopupMethod = 'eth_requestAccounts' | 'eth_sendTransaction' | 'eth_signTypedData_v3' | 'eth_signTypedData_v4' | 'personal_sign' | 'warning';
type PopupType = 'approve' | 'transactions' | 'sign' | 'warning';

async function showPopupForMethod(methodOrType: PopupMethod | PopupType, requestId: string) {
  const popupMap: Record<PopupMethod | PopupType, string> = {
    'eth_requestAccounts': '/dapp/popups/approve.html',
    'eth_sendTransaction': '/dapp/popups/transactions.html',
    'eth_signTypedData_v3': '/dapp/popups/sign.html',
    'eth_signTypedData_v4': '/dapp/popups/sign.html',
    'personal_sign': '/dapp/popups/sign.html',
    'warning': '/dapp/popups/warning.html',
    'approve': '/dapp/popups/approve.html',
    'transactions': '/dapp/popups/transactions.html',
    'sign': '/dapp/popups/sign.html'
  };

  const popupPath = popupMap[methodOrType];
  await showDappPopup(`${popupPath}?requestId=${requestId}`);
}
