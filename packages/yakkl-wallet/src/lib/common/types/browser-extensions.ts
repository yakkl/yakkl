// import type { Browser as WebExtensionBrowser } from '$lib/types/browser-types';

// // Define the side panel interface
// interface SidePanelAPI {
// 	open(options: { url: string; width?: number }): Promise<void>;
// }

// // Define the extended browser interface without recursion
// export interface ExtendedBrowser extends WebExtensionBrowser {
// 	sidePanel?: SidePanelAPI;
// }

// // Extend the webextension-polyfill module
// declare module 'webextension-polyfill' {
// 	interface Extension {
// 		ViewType: {
// 			side_panel: string;
// 		};
// 	}
// }
