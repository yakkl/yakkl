import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { lockWalletBackground } from '../utils/lockWalletBackground';
import type { SessionToken } from '$lib/common/interfaces';
import { IdleManager } from '$lib/managers/IdleManager';
import { backgroundJWTValidator } from '@yakkl/security';
import { setMiscStore } from '../security/secure-hash-store';
import { BackgroundIntervalService } from '$lib/services/background-interval.service';
import { backgroundProviderManager } from '../services/provider-manager';
import { stopLockIconTimer } from '$contexts/background/extensions/chrome/iconTimer';

// Session token management
let bgMemoryHash: string | null = null; // Used in STORE_SESSION_HASH and REFRESH_SESSION handlers
let bgSessionToken: SessionToken | null = null;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// In-memory JWT storage (secure, not persisted, cleared on browser restart)
let jwtToken: string | null = null;
let jwtExpiry: number = 0;
let loginTime: number = 0;
let userId: string | null = null;
let username: string | null = null;
let profileId: string | null = null;
let planLevel: string | null = null;

function generateSessionToken(): SessionToken {
  const now = Date.now();
  const token = `yakkl_${now}_${Math.random().toString(36).substring(2, 15)}`;
  const expiresAt = now + SESSION_TIMEOUT_MS;
  return { token, expiresAt };
}

// Session state management
const sessionState = {
  loginVerified: new Map<string, boolean>(),
  idleStatus: {
    isIdle: false,
    lastActivity: Date.now(),
    threshold: 120000, // 2 minutes default
    lockDelay: 60000 // 60 seconds default
  }
};

function setLoginVerified(verified: boolean, contextId?: string): void {
  const id = contextId || 'default';
  sessionState.loginVerified.set(id, verified);
  log.info('[SessionHandler] Login verification set:', false, { verified, contextId: id });
}

function getIdleStatus() {
  return {
    isIdle: sessionState.idleStatus.isIdle,
    isLoginVerified: sessionState.loginVerified.get('default') || false,
    lastActivity: sessionState.idleStatus.lastActivity,
    timeSinceLastActivity: Date.now() - sessionState.idleStatus.lastActivity,
    threshold: sessionState.idleStatus.threshold,
    lockDelay: sessionState.idleStatus.lockDelay,
    contextCount: sessionState.loginVerified.size,
    protectedContextCount: Array.from(sessionState.loginVerified.values()).filter(v => v).length
  };
}

