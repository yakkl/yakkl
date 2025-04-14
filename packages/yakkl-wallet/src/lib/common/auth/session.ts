// File: src/lib/auth/session.ts
import { writable, get } from 'svelte/store';
import { log } from '$plugins/Logger';
import { browser_ext, browserSvelte } from '../environment';
import type { SessionToken } from '../interfaces';
import type { StoreHashResponse } from '../interfaces';

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

export async function storeSessionToken(token: string, expiresAt: number, override: boolean = true): Promise<SessionToken | null> {
  if (override) {
    sessionToken.set(token);
    sessionExpiresAt.set(expiresAt);
    startExpiryCountdown(expiresAt);
    return { token, expiresAt };
  } else {
    return null;
  }
}

export async function storeEncryptedHash(encryptedHash: string): Promise<SessionToken | null> {
  try {
    if (browserSvelte) {
      if (!encryptedHash) {
        log.warn('No encrypted hash provided', false, { encryptedHash });
        return null;
      }
      const res: StoreHashResponse = await browser_ext.runtime.sendMessage({
        type: 'STORE_SESSION_HASH',
        payload: encryptedHash
      });
      if (res && res.token && res.expiresAt) {
        storeSessionToken(res.token, res.expiresAt);
        log.debug('Session token stored', false, res);
        return { token: res.token, expiresAt: res.expiresAt };
      } else {
        log.warn('Session token storage failed', false, res);
        return null;
      }
    }
  } catch (error) {
    log.error('Error storing encrypted hash', false, error);
    return null;
  }
}

export async function refreshSession(currentToken: string): Promise<SessionToken | null> {
  try {
    if (browserSvelte) {
      const res: StoreHashResponse = await browser_ext.runtime.sendMessage({
        type: 'REFRESH_SESSION',
        token: currentToken
      });

      if (res.token && res.expiresAt) {
        storeSessionToken(res.token, res.expiresAt);
        log.debug('Session refreshed', false, res);
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

