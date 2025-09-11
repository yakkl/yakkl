// background/secure-hash-store.ts
import { createSecureStore } from '@yakkl/security';
import { log } from '$lib/common/logger-wrapper';

/**
 * Create a secure store for the background
 * @returns The secure store
 */

// Create store that's completely invisible to DevTools
// Only initialize in browser context, not during SSR

let isGood = typeof globalThis !== 'undefined' && typeof globalThis.browser !== 'undefined';

if (isGood && globalThis) {
  if (globalThis.browser && globalThis.browser.runtime?.id === 'mock-extension-id') {
    isGood = false; // this is a mock extension id, so we don't want to use the secure store
  }
}

const bgMemoryHashStore = isGood
	? createSecureStore(
		{
			hash: '',
			timestamp: 0,
			nonce: typeof globalThis !== 'undefined' && globalThis.crypto 
				? globalThis.crypto.getRandomValues(new Uint8Array(32))
				: new Uint8Array(32) // Fallback for SSR
		},
		{
			backgroundOnly: true,
			encrypted: true,
			audit: true
		}
	)
	: null;

/**
 * Set the misc store
 * @param hash The hash to set
 */
export function setMiscStore(hash: string) {
	if (!bgMemoryHashStore) {
		log.warn('bgMemoryHashStore not initialized (SSR context)');
		return;
	}
	if (typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined') {
		bgMemoryHashStore.set({ hash, timestamp: Date.now(), nonce: globalThis.crypto.getRandomValues(new Uint8Array(32)) });
	}
}

// Secure getter with additional validation
/**
 * Get the misc store
 * @returns The misc store
 */
export async function getMiscStore(): Promise<string | null> {
	try {
    if (!bgMemoryHashStore) {
      log.warn('bgMemoryHashStore is not set (SSR context)');
      return null;
    }
		// Additional runtime checks
		if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
			throw new Error('Not in extension context');
		}

		// Check for debugger
		if ((chrome as any).debugger?.isAttached?.()) {
			throw new Error('Debugger detected');
		}

		// Anti-tampering check
		const startTime = performance.now();
		try {
			const value = await bgMemoryHashStore.get();
			const elapsed = performance.now() - startTime;

			// If getting value takes too long, might be intercepted
			if (elapsed > 1) {
				log.warn('Potential interception detected');
			}
			return value.hash;
		} catch (error) {
			log.warn('Error getting misc store');
			return null;
		}
	} catch (error) {
		log.warn('Security violation');
		return null;
	}
}

// Note: Removed module-level subscription and update that was causing issues in UI contexts
// Any initialization should be done explicitly by the background context when needed

/**
 * Subscribe to hash changes
 * @returns Unsubscribe function
 */
export function subscribeToHashChanges(callback: (hash: string) => void): () => void {
  if (!bgMemoryHashStore) {
    log.warn('bgMemoryHashStore not initialized (SSR context)');
    return () => {}; // Return no-op unsubscribe
  }
  return bgMemoryHashStore.subscribe((value) => {
    callback(value.hash);
  });
}


