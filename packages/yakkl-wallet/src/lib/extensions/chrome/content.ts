// content.ts
import { Duplex } from 'readable-stream';
import { YAKKL_PROVIDER_EIP6963, WALLET_SECURITY_CONFIG } from '$lib/common/constants';
import type { SecurityLevel } from '$lib/permissions/types';
import { SecurityLevel as SecurityLevelEnum } from '$lib/permissions/types';
import { SECURITY_LEVEL_DESCRIPTIONS } from '$lib/common/constants';
import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/plugins/Logger';
import browser from 'webextension-polyfill';
import { getWindowOrigin, isValidOrigin, getTargetOrigin, safePostMessage } from '$lib/common/origin';
import { SecurityLevel as PermissionsSecurityLevel } from '$lib/permissions/types';

type RuntimePort = Runtime.Port;

// We only want to receive events from the inpage script
const windowOrigin = getWindowOrigin();
let portEIP6963: RuntimePort | undefined = undefined;
let contentStream: PortDuplexStream | undefined = undefined;
let reconnectAttempts = 0;
let isConnecting = false;  // Add connection state tracking
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

// Add a flag to track extension context validity
let isExtensionContextValid = true;

// Security configuration state
let securityLevel: SecurityLevel = SecurityLevelEnum.MEDIUM; // Default to medium security
let injectIframes: boolean = true; // Default to true for backward compatibility

// Track pending messages for CSP-blocked frames
const pendingMessages = new Map<string, {
  message: any;
  timestamp: number;
  attempts: number;
}>();

