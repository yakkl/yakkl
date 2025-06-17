import { browser_ext, browserSvelte } from '$lib/common/environment';
import { ConnectionType } from '$managers/BackgroundManager';
import { log } from '$lib/common/logger-wrapper';
import type { MessageTypes, TabChangeData, WindowFocusData } from '$lib/common/types';
import { MessageType } from '$lib/common/types';
import { activeTabUIStore } from '../stores';

interface ConnectionState {
  retryCount: number;
  retryTimeout?: number;
  isConnecting: boolean;
}

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 32000; // 32 seconds
const state: ConnectionState = {
  retryCount: 0,
  retryTimeout: undefined,
  isConnecting: false
};

function calculateBackoffDelay(retryCount: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
  const maxDelay = Math.min(exponentialDelay, MAX_RETRY_DELAY);
  // Add random jitter (±20%)
  const jitter = maxDelay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(maxDelay + jitter);
}

function cleanupConnection() {
  if (state.retryTimeout) {
    clearTimeout(state.retryTimeout);
    state.retryTimeout = undefined;
  }
  state.isConnecting = false;
}

async function retryConnection(): Promise<void> {
  if (browserSvelte) {
    if (state.retryCount >= MAX_RETRIES) {
      log.error('Maximum reconnection attempts reached', true, {
        attempts: state.retryCount
      });
      cleanupConnection();
      return;
    }

    const delay = calculateBackoffDelay(state.retryCount);
    log.info('Attempting to reconnect', false, {
      attempt: state.retryCount + 1,
      delay: `${delay}ms`
    });

    if (typeof window !== 'undefined') {
      state.retryTimeout = window.setTimeout(async () => {
        try {
          state.retryCount++;
          await initializeUIConnection();
        } catch (error) {
          log.error('Reconnection attempt failed:', false, {
            attempt: state.retryCount,
            error
          });
          await retryConnection();
        }
      }, delay);
    }
  }
}

export async function initializeUIConnection() {
  // Prevent multiple simultaneous connection attempts
  if (state.isConnecting) {
    log.warn('Connection attempt already in progress');
    return;
  }

  try {
    state.isConnecting = true;
    if (browserSvelte && browser_ext) {
      const port = browser_ext.runtime.connect({ name: ConnectionType.UI });

      if (!port) {
        log.error('Failed to establish connection with UI', true);
        throw new Error('Connection failed');
      }

      port.onMessage.addListener((message: unknown) => {
        try {
          // Type guard function to check if message is valid
          if (isValidMessage(message)) {
            handleMessage(message);
          } else {
            log.warn('Invalid message format received:', false, message);
          }
        } catch (error) {
          log.error('Error handling message:', false, error);
        }
      });

      port.onDisconnect.addListener(() => {
        if (browserSvelte && browser_ext) {
          const error = browser_ext.runtime.lastError;
          log.warn('UI connection disconnected', false, { error });

          cleanupConnection();

          // Check if extension is still available before attempting reconnect
          if (browser_ext && !browser_ext.runtime.lastError) {
            retryConnection().catch(error => {
              log.error('Failed to initiate reconnection:', true, error);
            });
          } else {
            log.warn('Extension context invalid, skipping reconnection');
          }
        }
      });

      // Connection successful, reset retry count
      state.retryCount = 0;
      state.isConnecting = false;
      log.info('UI connection established successfully');
      return port;
    }
  } catch (error) {
    log.error('Failed to initialize UI connection:', true, error);
    throw error;
  }
}

// Optional: Add connection status monitoring
let connectionMonitorInterval: number;

function startConnectionMonitor() {
  if ( typeof window !== 'undefined' ) {
    connectionMonitorInterval = window.setInterval(() => {
      if (!state.isConnecting && state.retryCount < MAX_RETRIES) {
        if (browserSvelte && browser_ext) {
          browser_ext.runtime.getPlatformInfo()
            .then(() => {
              // Extension is responding, connection might be alive
            })
            .catch(() => {
              log.warn('Connection check failed, initiating reconnect');
              initializeUIConnection().catch(error => {
                log.error('Connection monitor reconnect failed:', false, error);
              });
            });
        }
      }
    }, 30000); // Check every 30 seconds
  }
}

