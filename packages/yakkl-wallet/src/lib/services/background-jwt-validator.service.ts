import { log } from '$lib/common/logger-wrapper';
import { backgroundJWTManager } from '$lib/utilities/jwt-background';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';

/**
 * Background JWT Validation Service
 * Runs in background context to validate JWT tokens and send logout messages to UI
 */
export class BackgroundJWTValidatorService {
  private static instance: BackgroundJWTValidatorService | null = null;
  private validationInterval: NodeJS.Timeout | number | null = null;
  private connectedPorts = new Map<string, Runtime.Port>();
  private readonly VALIDATION_INTERVAL = 30000; // 30 seconds
  private readonly PORT_NAME = 'jwt-validator';
  private lastValidation = 0;
  private loginTime = 0; // Track when user logged in
  private readonly GRACE_PERIOD_AFTER_LOGIN = 30000; // 30 seconds grace period after login

  static getInstance(): BackgroundJWTValidatorService {
    if (!BackgroundJWTValidatorService.instance) {
      BackgroundJWTValidatorService.instance = new BackgroundJWTValidatorService();
    }
    return BackgroundJWTValidatorService.instance;
  }

  /**
   * Start background JWT validation service (with delayed start until JWT exists)
   */
  start(): void {
    if (!browser.runtime) {
      log.warn('[BackgroundJWTValidator] Not in browser extension context');
      return;
    }

    if (this.validationInterval) {
      log.debug('[BackgroundJWTValidator] Already running');
      return;
    }

    log.info('[BackgroundJWTValidator] Starting background JWT validation service');

    // Note: Port listener is now handled by the main port listener system
    // which will call registerJWTValidatorPort() when jwt-validator ports connect

    // Wait for JWT token to be available before starting validation
    this.waitForJWTAndStart();
  }

  /**
   * Wait for JWT token to exist or timeout (but only start validation if token found)
   */
  private async waitForJWTAndStart(): Promise<void> {
    const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes max wait
    const CHECK_INTERVAL = 5000; // Check every 5 seconds
    const startTime = Date.now();

    log.info('[BackgroundJWTValidator] Waiting for JWT token to be available...');

    const checkForJWT = async (): Promise<void> => {
      try {
        // Check if JWT token exists
        const currentToken = await backgroundJWTManager.getCurrentToken();

        if (currentToken) {
          log.info('[BackgroundJWTValidator] JWT token found, starting validation');
          // Record the time we found the token as a proxy for login time if not already set
          if (this.loginTime === 0) {
            this.loginTime = Date.now();
            log.info('[BackgroundJWTValidator] Recording token discovery time as login time', false, { loginTime: this.loginTime });
          }
          this.startPeriodicValidation();
          return;
        }

        // Check if we've exceeded max wait time
        const elapsed = Date.now() - startTime;
        if (elapsed >= MAX_WAIT_TIME) {
          log.info('[BackgroundJWTValidator] Max wait time exceeded, stopping JWT checks (no token found)');
          log.info('[BackgroundJWTValidator] JWT validation will start when user logs in');
          return; // Don't start validation without a JWT token
        }

        // Wait and check again
        setTimeout(() => {
          checkForJWT();
        }, CHECK_INTERVAL);

      } catch (error) {
        log.warn('[BackgroundJWTValidator] Error checking for JWT, retrying...', false, error);
        setTimeout(() => {
          checkForJWT();
        }, CHECK_INTERVAL);
      }
    };

    // Start checking
    checkForJWT();
  }

  /**
   * Start the periodic validation interval
   */
  private startPeriodicValidation(): void {
    if (this.validationInterval) {
      return; // Already started
    }

    log.info('[BackgroundJWTValidator] Starting periodic JWT validation');

    // Start periodic validation
    this.validationInterval = setInterval(() => {
      this.validateJWTInBackground();
    }, this.VALIDATION_INTERVAL);

    // Immediate validation
    setTimeout(() => {
      this.validateJWTInBackground();
    }, 1000);
  }

