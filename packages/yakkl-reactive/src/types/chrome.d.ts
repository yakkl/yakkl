// Chrome extension API type definitions
export interface ChromeStorageArea {
  get(keys?: string | string[] | null): Promise<{ [key: string]: any }>;
  set(items: { [key: string]: any }): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface ChromeStorageChange {
  oldValue?: any;
  newValue?: any;
}

export interface ChromeStorageChangedEvent {
  addListener(
    callback: (changes: { [key: string]: ChromeStorageChange }, areaName: string) => void
  ): void;
  removeListener(
    callback: (changes: { [key: string]: ChromeStorageChange }, areaName: string) => void
  ): void;
}

export interface ChromeStorage {
  local: ChromeStorageArea;
  sync: ChromeStorageArea;
  session?: ChromeStorageArea;
  onChanged: ChromeStorageChangedEvent;
}

export interface ChromeAPI {
  storage?: ChromeStorage;
  runtime?: {
    id?: string;
  };
}

declare global {
  interface Window {
    chrome?: ChromeAPI;
  }

  const chrome: ChromeAPI | undefined;
}