function stopConnectionMonitor() {
  if (connectionMonitorInterval) {
    clearInterval(connectionMonitorInterval);
    connectionMonitorInterval = undefined;
  }
}

// Cleanup function for unmounting
export function cleanup() {
  cleanupConnection();
  stopConnectionMonitor();
}

// Initialize connection monitoring when the extension starts
startConnectionMonitor();

// Do not enable this unless needed and then put a guard around it for browser_ext
// Optional: Add cleanup logic for extension lifecycle events
// Handle extension lifecycle events
// browser_ext.runtime.onSuspend.addListener(() => {
//   cleanup();
// });

function handleMessage(message: MessageTypes) {
  try {
    log.debug('handleMessage:[connectionStore]', false, message);

    switch (message.type) {
      case MessageType.ACTIVE_TAB_CHANGED:
        if (isTabChangeData(message.data)) {
          handleActiveTabChange(message.data);
        }
        break;
      case MessageType.TAB_UPDATED:
        if (isTabChangeData(message.data)) {
          handleTabUpdate(message.data);
        }
        break;
      case MessageType.TAB_REMOVED:
        if (isTabChangeData(message.data)) {
          handleTabRemove(null);
        }
        break;
      case MessageType.WINDOW_FOCUSED:
        if (isWindowFocusData(message.data)) {
          handleWindowFocus(message.data);
        }
        break;
      default:
        log.info('Unhandled message type. Letting it pass:', false, message.type);
    }
  } catch (error) {
    throw error;
  }
}

// Type guard functions
function isValidMessage(message: unknown): message is MessageTypes {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    'data' in message &&
    typeof (message as MessageTypes).type === 'string'
  );
}

function isTabChangeData(data: unknown): data is TabChangeData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tabId' in data &&
    typeof (data as TabChangeData).tabId === 'number'
  );
}

function isWindowFocusData(data: unknown): data is WindowFocusData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'windowId' in data &&
    typeof (data as WindowFocusData).windowId === 'number'
  );
}

// Handler functions with proper typing
function handleActiveTabChange(data: TabChangeData) {
  log.debug('handleActiveTabChange:-------------------->>>>>>>>>>', false, data);

  if (data?.windowType === 'normal') {
    activeTabUIStore.set(data);
    log.debug('Active tab changed:', false, data);
  } else {
    // log.debug('Active tab did not change (windowType should only be "normal"):', false, data);
  }
}

function handleTabRemove(data: TabChangeData) {
  // We don't need to update the active tab on tab update

  // if (data?.windowType === 'normal') {
  //   activeTabUIStore.set(data);
  //   log.debug('Tab updated:', false, data);
  // } else {
    // log.debug('Tab did not change (windowType should only be "normal"):', false, data);
  // }
}

function handleTabUpdate(data: TabChangeData | null) {
  activeTabUIStore.set(data);
  log.debug('Tab removed:', false, data);
}

async function handleWindowFocus(data: WindowFocusData) {
  try {
    if (!(browserSvelte && browser_ext)) return;

    log.debug('handleWindowFocus:>>>>>>>>>>>>>>>>>>>>>>', false, data);

    // Implement window focus logic if needed
    if (data?.type === 'normal') {
      // This should set the active tab to the focused window if it is normal and not a popup or other type
      const activeTab = { tabId: 0, windowId: data.windowId, windowType: data.type, url: '', title: '', favIconUrl: '', dateTime: new Date().toISOString() };
      const tabs = await browser_ext.tabs.query({ active: true, windowId: data.windowId });
      if (tabs.length > 0) {
        activeTab.tabId = tabs[0].id ?? 0;
        activeTab.url = tabs[0].url ?? '';
        activeTab.title = tabs[0].title ?? '';
        activeTab.favIconUrl = tabs[0].favIconUrl ?? '';

        if (activeTab.tabId > 0) {
          activeTabUIStore.set(activeTab);
          log.debug('Window focused changed: [connectionStore]', false, activeTab);
        }
      }
    } else {
      // NOTE: Could add logic to handle different window types...
      // log.debug('Window focus did not change (type should only be "normal"):', false, data);
    }
  } catch (error) {
    log.error('Error handling window focus:', false, error);
    throw error;
  }
}
