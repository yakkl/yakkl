/**
 * Browser API Message Types for Client-Background Communication
 * 
 * This provides a message-passing interface for browser extension APIs
 * to solve SSR conflicts in SvelteKit while maintaining type safety.
 */

export enum BrowserAPIMessageType {
  // Storage API
  BROWSER_API_STORAGE_GET = 'BROWSER_API_STORAGE_GET',
  BROWSER_API_STORAGE_SET = 'BROWSER_API_STORAGE_SET',
  BROWSER_API_STORAGE_REMOVE = 'BROWSER_API_STORAGE_REMOVE',
  BROWSER_API_STORAGE_CLEAR = 'BROWSER_API_STORAGE_CLEAR',
  
  // Storage Sync API
  BROWSER_API_STORAGE_SYNC_GET = 'BROWSER_API_STORAGE_SYNC_GET',
  BROWSER_API_STORAGE_SYNC_SET = 'BROWSER_API_STORAGE_SYNC_SET',
  
  // Tabs API
  BROWSER_API_TABS_QUERY = 'BROWSER_API_TABS_QUERY',
  BROWSER_API_TABS_CREATE = 'BROWSER_API_TABS_CREATE',
  BROWSER_API_TABS_UPDATE = 'BROWSER_API_TABS_UPDATE',
  BROWSER_API_TABS_REMOVE = 'BROWSER_API_TABS_REMOVE',
  BROWSER_API_TABS_GET = 'BROWSER_API_TABS_GET',
  BROWSER_API_TABS_GET_CURRENT = 'BROWSER_API_TABS_GET_CURRENT',
  
  // Windows API
  BROWSER_API_WINDOWS_CREATE = 'BROWSER_API_WINDOWS_CREATE',
  BROWSER_API_WINDOWS_UPDATE = 'BROWSER_API_WINDOWS_UPDATE',
  BROWSER_API_WINDOWS_REMOVE = 'BROWSER_API_WINDOWS_REMOVE',
  BROWSER_API_WINDOWS_GET = 'BROWSER_API_WINDOWS_GET',
  BROWSER_API_WINDOWS_GET_CURRENT = 'BROWSER_API_WINDOWS_GET_CURRENT',
  BROWSER_API_WINDOWS_GET_ALL = 'BROWSER_API_WINDOWS_GET_ALL',
  
  // Runtime API
  BROWSER_API_RUNTIME_GET_MANIFEST = 'BROWSER_API_RUNTIME_GET_MANIFEST',
  BROWSER_API_RUNTIME_GET_URL = 'BROWSER_API_RUNTIME_GET_URL',
  BROWSER_API_RUNTIME_GET_PLATFORM_INFO = 'BROWSER_API_RUNTIME_GET_PLATFORM_INFO',
  BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE = 'BROWSER_API_RUNTIME_OPEN_OPTIONS_PAGE',
  BROWSER_API_RUNTIME_SEND_MESSAGE = 'BROWSER_API_RUNTIME_SEND_MESSAGE',
  BROWSER_API_RUNTIME_CONNECT = 'BROWSER_API_RUNTIME_CONNECT',
  BROWSER_API_RUNTIME_RELOAD = 'BROWSER_API_RUNTIME_RELOAD',
  
  // Notifications API
  BROWSER_API_NOTIFICATIONS_CREATE = 'BROWSER_API_NOTIFICATIONS_CREATE',
  BROWSER_API_NOTIFICATIONS_UPDATE = 'BROWSER_API_NOTIFICATIONS_UPDATE',
  BROWSER_API_NOTIFICATIONS_CLEAR = 'BROWSER_API_NOTIFICATIONS_CLEAR',
  
  // Identity API
  BROWSER_API_IDENTITY_GET_AUTH_TOKEN = 'BROWSER_API_IDENTITY_GET_AUTH_TOKEN',
  BROWSER_API_IDENTITY_REMOVE_CACHED_AUTH_TOKEN = 'BROWSER_API_IDENTITY_REMOVE_CACHED_AUTH_TOKEN',
  
  // Idle API
  BROWSER_API_IDLE_QUERY_STATE = 'BROWSER_API_IDLE_QUERY_STATE',
  BROWSER_API_IDLE_SET_DETECTION_INTERVAL = 'BROWSER_API_IDLE_SET_DETECTION_INTERVAL',
  
  // Alarms API
  BROWSER_API_ALARMS_CREATE = 'BROWSER_API_ALARMS_CREATE',
  BROWSER_API_ALARMS_CLEAR = 'BROWSER_API_ALARMS_CLEAR',
  BROWSER_API_ALARMS_CLEAR_ALL = 'BROWSER_API_ALARMS_CLEAR_ALL',
  BROWSER_API_ALARMS_GET = 'BROWSER_API_ALARMS_GET',
  BROWSER_API_ALARMS_GET_ALL = 'BROWSER_API_ALARMS_GET_ALL',
  
  // Encryption API (Background only)
  YAKKL_ENCRYPT = 'YAKKL_ENCRYPT',
  YAKKL_DECRYPT = 'YAKKL_DECRYPT',
  YAKKL_VERIFY_DIGEST = 'YAKKL_VERIFY_DIGEST',
}

export interface BrowserAPIRequest<T = any> {
  id: string;
  type: BrowserAPIMessageType;
  payload: T;
  timestamp: number;
}

export interface BrowserAPIResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: BrowserAPIError;
  timestamp: number;
}

export interface BrowserAPIError {
  code: string;
  message: string;
  details?: any;
}

// Payload types for each API method
export interface StorageGetPayload {
  keys?: string | string[] | Record<string, any> | null;
}

export interface StorageSetPayload {
  items: Record<string, any>;
}

export interface StorageRemovePayload {
  keys: string | string[];
}

export interface TabsQueryPayload {
  active?: boolean;
  currentWindow?: boolean;
  url?: string | string[];
  windowId?: number;
  [key: string]: any;
}

export interface TabsCreatePayload {
  url?: string;
  active?: boolean;
  index?: number;
  windowId?: number;
  [key: string]: any;
}

export interface TabsUpdatePayload {
  tabId: number;
  updateProperties: {
    url?: string;
    active?: boolean;
    [key: string]: any;
  };
}

export interface WindowsCreatePayload {
  url?: string | string[];
  focused?: boolean;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
  type?: 'normal' | 'popup' | 'panel' | 'detached_panel';
  [key: string]: any;
}

export interface NotificationCreatePayload {
  notificationId: string;
  options: {
    type: 'basic' | 'image' | 'list' | 'progress';
    iconUrl?: string;
    title: string;
    message: string;
    [key: string]: any;
  };
}

export interface RuntimeGetURLPayload {
  path: string;
}

export interface RuntimeSendMessagePayload {
  message: any;
  extensionId?: string;
}

export interface RuntimeConnectPayload {
  extensionId?: string;
  connectInfo?: {
    name?: string;
    includeTlsChannelId?: boolean;
  };
}