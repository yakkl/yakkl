import type { MessageHandlerFunc, MessageResponse } from './MessageHandler';
import { setLoginVerified, getIdleStatus } from '../extensions/chrome/context';
import { log } from '$lib/common/logger-wrapper';
import { lockWallet } from '$lib/common/lockWallet';
import browser from 'webextension-polyfill';

export const sessionHandlers = new Map<string, MessageHandlerFunc>([
  ['session.verifyLogin', async (payload): Promise<MessageResponse> => {
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
  
  ['session.getIdleStatus', async (): Promise<MessageResponse> => {
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
  }]
]);