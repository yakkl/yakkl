// vite-plugin-mock-browser-polyfill.js
export default function mockBrowserPolyfill() {
  return {
    name: 'mock-browser-polyfill',
    enforce: 'pre', // Run before other plugins
    resolveId(id, importer) {
      // Check if the import is for webextension-polyfill
      if (id === 'webextension-polyfill' || id.includes('webextension-polyfill')) {
        console.log(`[mock-browser-polyfill] Intercepting import: ${id} from ${importer}`);
        // Return a custom id that our plugin will handle
        return 'virtual:browser-polyfill-mock';
      }
      return null;
    },
    load(id) {
      // If this is our special ID, return a mock implementation
      if (id === 'virtual:browser-polyfill-mock') {
        console.log('[mock-browser-polyfill] Loading mock implementation');
        return `
          // Mock browser polyfill for SSR
          const mockBrowser = {
            runtime: {
              connect: () => ({
                onDisconnect: { addListener: () => {} },
                postMessage: () => {},
                disconnect: () => {}
              }),
              sendMessage: () => Promise.resolve({}),
              onMessage: {
                addListener: () => {},
                removeListener: () => {},
                hasListener: () => false
              },
              getURL: (path) => 'chrome-extension://mock/' + path,
              id: 'mock-extension-id'
            },
            storage: {
              local: {
                get: () => Promise.resolve({}),
                set: () => Promise.resolve(),
                remove: () => Promise.resolve(),
                clear: () => Promise.resolve()
              },
              sync: {
                get: () => Promise.resolve({}),
                set: () => Promise.resolve(),
                remove: () => Promise.resolve(),
                clear: () => Promise.resolve()
              }
            },
            tabs: {
              query: () => Promise.resolve([]),
              create: () => Promise.resolve({}),
              update: () => Promise.resolve({})
            },
            windows: {
              create: () => Promise.resolve({}),
              update: () => Promise.resolve({})
            }
          };
          
          export default mockBrowser;
          
          // Also export as named exports for compatibility
          export const runtime = mockBrowser.runtime;
          export const storage = mockBrowser.storage;
          export const tabs = mockBrowser.tabs;
          export const windows = mockBrowser.windows;
        `;
      }
      return null;
    }
  };
}