  /**
   * Stop background JWT validation service
   */
  stop(): void {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    // Disconnect all ports
    this.connectedPorts.forEach(port => {
      try {
        port.disconnect();
      } catch (error) {
        log.warn('[BackgroundJWTValidator] Error disconnecting port', false, error);
      }
    });
    this.connectedPorts.clear();

    log.info('[BackgroundJWTValidator] Stopped background JWT validation service');
  }

  /**
   * Register a JWT validator port (called by the main port listener system)
   */
  registerJWTValidatorPort(port: Runtime.Port): void {
    try {
      log.info('[BackgroundJWTValidator] UI connected via port', false, { portId: port.sender?.tab?.id });

      // Store the port
      const portId = port.sender?.tab?.id?.toString() || Date.now().toString();
      this.connectedPorts.set(portId, port);

      // Handle messages from UI
      port.onMessage.addListener((message) => {
        this.handleUIMessage(message, portId);
      });

      // Handle port disconnect
      port.onDisconnect.addListener(() => {
        log.info('[BackgroundJWTValidator] UI disconnected', false, { portId });
        this.connectedPorts.delete(portId);
      });

      // Send initial validation request
      setTimeout(() => {
        this.sendMessageToUI(port, {
          type: 'JWT_VALIDATION_REQUEST',
          timestamp: Date.now()
        });
      }, 1000);

      log.info('[BackgroundJWTValidator] JWT validator port registered successfully');
    } catch (error) {
      log.error('[BackgroundJWTValidator] Failed to register JWT validator port', false, error);
    }
  }

  /**
   * Handle messages from UI
   */
  private handleUIMessage(message: any, portId: string): void {
    try {
      log.debug('[BackgroundJWTValidator] Received message from UI', false, { message, portId });

      switch (message.type) {
        case 'JWT_VALIDATION_RESULT':
          if (!message.valid) {
            log.warn('[BackgroundJWTValidator] UI reported invalid JWT');
            this.sendLogoutToAllUIs('UI reported invalid JWT');
          }
          break;

        case 'LOGOUT_COMPLETED':
          log.info('[BackgroundJWTValidator] UI completed logout', false, message.reason);
          break;

        default:
          log.debug('[BackgroundJWTValidator] Unknown message type from UI', false, message.type);
      }
    } catch (error) {
      log.error('[BackgroundJWTValidator] Error handling UI message', false, error);
    }
  }

