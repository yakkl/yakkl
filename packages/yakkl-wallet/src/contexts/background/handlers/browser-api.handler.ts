/**
 * Background Browser API Handler
 * 
 * Handles all browser API requests from the client context
 * and executes them in the background context where browser APIs are available.
 */

import browser from 'webextension-polyfill';
import {
  BrowserAPIMessageType,
  type BrowserAPIRequest,
  type BrowserAPIResponse,
  type StorageGetPayload,
  type StorageSetPayload,
  type StorageRemovePayload,
  type TabsQueryPayload,
  type TabsCreatePayload,
  type TabsUpdatePayload,
  type WindowsCreatePayload,
  type NotificationCreatePayload,
  type RuntimeGetURLPayload,
  type RuntimeSendMessagePayload,
  type RuntimeConnectPayload
} from '$lib/types/browser-api-messages';
import { log } from '$lib/managers/Logger';

export async function handleBrowserAPIMessage(
  message: BrowserAPIRequest
): Promise<any> {
  const startTime = Date.now();
  
  try {
    log.debug(`[BrowserAPI] Handling ${message.type}`, false, message.payload);
    
    let result: any;
    
    switch (message.type) {
      // Storage API handlers
      case BrowserAPIMessageType.BROWSER_API_STORAGE_GET:
        result = await handleStorageGet(message.payload as StorageGetPayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_STORAGE_SET:
        result = await handleStorageSet(message.payload as StorageSetPayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_STORAGE_REMOVE:
        result = await handleStorageRemove(message.payload as StorageRemovePayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_STORAGE_CLEAR:
        result = await handleStorageClear();
        break;
        
      case BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_GET:
        result = await handleStorageSyncGet(message.payload as StorageGetPayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_SET:
        result = await handleStorageSyncSet(message.payload as StorageSetPayload);
        break;
        
      // Tabs API handlers
      case BrowserAPIMessageType.BROWSER_API_TABS_QUERY:
        result = await handleTabsQuery(message.payload as TabsQueryPayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_TABS_CREATE:
        result = await handleTabsCreate(message.payload as TabsCreatePayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_TABS_UPDATE:
        result = await handleTabsUpdate(message.payload as TabsUpdatePayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_TABS_GET_CURRENT:
        result = await handleTabsGetCurrent();
        break;
        
      // Windows API handlers
      case BrowserAPIMessageType.BROWSER_API_WINDOWS_CREATE:
        result = await handleWindowsCreate(message.payload as WindowsCreatePayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_CURRENT:
        result = await handleWindowsGetCurrent();
        break;
        
      case BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_ALL:
        result = await handleWindowsGetAll();
        break;
        
      // Runtime API handlers
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_MANIFEST:
        result = await handleRuntimeGetManifest();
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_URL:
        result = await handleRuntimeGetURL(message.payload as RuntimeGetURLPayload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_PLATFORM_INFO:
        result = await handleRuntimeGetPlatformInfo();
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_SEND_MESSAGE:
        result = await handleRuntimeSendMessage(message.payload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_CONNECT:
        result = await handleRuntimeConnect(message.payload);
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_RELOAD:
        result = await handleRuntimeReload();
        break;
        
      case BrowserAPIMessageType.BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE:
        result = await handleRuntimeOpenOptionsPage();
        break;
        
      // Notifications API handlers
      case BrowserAPIMessageType.BROWSER_API_NOTIFICATIONS_CREATE:
        result = await handleNotificationCreate(message.payload as NotificationCreatePayload);
        break;
        
      // Idle API handlers
      case BrowserAPIMessageType.BROWSER_API_IDLE_QUERY_STATE:
        result = await handleIdleQueryState();
        break;
        
      default:
        throw new Error(`Unknown browser API message type: ${message.type}`);
    }
    
    log.debug(`[BrowserAPI] Completed ${message.type} in ${Date.now() - startTime}ms`, false);
    
    // Return in the format expected by BaseService
    return {
      success: true,
      data: result
    };
    
  } catch (error) {
    log.error(`[BrowserAPI] Error handling ${message.type}`, false, error);
    
    // Return error in the format expected by BaseService
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Storage API implementations
async function handleStorageGet(payload: StorageGetPayload) {
  return browser.storage.local.get(payload.keys);
}

async function handleStorageSet(payload: StorageSetPayload) {
  await browser.storage.local.set(payload.items);
  return { success: true };
}

async function handleStorageRemove(payload: StorageRemovePayload) {
  await browser.storage.local.remove(payload.keys);
  return { success: true };
}

async function handleStorageClear() {
  await browser.storage.local.clear();
  return { success: true };
}

async function handleStorageSyncGet(payload: StorageGetPayload) {
  return browser.storage.sync.get(payload.keys);
}

async function handleStorageSyncSet(payload: StorageSetPayload) {
  await browser.storage.sync.set(payload.items);
  return { success: true };
}

// Tabs API implementations
async function handleTabsQuery(payload: TabsQueryPayload) {
  return browser.tabs.query(payload);
}

async function handleTabsCreate(payload: TabsCreatePayload) {
  return browser.tabs.create(payload);
}

async function handleTabsUpdate(payload: TabsUpdatePayload) {
  const { tabId, updateProperties } = payload;
  return browser.tabs.update(tabId, updateProperties);
}

async function handleTabsGetCurrent() {
  return browser.tabs.getCurrent();
}

// Windows API implementations
async function handleWindowsCreate(payload: WindowsCreatePayload) {
  return browser.windows.create(payload);
}

async function handleWindowsGetCurrent() {
  return browser.windows.getCurrent();
}

async function handleWindowsGetAll() {
  return browser.windows.getAll();
}

// Runtime API implementations
async function handleRuntimeGetManifest() {
  return browser.runtime.getManifest();
}

async function handleRuntimeGetURL(payload: RuntimeGetURLPayload) {
  return browser.runtime.getURL(payload.path);
}

async function handleRuntimeGetPlatformInfo() {
  return browser.runtime.getPlatformInfo();
}

async function handleRuntimeSendMessage(payload: RuntimeSendMessagePayload) {
  const { message, extensionId } = payload;
  log.info('[BrowserAPI] runtime.sendMessage:', false, { extensionId, messageType: message?.type });
  
  // Send message and wait for response
  const response = await browser.runtime.sendMessage(extensionId, message);
  return response;
}

async function handleRuntimeConnect(payload: RuntimeConnectPayload) {
  const { extensionId, connectInfo } = payload;
  log.info('[BrowserAPI] runtime.connect:', false, { extensionId, connectInfo });
  
  // Create port connection
  const port = browser.runtime.connect(extensionId, connectInfo);
  
  // Generate a unique port ID
  const portId = `port_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  // Store the port for later use
  // Note: We can't send the actual port object back, but we can
  // manage it here and provide an ID for reference
  globalThis.__browserAPIPorts = globalThis.__browserAPIPorts || {};
  globalThis.__browserAPIPorts[portId] = port;
  
  // Return port metadata
  return {
    portId,
    name: port.name,
    // Provide methods to interact with the port via messages
    // The client will need to use these through the BrowserAPI service
  };
}

async function handleRuntimeReload() {
  log.info('[BrowserAPI] runtime.reload');
  browser.runtime.reload();
  return { success: true };
}

async function handleRuntimeOpenOptionsPage() {
  log.info('[BrowserAPI] runtime.openOptionsPage');
  await browser.runtime.openOptionsPage();
  return { success: true };
}

// Notifications API implementations
async function handleNotificationCreate(payload: NotificationCreatePayload) {
  const { notificationId, options } = payload;
  return browser.notifications.create(notificationId, options);
}

// Idle API implementations
async function handleIdleQueryState() {
  const detectionInterval = 60; // Default 60 seconds
  return browser.idle.queryState(detectionInterval);
}

// Export handlers for MessageHandler
export const browserAPIHandlers = new Map<string, (payload: any) => Promise<any>>([
  [BrowserAPIMessageType.BROWSER_API_STORAGE_GET, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_GET, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_STORAGE_SET, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_SET, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_STORAGE_REMOVE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_REMOVE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_STORAGE_CLEAR, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_CLEAR, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_GET, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_GET, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_SET, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_STORAGE_SYNC_SET, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_TABS_QUERY, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_TABS_QUERY, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_TABS_CREATE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_TABS_CREATE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_TABS_UPDATE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_TABS_UPDATE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_TABS_GET_CURRENT, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_TABS_GET_CURRENT, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_WINDOWS_CREATE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_WINDOWS_CREATE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_CURRENT, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_CURRENT, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_ALL, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_WINDOWS_GET_ALL, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_MANIFEST, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_MANIFEST, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_URL, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_URL, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_PLATFORM_INFO, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_GET_PLATFORM_INFO, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_SEND_MESSAGE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_SEND_MESSAGE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_CONNECT, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_CONNECT, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_RELOAD, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_RELOAD, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_NOTIFICATIONS_CREATE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_NOTIFICATIONS_CREATE, payload, id: '', timestamp: Date.now() })],
  [BrowserAPIMessageType.BROWSER_API_IDLE_QUERY_STATE, (payload) => handleBrowserAPIMessage({ type: BrowserAPIMessageType.BROWSER_API_IDLE_QUERY_STATE, payload, id: '', timestamp: Date.now() })],
]);