const MAX_RETRY_ATTEMPTS = 3;
// const RETRY_DELAY = 1000; // 1 second

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
    log.debug('Created PortDuplexStream for EIP-6963', false, contentStream);

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
  if (!stream) {
    log.error('No stream provided for message handling', false);
    return;
  }

  // Listen for messages from the background script
  stream.on('data', (data: any) => {
    try {
      log.debug('Received message from background:', false, {
        data,
        timestamp: new Date().toISOString()
      });

      // Forward the response to the inpage script
      post(data, getTargetOrigin(), );
    } catch (error) {
      log.error('Error handling message from background:', false, {
        error,
        data,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Listen for messages from the inpage script
  window.addEventListener('message', handleInpageMessage);
  log.debug('Message handling setup complete', false, {
    timestamp: new Date().toISOString()
  });
}

function post(message: any, targetOrigin: string | null) {
  const retryKey = `${message.type}-${message.id}`;
  safePostMessage(message, targetOrigin, {
    context: 'content',
    allowRetries: message.type === 'YAKKL_RESPONSE:EIP6963',
    retryKey
  });
}

// // Helper function to verify if a frame is still accessible
// function isFrameAccessible(win: Window | null): boolean {
//   try {
//     if (!win) return false;
//     // Try to access a property that would throw if frame is blocked
//     return !!win && win !== window && typeof win.postMessage === 'function';
//   } catch (e) {
//     return false;
//   }
// }

// Helper function to safely send messages
// function safePostMessage(
//   message: any,
//   targetOrigin: string | null,
//   options?: {
//     allowRetries?: boolean;
//     retryKey?: string;
//     context?: 'content' | 'inpage' | 'ports';
//   }) {
//   try {
//     // If we have a null origin, this likely means the frame was blocked by CSP
//     if (!targetOrigin) {
//       const messageKey = `${message.type}-${message.id}`;

//       log.warn('Cannot send message - frame may have been blocked by CSP', false, {
//         messageType: message.type,
//         messageId: message.id,
//         timestamp: new Date().toISOString()
//       });

//       if (options?.context === 'content' && options?.allowRetries && options.retryKey) {
//         // For EIP-6963 responses, store for potential retry
//         if (message.type === 'YAKKL_RESPONSE:EIP6963') {
//           const pendingMessage = pendingMessages.get(messageKey);
//           if (!pendingMessage || pendingMessage.attempts < MAX_RETRY_ATTEMPTS) {
//             const attempts = (pendingMessage?.attempts || 0) + 1;
//             pendingMessages.set(messageKey, {
//               message: {
//                 ...message,
//                 error: {
//                   code: 4900,
//                   message: 'Frame blocked by Content Security Policy'
//                 }
//               },
//               timestamp: Date.now(),
//               attempts
//             });

//             // Schedule retry if we haven't exceeded max attempts
//             if (attempts < MAX_RETRY_ATTEMPTS) {
//               setTimeout(() => {
//                 const stored = pendingMessages.get(messageKey);
//                 if (stored && Date.now() - stored.timestamp < RETRY_DELAY * MAX_RETRY_ATTEMPTS) {
//                   safePostMessage(stored.message, getTargetOrigin(), options);
//                 }
//               }, RETRY_DELAY * attempts);
//               }
//             }
//           }
//       }
//       return;
//     }

//     // Verify frame is still accessible before sending
//     if (!isFrameAccessible(window)) {
//       log.warn('Frame is no longer accessible, message not sent', false, {
//         messageType: message.type,
//         messageId: message.id,
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     window.postMessage(message, targetOrigin);
//   } catch (error) {
//     log.error('Error sending message:', false, {
//       error,
//       messageType: message.type,
//       messageId: message.id,
//       targetOrigin,
//       timestamp: new Date().toISOString()
//     });
//   }
// }

// Clean up pending messages periodically
function cleanupPendingMessages() {
  const now = Date.now();
  for (const [key, value] of pendingMessages.entries()) {
    // Remove messages older than 30 seconds or that have exceeded max attempts
    if (now - value.timestamp > 30000 || value.attempts >= MAX_RETRY_ATTEMPTS) {
      pendingMessages.delete(key);
    }
  }
}

// Add cleanup interval
const cleanupInterval = setInterval(cleanupPendingMessages, 10000); // Clean up every 10 seconds

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  clearInterval(cleanupInterval);
  pendingMessages.clear();
});

// Handler for inpage messages
function handleInpageMessage(event: MessageEvent) {
  log.debug('Content script received message:', false, {
    event,
    timestamp: new Date().toISOString()
  });

  if (event.source !== window) {
    log.debug('Message source is not window, ignoring', false);
    return;
  }
  if (!event.data?.type) {
    log.debug('Message has no type, ignoring', false);
    return;
  }
  if (!isValidOrigin(event.origin)) {
    log.debug('Invalid origin, ignoring message', false, {
      origin: event.origin,
      timestamp: new Date().toISOString()
    });
    return;
  }

  try {
    // Handle both EIP-6963 and EIP-1193 requests
    if (event.data.type === 'YAKKL_REQUEST:EIP6963' || event.data.type === 'YAKKL_REQUEST:EIP1193') {
      log.debug('Processing request from inpage:', false, {
        data: event.data,
        timestamp: new Date().toISOString()
      });

      // Ensure we have an active connection
      if (!contentStream && !isConnecting) {
        log.debug('No active connection, attempting to establish one', false);
        contentStream = setupEIP6963Connection();
      }

      if (contentStream) {
        log.debug('Forwarding request to background:', false, {
          data: event.data,
          timestamp: new Date().toISOString()
        });
        contentStream.write({
          ...event.data,
          // Always convert to EIP-6963 type for background processing
          type: 'YAKKL_REQUEST:EIP6963'
        });
      } else {
        log.error('Failed to establish connection for message:', false, {
          data: event.data,
          timestamp: new Date().toISOString()
        });
        // Send error response back to inpage script
        safePostMessage({
          type: 'YAKKL_RESPONSE:EIP6963',
          id: event.data.id,
          error: {
            code: 4900,
            message: 'Failed to establish connection'
          }
        }, getTargetOrigin());
      }
    }
  } catch (error) {
    log.error('Error processing message from inpage:', false, {
      error,
      data: event.data,
      timestamp: new Date().toISOString()
    });
    // Send error response back to inpage script
    if (event.data?.id) {
      safePostMessage({
        type: 'YAKKL_RESPONSE:EIP6963',
        id: event.data.id,
        error: {
          code: -32603,
          message: 'Internal error processing request'
        }
      }, getTargetOrigin());
    }
  }
}

// Listen for EIP-6963 events from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const yakklEvent = message as { type: string; event: string; data: unknown };
  if (yakklEvent.type === 'YAKKL_EVENT:EIP6963') {
    // Forward EIP-6963 events to inpage
    safePostMessage({
      type: 'YAKKL_EVENT:EIP6963',
      event: yakklEvent.event,
      data: yakklEvent.data
    }, getTargetOrigin());
  }
  return true;
});

// Listen for security configuration updates from background
browser.runtime.onMessage.addListener((message: unknown) => {
  const configMessage = message as {
    type: string;
    securityLevel?: PermissionsSecurityLevel;
    injectIframes?: boolean;
  };

  if (configMessage.type === 'YAKKL_SECURITY_CONFIG_UPDATE') {
    if (configMessage.securityLevel !== undefined) {
      securityLevel = configMessage.securityLevel;
      log.debug('Security level updated:', false, {
        level: securityLevel,
        description: getSecurityLevelDescription(securityLevel)
      });
    }
    if (configMessage.injectIframes !== undefined) {
      injectIframes = configMessage.injectIframes;
      log.debug('Iframe injection setting updated:', false, { injectIframes });
    }
  }
  return true;
});

