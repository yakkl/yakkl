/**
 * Authentication Message Handler for Background Context
 * Handles JWT tokens and authentication state across contexts
 */

import browser from 'webextension-polyfill';
import { browserJWT as contextAwareJWT } from '@yakkl/security';
import type { SessionState } from '$lib/managers/SessionManager';
import { authStore } from '$lib/stores/auth-store';
import { log } from '$lib/common/logger-wrapper';
// Message type defined inline to avoid import issues
interface Message {
  type: string;
  payload?: any;
  tabId?: number;
  error?: string;
}

/**
 * Authentication message types
 */
export enum AuthMessageType {
  USER_LOGIN_SUCCESS = 'USER_LOGIN_SUCCESS',
  USER_LOGOUT = 'USER_LOGOUT',
  JWT_UPDATED = 'JWT_UPDATED',
  JWT_REFRESH_NEEDED = 'JWT_REFRESH_NEEDED',
  AUTH_STATE_REQUEST = 'AUTH_STATE_REQUEST',
  AUTH_STATE_RESPONSE = 'AUTH_STATE_RESPONSE'
}

/**
 * Authentication message handler
 */
export class AuthHandler {
  private static instance: AuthHandler | null = null;

  private constructor() {
    this.registerHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuthHandler {
    if (!AuthHandler.instance) {
      AuthHandler.instance = new AuthHandler();
    }
    return AuthHandler.instance;
  }

  /**
   * Register message handlers
   */
  private registerHandlers(): void {
    // Listen for messages from content/popup contexts
    browser.runtime.onMessage.addListener((message, sender) => {
      return this.handleMessage(message, sender);
    });
  }
  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: any,
    sender: browser.Runtime.MessageSender
  ): Promise<any> {
    try {
      switch (message.type) {
        case AuthMessageType.USER_LOGIN_SUCCESS:
          return await this.handleUserLoginSuccess(message);

        case AuthMessageType.USER_LOGOUT:
          return await this.handleUserLogout(message);

        case AuthMessageType.JWT_REFRESH_NEEDED:
          return await this.handleJWTRefresh(message);

        case AuthMessageType.AUTH_STATE_REQUEST:
          return await this.handleAuthStateRequest(message);

        default:
          // Not our message, let other handlers process it
          return undefined;
      }
    } catch (error) {
      log.error('[AuthHandler] Error handling message:', false, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Handle USER_LOGIN_SUCCESS message
   */
  private async handleUserLoginSuccess(message: Message): Promise<any> {
    const { jwtToken, userId, username, profileId, planLevel } = message.payload || {};

    if (!jwtToken) {
      log.error('[AuthHandler] No JWT token in USER_LOGIN_SUCCESS message');
      return { success: false, error: 'No JWT token provided' };
    }

    try {
      // JWT is already stored internally when validated
      const isValid = await contextAwareJWT.validateToken(jwtToken);
      if (!isValid) {
        return { success: false, error: 'Invalid JWT token' };
      }

      // Update auth store using the proper method
      const sessionState: SessionState = {
        isActive: true,
        userId,
        username,
        profileId,
        planLevel,
        lastActivity: Date.now(),
        jwtToken,
        sessionId: crypto.randomUUID(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        warningShown: false
      };
      await authStore.updateSessionState(sessionState, jwtToken);

      // Store user info for reference
      await this.storeUserInfo({
        userId,
        username,
        profileId,
        planLevel,
        loginTime: Date.now()
      });

      // Notify all tabs/windows about successful login
      await this.broadcastAuthUpdate({
        type: AuthMessageType.JWT_UPDATED,
        payload: {
          jwtToken,
          userId,
          authenticated: true
        }
      });

      // Update extension badge to show logged in state
      await this.updateBadge(true);

      log.info('[AuthHandler] Login success processed, JWT stored');

      return { success: true };
    } catch (error) {
      log.error('[AuthHandler] Failed to process login success:', false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process login'
      };
    }
  }

  /**
   * Handle USER_LOGOUT message
   */
  private async handleUserLogout(message: Message): Promise<any> {
    try {
      // Clear JWT token
      await contextAwareJWT.clearToken();

      // Update auth store using the proper method
      await authStore.updateSessionState(null);

      // Clear user info
      await this.clearUserInfo();

      // Notify all contexts
      await this.broadcastAuthUpdate({
        type: AuthMessageType.JWT_UPDATED,
        payload: {
          jwtToken: null,
          authenticated: false
        }
      });

      // Update badge
      await this.updateBadge(false);
      return { success: true };
    } catch (error) {
      log.error('[AuthHandler] Failed to process logout:', false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process logout'
      };
    }
  }

  /**
   * Handle JWT refresh request
   */
  private async handleJWTRefresh(message: Message): Promise<any> {
    log.info('[AuthHandler] JWT_REFRESH_NEEDED received');

    try {
      const currentToken = await contextAwareJWT.getCurrentToken();

      if (!currentToken) {
        return { success: false, error: 'No current token to refresh' };
      }

      // Attempt to refresh the token
      // This would call your backend API to get a new token
      const newToken = await this.refreshJWTToken(currentToken);

      if (newToken) {
        // Store new token
        // Get current user info from storage
        const userInfo = await this.getUserInfo();

        const sessionState: SessionState = {
          isActive: true,
          userId: userInfo?.userId || null,
          username: userInfo?.username || null,
          profileId: userInfo?.profileId || null,
          planLevel: userInfo?.planLevel || null,
          lastActivity: Date.now(),
          jwtToken: newToken,
          sessionId: crypto.randomUUID(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          warningShown: false
        };
        authStore.updateSessionState(sessionState, newToken);

        // Broadcast update
        await this.broadcastAuthUpdate({
          type: AuthMessageType.JWT_UPDATED,
          payload: {
            jwtToken: newToken,
            authenticated: true
          }
        });

        return { success: true, jwtToken: newToken };
      } else {
        return { success: false, error: 'Failed to refresh token' };
      }
    } catch (error) {
      log.error('[AuthHandler] Failed to refresh JWT:', false, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh JWT'
      };
    }
  }

  /**
   * Handle auth state request
   */
  private async handleAuthStateRequest(message: Message): Promise<any> {
    log.debug('[AuthHandler] AUTH_STATE_REQUEST received');

    try {
      const jwtToken = await contextAwareJWT.getCurrentToken();
      const isValid = jwtToken ? await contextAwareJWT.validateToken(jwtToken) : false;
      const userInfo = await this.getUserInfo();

      return {
        type: AuthMessageType.AUTH_STATE_RESPONSE,
        payload: {
          authenticated: isValid,
          hasToken: !!jwtToken,
          userInfo
        }
      };
    } catch (error) {
      log.error('[AuthHandler] Failed to get auth state:', false, error);
      return {
        type: AuthMessageType.AUTH_STATE_RESPONSE,
        payload: {
          authenticated: false,
          hasToken: false,
          error: error instanceof Error ? error.message : 'Failed to get auth state'
        }
      };
    }
  }

  /**
   * Broadcast authentication update to all contexts
   */
  private async broadcastAuthUpdate(message: any): Promise<void> {
    try {
      // Send to all tabs
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          browser.tabs.sendMessage(tab.id, message).catch(() => {
            // Tab might not have content script, ignore error
          });
        }
      }

      // Send to all extension contexts (popup, options, etc.)
      await browser.runtime.sendMessage(message).catch(() => {
        // Might not have any listeners, ignore
      });
    } catch (error) {
      log.warn('[AuthHandler] Failed to broadcast auth update:', false, error);
    }
  }

  /**
   * Update extension badge
   */
  private async updateBadge(authenticated: boolean): Promise<void> {
    try {
      if (authenticated) {
        // Green badge for authenticated
        await browser.action.setBadgeBackgroundColor({ color: '#10b981' });
        await browser.action.setBadgeText({ text: '' });
      } else {
        // Red badge for locked
        await browser.action.setBadgeBackgroundColor({ color: '#ef4444' });
        await browser.action.setBadgeText({ text: '🔒' });
      }
    } catch (error) {
      log.warn('[AuthHandler] Failed to update badge:', false, error);
    }
  }

  /**
   * Store user info in local storage
   */
  private async storeUserInfo(info: any): Promise<void> {
    try {
      await browser.storage.local.set({
        'auth-user-info': info
      });
    } catch (error) {
      log.warn('[AuthHandler] Failed to store user info:', false, error);
    }
  }

  /**
   * Get user info from local storage
   */
  private async getUserInfo(): Promise<any> {
    try {
      const result = await browser.storage.local.get('auth-user-info');
      return result['auth-user-info'] || null;
    } catch (error) {
      log.warn('[AuthHandler] Failed to get user info:', false, error);
      return null;
    }
  }

  /**
   * Clear user info from local storage
   */
  private async clearUserInfo(): Promise<void> {
    try {
      await browser.storage.local.remove('auth-user-info');
    } catch (error) {
      log.warn('[AuthHandler] Failed to clear user info:', false, error);
    }
  }

  /**
   * Refresh JWT token (placeholder - implement with your backend)
   */
  private async refreshJWTToken(currentToken: string): Promise<string | null> {
    // TODO: Implement actual token refresh with backend
    // For now, return null to indicate refresh not available
    log.warn('[AuthHandler] JWT refresh not yet implemented');
    return null;
  }

  /**
   * Initialize handler on service worker startup
   */
  static initialize(): void {
    const handler = AuthHandler.getInstance();
  }
}

// Auto-initialize when module loads
if (typeof browser !== 'undefined' && browser.runtime) {
  AuthHandler.initialize();
}
