// import type { BrowserAPI } from '$lib/types/browser-types';

// declare global {
  // interface Window {
    // browser?: BrowserAPI;
    // browserPolyfill?: BrowserAPI;
    // chrome?: any;
    // __browserPolyfillReady?: Promise<void>;
  // }

  // Also declare browser as a global variable for extension contexts
  // const browser: BrowserAPI | undefined;
  // const chrome: any;
// }
// src/app.d.ts (or create src/global.d.ts)

// src/types/browser-extension.d.ts

// import type { Browser } from 'webextension-polyfill';

// declare global {
// 	interface Window {
// 		chrome?: Browser;
// 		browser?: Browser;
// 	}

// 	var chrome: Browser | undefined;
// 	var browser: Browser | undefined;
// }

// export {};
