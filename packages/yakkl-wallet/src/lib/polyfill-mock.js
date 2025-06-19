// Mock webextension-polyfill for SSR
// This prevents the actual polyfill from loading during server-side rendering

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

// Export as both default and named exports for compatibility
module.exports = mockBrowser;
module.exports.default = mockBrowser;

// Also define exports for ES modules
if (typeof exports !== 'undefined') {
  exports.runtime = mockBrowser.runtime;
  exports.storage = mockBrowser.storage;
  exports.tabs = mockBrowser.tabs;
  exports.windows = mockBrowser.windows;
}