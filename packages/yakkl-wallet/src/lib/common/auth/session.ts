// File: src/lib/auth/session.ts
import { writable } from 'svelte/store';
import { log } from '$plugins/Logger';
import { browser_ext, browserSvelte } from '../environment';
import type { SessionToken } from '../interfaces';
import type { StoreHashResponse } from '../interfaces';

export const sessionToken = writable<string | null>(null);
export const sessionExpiresAt = writable<number | null>(null);

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

function startExpiryCountdown(expiresAt: number) {
  const timeout = expiresAt - Date.now();
  if (expiryTimer) clearTimeout(expiryTimer);
  if (timeout > 0) {
    expiryTimer = setTimeout(() => {
      sessionToken.set(null);
      sessionExpiresAt.set(null);
      log.warn('Session expired automatically');
    }, timeout);
    log.debug('Expiry countdown set', false, { timeout });
  }
}

export async function storeEncryptedHash(encryptedHash: string): Promise<SessionToken | null> {
  try {
    if (browserSvelte) {
      const res: StoreHashResponse = await browser_ext.runtime.sendMessage({
        type: 'STORE_HASH',
        payload: encryptedHash
      });

      if (res.success) {
        sessionToken.set(res.token);
        sessionExpiresAt.set(res.expiresAt);
        startExpiryCountdown(res.expiresAt);
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
        sessionToken.set(res.token);
        sessionExpiresAt.set(res.expiresAt);
        startExpiryCountdown(res.expiresAt);
        log.debug('Session refreshed', false, res);
        return { token: res.token, expiresAt: res.expiresAt };
      } else {
        log.warn('Session refresh failed or token invalid', false, res);
        sessionToken.set(null);
        sessionExpiresAt.set(null);
        return null;
      }
    }
  } catch (error) {
    log.error('Error refreshing session', false, error);
    return null;
  }
}

