// Global type declarations for browser APIs
declare global {
  interface Window {
    chrome?: typeof chrome;
  }

  const chrome: {
    storage?: {
      local: chrome.storage.StorageArea;
      sync: chrome.storage.StorageArea;
      session?: chrome.storage.StorageArea;
      onChanged: chrome.storage.StorageChangedEvent;
    };
    runtime?: {
      id?: string;
    };
  };
}

export {};