export const sessionHandlers = new Map<string, MessageHandlerFunc>([
  ['STORE_SESSION_HASH', async (payload): Promise<MessageResponse> => {
    try {
      console.log('[SessionHandler] STORE_SESSION_HASH called with:', {
        payloadType: typeof payload,
        payloadLength: payload?.length
      });

      if (!payload || typeof payload !== 'string') {
        log.warn('[SessionHandler] Invalid payload for STORE_SESSION_HASH', false);
        return { success: false, error: 'Invalid payload' };
      }

      bgMemoryHash = payload;
      bgSessionToken = generateSessionToken();
      setMiscStore(bgMemoryHash);

      // Broadcast token after storing
      setTimeout(async () => {
        try {
          await browser.runtime.sendMessage({
            type: 'SESSION_TOKEN_BROADCAST',
            token: bgSessionToken!.token,
            expiresAt: bgSessionToken!.expiresAt
          });
        } catch (error) {
          log.warn('[SessionHandler] Failed to broadcast session token', false, error);
        }
      }, 0);

      // Return token and expiresAt in data field for MessageResponse compatibility
      // But also include at top level for backward compatibility
      const response: MessageResponse = {
        success: true,
        data: {
          token: bgSessionToken.token,
          expiresAt: bgSessionToken.expiresAt
        }
      };

      // Add token and expiresAt at top level for the client expectation
      (response as any).token = bgSessionToken.token;
      (response as any).expiresAt = bgSessionToken.expiresAt;

      log.info('[SessionHandler] STORE_SESSION_HASH successful', false, response);
      return response;
    } catch (error) {
      log.error('[SessionHandler] Error handling STORE_SESSION_HASH', false, error);
      return { success: false, error: 'Failed to store session hash' };
    }
  }],

  ['REFRESH_SESSION', async (payload): Promise<MessageResponse> => {
    try {
      const providedToken = payload?.token as string | undefined;
      if (bgSessionToken && providedToken === bgSessionToken.token) {
        bgSessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;

        // Broadcast updated token expiry
        setTimeout(async () => {
          try {
            await browser.runtime.sendMessage({
              type: 'SESSION_TOKEN_BROADCAST',
              token: bgSessionToken!.token,
              expiresAt: bgSessionToken!.expiresAt
            });
          } catch (error) {
            log.warn('[SessionHandler] Failed to broadcast refreshed session token', false, error);
          }
        }, 0);

        const response: MessageResponse = {
          success: true,
          data: {
            token: bgSessionToken.token,
            expiresAt: bgSessionToken.expiresAt
          }
        };

        // Add at top level for backward compatibility
        (response as any).token = bgSessionToken.token;
        (response as any).expiresAt = bgSessionToken.expiresAt;

        return response;
      } else {
        // Clear on invalid token
        bgSessionToken = null;
        bgMemoryHash = null;
        return { success: false, error: 'Unauthorized' };
      }
    } catch (error) {
      log.error('[SessionHandler] Error handling REFRESH_SESSION', false, error);
      return { success: false, error: 'Failed to refresh session' };
    }
  }],

  ['yakkl_session.verifyLogin', async (payload): Promise<MessageResponse> => {
    try {
      // Handle undefined payload
      if (!payload) {
        log.warn('[SessionHandler] No payload provided for verifyLogin');
        return {
          success: false,
          error: 'No payload provided'
        };
      }

      const { verified, contextId } = payload;
      log.info('[SessionHandler] Verify login request:', false, { verified, contextId });

      // Set login verification status in context tracker
      setLoginVerified(verified, contextId);

      // Return current idle status
      const idleStatus = getIdleStatus();

      return {
        success: true,
        data: {
          verified,
          idleStatus
        }
      };
    } catch (error) {
      log.error('[SessionHandler] Error verifying login:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['yakkl_session.getIdleStatus', async (): Promise<MessageResponse> => {
    try {
      const idleStatus = getIdleStatus();
      return {
        success: true,
        data: idleStatus
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['logout', async (payload): Promise<MessageResponse> => {
    try {
      const { reason = 'user-logout' } = payload || {};
      log.info('[SessionHandler] Logout request received:', false, { reason });

      // Lock the wallet (this handles all cleanup including window closing)
      await lockWalletBackground(reason);

      log.info('[SessionHandler] Logout completed successfully');
      return { success: true };
    } catch (error) {
      log.error('[SessionHandler] Error during logout:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['closeAllWindows', async (payload): Promise<MessageResponse> => {
    try {
      const { reason = 'session-timeout' } = payload || {};
      log.info('[SessionHandler] Close all windows request received:', false, { reason });

      // Close all extension windows
      const windows = await browser.windows.getAll({ windowTypes: ['popup'] });
      for (const window of windows) {
        if (window.id) {
          try {
            await browser.windows.remove(window.id);
          } catch (error) {
            log.warn('[SessionHandler] Failed to close window:', false, { windowId: window.id, error });
          }
        }
      }

      return { success: true };
    } catch (error) {
      log.error('[SessionHandler] Error closing windows:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['USER_LOGIN_SUCCESS', async (payload): Promise<MessageResponse> => {
    try {
      log.info('[SessionHandler] USER_LOGIN_SUCCESS received', false, {
        hasJWT: !!payload?.jwtToken,
        hasUserId: !!payload?.userId,
        hasUsername: !!payload?.username,
        jwtLength: payload?.jwtToken?.length || 0
      });

      // Store JWT and user info in memory (secure, not persisted)
      if (payload?.jwtToken) {
        jwtToken = payload.jwtToken;
        jwtExpiry = Date.now() + (60 * 60 * 1000); // 1 hour expiry
        loginTime = Date.now();
        userId = payload.userId || null;
        username = payload.username || null;
        profileId = payload.profileId || null;
        planLevel = payload.planLevel || 'explorer_member';

        log.info('[SessionHandler] JWT stored in memory', false, {
          hasToken: true,
          userId,
          username,
          planLevel,
          expiryTime: new Date(jwtExpiry).toISOString()
        });

        // Start background JWT validation after a grace period (60 seconds)
        // This prevents immediate validation right after login
        setTimeout(() => {
          if (jwtToken) {
            try {
              backgroundJWTValidator.notifyLoginSuccess(jwtToken, loginTime);
              log.info('[SessionHandler] Background JWT validator notified after grace period');
            } catch (error) {
              log.warn('[SessionHandler] Failed to notify JWT validator:', false, error);
            }
          }
        }, 60000); // 60 second grace period

        // Also set login verified for idle detection
        try {
          const idleManager = IdleManager.getInstance();
          idleManager.setLoginVerified(true);
          log.info('[SessionHandler] Idle manager login verification set');
        } catch (error) {
          log.warn('[SessionHandler] Failed to set idle login verification:', false, error);
        }

        // Trigger immediate full data refresh on login
        // This ensures all data is fresh when user logs in
        try {
          log.info('[SessionHandler] Triggering full data refresh after login');

          // Use statically imported BackgroundIntervalService (NO DYNAMIC IMPORTS IN SERVICE WORKERS!)
          const intervalService = BackgroundIntervalService.getInstance();

          // Trigger manual refresh of all data
          await intervalService.manualRefresh();

          // Also ensure provider is initialized and native balance is fetched

          // Get currently selected data
          const stored = await browser.storage.local.get('yakkl-currently-selected');
          if (stored && stored['yakkl-currently-selected']) {
            const currentlySelected = stored['yakkl-currently-selected'] as any;
            const chainId = currentlySelected?.shortcuts?.chainId;
            const address = currentlySelected?.shortcuts?.address;

            if (chainId && address) {
              log.info('[SessionHandler] Fetching native balance for logged in user', { chainId, address });

              // Initialize provider if needed
              if (!backgroundProviderManager.isReady() || backgroundProviderManager.getCurrentChainId() !== chainId) {
                await backgroundProviderManager.initialize(chainId);
              }

              // Fetch native balance
              const provider = backgroundProviderManager.getProvider();
              if (provider) {
                try {
                  const balance = await provider.getBalance(address);
                  log.info('[SessionHandler] Native balance fetched on login:', balance.toString());

                  // Update cache
                  const cacheKey = `native_balance_${chainId}_${address.toLowerCase()}`;
                  await browser.storage.local.set({
                    [cacheKey]: balance.toString(),
                    [`${cacheKey}_updated`]: Date.now()
                  });
                } catch (balanceError) {
                  log.warn('[SessionHandler] Failed to fetch native balance on login:', balanceError);
                }
              }
            }
          }

          log.info('[SessionHandler] Full data refresh triggered successfully');
        } catch (refreshError) {
          log.warn('[SessionHandler] Failed to trigger full data refresh:', false, refreshError);
          // Don't fail login if refresh fails
        }

        return { success: true, data: { message: 'JWT stored successfully' } };
      } else {
        log.warn('[SessionHandler] USER_LOGIN_SUCCESS received without JWT token');
        return { success: false, error: 'No JWT token provided' };
      }
    } catch (error) {
      log.error('[SessionHandler] Error handling USER_LOGIN_SUCCESS:', false, error);
      return { success: false, error: 'Failed to process login success' };
    }
  }],

  ['GET_JWT_TOKEN', async (): Promise<MessageResponse> => {
    try {
      // Check if JWT exists and is not expired
      if (jwtToken && jwtExpiry > Date.now()) {
        return {
          success: true,
          data: {
            token: jwtToken,
            expiresAt: jwtExpiry,
            userId,
            username,
            profileId,
            planLevel
          }
        };
      } else {
        return { success: false, error: 'No valid JWT token available' };
      }
    } catch (error) {
      log.error('[SessionHandler] Error getting JWT token:', false, error);
      return { success: false, error: 'Failed to retrieve JWT token' };
    }
  }],

  ['CLEAR_JWT_TOKEN', async (): Promise<MessageResponse> => {
    try {
      jwtToken = null;
      jwtExpiry = 0;
      loginTime = 0;
      userId = null;
      username = null;
      profileId = null;
      planLevel = null;
      log.info('[SessionHandler] JWT token cleared from memory');
      return { success: true };
    } catch (error) {
      log.error('[SessionHandler] Error clearing JWT token:', false, error);
      return { success: false, error: 'Failed to clear JWT token' };
    }
  }],

  ['SET_IDLE_LOGIN_VERIFIED', async (payload): Promise<MessageResponse> => {
    try {
      const { verified } = payload || {};
      log.info('[SessionHandler] Setting idle login verification:', false, { verified });

      // Get the IdleManager instance and set login verification
      try {
        const idleManager = IdleManager.getInstance();
        idleManager.setLoginVerified(verified === true);
        log.info('[SessionHandler] IdleManager login verification set successfully:', false, { verified });
      } catch (error) {
        log.warn('[SessionHandler] IdleManager not initialized or error setting verification:', false, error);
        // Don't fail the request if IdleManager isn't ready yet
      }

      return {
        success: true,
        data: { verified }
      };
    } catch (error) {
      log.error('[SessionHandler] Error setting idle login verification:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['SET_LOGIN_VERIFIED', async (payload): Promise<MessageResponse> => {
    try {
      const { verified, contextId } = payload || {};
      log.info('[SessionHandler] SET_LOGIN_VERIFIED request:', false, { verified, contextId });

      // Set login verification status
      setLoginVerified(verified === true, contextId);

      // Also update idle manager if available
      try {
        const idleManager = IdleManager.getInstance();
        idleManager.setLoginVerified(verified === true);
      } catch (error) {
        log.debug('[SessionHandler] IdleManager not ready, skipping update', false, error);
      }

      return {
        success: true,
        data: {
          verified,
          contextId,
          message: 'Login verification status updated'
        }
      };
    } catch (error) {
      log.error('[SessionHandler] Error handling SET_LOGIN_VERIFIED:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['SESSION_SESSION_STARTED', async (payload): Promise<MessageResponse> => {
    try {
      const { sessionId, expiresAt } = payload?.data || payload || {};
      log.info('[SessionHandler] SESSION_SESSION_STARTED received:', false, { sessionId, expiresAt });

      // Store session information
      if (sessionId && expiresAt) {
        // Update session token if needed
        bgSessionToken = { token: sessionId, expiresAt };

        // Set login verified
        setLoginVerified(true);

        return {
          success: true,
          data: {
            sessionId,
            expiresAt,
            message: 'Session started successfully'
          }
        };
      } else {
        return {
          success: false,
          error: 'Invalid session data'
        };
      }
    } catch (error) {
      log.error('[SessionHandler] Error handling SESSION_SESSION_STARTED:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['SESSION_SESSION_ENDED', async (payload): Promise<MessageResponse> => {
    try {
      const { sessionId } = payload?.data || payload || {};
      log.info('[SessionHandler] SESSION_SESSION_ENDED received:', false, { sessionId });

      // Clear session information
      bgSessionToken = null;
      bgMemoryHash = null;

      // Clear JWT token as well
      jwtToken = null;
      jwtExpiry = 0;
      loginTime = 0;
      userId = null;
      username = null;
      profileId = null;
      planLevel = null;

      // Set login verified to false
      setLoginVerified(false);

      // Update idle manager if available
      try {
        const idleManager = IdleManager.getInstance();
        idleManager.setLoginVerified(false);
      } catch (error) {
        log.debug('[SessionHandler] IdleManager not ready during session end', false, error);
      }

      // Lock the wallet
      try {
        await lockWalletBackground('session-ended');
        log.info('[SessionHandler] Wallet locked due to session end');
      } catch (lockError) {
        log.warn('[SessionHandler] Failed to lock wallet on session end:', false, lockError);
      }

      return {
        success: true,
        data: {
          sessionId,
          message: 'Session ended successfully'
        }
      };
    } catch (error) {
      log.error('[SessionHandler] Error handling SESSION_SESSION_ENDED:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['SESSION_SESSION_EXTENDED', async (payload): Promise<MessageResponse> => {
    try {
      const { additionalMinutes = 30 } = payload?.data || payload || {};
      log.info('[SessionHandler] SESSION_SESSION_EXTENDED received:', false, { additionalMinutes });

      // Extend the session if we have an active session
      if (bgSessionToken) {
        const now = Date.now();
        const currentExpiry = bgSessionToken.expiresAt || now;
        const newExpiry = currentExpiry + (additionalMinutes * 60 * 1000);

        // Update session token expiry
        bgSessionToken = {
          ...bgSessionToken,
          expiresAt: newExpiry
        };

        // Also extend JWT expiry if we have one
        if (jwtToken && jwtExpiry > 0) {
          jwtExpiry = now + (additionalMinutes * 60 * 1000);
          log.info('[SessionHandler] Extended JWT expiry to:', false, new Date(jwtExpiry).toISOString());
        }

        // Cancel lockdown countdown if idle manager is available
        try {
          const idleManager = IdleManager.getInstance();
          await idleManager.cancelLockdown();
          log.info('[SessionHandler] Cancelled lockdown countdown after session extension');
        } catch (error) {
          log.debug('[SessionHandler] IdleManager not ready during session extension', false, error);
        }

        return {
          success: true,
          data: {
            expiresAt: newExpiry,
            message: `Session extended by ${additionalMinutes} minutes`
          }
        };
      } else {
        log.warn('[SessionHandler] No active session to extend');
        return {
          success: false,
          error: 'No active session to extend'
        };
      }
    } catch (error) {
      log.error('[SessionHandler] Error handling SESSION_SESSION_EXTENDED:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }],

  ['stopLockIconTimer', async (): Promise<MessageResponse> => {
    try {
      log.info('[SessionHandler] Stopping lock icon timer');
      await stopLockIconTimer();
      return { success: true };
    } catch (error) {
      log.error('[SessionHandler] Error stopping lock icon timer:', false, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }]
]);
