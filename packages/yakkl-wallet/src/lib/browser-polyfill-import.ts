// // Browser polyfill import wrapper that handles both SSR and client-side contexts
// // This file provides a proper ES module interface for webextension-polyfill

// import type { BrowserAPI } from './types/browser-types';

// // Check if we're in an extension context
// function isExtensionContext(): boolean {
//   if (typeof window === 'undefined') return false;

//   try {
//     // Check for chrome extension URL
//     if (window.location.protocol === 'chrome-extension:') return true;
//     if (window.location.protocol === 'moz-extension:') return true;

//     // Check for chrome.runtime
//     if ((window as any).chrome && (window as any).chrome.runtime && (window as any).chrome.runtime.id) {
//       return true;
//     }

//     return false;
//   } catch {
//     return false;
//   }
// }

// // During build time, this will work with the polyfill-mock.js
// // At runtime in the extension, we'll use the globally loaded polyfill
// let browser: BrowserAPI;

// if (typeof window !== 'undefined') {
//   // Client-side: Use the globally loaded browser API
//   if ((window as any).browser && (window as any).browser.runtime) {
//     browser = (window as any).browser;
//   } else if ((window as any).chrome && (window as any).chrome.runtime) {
//     // Use chrome API directly - it's compatible with the browser API for most uses
//     browser = (window as any).chrome as any;
//   } else if (isExtensionContext()) {
//     // We're in an extension but the API isn't loaded yet
//     // This can happen if the polyfill script hasn't executed yet
//     console.warn('[browser-polyfill-import] Extension context detected but browser API not yet available');

//     // Create a proxy that will lazily access the API when it's available
//     browser = new Proxy({} as BrowserAPI, {
//       get(_target, prop) {
//         const realBrowser = (window as any).browser || (window as any).chrome;
//         if (realBrowser && realBrowser[prop]) {
//           return realBrowser[prop];
//         }

//         // Special handling for common properties
//         if (prop === 'runtime' || prop === 'storage' || prop === 'tabs' || prop === 'windows') {
//           // Return another proxy for nested access
//           return new Proxy({}, {
//             get(_innerTarget, innerProp) {
//               const api = realBrowser?.[prop];
//               if (api && api[innerProp]) {
//                 return api[innerProp];
//               }
//               return undefined;
//             }
//           });
//         }

//         return undefined;
//       }
//     });
//   } else {
//     // Not in an extension context - use mock
//     console.log('[browser-polyfill-import] Not in extension context, using mock API');
//     browser = createMockBrowser() as any;
//   }
// } else {
//   // Server-side: Return mock
//   browser = createMockBrowser() as any;
// }

// // Mock browser API for non-extension contexts
// function createMockBrowser(): BrowserAPI {
//   return {
//     runtime: {
//       id: 'mock-extension-id',
//       getManifest: () => ({ version: '1.0.0', name: 'Mock Extension' }),
//       getURL: (path: string) => `chrome-extension://mock/${path}`,
//       sendMessage: () => Promise.resolve({}),
//       connect: () => ({
//         name: 'mock-port',
//         onDisconnect: {
//           addListener: () => {},
//           removeListener: () => {},
//           hasListener: () => false
//         },
//         onMessage: {
//           addListener: () => {},
//           removeListener: () => {},
//           hasListener: () => false
//         },
//         postMessage: () => {},
//         disconnect: () => {}
//       }),
//       onMessage: {
//         addListener: () => {},
//         removeListener: () => {},
//         hasListener: () => false
//       },
//       onConnect: {
//         addListener: () => {},
//         removeListener: () => {},
//         hasListener: () => false
//       },
//       onInstalled: {
//         addListener: () => {},
//         removeListener: () => {},
//         hasListener: () => false
//       },
//       getPlatformInfo: () => Promise.resolve({ os: 'mac', arch: 'x86-64' })
//     },
//     storage: {
//       local: {
//         get: () => Promise.resolve({}),
//         set: () => Promise.resolve(),
//         remove: () => Promise.resolve(),
//         clear: () => Promise.resolve()
//       },
//       sync: {
//         get: () => Promise.resolve({}),
//         set: () => Promise.resolve(),
//         remove: () => Promise.resolve(),
//         clear: () => Promise.resolve()
//       }
//     },
//     tabs: {
//       get: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
//       query: () => Promise.resolve([]),
//       create: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
//       update: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
//       remove: () => Promise.resolve(),
//       sendMessage: () => Promise.resolve({})
//     },
//     windows: {
//       WINDOW_ID_CURRENT: -2,
//       create: () => Promise.resolve({ id: 1, focused: true }),
//       update: () => Promise.resolve({ id: 1, focused: true }),
//       get: () => Promise.resolve({ id: 1, focused: true }),
//       getCurrent: () => Promise.resolve({ id: 1, focused: true }),
//       getAll: () => Promise.resolve([]),
//       remove: () => Promise.resolve(),
//       onRemoved: {
//         addListener: () => {},
//         removeListener: () => {},
//         hasListener: () => false
//       }
//     }
//   };
// }

// // Helper function to wait for browser API and then dynamically import a module
// export async function importWithBrowserAPI<T>(moduleImporter: () => Promise<T>): Promise<T> {
//   // Wait for the browser API to be ready if we're in an extension context
//   if (typeof window !== 'undefined' && isExtensionContext()) {
//     // Wait for the polyfill to be loaded
//     if (window.__browserPolyfillReady) {
//       await window.__browserPolyfillReady;
//     }

//     // Double-check that the API is now available
//     const api = (window as any).browser || (window as any).chrome;
//     if (!api || !api.runtime) {
//       console.warn('[browser-polyfill-import] Browser API still not available after waiting');
//     }
//   }

//   // Now import the module
//   return moduleImporter();
// }

// // Helper to ensure browser API is ready
// export async function ensureBrowserAPI(): Promise<BrowserAPI> {
//   if (typeof window !== 'undefined' && isExtensionContext() && window.__browserPolyfillReady) {
//     await window.__browserPolyfillReady;

//     // Re-check and update the browser reference
//     if ((window as any).browser && (window as any).browser.runtime) {
//       browser = (window as any).browser;
//     } else if ((window as any).chrome && (window as any).chrome.runtime) {
//       browser = (window as any).chrome as any;
//     }
//   }

//   return browser;
// }

// export default browser;
// export { browser };

// // Re-export common APIs for convenience
// export const runtime = browser.runtime;
// export const storage = browser.storage;
// export const tabs = browser.tabs;
// export const windows = browser.windows;
