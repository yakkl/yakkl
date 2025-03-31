// src/types/chrome-api.d.ts

/**
 * Chrome Extension API type definitions
 * Extends the global namespace with Chrome API interfaces
 */

declare global {
  interface Chrome {
    runtime: ChromeRuntime;
    storage: ChromeStorage;
    sidePanel: ChromeSidePanel;
    tabs?: ChromeTabs;
    alarms?: ChromeAlarms;
    idle?: ChromeIdle;
    notifications?: ChromeNotifications;
    // Add any other properties you're using
  }

  const chrome: Chrome | undefined;
}

interface ChromeRuntime {
  sendMessage: (message: any, callback?: (response: any) => void) => void;
  connect: (connectInfo?: ChromeRuntimeConnectInfo) => ChromePort;
  lastError?: {message: string};
  id?: string;
  onMessage: {
    addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => void;
    removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => void;
    hasListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => boolean | void) => boolean;
  };
  onConnect: {
    addListener: (callback: (port: ChromePort) => void) => void;
    removeListener: (callback: (port: ChromePort) => void) => void;
    hasListener: (callback: (port: ChromePort) => void) => boolean;
  };
  getURL: (path: string) => string;
  reload: () => void;
}

interface ChromeRuntimeConnectInfo {
  name?: string;
  includeTlsChannelId?: boolean;
}

interface ChromePort {
  name: string;
  sender?: any;
  onMessage: {
    addListener: (callback: (message: any) => void) => void;
    removeListener: (callback: (message: any) => void) => void;
    hasListener: (callback: (message: any) => void) => boolean;
  };
  onDisconnect: {
    addListener: (callback: () => void) => void;
    removeListener: (callback: () => void) => void;
    hasListener: (callback: () => void) => boolean;
  };
  postMessage: (message: any) => void;
  disconnect: () => void;
}

interface ChromeStorage {
  local: {
    get: (keys: string | string[] | null | undefined | Record<string, any>, callback: (result: {[key: string]: any}) => void) => void;
    set: (items: {[key: string]: any}, callback?: () => void) => void;
    remove: (keys: string | string[], callback?: () => void) => void;
    clear: (callback?: () => void) => void;
    getBytesInUse?: (keys: string | string[] | null, callback: (bytesInUse: number) => void) => void;
  };
  sync?: {
    get: (keys: string | string[] | null | undefined | Record<string, any>, callback: (result: {[key: string]: any}) => void) => void;
    set: (items: {[key: string]: any}, callback?: () => void) => void;
    remove: (keys: string | string[], callback?: () => void) => void;
    clear: (callback?: () => void) => void;
    getBytesInUse?: (keys: string | string[] | null, callback: (bytesInUse: number) => void) => void;
  };
  session?: {
    get: (keys: string | string[] | null | undefined | Record<string, any>, callback: (result: {[key: string]: any}) => void) => void;
    set: (items: {[key: string]: any}, callback?: () => void) => void;
    remove: (keys: string | string[], callback?: () => void) => void;
    clear: (callback?: () => void) => void;
  };
  onChanged: {
    addListener: (callback: (changes: {[key: string]: chrome.storage.StorageChange}, areaName: string) => void) => void;
    removeListener: (callback: (changes: {[key: string]: chrome.storage.StorageChange}, areaName: string) => void) => void;
    hasListener: (callback: (changes: {[key: string]: chrome.storage.StorageChange}, areaName: string) => void) => boolean;
  };
}

interface ChromeStorageChange {
  oldValue?: any;
  newValue?: any;
}

interface ChromeTabs {
  query: (queryInfo: chrome.tabs.QueryInfo, callback: (result: chrome.tabs.Tab[]) => void) => void;
  create: (createProperties: chrome.tabs.CreateProperties, callback?: (tab: chrome.tabs.Tab) => void) => void;
  update: (tabId: number, updateProperties: chrome.tabs.UpdateProperties, callback?: (tab?: chrome.tabs.Tab) => void) => void;
  get: (tabId: number, callback: (tab: chrome.tabs.Tab) => void) => void;
  getCurrent: (callback: (tab?: chrome.tabs.Tab) => void) => void;
  sendMessage: (tabId: number, message: any, options?: chrome.tabs.MessageSendOptions, callback?: (response: any) => void) => void;
}

interface ChromeTabsQueryInfo {
  active?: boolean;
  audible?: boolean;
  currentWindow?: boolean;
  highlighted?: boolean;
  index?: number;
  muted?: boolean;
  pinned?: boolean;
  status?: 'loading' | 'complete';
  title?: string;
  url?: string | string[];
  windowId?: number;
  windowType?: 'normal' | 'popup' | 'panel' | 'app' | 'devtools';
}

interface ChromeTabsTab {
  id?: number;
  index: number;
  pinned: boolean;
  highlighted: boolean;
  active: boolean;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: string;
  incognito: boolean;
  windowId: number;
  audible?: boolean;
  muted?: boolean;
  width?: number;
  height?: number;
}

interface ChromeTabsCreateProperties {
  active?: boolean;
  index?: number;
  openerTabId?: number;
  pinned?: boolean;
  url?: string;
  windowId?: number;
}