// Helper function to get security level description
function getSecurityLevelDescription(level: SecurityLevel): string {
  switch (level) {
    case SecurityLevelEnum.HIGH:
      return 'High security - No iframe injection';
    case SecurityLevelEnum.MEDIUM:
      return 'Medium security - Trusted domains only';
    case SecurityLevelEnum.STANDARD:
      return 'Standard security - All non-null origin frames';
    default:
      return 'Unknown security level';
  }
}

// Helper function to check if we should inject into a frame
function shouldInjectIntoFrame(frame: Window): boolean {
  try {
    // Don't inject if the frame is not accessible
    if (!frame || !frame.document) {
      return false;
    }

    // Check if iframe injection is enabled
    if (!injectIframes) {
      log.debug('Iframe injection is disabled', false);
      return false;
    }

    // Check security level
    switch (securityLevel) {
      case SecurityLevelEnum.HIGH:
        log.debug('High security level - no iframe injection', false);
        return false;

      case SecurityLevelEnum.MEDIUM:
        // Check if the frame has a null origin
        if (frame.location.origin === 'null') {
          log.debug('Skipping injection into null origin frame', false);
          return false;
        }

        // Check if the frame is from a trusted domain
        const frameOrigin = frame.location.origin;
        const isTrustedDomain = WALLET_SECURITY_CONFIG.TRUSTED_DOMAINS.some(
          domain => frameOrigin.includes(domain)
        );

        if (!isTrustedDomain) {
          log.debug('Skipping injection into untrusted frame:', false, {
            origin: frameOrigin,
            securityLevel: SecurityLevelEnum.MEDIUM
          });
          return false;
        }
        break;

      case SecurityLevelEnum.STANDARD:
        // Only check for null origin
        if (frame.location.origin === 'null') {
          log.debug('Skipping injection into null origin frame', false);
          return false;
        }
        break;
    }

    return true;
  } catch (error) {
    log.debug('Error checking frame injection:', false, {
      error,
      securityLevel,
      injectIframes
    });
    return false;
  }
}

// Helper function to check if a frame is safe to inject into
function isFrameSafe(frame: Window): boolean {
  try {
    // Basic safety checks
    if (!frame || !frame.document) {
      log.debug('Frame is not accessible', false);
      return false;
    }

    // Check for null origin
    if (frame.location.origin === 'null') {
      log.debug('Frame has null origin, skipping injection', false);
      return false;
    }

    // Check if we can access the frame's location
    try {
      frame.location.href;
    } catch (e) {
      log.debug('Cannot access frame location, skipping injection', false);
      return false;
    }

    return true;
  } catch (error) {
    log.debug('Error checking frame safety:', false, error);
    return false;
  }
}

// Helper function to inject script into a frame
function injectScriptIntoFrame(frame: Window) {
  try {
    // Additional safety check before injection
    if (!isFrameSafe(frame)) {
      log.debug('Frame failed safety checks, skipping injection', false);
      return;
    }

    if (!frame || !frame.document) return;

    const container = frame.document.head || frame.document.documentElement;
    const script = frame.document.createElement("script");
    script.setAttribute("async", "false");
    script.src = browser.runtime.getURL("/ext/inpage.js");
    script.id = YAKKL_PROVIDER_EIP6963;
    script.onload = () => {
      log.debug('Inpage script loaded in frame:', false, {
        origin: frame.location.origin,
        timestamp: new Date().toISOString()
      });
      script.remove();
    };
    container.prepend(script);
  } catch (error) {
    log.debug('Error injecting script into frame:', false, error);
  }
}

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
    // Always inject into the main window
    if (document.contentType === "text/html") {
      log.debug('Injecting inpage script into main window...', false);
      const container = document.head || document.documentElement;
      const script = document.createElement("script");
      script.setAttribute("async", "false");
      script.src = browser.runtime.getURL("/ext/inpage.js");
      script.id = YAKKL_PROVIDER_EIP6963;
      script.onload = () => {
        log.debug('Inpage script loaded in main window', false);
        script.remove();
      };
      container.prepend(script);
    }

    // Setup initial EIP-6963 connection
    setupEIP6963Connection();

    // Start the health check
    startHealthCheck();

    // Handle iframe injection more selectively
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLIFrameElement) {
            // Wait for the iframe to load
            node.addEventListener('load', () => {
              try {
                const frame = node.contentWindow;
                // First check if the frame is safe
                if (frame && isFrameSafe(frame)) {
                  // Then check if we should inject based on security settings
                  if (shouldInjectIntoFrame(frame)) {
                    injectScriptIntoFrame(frame);
                  }
                }
              } catch (error) {
                log.debug('Error handling iframe:', false, error);
              }
            });
          }
        });
      });
    });

    // Observe DOM changes for new iframes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Clean up observer on page unload
    window.addEventListener('beforeunload', () => {
      observer.disconnect();
    });
  }
} catch (e) {
  log.error('Content script initialization failed:', false, e);
}