  /**
   * Validate JWT in background context
   */
  private async validateJWTInBackground(): Promise<void> {
    try {
      const now = Date.now();

      // Rate limiting
      if (now - this.lastValidation < 10000) { // 10 seconds minimum
        return;
      }

      this.lastValidation = now;

      // Check if we're in grace period after login
      const timeSinceLogin = this.loginTime > 0 ? now - this.loginTime : Number.MAX_SAFE_INTEGER;
      const inGracePeriod = timeSinceLogin < this.GRACE_PERIOD_AFTER_LOGIN;

      log.debug('[BackgroundJWTValidator] Validation check', false, {
        timeSinceLogin,
        inGracePeriod,
        gracePeriod: this.GRACE_PERIOD_AFTER_LOGIN
      });

      // Get current JWT token
      const currentToken = await backgroundJWTManager.getCurrentToken();

      if (!currentToken) {
        if (inGracePeriod) {
          log.info('[BackgroundJWTValidator] No JWT token found but in grace period - skipping logout', false, {
            timeSinceLogin,
            gracePeriodRemaining: this.GRACE_PERIOD_AFTER_LOGIN - timeSinceLogin
          });
          return;
        }
        log.warn('[BackgroundJWTValidator] No JWT token found and outside grace period - logging out');
        this.sendLogoutToAllUIs('No JWT token found');
        return;
      }

      // Validate token
      const isValid = await backgroundJWTManager.validateToken(currentToken);

      if (!isValid) {
        if (inGracePeriod) {
          log.info('[BackgroundJWTValidator] Invalid JWT token but in grace period - skipping logout', false, {
            timeSinceLogin,
            gracePeriodRemaining: this.GRACE_PERIOD_AFTER_LOGIN - timeSinceLogin
          });
          return;
        }
        log.warn('[BackgroundJWTValidator] JWT token validation failed and outside grace period - logging out');
        this.sendLogoutToAllUIs('JWT token validation failed');
        return;
      }

      // Check session info for additional validation
      const sessionInfo = await backgroundJWTManager.getSessionInfo();

      if (!sessionInfo.hasActiveSession) {
        if (inGracePeriod) {
          log.info('[BackgroundJWTValidator] No active session but in grace period - skipping logout', false, {
            timeSinceLogin,
            gracePeriodRemaining: this.GRACE_PERIOD_AFTER_LOGIN - timeSinceLogin
          });
          return;
        }
        log.warn('[BackgroundJWTValidator] No active session and outside grace period - logging out');
        this.sendLogoutToAllUIs('No active session');
        return;
      }

      log.debug('[BackgroundJWTValidator] JWT validation passed in background');
    } catch (error) {
      const now = Date.now();
      const timeSinceLogin = this.loginTime > 0 ? now - this.loginTime : Number.MAX_SAFE_INTEGER;
      const inGracePeriod = timeSinceLogin < this.GRACE_PERIOD_AFTER_LOGIN;

      if (inGracePeriod) {
        log.warn('[BackgroundJWTValidator] JWT validation error but in grace period - skipping logout', false, {
          error: (error as Error).message,
          timeSinceLogin,
          gracePeriodRemaining: this.GRACE_PERIOD_AFTER_LOGIN - timeSinceLogin
        });
        return;
      }

      log.error('[BackgroundJWTValidator] Background JWT validation error and outside grace period', false, error);
      this.sendLogoutToAllUIs('JWT validation error: ' + (error as Error).message);
    }
  }

  /**
   * Send logout message to all connected UIs
   */
  private sendLogoutToAllUIs(reason: string): void {
    if (this.connectedPorts.size === 0) {
      log.debug('[BackgroundJWTValidator] No connected UIs to send logout message');
      return;
    }

    log.warn('[BackgroundJWTValidator] Sending logout to all UIs', false, { reason, portCount: this.connectedPorts.size });

    const logoutMessage = {
      type: 'FORCE_LOGOUT',
      reason,
      timestamp: Date.now()
    };

    this.connectedPorts.forEach((port, portId) => {
      try {
        this.sendMessageToUI(port, logoutMessage);
      } catch (error) {
        log.warn('[BackgroundJWTValidator] Failed to send logout to UI', false, { portId, error });
        // Remove invalid port
        this.connectedPorts.delete(portId);
      }
    });
  }

  /**
   * Send message to specific UI port
   */
  private sendMessageToUI(port: Runtime.Port, message: any): void {
    try {
      port.postMessage(message);
    } catch (error) {
      log.warn('[BackgroundJWTValidator] Failed to send message to UI port', false, error);
      throw error;
    }
  }

  /**
   * Force logout of all UIs (can be called externally)
   */
  forceLogoutAllUIs(reason: string): void {
    this.sendLogoutToAllUIs(reason);
  }

  /**
   * Get number of connected UIs
   */
  getConnectedUICount(): number {
    return this.connectedPorts.size;
  }

  /**
   * Force start validation immediately (called when user logs in)
   */
  startValidationNow(): void {
    // Record login time for grace period
    this.loginTime = Date.now();
    log.info('[BackgroundJWTValidator] Login time recorded, starting validation with grace period', false, { loginTime: this.loginTime });

    if (this.validationInterval) {
      log.debug('[BackgroundJWTValidator] Validation already running');
      return;
    }

    log.info('[BackgroundJWTValidator] Starting JWT validation immediately due to login');
    this.startPeriodicValidation();
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.validationInterval !== null;
  }
}

// Export singleton instance
export const backgroundJWTValidatorService = BackgroundJWTValidatorService.getInstance();
