// vite-plugin-mock-browser-polyfill.js
export default function mockBrowserPolyfill() {
  return {
    name: 'mock-browser-polyfill',
    resolveId(id) {
      // Check if the import is for webextension-polyfill
      if (id === 'webextension-polyfill' || id.includes('webextension-polyfill/')) {
        // Return a custom id that our plugin will handle
        return 'virtual:browser-polyfill-mock';
      }
      return null;
    },
    load(id) {
      // If this is our special ID, return a mock implementation
      if (id === 'virtual:browser-polyfill-mock') {
        return `
          console.log('Using mock browser polyfill for SSR');
          export default {
            /* Mock browser API methods */
            runtime: {
              connect: () => ({}),
              sendMessage: () => Promise.resolve({}),
              onMessage: {
                addListener: () => {},
                removeListener: () => {},
                hasListener: () => false
              }
            },
            /* Add other APIs as needed */
            storage: {
              local: {
                get: () => Promise.resolve({}),
                set: () => Promise.resolve()
              },
              sync: {
                get: () => Promise.resolve({}),
                set: () => Promise.resolve()
              }
            },
            tabs: {
              query: () => Promise.resolve([])
            }
          };
        `;
      }
      return null;
    }
  };
}
