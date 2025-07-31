import { log } from '$lib/common/logger-wrapper';
import { authStore } from '$lib/stores/auth-store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { get } from 'svelte/store';

// Add modal state management
import { writable } from 'svelte/store';

export const jwtValidationModalStore = writable({
  show: false,
  status: 'checking' as 'checking' | 'valid' | 'invalid' | 'grace_period' | 'error',
  message: '',
  gracePeriodRemaining: 0
});

/**
 * UI JWT Validation Service
 * Runs in UI context to validate JWT tokens and handle logout messages from background
 */
export class UIJWTValidatorService {
  private static instance: UIJWTValidatorService | null = null;
  private validationInterval: NodeJS.Timeout | number | null = null;
  private messagePort: chrome.runtime.Port | null = null;
  private readonly VALIDATION_INTERVAL = 30000; // 30 seconds
  private readonly PORT_NAME = 'jwt-validator';
  private isConnected = false;
  private retryTimeout: NodeJS.Timeout | number | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private lastModalShow = 0;
  private readonly MODAL_COOLDOWN = 10000; // 10 seconds between modals

  static getInstance(): UIJWTValidatorService {
    if (!UIJWTValidatorService.instance) {
      UIJWTValidatorService.instance = new UIJWTValidatorService();
    }
    return UIJWTValidatorService.instance;
  }

  /**
   * Start JWT validation service in UI context
   */
  start(): void {
    if (!browser || typeof chrome === 'undefined') {
      log.warn('[UIJWTValidator] Not in browser extension client context');
      return;
    }

    if (this.validationInterval) {
      log.debug('[UIJWTValidator] Already running');
      return;
    }

    log.info('[UIJWTValidator] Starting JWT validation service');

    // Don't show modal immediately on startup - wait for actual validation issues
    // this.updateModal('checking', 'Connecting to authentication service...');

    // Connect to background script
    this.connectToBackground();

    // Start periodic validation
    this.validationInterval = window.setInterval(() => {
      this.validateJWTToken();
    }, this.VALIDATION_INTERVAL);

    // Delay initial validation to allow grace period to be established
    setTimeout(() => {
      log.info('[UIJWTValidator] Starting initial validation after grace period buffer');
      this.validateJWTToken();
    }, 10000); // Wait 10 seconds to ensure background grace period is active
  }

  /**
   * Stop JWT validation service
   */
  stop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    if (this.messagePort) {
      try {
        this.messagePort.disconnect();
      } catch (error) {
        log.warn('[UIJWTValidator] Error disconnecting port', false, error);
      }
      this.messagePort = null;
      this.isConnected = false;
    }

