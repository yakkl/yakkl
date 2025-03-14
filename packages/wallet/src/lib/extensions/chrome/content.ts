// content.ts
import { Duplex } from 'readable-stream';
import { YAKKL_EXTERNAL, YAKKL_PROVIDER_EIP6963, YAKKL_PROVIDER_ETHEREUM } from '$lib/common/constants';
import type { Runtime } from 'webextension-polyfill';
import { getIcon } from '$lib/common/icon';
import { extractFQDN } from '$lib/common/misc';
import type { MetaDataParams } from '$lib/common/interfaces';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';

type RuntimePort = Runtime.Port;

// We only want to receive events from the inpage (injected) script
const windowOrigin = window.location.origin;
let portExternal: RuntimePort | undefined = undefined;
let portEIP6963: RuntimePort | undefined = undefined;

class PortDuplexStream extends Duplex {
  private port: RuntimePort;

  constructor(port: RuntimePort) {
    super({ objectMode: true });
    this.port = port;
    this.port.onMessage.addListener(this._onMessage.bind(this));
    this.port.onDisconnect.addListener(() => this.destroy());
  }

  _read() {
    // No-op
  }

  _write(message: any, _encoding: string, callback: () => void) {
    try {
      log.debug('Writing to port', false, message);
      this.port.postMessage(message);
      callback();
    } catch (error) {
      log.error('Failed to write to port', false, error);
      callback();
    }
  }

  _onMessage(message: any) {
    try {
      this.push(message);
    } catch (error) {
      log.error('Error in _onMessage', false, error);
    }
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    try {
      this.port.disconnect();
      callback(err);
    } catch (error: unknown) {
      log.error('Error in _destroy', false, error);
      if (error instanceof Error) {
        callback(error);
      } else {
        callback(new Error('Failed to destroy port'));
      }
    }
  }
}

function createLegacyPort(name: string) {
  try {
    // Should only be one. All frames use the same port OR there should only be an injection into the top frame (one content script per tab)
    if (portExternal || !browser) {
      return;
    }
    portExternal = browser.runtime.connect({
      name: name
    });
    if (portExternal) {
      portExternal.onMessage.addListener(onMessageListener());
      portExternal.onDisconnect.addListener(onDisconnectListener);
    }
  } catch (error) {
    log.error('Content: createLegacyPort:', false, error);
  }
}

function onMessageListener() {
  return function(response: any) {
    try {
      if (response.type === 'YAKKL_RESPONSE') {
        window.postMessage(response, windowOrigin); // This is the response back to the dApp!
      }
    } catch (error) {
      log.error('onMessageListener:', false, error);
      window.postMessage({id: response.id, method: response.method, error: error, type: 'YAKKL_RESPONSE'}, windowOrigin);
    }
  };
}

function onDisconnectListener() {
  try {
    if (!browser) return;

    if (browser.runtime?.lastError) {
      log.warn('onDisconnectListener - lastError:', false, browser.runtime.lastError);
    }
    if (portExternal) {
      if (portExternal.onMessage) {
        portExternal.onMessage.removeListener(onMessageListener());
      }
      portExternal = undefined;
    }

    // Reconnect the port
    createLegacyPort(YAKKL_EXTERNAL);
  } catch (error) {
    log.error('Error in onDisconnectListener', false, error);
  }
}

