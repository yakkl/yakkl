// File: src/lib/auth/session.ts
import { writable, get } from 'svelte/store';
import { log } from '$lib/common/logger-wrapper';
// import { getBrowserExtFromGlobal } from '../environment';
import type { SessionToken } from '../interfaces';
import type { StoreHashResponse } from '../interfaces';

import type { Browser } from 'webextension-polyfill';

let browser: Browser | null = null;

if (typeof window === 'undefined') {
	browser = await import('webextension-polyfill');
} else {
	browser = await import('$lib/common/environment').then(m => m.browser_ext);
}

// This is for svelte client side only
export const sessionToken = writable<string | null>(null);
export const sessionExpiresAt = writable<number | null>(null);

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function startExpiryCountdown(expiresAt: number) {
	try {
		const timeout = expiresAt - Date.now();

		// This line checks if there's an existing timer and clears it
		if (expiryTimer) clearTimeout(expiryTimer);

		// If the new expiry time is in the future, set a new timer
		if (timeout > 0) {
			expiryTimer = setTimeout(() => {
				sessionToken.set(null);
				sessionExpiresAt.set(null);
				log.info('Session expired automatically');
			}, timeout);
			// log.debug('Expiry countdown set', false, { timeout });
		}
	} catch (error) {
		log.error('Error starting expiry countdown', false, error);
	}
}

export async function storeSessionToken(
	token: string,
	expiresAt: number,
	override: boolean = true
): Promise<SessionToken | null> {
	if (override) {
		sessionToken.set(token);
		sessionExpiresAt.set(expiresAt);
		startExpiryCountdown(expiresAt);
		return { token, expiresAt };
	} else {
		return null;
	}
}

export async function storeEncryptedHash(encryptedHash: string, profileData?: { userId?: string; username?: string; profileId?: string }): Promise<SessionToken | null> {
  if (!browser) {
    log.error('Browser API not available', false);
    return null;
  }

	// Retry configuration
	const MAX_RETRIES = 2;
	const RETRY_DELAY = 500; // 500ms

  // Fallback: wait for SESSION_TOKEN_BROADCAST if direct response is missing
  const waitForBroadcast = async (timeoutMs = 1000): Promise<SessionToken | null> => {
    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const listener = (message: any) => {
        try {
          if (message?.type === 'SESSION_TOKEN_BROADCAST' && message?.token && message?.expiresAt) {
            if (timeoutId) clearTimeout(timeoutId);
            browser.runtime.onMessage.removeListener(listener as any);
            storeSessionToken(message.token, message.expiresAt);
            log.info('Session token stored from broadcast', false, { expiresAt: message.expiresAt });
            console.log('[storeEncryptedHash] Session token stored from broadcast', { expiresAt: message.expiresAt });
            resolve({ token: message.token, expiresAt: message.expiresAt });
          }
        } catch {
          // ignore
        }
      };
      browser.runtime.onMessage.addListener(listener as any);
      timeoutId = setTimeout(() => {
        try { browser.runtime.onMessage.removeListener(listener as any); } catch {}
        resolve(null);
      }, timeoutMs);
    });
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
      if (!encryptedHash) {
        log.warn('No encrypted hash provided', false, { encryptedHash });
        return null;
      }

      // Add timeout to prevent hanging
      const messagePromise = browser.runtime.sendMessage({
        type: 'STORE_SESSION_HASH',
        payload: encryptedHash,
        profileData: profileData
      }) as Promise<StoreHashResponse>;

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Message timeout')), 3000)
      );

      const res = await Promise.race([messagePromise, timeoutPromise]);

      console.log(`[storeEncryptedHash] Attempt ${attempt} - Background response:`, res, await messagePromise);

      if (res && (res as any).token && (res as any).expiresAt) {
        storeSessionToken(res.token, res.expiresAt);
        log.info('Session token stored', false, res);
        console.log(`[storeEncryptedHash] Attempt ${attempt} - Session token stored successfully`);
        return { token: res.token, expiresAt: res.expiresAt };
      } else {
        log.warn(`Session token storage failed on attempt ${attempt} (trying broadcast fallback)`, false, res);

        // Try fallback: listen for broadcast sent by background after handling STORE_SESSION_HASH
        const broadcastToken = await waitForBroadcast(1000);
        if (broadcastToken) {
          return broadcastToken;
        }

        // If this isn't the last attempt, continue to retry
        if (attempt < MAX_RETRIES) {
          console.log(`[storeEncryptedHash] Retrying in ${RETRY_DELAY}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        return null;
      }
		} catch (error) {
			log.error(`Error storing encrypted hash on attempt ${attempt}`, false, error);

			// If this isn't the last attempt, retry
			if (attempt < MAX_RETRIES) {
				console.log(`[storeEncryptedHash] Retrying in ${RETRY_DELAY}ms due to error...`);
				await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
				continue;
			}

			// Final attempt failed
			return null;
		}
	}

	// Should never reach here, but just in case
	return null;
}

export async function refreshSession(currentToken: string): Promise<SessionToken | null> {
	try {
		if (typeof window !== 'undefined') {
			// Ensure browser API is initialized before use
			// const browserApi = await getBrowserExtFromGlobal();
			// if (!browserApi) {
			// 	log.error('Browser API not available for refresh', false);
			// 	return null;
			// }

			const res: StoreHashResponse = await browser.runtime.sendMessage({
				type: 'REFRESH_SESSION',
				token: currentToken
			});

			if (res.token && res.expiresAt) {
				storeSessionToken(res.token, res.expiresAt);
				log.info('Session refreshed', false, res);
				return { token: res.token, expiresAt: res.expiresAt };
			} else {
				log.warn('Session refresh failed or token invalid', false, res);
				storeSessionToken(null, null, false);
				return null;
			}
		}
	} catch (error) {
		log.error('Error refreshing session', false, error);
		return null;
	}
}

export async function verifySessionToken(token: string): Promise<boolean> {
	try {
		if (!token) {
			log.warn('No token provided for verification', false);
			return false;
		}

		const currentToken = get(sessionToken);
		const currentExpiresAt = get(sessionExpiresAt);

		if (!currentToken || !currentExpiresAt) {
			log.warn('No active session found', false);
			return false;
		}

		if (currentToken !== token) {
			log.warn('Token mismatch', false);
			return false;
		}

		if (Date.now() >= currentExpiresAt) {
			log.warn('Session expired', false);
			sessionToken.set(null);
			sessionExpiresAt.set(null);
			return false;
		}

		return true;
	} catch (error) {
		log.error('Error verifying session token', false, error);
		return false;
	}
}
