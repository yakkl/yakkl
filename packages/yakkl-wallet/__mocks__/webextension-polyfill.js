// @ts-nocheck
// Mock implementation of the webextension-polyfill
const mockBrowser = {
	runtime: {
		id: 'mock-extension-id',
		getManifest: () => ({ version: '1.0.0', name: 'Mock Extension' }),
		getURL: (path) => `chrome-extension://mock-extension-id/${path}`,
		connect: () => ({
			name: 'mock-port',
			disconnect: () => {},
			postMessage: () => {},
			onMessage: {
				addListener: () => {},
				removeListener: () => {},
				hasListener: () => false
			},
			onDisconnect: {
				addListener: () => {},
				removeListener: () => {},
				hasListener: () => false
			}
		}),
		sendMessage: () => Promise.resolve({}),
		getPlatformInfo: () => Promise.resolve({ os: 'mac', arch: 'x86-64' }),
		onMessage: {
			addListener: () => {},
			removeListener: () => {},
			hasListener: () => false
		},
		onConnect: {
			addListener: () => {},
			removeListener: () => {},
			hasListener: () => false
		},
		onInstalled: {
			addListener: () => {},
			removeListener: () => {},
			hasListener: () => false
		}
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
		get: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
		query: () => Promise.resolve([]),
		create: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
		update: () => Promise.resolve({ id: 1, index: 0, windowId: 1, active: true }),
		remove: () => Promise.resolve(),
		sendMessage: () => Promise.resolve({})
	},
	windows: {
		WINDOW_ID_CURRENT: -2,
		create: () => Promise.resolve({ id: 1, focused: true }),
		update: () => Promise.resolve({ id: 1, focused: true }),
		get: () => Promise.resolve({ id: 1, focused: true }),
		getCurrent: () => Promise.resolve({ id: 1, focused: true }),
		getAll: () => Promise.resolve([]),
		remove: () => Promise.resolve(),
		onRemoved: {
			addListener: () => {},
			removeListener: () => {},
			hasListener: () => false
		}
	}
};

module.exports = mockBrowser;