// Setup EIP-6963 connection with proper error handling
function setupEIP6963Connection() {
  try {
    if (!browser) {
      log.error('Browser extension API not available');
      return null;
    }

    // Create a port for EIP-6963 communication
    portEIP6963 = browser.runtime.connect({ name: YAKKL_PROVIDER_EIP6963 });
    const contentStream = new PortDuplexStream(portEIP6963);

    // Setup port disconnect handler for EIP-6963
    portEIP6963.onDisconnect.addListener(() => {
      log.debug('EIP-6963 port disconnected, attempting to reconnect');
      if (browser.runtime?.lastError) {
        log.warn('EIP-6963 port disconnect error:', false, browser.runtime.lastError);
      }
      portEIP6963 = undefined;

      // Try to reconnect immediately
      setTimeout(() => {
        if (!portEIP6963) {
          try {
            setupEIP6963Connection();
          } catch (e) {
            log.error('Failed to reconnect EIP-6963 port', false, e);
          }
        }
      }, 1000);
    });

    // Listen for messages from inpage script to forward to background
    window.addEventListener('message', (event: MessageEvent) => {
      try {
        if (event.source !== window) return;
        if (event.data && event.data.type === 'YAKKL_REQUEST:EIP6963') {
          log.debug('Content script received EIP-6963 request', false, event.data);
          contentStream.write(event.data);
        }
      } catch (error) {
        log.error('Error processing EIP-6963 message from inpage', false, error);
      }
    });

    // Forward responses and events from background to inpage script
    contentStream.on('data', (data) => {
      try {
        log.debug('Content script received response from background', false, data);
        window.postMessage(data, windowOrigin);
      } catch (error) {
        log.error('Error forwarding EIP-6963 response to inpage', false, error);
      }
    });

    // Add error handling for the stream
    contentStream.on('error', (error) => {
      log.error('EIP-6963 content stream error', false, error);

      // Try to reconnect on error
      setTimeout(() => {
        if (!portEIP6963) {
          try {
            setupEIP6963Connection();
          } catch (e) {
            log.error('Failed to reconnect EIP-6963 port after error', false, e);
          }
        }
      }, 2000);
    });

    log.debug('EIP-6963 connection established');
    return contentStream;
  } catch (error) {
    log.error('Failed to setup EIP-6963 connection', false, error);
    return null;
  }
}

function requestListener(event: any) {
  try {
    if (event?.source !== window) return;

    if (event?.data && event?.data?.type === 'YAKKL_REQUEST' && event?.origin === windowOrigin) {
      const data = event.data;
      data.external = true;

      createLegacyPort(YAKKL_EXTERNAL); // This will return an already created port otherwise create a new one

      if (data.params === undefined) {
        data.params = [];
      }

      const faviconUrl = getIcon();
      const title = window.document?.title ?? '';
      const domain = extractFQDN(event?.origin);
      const context = data.method;
      const message = (data.method === 'eth_requestAccounts' || data.method === 'wallet_requestPermissions') ? 'Wanting you to approve one or more accounts the dApp can work with!' : 'Wanting you to approve the transaction or sign message. Be mindful of the request!';

      if (domain === null) {
        throw 'Domain name is not valid. This can be due to malformed URL Address of the dApp.';
      }

      const metaDataParams: MetaDataParams = { title: title, icon: faviconUrl, domain: domain, context: context, message: message };

      switch (data.method) {
        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain':
        case 'eth_sendTransaction':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
        case 'eth_estimategas':
        case 'personal_sign':
          data.metaDataParams = metaDataParams.transaction = data.params;
          break;
        default:
          data.metaDataParams = metaDataParams;
          break;
      }

      if (data.method && portExternal) {
        portExternal.postMessage(data);
      }
    }
  } catch (e) {
    log.error('Error in requestListener', false, e);
    window.postMessage({ id: event.id, method: event.method, error: e, type: 'YAKKL_RESPONSE' }, windowOrigin);
  }
}

// This is the main entry point for the content script
try {
  if (browser) {
    // Inject the inpage script
    if (document.contentType === "text/html") {
      const container = document.head || document.documentElement;
      const script = document.createElement("script");
      script.setAttribute("async", "false");
      script.src = browser.runtime.getURL("/ext/inpage.js");
      script.id = YAKKL_PROVIDER_ETHEREUM;
      script.onload = () => {
        script.remove();
      };
      container.prepend(script);
    }

    // Create legacy provider connection
    createLegacyPort(YAKKL_EXTERNAL);

    // Listen for legacy provider messages
    window.addEventListener('message', requestListener);

    // Setup EIP-6963 connection
    setupEIP6963Connection();

    // Set up a periodic check to make sure connections are still alive
    setInterval(() => {
      if (!portExternal) {
        log.debug('Legacy port disconnected, reconnecting');
        createLegacyPort(YAKKL_EXTERNAL);
      }

      if (!portEIP6963) {
        log.debug('EIP-6963 port disconnected, reconnecting');
        setupEIP6963Connection();
      }
    }, 30000); // Check every 30 seconds
  }
} catch (e) {
  log.error('content - YAKKL: Provider injection failed. This web page will not be able to connect to YAKKL.', false, e);
}
