// content.ts
import { Duplex } from 'readable-stream';
import { YAKKL_PROVIDER_EIP6963 } from '$lib/common/constants';
import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';

type RuntimePort = Runtime.Port;

// We only want to receive events from the inpage script
const windowOrigin = window.location.origin;
let portEIP6963: RuntimePort | undefined = undefined;
let contentStream: PortDuplexStream | undefined = undefined;
let reconnectAttempts = 0;
let isConnecting = false;  // Add connection state tracking
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

// Add a flag to track extension context validity
let isExtensionContextValid = true;

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

// Setup EIP-6963 connection with proper error handling
function setupEIP6963Connection() {
  try {
    if (!browser?.runtime) {
      log.error('Browser extension API not available', false);
      isExtensionContextValid = false;
      return null;
    }

    // Check if the extension context is still valid
    if (browser.runtime.id === undefined) {
      log.error('Extension context invalidated', false);
      isExtensionContextValid = false;
      // Clean up existing connection
      cleanupConnection();
      return null;
    }

    // Reset context validity flag since we can access the runtime
    isExtensionContextValid = true;

    log.info('setupEIP6963Connection - isConnecting', false, isConnecting);
    log.info('setupEIP6963Connection - portEIP6963?.name', false, portEIP6963?.name);
    log.info('setupEIP6963Connection - contentStream', false, contentStream);

    // If we already have an active connection or are in the process of connecting, don't create a new one
    if (isConnecting || (portEIP6963?.name === YAKKL_PROVIDER_EIP6963 && contentStream)) {
      return contentStream;
    }

    isConnecting = true;
    log.debug('Setting up EIP-6963 connection...', false);

    // Create a port for EIP-6963 communication
    try {
      portEIP6963 = browser.runtime.connect({ name: YAKKL_PROVIDER_EIP6963 });
      log.debug('Created EIP-6963 port connection', false, { portName: YAKKL_PROVIDER_EIP6963 });
    } catch (error) {
      log.error('Failed to create port connection:', false, error);
      isConnecting = false;
      // Check if this was due to invalid context
      if (browser.runtime.id === undefined) {
        isExtensionContextValid = false;
      }
      return null;
    }

    contentStream = new PortDuplexStream(portEIP6963);
    log.debug('Created PortDuplexStream for EIP-6963', false);

    // Single disconnect handler with exponential backoff
    let disconnectHandled = false;
    portEIP6963.onDisconnect.addListener(() => {
      if (disconnectHandled) return;
      disconnectHandled = true;

      const lastError = browser.runtime.lastError;
      log.debug('EIP-6963 port disconnected', false, { lastError });

      // Clean up existing connection
      cleanupConnection();

      // Check if extension context is still valid before attempting reconnection
      if (browser.runtime.id === undefined) {
        log.error('Extension context invalidated during disconnect', false);
        return;
      }

      // Implement exponential backoff for reconnection
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
        log.debug(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`, false);

        setTimeout(() => {
          // Double-check extension context before reconnecting
          if (browser.runtime.id !== undefined) {
            disconnectHandled = false;
            reconnectAttempts++;
            const newStream = setupEIP6963Connection();
            if (newStream) {
              reconnectAttempts = 0; // Reset on successful connection
            }
          } else {
            log.error('Extension context invalid, skipping reconnection attempt', false);
          }
        }, delay);
      } else {
        log.error('Max reconnection attempts reached', false);
      }
    });

    // Setup message handling for the stream
    setupMessageHandling(contentStream);

    log.debug('EIP-6963 connection established', false);
    isConnecting = false;
    return contentStream;
  } catch (error) {
    log.error('Failed to setup EIP-6963 connection:', false, error);
    // Check if this was due to invalid context
    if (browser?.runtime?.id === undefined) {
      isExtensionContextValid = false;
    }
    cleanupConnection();
    return null;
  }
}

// Helper function to clean up connection state
function cleanupConnection() {
  if (contentStream) {
    try {
      contentStream.destroy();
    } catch (e) {
      log.error('Error destroying content stream:', false, e);
    }
  }
  contentStream = undefined;
  portEIP6963 = undefined;
  isConnecting = false;
  reconnectAttempts = 0; // Reset reconnect attempts on cleanup
}

// Setup message handling for the stream
function setupMessageHandling(stream: PortDuplexStream) {
  if (!stream) return;

  // Listen for messages from the background script
  stream.on('data', (data: any) => {
    try {
      log.debug('Received message from background:', false, data);

      // Forward the response to the inpage script
      window.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        ...data
      }, window.location.origin);
    } catch (error) {
      log.error('Error handling message from background:', false, error);
    }
  });

  // Listen for messages from the inpage script
  window.addEventListener('message', handleInpageMessage);
}

// Handler for inpage messages
function handleInpageMessage(event: MessageEvent) {
  if (event.source !== window) return;
  if (!event.data?.type) return;

  try {
    // Handle both EIP-6963 and EIP-1193 requests
    if (event.data.type === 'YAKKL_REQUEST:EIP6963' || event.data.type === 'YAKKL_REQUEST:EIP1193') {
      // Ensure we have an active connection
      if (!contentStream && !isConnecting) {
        contentStream = setupEIP6963Connection();
      }

      if (contentStream) {
        log.debug('Forwarding request to background:', false, event.data);
        contentStream.write({
          ...event.data,
          // Always convert to EIP-6963 type for background processing
          type: 'YAKKL_REQUEST:EIP6963'
        });
      } else {
        log.error('Failed to establish connection for message:', false, event.data);
        // Send error response back to inpage script
        window.postMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          id: event.data.id,
          error: {
            code: 4900,
            message: 'Failed to establish connection'
          }
        }, window.location.origin);
      }
    }
  } catch (error) {
    log.error('Error processing message from inpage:', false, error);
    // Send error response back to inpage script
    if (event.data?.id) {
      window.postMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        id: event.data.id,
        error: {
          code: -32603,
          message: 'Internal error processing request'
        }
      }, window.location.origin);
    }
  }
}

// Listen for EIP-6963 events from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const yakklEvent = message as { type: string; event: string; data: unknown };
  if (yakklEvent.type === 'YAKKL_EVENT:EIP6963') {
    // Forward EIP-6963 events to inpage
    window.postMessage({
      type: 'YAKKL_EVENT:EIP6963',
      event: yakklEvent.event,
      data: yakklEvent.data
    }, window.location.origin);
  }
  return true;
});

// Modify the periodic health check
let healthCheckInterval: number | undefined;

function startHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = window.setInterval(() => {
    // If context was previously invalid, check if it's been restored
    if (!isExtensionContextValid) {
      if (browser?.runtime?.id !== undefined) {
        log.debug('Extension context restored, resuming normal operation', false);
        isExtensionContextValid = true;
        reconnectAttempts = 0;
      } else {
        // Context still invalid, skip health check
        return;
      }
    }

    // Only attempt reconnection if context is valid
    if (isExtensionContextValid && (!portEIP6963 || !contentStream)) {
      log.debug('EIP-6963 connection lost, attempting to restore...', false);
      reconnectAttempts = 0; // Reset attempts for periodic checks
      setupEIP6963Connection();
    }
  }, 60000); // Check every minute

  // Cleanup on page beforeunload
  window.addEventListener('beforeunload', () => {
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    cleanupConnection();
  });
}

// This is the main entry point for the content script
try {
  log.debug('Content script starting...', false);
  if (browser) {
    // Inject the inpage script
    if (document.contentType === "text/html") {
      log.debug('Injecting inpage script...', false);
      const container = document.head || document.documentElement;
      const script = document.createElement("script");
      script.setAttribute("async", "false");
      script.src = browser.runtime.getURL("/ext/inpage.js");
      script.id = YAKKL_PROVIDER_EIP6963;
      script.onload = () => {
        log.debug('Inpage script loaded', false);
        script.remove();
      };
      container.prepend(script);
    }

    // Setup initial EIP-6963 connection
    setupEIP6963Connection();

    // Start the health check
    startHealthCheck();
  }
} catch (e) {
  log.error('Content script initialization failed:', false, e);
}
