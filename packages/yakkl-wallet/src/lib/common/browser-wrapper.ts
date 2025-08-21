// $lib/common/browser-wrapper.ts
import type { Browser } from 'webextension-polyfill';

// Detect context
const isBackground = typeof window === 'undefined';
const isClient = typeof window !== 'undefined';

let browserAPI: Browser | null = null;

// Function to create a recursive proxy for nested access
function createProxy(path: string[] = []): any {
	return new Proxy(() => {}, {
		get(target, prop) {
			const currentPath = [...path, prop as string];

			// If browser API is loaded, navigate to the actual property
			if (browserAPI) {
				let obj: any = browserAPI;
				for (const p of currentPath) {
					obj = obj?.[p];
				}
				return obj;
			}

			// Return another proxy for nested access
			return createProxy(currentPath);
		},

		apply(target, thisArg, args) {
			// This handles the actual function call
			return (async () => {
				// Load browser API if not loaded
				if (!browserAPI) {
					browserAPI = await import('webextension-polyfill').then((m) => m.default);
				}

				// Navigate to the actual method
				let obj: any = browserAPI;
				for (let i = 0; i < path.length - 1; i++) {
					obj = obj?.[path[i]];
				}

				// Call the method
				const method = obj?.[path[path.length - 1]];
				if (typeof method === 'function') {
					return method.apply(obj, args);
				}

				throw new Error(`${path.join('.')} is not a function`);
			})();
		}
	});
}

// For background: load immediately
if (isBackground) {
	browserAPI = await import('webextension-polyfill').then((m) => m.default);
}

// Export as default
const browser = isBackground ? browserAPI : createProxy();
export default browser as Browser;


// $lib/common/browser-wrapper.ts
// import type { Browser } from 'webextension-polyfill';

// let browserAPI: Browser;

// Only run in extension contexts
// if (typeof window === 'undefined' || window.location?.protocol?.startsWith('chrome-extension')) {
  // Dynamic import to avoid SSR issues
  // browserAPI = await import('webextension-polyfill').then(m => m.default);
// } else {
  // Not in extension context - create a mock that throws
  // browserAPI = new Proxy({} as Browser, {
    // get() {
  //     throw new Error('Browser API not available outside extension context');
  //   }
  // });
// }

// export default browserAPI;
