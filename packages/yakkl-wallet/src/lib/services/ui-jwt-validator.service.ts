import { log } from '$lib/common/logger-wrapper';
import { authStore } from '$lib/stores/auth-store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import type { Runtime } from 'webextension-polyfill';

// Add modal state management
import { writable } from 'svelte/store';
import { browser_ext } from '$lib/common/environment';
import { SessionManager } from '$lib/managers/SessionManager';

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
  private messagePort: Runtime.Port | null = null;
  private readonly VALIDATION_INTERVAL = 300000; // 5 minutes - reduced from 30 seconds for performance
  private lastUserActivity = Date.now();
  private readonly ACTIVITY_THRESHOLD = 60000; // 1 minute of inactivity before reducing validation frequency
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
    try {
      if (!browser || typeof window === 'undefined') {
        log.warn('[UIJWTValidator] Not in browser extension client context');
        return;
      }

      if (this.validationInterval) {
        log.debug('[UIJWTValidator] Already running');
        return;
      }

      console.log('[UIJWTValidator] Starting JWT validation service with delays');

      // Track user activity for intelligent validation
      this.setupActivityTracking();

      // Check if we have a valid JWT before starting validation
      const authState = get(authStore);
      const sessionManager = SessionManager.getInstance();
      const sessionState = sessionManager.getSessionState();
      const hasJWT = !!(authState.jwtToken || sessionState?.jwtToken || sessionStorage.getItem('wallet-jwt-token'));

      // Check if we just logged in (JWT in sessionStorage means fresh login)
      const justLoggedIn = !!sessionStorage.getItem('wallet-jwt-token');

      // Check if we recently had activity (within last 2 minutes)
      const recentActivity = authState.lastActivity && (Date.now() - authState.lastActivity) < 120000;

      // Adjust delay based on JWT status and login state
      // Much longer grace period if we just logged in or have recent activity
      const initialDelay = justLoggedIn ? 300000 : (recentActivity ? 180000 : (hasJWT ? 60000 : 120000));
      // 5 min for fresh login, 3 min for recent activity, 1 min if JWT exists, 2 min if not

      console.log('[UIJWTValidator] Initial delay:', initialDelay, 'ms, hasJWT:', hasJWT, 'justLoggedIn:', justLoggedIn, 'recentActivity:', recentActivity);

      // Delay all JWT validation operations to prevent login/home page slowdown
      // Phase 1: Connect to background after initial delay
      setTimeout(() => {
        console.log('[UIJWTValidator] Phase 1: Connecting to background after delay');
        this.connectToBackground();

        // Phase 2: Start validation after another 30 seconds
        setTimeout(() => {
          console.log('[UIJWTValidator] Phase 2: Starting validation');
          
          // Start periodic validation with activity-based frequency
          this.validationInterval = window.setInterval(() => {
            this.performActivityBasedValidation();
          }, this.VALIDATION_INTERVAL);

          // Perform first validation check
          this.validateJWTToken();
        }, 30000); // Additional 30 seconds
      }, initialDelay); // Dynamic initial delay based on JWT status
    } catch (error) {
      console.log('[UIJWTValidator] Error starting JWT validation service', false, error);
    }
  }

  /**
   * Setup activity tracking for intelligent validation
   */
  private setupActivityTracking(): void {
    // Track user activity events
    const updateActivity = () => {
      this.lastUserActivity = Date.now();
    };

    // Listen to common user activity events
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', updateActivity);
      window.addEventListener('keydown', updateActivity);
      window.addEventListener('scroll', updateActivity);
      window.addEventListener('touchstart', updateActivity);
    }
  }

  /**
   * Perform validation based on user activity
   * Reduces validation frequency when user is inactive
   */
  private performActivityBasedValidation(): void {
    const now = Date.now();
    const timeSinceActivity = now - this.lastUserActivity;

    // If user has been inactive for more than threshold, skip validation
    // This reduces unnecessary background work when user is not actively using the wallet
    if (timeSinceActivity > this.ACTIVITY_THRESHOLD) {
      log.debug('[UIJWTValidator] User inactive, skipping validation');
      return;
    }

    // User is active, perform validation
    this.validateJWTToken();
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
      if (!browser_ext.runtime?.connect) {
        log.warn('[UIJWTValidator] Chrome runtime not available');
        return;
      }

      this.messagePort = browser_ext.runtime.connect({ name: this.PORT_NAME });
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

      console.log('[UIJWTValidator] authState', authState);
      
      // Try to get JWT from SessionManager if not in authStore
      let jwtToken = authState.jwtToken;
      if (!jwtToken && authState.isAuthenticated) {
        try {
          const sessionManager = SessionManager.getInstance();
          const sessionState = sessionManager.getSessionState();
          jwtToken = sessionState?.jwtToken || null;
          console.log('[UIJWTValidator] Retrieved JWT from SessionManager:', !!jwtToken);
        } catch (error) {
          console.log('[UIJWTValidator] Failed to get JWT from SessionManager:', error);
        }
      }
      
      // Basic checks without calling full session validation
      if (!authState.isAuthenticated || !jwtToken) {
        console.log('[UIJWTValidator] Not authenticated or no JWT token', {
          isAuthenticated: authState.isAuthenticated,
          hasJWT: !!jwtToken,
          lastActivity: authState.lastActivity
        });

        // CRITICAL FIX: If user is authenticated but JWT is not ready yet,
        // we should ALWAYS skip validation to prevent false positives
        if (authState.isAuthenticated && !jwtToken) {
          // Check if this is a fresh login (within first 10 minutes)
          const timeSinceActivity = Date.now() - authState.lastActivity;
          if (timeSinceActivity < 600000) { // 10 minutes grace period for JWT generation
            console.log('[UIJWTValidator] User authenticated but JWT not ready - within grace period, skipping validation');
            // JWT might still be generating or synchronizing - this is normal
            // DO NOT show any warning - the JWT will arrive soon
            return;
          }

          // If we're past the grace period and still no JWT, this might be a legacy session
          // or digest-only authentication - still valid, don't show error
          console.log('[UIJWTValidator] User authenticated with digest-only (no JWT) - this is valid');
          return;
        }

        // Check if we're within extended grace period after login (first 10 minutes)
        // This handles cases where both auth and JWT are missing temporarily
        const timeSinceActivity = Date.now() - authState.lastActivity;
        if (timeSinceActivity < 600000) { // 10 minutes grace period
          console.log('[UIJWTValidator] Within extended grace period after login, skipping validation');
          return;
        }

        // Only show warning if truly not authenticated AND past grace period
        if (!authState.isAuthenticated) {
          // Show 20-second security countdown modal
          this.showSecurityWarningModal(
            'Your session has expired or is invalid.',
            'JWT validation failed - not authenticated'
          );
        }
        return;
      }

      // Check if session state exists and is active
      if (!authState.sessionState || !authState.profile) {
        console.log('[UIJWTValidator] No valid session state or profile', {
          hasSessionState: !!authState.sessionState,
          hasProfile: !!authState.profile,
          hasJWT: !!jwtToken
        });

        // CRITICAL FIX: If we have a JWT token, the session is valid
        // Session state might be updating asynchronously - don't fail validation
        if (jwtToken) {
          console.log('[UIJWTValidator] Have valid JWT token - session is valid despite missing state');
          // Continue with validation - JWT is the source of truth
          // Session state will catch up asynchronously
        } else {
          // Check if we're within extended grace period after login (first 10 minutes)
          const timeSinceActivity = Date.now() - authState.lastActivity;
          if (timeSinceActivity < 600000) { // 10 minutes grace period
            console.log('[UIJWTValidator] Within grace period for session state, skipping validation');
            return;
          }

          // Even without JWT, if user is authenticated with digest, that's valid
          if (authState.isAuthenticated) {
            console.log('[UIJWTValidator] Authenticated with digest only - valid session');
            return;
          }

          // Only show warning if we don't have JWT AND not authenticated AND past grace period
          this.showSecurityWarningModal(
            'Your session state is invalid.',
            'JWT validation failed - no valid session state or profile'
          );
          return;
        }
      }

      // Send validation result to background
      if (this.messagePort && this.isConnected) {
        this.messagePort.postMessage({
          type: 'JWT_VALIDATION_RESULT',
          valid: true,
          timestamp: Date.now()
        });
      }

      console.log('[UIJWTValidator] JWT validation passed');
    } catch (error) {
      console.log('[UIJWTValidator] JWT validation error', false, error);
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
