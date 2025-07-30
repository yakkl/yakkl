import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { lockWallet } from '$lib/common/lockWallet';

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
  ['yakkl_session.verifyLogin', async (payload): Promise<MessageResponse> => {
    try {
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

      // Lock the wallet (this handles all cleanup)
      await lockWallet(reason);

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
  }]
]);
