// // Mock webextension-polyfill for SSR and client-side fallback
// // This prevents the actual polyfill from loading during server-side rendering
// // and provides a fallback when the polyfill isn't available as an ES module




// // Check if we're in a browser context and the global browser object exists
// const getBrowserAPI = () => {
// 	// Server-side: return mock
// 	if (typeof window === 'undefined') {
// 		return createMockBrowser();
// 	}

// 	// Client-side: try to use the real browser API if available
// 	if (typeof window !== 'undefined') {
// 		// Check if browser polyfill was loaded via script tag
// 		if (window.browser && window.browser.runtime) {
// 			console.log('[polyfill-mock] Using window.browser API');
// 			return window.browser;
// 		}
// 		// Check for chrome API - use it directly since it's already compatible
// 		if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) {
// 			console.log('[polyfill-mock] Using window.chrome API');
// 			// Chrome API is available - wrap it to match browser API interface
// 			return window.chrome;
// 		}
// 	}

// 	console.warn('[polyfill-mock] No browser API found, using mock');
// 	// Fallback to mock
// 	return createMockBrowser();
// };

// function createMockBrowser() {
// 	return {
// 		runtime: {
// 			connect: () => ({
// 				onDisconnect: { addListener: () => {} },
// 				postMessage: () => {},
// 				disconnect: () => {}
// 			}),
// 			sendMessage: () => Promise.resolve({}),
// 			onMessage: {
// 				addListener: () => {},
// 				removeListener: () => {},
// 				hasListener: () => false
// 			},
// 			getURL: (path) => 'chrome-extension://mock/' + path,
// 			id: 'mock-extension-id'
// 		},
// 		storage: {
// 			local: {
// 				get: () => Promise.resolve({}),
// 				set: () => Promise.resolve(),
// 				remove: () => Promise.resolve(),
// 				clear: () => Promise.resolve()
// 			},
// 			sync: {
// 				get: () => Promise.resolve({}),
// 				set: () => Promise.resolve(),
// 				remove: () => Promise.resolve(),
// 				clear: () => Promise.resolve()
// 			}
// 		},
// 		tabs: {
// 			query: () => Promise.resolve([]),
// 			create: () => Promise.resolve({}),
// 			update: () => Promise.resolve({})
// 		},
// 		windows: {
// 			create: () => Promise.resolve({}),
// 			update: () => Promise.resolve({})
// 		}
// 	};
// }

// const browserAPI = getBrowserAPI();

// // Export for both CommonJS and ES modules
// if (typeof module !== 'undefined' && module.exports) {
// 	// CommonJS
// 	module.exports = browserAPI;
// 	module.exports.default = browserAPI;
// 	module.exports.runtime = browserAPI.runtime;
// 	module.exports.storage = browserAPI.storage;
// 	module.exports.tabs = browserAPI.tabs;
// 	module.exports.windows = browserAPI.windows;
// }

// // ES module exports
// export default browserAPI;
// export const runtime = browserAPI.runtime;
// export const storage = browserAPI.storage;
// export const tabs = browserAPI.tabs;
// export const windows = browserAPI.windows;
