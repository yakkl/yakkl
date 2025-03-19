// src/lib/permissions/index.ts

// Re-export the main functions and types
export * from './types';
export * from './storage';
export * from './security';
export * from './handlers';

import { resolvePermissionRequest, rejectPermissionRequest } from './handlers';
// Main initialization function
import { log } from "$lib/plugins/Logger";
import browser from "webextension-polyfill";

/**
 * Initialize the permissions system
 */
export function initializePermissions(): void {
  try {
    log.info('Initializing wallet permissions system');

    // Set up message listener for permission responses from popups
    browser.runtime.onMessage.addListener((
      message: unknown,
      sender: browser.Runtime.MessageSender,
      sendResponse: (response?: any) => void
    ): true | Promise<unknown> => {
      try {
        // Type guard for message
        if (!message || typeof message !== 'object') {
          return Promise.resolve(undefined);
        }

        // Use type assertion with proper checks
        const msg = message as Record<string, unknown>;

        if (msg.type === 'WALLET_PERMISSION_RESPONSE' &&
            typeof msg.requestId === 'string') {

          const requestId = msg.requestId;
          const approved = Boolean(msg.approved);
          const accounts = Array.isArray(msg.accounts) ? msg.accounts : [];

          if (approved) {
            // Resolve the permission request
            resolvePermissionRequest(requestId, { approved, accounts });
          } else {
            // Reject the permission request
            rejectPermissionRequest(requestId, 'User rejected the request');
          }

          sendResponse({ success: true });
          return true;
        }

        // Always return a Promise for unhandled messages
        return Promise.resolve(undefined);
      } catch (error) {
        log.error('Error handling permission response', false, error);
        return Promise.resolve(undefined);
      }
    });

    // Optional: Clean expired permissions every hour
    setInterval(async () => {
      try {
        // This leverages getAllPermissions() which already cleans expired ones
        await import('./storage').then(m => m.getAllPermissions());
      } catch (error) {
        log.error('Error cleaning expired permissions', false, error);
      }
    }, 60 * 60 * 1000);

  } catch (error) {
    log.error('Failed to initialize permissions system', false, error);
  }
}
