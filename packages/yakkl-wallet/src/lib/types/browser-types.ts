/**
 * Browser extension API types
 * These are defined locally to avoid module resolution issues
 */

// Basic browser API structure
export interface BrowserAPI {
  runtime: Runtime;
  storage: Storage;
  tabs: Tabs;
  windows: Windows;
  alarms?: Alarms;
  notifications?: Notifications;
  action?: Action;
  idle?: Idle;
  // Add more APIs as needed
}

export interface Action {
  setIcon(details: { path?: string | { [size: string]: string }; tabId?: number }): Promise<void>;
  setBadgeText(details: { text: string; tabId?: number }): Promise<void>;
  setBadgeBackgroundColor(details: { color: string | number[]; tabId?: number }): Promise<void>;
  getBadgeText(details: { tabId?: number }): Promise<string>;
  getBadgeBackgroundColor(details: { tabId?: number }): Promise<number[]>;
  setTitle(details: { title: string; tabId?: number }): Promise<void>;
  getTitle(details: { tabId?: number }): Promise<string>;
  onClicked: EventListener<(tab: Tab) => void>;
}

export interface Runtime {
  id: string;
  lastError?: { message: string };
  getManifest(): any;
  getURL(path: string): string;
  sendMessage(message: any): Promise<any>;
  connect(connectInfo?: { name?: string }): Port;
  getPlatformInfo(): Promise<Runtime.PlatformInfo>;
  onMessage: EventListener<(message: any, sender: MessageSender, sendResponse: (response: any) => void) => void | boolean | Promise<void>>;
  onConnect: EventListener<(port: Port) => void>;
  onInstalled: EventListener<(details: { reason: string; previousVersion?: string; temporary?: boolean }) => void>;
  onSuspend?: EventListener<() => void>;
  onStartup?: EventListener<() => void>;
  onUpdateAvailable?: EventListener<(details: { version: string }) => void>;
  reload?(): void;
}

export interface Port {
  name: string;
  sender?: MessageSender;
  disconnect(): void;
  postMessage(message: any): void;
  onMessage: EventListener<(message: any) => void>;
  onDisconnect: EventListener<() => void>;
}

export interface MessageSender {
  tab?: Tab;
  frameId?: number;
  id?: string;
  url?: string;
}

export interface Storage {
  local: StorageArea;
  sync: StorageArea;
  session?: StorageArea;
  managed?: StorageArea;
}

export interface StorageArea {
  get(keys?: string | string[] | null): Promise<{ [key: string]: any }>;
  set(items: { [key: string]: any }): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface Tabs {
  get(tabId: number): Promise<Tab>;
  query(queryInfo: TabQuery): Promise<Tab[]>;
  create(createProperties: { url?: string; active?: boolean }): Promise<Tab>;
  update(tabId: number, updateProperties: { url?: string; active?: boolean }): Promise<Tab>;
  remove(tabIds: number | number[]): Promise<void>;
  sendMessage(tabId: number, message: any): Promise<any>;
}

export interface TabQuery {
  active?: boolean;
  currentWindow?: boolean;
  url?: string | string[];
  windowId?: number;
}

export interface Tab {
  id?: number;
  index: number;
  windowId: number;
  active: boolean;
  url?: string;
  title?: string;
  favIconUrl?: string;
  highlighted?: boolean;
  pinned?: boolean;
  incognito?: boolean;
}

export interface Windows {
  WINDOW_ID_CURRENT: number;
  create(createData?: WindowCreateData): Promise<Window>;
  update(windowId: number, updateInfo: WindowUpdateInfo): Promise<Window>;
  get(windowId: number): Promise<Window>;
  getCurrent(): Promise<Window>;
  getAll(getInfo?: WindowGetAllInfo): Promise<Window[]>;
  remove(windowId: number): Promise<void>;
  onRemoved: EventListener<(windowId: number) => void>;
}

// Windows namespace for constants
export namespace Windows {
  export const WINDOW_ID_CURRENT = -2;
}

export interface WindowCreateData {
  url?: string | string[];
  tabId?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  focused?: boolean;
  type?: 'normal' | 'popup' | 'panel' | 'detached';
}

export interface WindowUpdateInfo {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  focused?: boolean;
  state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
}

export interface Window {
  id?: number;
  focused: boolean;
  top?: number;
  left?: number;
  width?: number;
  height?: number;
  tabs?: Tab[];
  type?: 'normal' | 'popup' | 'panel' | 'devtools';
  state?: 'normal' | 'minimized' | 'maximized' | 'fullscreen';
}

export interface WindowGetAllInfo {
  populate?: boolean;
  windowTypes?: Array<'normal' | 'popup' | 'panel' | 'devtools'>;
}

export interface Alarms {
  create(name: string, alarmInfo: AlarmCreateInfo): void;
  get(name?: string): Promise<Alarm | undefined>;
  getAll(): Promise<Alarm[]>;
  clear(name?: string): Promise<boolean>;
  clearAll(): Promise<boolean>;
  onAlarm: EventListener<(alarm: Alarm) => void>;
}

export interface AlarmCreateInfo {
  when?: number;
  delayInMinutes?: number;
  periodInMinutes?: number;
}

export interface Alarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

export interface Notifications {
  create(notificationId: string | undefined, options: NotificationOptions): Promise<string>;
  update(notificationId: string, options: NotificationOptions): Promise<boolean>;
  clear(notificationId: string): Promise<boolean>;
  getAll(): Promise<{ [id: string]: NotificationOptions }>;
}

export interface NotificationOptions {
  type?: 'basic' | 'image' | 'list' | 'progress';
  iconUrl?: string;
  title?: string;
  message?: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  items?: Array<{ title: string; message: string }>;
}

export interface EventListener<T extends Function> {
  addListener(callback: T): void;
  removeListener(callback: T): void;
  hasListener(callback: T): boolean;
  hasListeners?(): boolean;
}

// Additional types for Runtime namespace
export namespace Runtime {
  export interface PlatformInfo {
    os: string;
    arch: string;
  }
  
  export interface Port {
    name: string;
    sender?: MessageSender;
    disconnect(): void;
    postMessage(message: any): void;
    onMessage: EventListener<(message: any) => void>;
    onDisconnect: EventListener<() => void>;
  }
  
  export interface MessageSender {
    tab?: Tab;
    frameId?: number;
    id?: string;
    url?: string;
  }
}

// Browser type export
export interface Browser extends BrowserAPI {}

// Export RuntimePlatformInfo for convenience
export type RuntimePlatformInfo = Runtime.PlatformInfo;

// Manifest types
export namespace Manifest {
  export interface WebExtensionManifest {
    manifest_version: number;
    name: string;
    version: string;
    description?: string;
    icons?: { [size: string]: string };
    permissions?: string[];
    // Add more fields as needed
  }
}

// Alarms namespace
export namespace Alarms {
  export interface Alarm {
    name: string;
    scheduledTime: number;
    periodInMinutes?: number;
  }
}

// Idle API
export interface Idle {
  setDetectionInterval(intervalInSeconds: number): Promise<void>;
  queryState(detectionIntervalInSeconds: number): Promise<string>;
  onStateChanged: EventListener<(newState: string) => void>;
}