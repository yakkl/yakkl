// File: src/background/secureListener.ts
import { log } from '$plugins/Logger';
import browser from 'webextension-polyfill';
import type { SessionToken } from '$lib/common/interfaces';
import { decryptData, encryptData } from '$lib/common/encryption';

let sessionToken: SessionToken | null = null;
let memoryHash: string | null = null;

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

function generateSessionToken(): SessionToken {
  const token = crypto.randomUUID();
  const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
  log.debug('Generated new session token', false, { token, expiresAt });
  return { token, expiresAt };
}

function clearSession(reason: string) {
  log.warn(`Session cleared: ${reason}`);
  sessionToken = null;
  memoryHash = null;
}

browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  // Return true to indicate we'll respond asynchronously
  const handleMessage = async () => {
    try {
      if (!message || typeof message !== 'object') return;

      switch (message.type) {
        case 'STORE_HASH': {
          if (!message.payload || typeof message.payload !== 'string') {
            sendResponse({ error: 'Invalid payload' });
            return;
          }
          memoryHash = message.payload;
          sessionToken = generateSessionToken();
          sendResponse({
            success: true,
            token: sessionToken.token,
            expiresAt: sessionToken.expiresAt
          });
          return;
        }

        case 'REFRESH_SESSION': {
          if (sessionToken && message.token === sessionToken.token) {
            sessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
            log.debug('Session refreshed');
            sendResponse({
              token: sessionToken.token,
              expiresAt: sessionToken.expiresAt
            });
          } else {
            clearSession('Invalid or expired refresh request');
            sendResponse({ error: 'Unauthorized' });
          }
          return;
        }

        case 'DECRYPT_DATA': {
          if (!sessionToken || Date.now() > sessionToken.expiresAt) {
            clearSession('Token expired or missing');
            sendResponse({ error: 'Session expired' });
            return;
          }
          if (message.token !== sessionToken.token) {
            log.warn('Invalid session token used for decryption');
            sendResponse({ error: 'Unauthorized' });
            return;
          }
          if (!memoryHash || typeof message.payload !== 'string') {
            log.warn('Missing decryption payload or memory hash');
            sendResponse({ error: 'Decryption failed' });
            return;
          }

          // Your actual decryption logic should be implemented here
          const decrypted = await decryptData(message.payload, memoryHash);
          sendResponse({ data: decrypted });
          return;
        }

        case 'ENCRYPT_DATA': {
          if (!sessionToken || Date.now() > sessionToken.expiresAt) {
            clearSession('Token expired or missing');
            sendResponse({ error: 'Session expired' });
            return;
          }
          if (message.token !== sessionToken.token) {
            log.warn('Invalid session token used for encryption');
            sendResponse({ error: 'Unauthorized' });
            return;
          }
          if (!memoryHash || typeof message.payload !== 'string') {
            log.warn('Missing encryption payload or memory hash');
            sendResponse({ error: 'Encryption failed' });
            return;
          }

          const encrypted = await encryptData(message.payload, memoryHash);
          sendResponse({ data: encrypted });
          return;
        }
        
        default: {
          log.debug('Unhandled message type', message.type);
          sendResponse({ error: 'Unknown request type' });
          return;
        }
      }
    } catch (error) {
      console.error('Error in secureListener:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
    }
  };

  handleMessage();
  return true; // Required for async response
});