interface ChromeTabsUpdateProperties {
  active?: boolean;
  autoDiscardable?: boolean;
  highlighted?: boolean;
  muted?: boolean;
  pinned?: boolean;
  url?: string;
}

interface ChromeTabsMessageSendOptions {
  frameId?: number;
}

interface ChromeSidePanel {
  setPanelBehavior: (options: { openPanelOnActionClick: boolean }) => void;
  open: (options: { tabId: number }) => Promise<void>;
  getOptions?: () => Promise<{ enabled: boolean }>;
  setOptions: (options: { tabId: number, enabled: boolean, path: string }) => Promise<void>;
}

interface ChromeAlarms {
  create: (name: string, alarmInfo: chrome.alarms.AlarmCreateInfo) => void;
  get: (name: string, callback: (alarm: chrome.alarms.Alarm) => void) => void;
  getAll: (callback: (alarms: chrome.alarms.Alarm[]) => void) => void;
  clear: (name?: string, callback?: (wasCleared: boolean) => void) => void;
  clearAll: (callback?: (wasCleared: boolean) => void) => void;
  onAlarm: {
    addListener: (callback: (alarm: chrome.alarms.Alarm) => void) => void;
    removeListener: (callback: (alarm: chrome.alarms.Alarm) => void) => void;
    hasListener: (callback: (alarm: chrome.alarms.Alarm) => void) => boolean;
  };
}

interface ChromeAlarmsAlarmCreateInfo {
  when?: number;
  delayInMinutes?: number;
  periodInMinutes?: number;
}

interface ChromeAlarmsAlarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

interface ChromeIdle {
  queryState: (detectionIntervalInSeconds: number, callback: (newState: chrome.idle.IdleState) => void) => void;
  setDetectionInterval: (intervalInSeconds: number) => void;
  onStateChanged: {
    addListener: (callback: (newState: chrome.idle.IdleState) => void) => void;
    removeListener: (callback: (newState: chrome.idle.IdleState) => void) => void;
    hasListener: (callback: (newState: chrome.idle.IdleState) => void) => boolean;
  };
}

interface ChromeIdleState {
  state: 'active' | 'idle' | 'locked';
}

interface ChromeExtension {
  getURL: (path: string) => string;
  getViews: (fetchProperties?: { type?: string; windowId?: number }) => Window[];
  getBackgroundPage: () => Window | null;
  isAllowedIncognitoAccess: (callback: (isAllowedAccess: boolean) => void) => void;
  isAllowedFileSchemeAccess: (callback: (isAllowedAccess: boolean) => void) => void;
}

interface ChromeNotifications {
  create: (notificationId: string | undefined, options: chrome.notifications.NotificationOptions, callback?: (notificationId: string) => void) => void;
  update: (notificationId: string, options: chrome.notifications.NotificationOptions, callback?: (wasUpdated: boolean) => void) => void;
  clear: (notificationId: string, callback?: (wasCleared: boolean) => void) => void;
  getAll: (callback: (notifications: { [notificationId: string]: boolean }) => void) => void;
  onClicked: {
    addListener: (callback: (notificationId: string) => void) => void;
    removeListener: (callback: (notificationId: string) => void) => void;
    hasListener: (callback: (notificationId: string) => void) => boolean;
  };
}

interface ChromeNotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl: string;
  title: string;
  message: string;
  contextMessage?: string;
  priority?: number;
  eventTime?: number;
  buttons?: chrome.notifications.Button[];
  imageUrl?: string;
  items?: chrome.notifications.Item[];
  progress?: number;
  isClickable?: boolean;
}

interface ChromeNotificationButton {
  title: string;
  iconUrl?: string;
}

interface ChromeNotificationItem {
  title: string;
  message: string;
}

interface Chrome {
  runtime: ChromeRuntime;
  storage: ChromeStorage;
  tabs?: ChromeTabs;
  sidePanel?: ChromeSidePanel;
  alarms?: ChromeAlarms;
  idle?: ChromeIdle;
  extension?: ChromeExtension;
  notifications?: ChromeNotifications;
  // Add other APIs as needed
}

// Add Chrome namespace
declare namespace chrome {
  export namespace runtime {
    export interface ConnectInfo extends ChromeRuntimeConnectInfo {}
    export interface Port extends ChromePort {}
  }

  export namespace storage {
    export interface StorageChange extends ChromeStorageChange {}
  }

  export namespace tabs {
    export interface QueryInfo extends ChromeTabsQueryInfo {}
    export interface Tab extends ChromeTabsTab {}
    export interface CreateProperties extends ChromeTabsCreateProperties {}
    export interface UpdateProperties extends ChromeTabsUpdateProperties {}
    export interface MessageSendOptions extends ChromeTabsMessageSendOptions {}
  }

  export namespace alarms {
    export interface AlarmCreateInfo extends ChromeAlarmsAlarmCreateInfo {}
    export interface Alarm extends ChromeAlarmsAlarm {}
  }

  export namespace idle {
    export type IdleState = 'active' | 'idle' | 'locked';
  }

  export namespace notifications {
    export interface NotificationOptions extends ChromeNotificationOptions {}
    export interface Button extends ChromeNotificationButton {}
    export interface Item extends ChromeNotificationItem {}
  }
}

// Declare the global chrome variable
declare const chrome: Chrome | undefined;

// Commented this line out to be truly global
// export {};
