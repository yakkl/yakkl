import { log } from '$lib/common/logger-wrapper';
import { backgroundJWTManager } from '$lib/utilities/jwt-background';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/backgroundStorage';
import { STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
import type { YakklSettings } from '$lib/common/interfaces';
import { SingletonWindowManager } from '$lib/managers/SingletonWindowManager';
import browser from 'webextension-polyfill';

// NOTE: This can only be used in the background context

/**
 * Request source types for popup security
 */
export type PopupRequestSource = 'internal' | 'external';

/**
 * Security state for popup validation
 */
interface SecurityState {
  walletLocked: boolean;
  jwtValid: boolean;
  sessionActive: boolean;
  lastActivity: Date | null;
  isInitialized: boolean;
  termsAccepted: boolean;
}

/**
 * Enhanced Popup Security Manager
 * Implements session-based security flow for better UX and security
 */
export class PopupSecurityManager {
  private static instance: PopupSecurityManager | null = null;

  static getInstance(): PopupSecurityManager {
    if (!PopupSecurityManager.instance) {
      PopupSecurityManager.instance = new PopupSecurityManager();
    }
    return PopupSecurityManager.instance;
  }

  /**
   * Main entry point for popup requests with session-based security
   */
  async handlePopupRequest(
    url: string = '',
    pinnedLocation: string = '0',
    source: PopupRequestSource = 'external'
  ): Promise<void> {
    try {
      log.info('[PopupSecurity] Handling popup request', false, { url, source });

      // const windowManager = SingletonWindowManager.getInstance();
      const popupExists = await this.checkPopupExists();

      if (popupExists) {
        // Popup already exists - handle security check
        await this.handleExistingPopup(url, source);
      } else {
        // No popup exists - create new one with full security flow
        await this.handleNewPopup(url, pinnedLocation);
      }
    } catch (error) {
      log.error('[PopupSecurity] Failed to handle popup request', false, error);
      // Fallback to basic popup creation
      const windowManager = SingletonWindowManager.getInstance();
      await windowManager.showPopup(url || 'login.html', pinnedLocation);
    }
  }

  /**
   * Handle existing popup with session-based security
   */
  private async handleExistingPopup(
    url: string,
    source: PopupRequestSource
  ): Promise<void> {
    const windowManager = SingletonWindowManager.getInstance();

    if (source === 'internal') {
      // Internal request (session timeout warning, etc.) - just focus
      log.info('[PopupSecurity] Internal request - focusing existing popup', false);
      await windowManager.showPopup('', '0'); // Focus existing without changing URL
      return;
    }

    // External request - perform security validation
    log.info('[PopupSecurity] External request - validating security state', false);
    const securityState = await this.getSecurityState();

    if (!securityState.jwtValid) {
      // Wallet explicitly locked - go to login
      log.info('[PopupSecurity] Invalid JWT - routing to login', false);
      await windowManager.showPopup('login.html', '0');
    } else if (securityState.sessionActive) {
      // Valid session - just focus existing popup (preserve current page)
      log.info('[PopupSecurity] Valid session - focusing existing popup', false);
      await windowManager.showPopup(url || '', '0');
    } else {
      // Invalid session - lock wallet and require login
      log.info('[PopupSecurity] Invalid session - locking and routing to login', false);
      await this.lockWallet();
      await windowManager.showPopup('login.html', '0');
    }
  }

  /**
   * Handle new popup creation with full security flow
   */
  private async handleNewPopup(
    url: string,
    pinnedLocation: string
  ): Promise<void> {
    log.info('[PopupSecurity] Creating new popup - full security flow', false);

    const securityState = await this.getSecurityState();
    let targetUrl = url;

    log.debug('[PopupSecurity] Security state', false, securityState);

    // Determine target URL based on security state
    if (!securityState.isInitialized) {
      targetUrl = 'register.html';
      log.info('[PopupSecurity] Not initialized - routing to register', false);
    } else if (!securityState.termsAccepted) {
      targetUrl = 'legal.html';
      log.info('[PopupSecurity] Terms not accepted - routing to legal', false);
    } else if (!securityState.jwtValid) {
      targetUrl = 'login.html';
      log.info('[PopupSecurity] Invalid JWT - routing to login', false);
    } else if (!targetUrl || targetUrl === '') {
      targetUrl = 'home.html';
      log.info('[PopupSecurity] Authenticated user - routing to home', false);
    }

    log.info('[PopupSecurity] Target URL', false, targetUrl);

    // targetUrl may need to be verified in the future to only specific pages
    const windowManager = SingletonWindowManager.getInstance();
    await windowManager.showPopup(targetUrl, pinnedLocation);
  }

  /**
   * Get comprehensive security state
   */
  private async getSecurityState(): Promise<SecurityState> {
    try {
      // Get settings
      const settings = await getObjectFromLocalStorage<YakklSettings>(STORAGE_YAKKL_SETTINGS);

      log.debug('[PopupSecurity] Settings', false, settings);

      // Check basic wallet state
      let walletLocked = settings?.isLocked ?? false;
      const isInitialized = settings?.init ?? false;
      const termsAccepted = settings?.legal?.termsAgreed ?? false;

      // Check JWT validity
      let jwtValid = false;
      let sessionActive = false;
      let lastActivity: Date | null = null;

      try {
        const currentToken = await backgroundJWTManager.getCurrentToken();
        if (currentToken) {
           jwtValid = await backgroundJWTManager.validateToken(currentToken);
           if (!jwtValid) {
            await backgroundJWTManager.invalidateToken();
            walletLocked = true;
            settings.isLocked = true;
            await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
            throw new Error('Invalid token');
           }

           // Get session info if available
           const sessionInfo = await backgroundJWTManager.getSessionInfo();
           if (sessionInfo) {
             sessionActive = sessionInfo.hasActiveSession;
             if (sessionInfo.payload) {
               lastActivity = new Date(sessionInfo.payload.iat * 1000);
             }
           }
         }
       } catch (error) {
         log.warn('[PopupSecurity] JWT validation failed', false, error);
         jwtValid = false;
         sessionActive = false;
       }

      const securityState: SecurityState = {
        walletLocked,
        jwtValid,
        sessionActive,
        lastActivity,
        isInitialized,
        termsAccepted
      };

      log.debug('[PopupSecurity] Security state', false, securityState);
      return securityState;
    } catch (error) {
      log.error('[PopupSecurity] Failed to get security state', false, error);

      // Return safe defaults
      return {
        walletLocked: true,
        jwtValid: false,
        sessionActive: false,
        lastActivity: null,
        isInitialized: false,
        termsAccepted: false
      };
    }
  }

  /**
   * Check if popup window exists by checking both SingletonWindowManager and session storage
   */
  private async checkPopupExists(): Promise<boolean> {
    try {
      // First check SingletonWindowManager
      const windowManager = SingletonWindowManager.getInstance();
      const hasActiveWindow = await windowManager.hasActiveWindow();

      if (hasActiveWindow) {
        return true;
      }

      // Also check session storage for windowId
      if (typeof browser !== 'undefined' && browser.storage?.session) {
        try {
          const result = await browser.storage.session.get('windowId');
          if (result.windowId && typeof result.windowId === 'number') {
            // Verify the window still exists
            try {
              await browser.windows.get(result.windowId as number);
              log.info('[PopupSecurity] Found existing window in session storage', false, { windowId: result.windowId });
              return true;
            } catch (error) {
              // Window doesn't exist anymore, clean up session storage
              await browser.storage.session.remove('windowId');
              log.info('[PopupSecurity] Cleaned up stale window reference from session storage');
            }
          }
        } catch (error) {
          log.warn('[PopupSecurity] Failed to check session storage for windowId', false, error);
        }
      }

      return false;
    } catch (error) {
      log.warn('[PopupSecurity] Failed to check popup existence', false, error);
      return false;
    }
  }

  /**
   * Lock the wallet (set isLocked = true)
   * @param tokenToInvalidate - Optional specific token to invalidate
   */
  private async lockWallet(tokenToInvalidate?: string): Promise<void> {
    try {
      const settings = await getObjectFromLocalStorage<YakklSettings>(STORAGE_YAKKL_SETTINGS);
      if (settings) {
        settings.isLocked = true;
        await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
        log.info('[PopupSecurity] Wallet locked due to invalid session', false);

        await this.invalidateJWTToken(tokenToInvalidate);
      }
    } catch (error) {
      log.error('[PopupSecurity] Failed to lock wallet', false, error);
    }
  }

  /**
   * Validate JWT token in background context
   */
  async validateJWTToken(token?: string): Promise<boolean> {
    try {
      const tokenToValidate = token || await backgroundJWTManager.getCurrentToken();
      if (!tokenToValidate) {
        return false;
      }

      return await backgroundJWTManager.validateToken(tokenToValidate);
    } catch (error) {
      log.warn('[PopupSecurity] JWT validation failed', false, error);
      return false;
    }
  }

    /**
   * Invalidate a JWT token
   * @param token - Optional specific token to invalidate. If not provided, invalidates current token
   * @returns true if invalidation was successful, false otherwise
   */
  async invalidateJWTToken(token?: string): Promise<boolean> {
    try {
      await backgroundJWTManager.invalidateToken(token);
      log.info('[PopupSecurity] JWT token invalidated successfully', false);
      return true;
    } catch (error) {
      log.error('[PopupSecurity] Failed to invalidate JWT token', false, error);
      return false;
    }
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<{
    hasActiveSession: boolean;
    sessionExpiresAt: number | null;
    sessionId: string | null;
  }> {
    try {
      const sessionInfo = await backgroundJWTManager.getSessionInfo();

      return {
        hasActiveSession: sessionInfo.hasActiveSession,
        sessionExpiresAt: sessionInfo.sessionExpiresAt,
        sessionId: sessionInfo.sessionId
      };
    } catch (error) {
      log.error('[PopupSecurity] Failed to get session info', false, error);
      return {
        hasActiveSession: false,
        sessionExpiresAt: null,
        sessionId: null
      };
    }
  }
}

// Export singleton instance
export const popupSecurityManager = PopupSecurityManager.getInstance();

// Export convenience functions for token management
export async function invalidateJWTToken(token?: string): Promise<boolean> {
  return popupSecurityManager.invalidateJWTToken(token);
}

export async function validateJWTToken(token?: string): Promise<boolean> {
  return popupSecurityManager.validateJWTToken(token);
}
