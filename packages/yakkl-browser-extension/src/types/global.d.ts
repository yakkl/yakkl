/// <reference types="webextension-polyfill" />

declare global {
  interface Window {
    browser: typeof import('webextension-polyfill');
  }
  
  // For service worker context
  interface ServiceWorkerGlobalScope {
    browser: typeof import('webextension-polyfill');
  }
  
  const browser: typeof import('webextension-polyfill');
}

export {};