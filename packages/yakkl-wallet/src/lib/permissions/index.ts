// src/lib/permissions/index.ts

// Re-export the main functions and types
export * from './types';
export * from './storage';
export * from './security';
export * from './handlers';

// Main initialization function
import { log } from '$lib/managers/Logger';

/**
 * Initialize the permissions system
 */
export function initializePermissions(): void {
	try {
		// Set up message listener for permission responses from popups
		// browser.runtime.onMessage.addListener((
		//   message: unknown,
		//   sender: browser.Runtime.MessageSender,
		//   sendResponse: (response?: any) => void
		// ): any => {
		//   try {
		//     // Type guard for message
		//     if (!message || typeof message !== 'object') {
		//       return false;
		//     }

		//     // Use type assertion with proper checks
		//     const msg = message as Record<string, unknown>;

		//     if (msg.type === 'WALLET_PERMISSION_RESPONSE' &&
		//         typeof msg.requestId === 'string') {

		//       const requestId = msg.requestId;
		//       const approved = Boolean(msg.approved);
		//       const accounts = Array.isArray(msg.accounts) ? msg.accounts : [];

		//       if (approved) {
		//         // Resolve the permission request
		//         resolvePermissionRequest(requestId, { approved, accounts });
		//       } else {
		//         // Reject the permission request
		//         rejectPermissionRequest(requestId, 'User rejected the request');
		//       }

		//       sendResponse({ success: true });
		//       return true;
		//     }

		//     // Always return a Promise for unhandled messages
		//     return false;
		//   } catch (error) {
		//     log.error('Error handling permission response', false, error);
		//     return false;
		//   }
		// });

		// Optional: Clean expired permissions every hour
		setInterval(
			async () => {
				try {
					// This leverages getAllPermissions() which already cleans expired ones
					await import('./storage').then((m) => m.getAllPermissions());
				} catch (error) {
					log.error('Error cleaning expired permissions', false, error);
				}
			},
			60 * 60 * 1000
		);
	} catch (error) {
		log.error('Failed to initialize permissions system', false, error);
	}
}