    log.info('[UIJWTValidator] Stopped JWT validation service');
  }

  /**
   * Connect to background script for receiving logout messages
   */
  private connectToBackground(): void {
    try {
      if (!chrome.runtime?.connect) {
        log.warn('[UIJWTValidator] Chrome runtime not available');
        return;
      }

      this.messagePort = chrome.runtime.connect({ name: this.PORT_NAME });
      this.isConnected = true;

      this.messagePort.onMessage.addListener((message) => {
        this.handleBackgroundMessage(message);
      });

      this.messagePort.onDisconnect.addListener(() => {
        log.info('[UIJWTValidator] Disconnected from background');
        this.isConnected = false;
        this.messagePort = null;

        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (!this.isConnected) {
            log.info('[UIJWTValidator] Attempting to reconnect to background');
            this.connectToBackground();
          }
        }, 5000);
      });

      log.info('[UIJWTValidator] Connected to background script');
    } catch (error) {
      log.warn('[UIJWTValidator] Failed to connect to background', false, error);
    }
  }

  /**
   * Handle messages from background script with modal updates
   */
  private async handleBackgroundMessage(message: any): Promise<void> {
    try {
      log.debug('[UIJWTValidator] Received message from background', false, message);

      switch (message.type) {
        case 'JWT_VALIDATION_REQUEST':
          // Background is requesting validation - show checking status
          this.updateModal('checking', 'Validating authentication...');
          await this.validateJWTToken();
          break;

        case 'JWT_INVALID':
          log.warn('[UIJWTValidator] Received JWT invalid from background');

          if (message.gracePeriod) {
            // Still in grace period
            this.updateModal(
              'grace_period',
              'Authentication verification in progress. Your session remains secure.',
              message.gracePeriodRemaining || 0,
              true
            );
          } else {
            // Grace period over - show security warning with 20-second countdown
            this.showSecurityWarningModal('Your session has expired for security reasons.', message.reason || 'JWT validation failed');
          }
          break;

        case 'FORCE_LOGOUT':
          log.warn('[UIJWTValidator] Received force logout from background');
          // Show security warning with 20-second countdown
          this.showSecurityWarningModal('Session security check failed. Closing for your protection.', message.reason || 'Force logout from background');
          break;

        case 'JWT_VALID':
          log.debug('[UIJWTValidator] JWT validation successful');
          this.updateModal('valid', 'Your session is secure and authenticated.');
          // Auto-hide after 2 seconds
          setTimeout(() => this.hideModal(), 2000);
          break;

        case 'JWT_ERROR':
          log.warn('[UIJWTValidator] JWT validation error from background', false, message.error);
          this.updateModal(
            'error',
            `Authentication error: ${message.error || 'Unknown validation error'}`,
            0,
            true
          );
          break;

        default:
          log.debug('[UIJWTValidator] Unknown message type', false, message.type);
      }
    } catch (error) {
      log.warn('[UIJWTValidator] Error handling background message', false, error);
      this.updateModal('error', 'Error processing authentication status', 0, true);
    }
  }

  /**
   * Validate JWT token in UI context (simplified to avoid circular dependency)
   */
  private async validateJWTToken(): Promise<void> {
    try {
            // Get auth state directly from store WITHOUT calling checkSession
      // to avoid circular dependency with JWT validation
      const authState = get(authStore);

      // Basic checks without calling full session validation
      if (!authState.isAuthenticated || !authState.jwtToken) {
        log.warn('[UIJWTValidator] Not authenticated or no JWT token');
        // Show 20-second security countdown modal instead of immediate logout
        this.showSecurityWarningModal(
          'Your session has expired or is invalid.',
          'JWT validation failed - no authentication or token'
        );
        return;
      }

      // Check if session state exists and is active
      if (!authState.sessionState || !authState.profile) {
        log.warn('[UIJWTValidator] No valid session state or profile');
        // Show 20-second security countdown modal instead of immediate logout
        this.showSecurityWarningModal(
          'Your session state is invalid.',
          'JWT validation failed - no valid session state or profile'
        );
        return;
      }

      // Send validation result to background
      if (this.messagePort && this.isConnected) {
        this.messagePort.postMessage({
          type: 'JWT_VALIDATION_RESULT',
          valid: true,
          timestamp: Date.now()
        });
      }

      log.debug('[UIJWTValidator] JWT validation passed');
    } catch (error) {
      log.warn('[UIJWTValidator] JWT validation error', false, error);
      // Show 20-second security countdown modal instead of immediate logout
      this.showSecurityWarningModal(
        'A security error occurred during session validation.',
        'JWT validation error - ' + (error instanceof Error ? error.message : 'unknown error')
      );
    }
  }

  /**
   * Perform logout and navigate to logout page
   */
  private async performLogout(reason: string): Promise<void> {
    try {
      log.warn('[UIJWTValidator] Performing logout', false, { reason });

      // Logout through auth store first
      await authStore.logout();

      // Navigate to logout page
      await goto('/logout');

      // Send confirmation to background
      if (this.messagePort && this.isConnected) {
        this.messagePort.postMessage({
          type: 'LOGOUT_COMPLETED',
          reason,
          timestamp: Date.now()
        });
      }

      log.info('[UIJWTValidator] Logout completed', false, { reason });
    } catch (error) {
      log.warn('[UIJWTValidator] Error during logout', false, error);

      // Force navigation even if auth store logout fails
      try {
        await goto('/logout');
      } catch (navError) {
        log.warn('[UIJWTValidator] Failed to navigate to logout', false, navError);
        // Navigation failed - log but don't throw
        log.warn('[UIJWTValidator] Navigation to logout failed, user may need to manually navigate', false, navError);
      }
    }
  }

  /**
   * Send message to background
   */
  sendMessageToBackground(message: any): void {
    if (this.messagePort && this.isConnected) {
      try {
        this.messagePort.postMessage(message);
      } catch (error) {
        log.warn('[UIJWTValidator] Failed to send message to background', false, error);
      }
    }
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.validationInterval !== null;
  }

  /**
   * Check if connected to background
   */
  isConnectedToBackground(): boolean {
    return this.isConnected;
  }

  /**
   * Update the JWT validation modal
   */
  private updateModal(
    status: 'checking' | 'valid' | 'invalid' | 'grace_period' | 'error',
    message: string = '',
    gracePeriodRemaining: number = 0,
    forceShow: boolean = false
  ): void {
    const now = Date.now();

    // Rate limit modal showing (except for forced shows)
    if (!forceShow && now - this.lastModalShow < this.MODAL_COOLDOWN) {
      log.debug('[UIJWTValidator] Modal on cooldown, skipping update');
      return;
    }

    // Only show modal for important status updates
    const shouldShow = forceShow ||
      status === 'grace_period' ||
      status === 'invalid' ||
      status === 'error' ||
      (status === 'valid' && this.lastModalShow > 0); // Show valid only if we previously showed an issue

    if (shouldShow) {
      this.lastModalShow = now;
      jwtValidationModalStore.set({
        show: true,
        status,
        message,
        gracePeriodRemaining
      });

      log.debug('[UIJWTValidator] Updated modal', false, { status, message });
    }
  }

  /**
   * Hide the JWT validation modal
   */
  private hideModal(): void {
    jwtValidationModalStore.update(state => ({ ...state, show: false }));
  }



    /**
   * Handle modal retry action
   */
  async handleModalRetry(): Promise<void> {
    log.info('[UIJWTValidator] Manual retry requested from modal');
    this.hideModal();
    this.updateModal('checking', 'Retrying authentication validation...');

    // Force immediate validation
    await this.validateJWTToken();

    // Reconnect if needed
    if (!this.isConnected) {
      this.connectToBackground();
    }
  }

  /**
   * Handle modal logout action
   */
  handleModalLogout(): void {
    log.info('[UIJWTValidator] Manual logout requested from modal');
    this.hideModal();
    this.performLogout('Manual logout from modal');
  }

  /**
   * Handle modal close action
   */
  handleModalClose(): void {
    log.debug('[UIJWTValidator] Modal closed by user');
    this.hideModal();
  }

  /**
   * Show security warning modal with 20-second countdown before logout
   */
  private showSecurityWarningModal(message: string, reason: string): void {
    log.warn('[UIJWTValidator] Showing security warning modal with 20-second countdown', false, { message, reason });

    // Show modal with security warning and 20-second countdown
    this.updateModal(
      'invalid',
      `${message} This popup will close in 20 seconds for your security.`,
      20, // 20 seconds countdown
      true // force show
    );

    // Start 20-second countdown timer
    let timeRemaining = 20;
    const countdownInterval = setInterval(() => {
      timeRemaining--;

      if (timeRemaining > 0) {
        // Update modal with remaining time
        this.updateModal(
          'invalid',
          `${message} This popup will close in ${timeRemaining} seconds for your security.`,
          timeRemaining,
          true
        );
      } else {
        // Time's up - close modal and logout
        clearInterval(countdownInterval);
        log.warn('[UIJWTValidator] Security timeout reached - performing logout');
        this.hideModal();
        setTimeout(() => {
          this.performLogout(reason);
        }, 500); // Small delay to let modal close animation complete
      }
    }, 1000);

    // Store interval reference for potential cleanup
    (this as any).securityCountdownInterval = countdownInterval;
  }

  /**
   * Handle security modal logout (when user clicks logout during countdown)
   */
  handleSecurityModalLogout(): void {
    log.info('[UIJWTValidator] User chose to logout from security modal');

    // Clear any ongoing countdown
    if ((this as any).securityCountdownInterval) {
      clearInterval((this as any).securityCountdownInterval);
      (this as any).securityCountdownInterval = null;
    }

    this.hideModal();
    this.performLogout('User confirmed logout from security modal');
  }

  /**
   * Handle security modal close (when user clicks close during countdown)
   */
  handleSecurityModalClose(): void {
    log.info('[UIJWTValidator] User closed security modal - still proceeding with logout');

    // Clear any ongoing countdown
    if ((this as any).securityCountdownInterval) {
      clearInterval((this as any).securityCountdownInterval);
      (this as any).securityCountdownInterval = null;
    }

    this.hideModal();
    // Still logout even if user closes - security requirement
    setTimeout(() => {
      this.performLogout('Security modal closed by user');
    }, 500);
  }
}

// Export singleton instance
export const uiJWTValidatorService = UIJWTValidatorService.getInstance();
