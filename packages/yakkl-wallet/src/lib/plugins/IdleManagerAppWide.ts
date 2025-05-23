import type { IdleConfig, IdleState } from '$lib/common/idle/types';
import { IdleManagerBase } from './IdleManagerBase';
import { browser_ext } from '$lib/common/environment';
import { log } from './Logger';

// In AppWideIdleManager class
export class AppWideIdleManager extends IdleManagerBase {
  private lastActivity: number = Date.now();
  private idleCheckInterval: number | null = null;
  private boundResetTimer: () => void;
  private isCheckingIdle: boolean = false; // Prevent concurrent checks
  private readonly events = [
    'mousemove', 'mousedown', 'keypress', 'DOMMouseScroll',
    'mousewheel', 'touchmove', 'MSPointerMove', 'focus'
  ];

  constructor(config: IdleConfig) {
    super({ ...config, width: 'app-wide' });
    this.boundResetTimer = this.resetTimer.bind(this);
    this.checkIdleStatus = this.checkIdleStatus.bind(this);
    if (typeof window === 'undefined') {
     throw new Error('AppWideIdleManager must be initialized in client context!');
    }
  }

  private resetTimer(): void {
    if (!browser_ext) return;

    try {
      const now = Date.now();
      this.lastActivity = now;

      // Important: Reset lockdown initiation when activity is detected
      if (this.isLockdownInitiated) {
        log.info('Activity detected, canceling pending lockdown');
        this.isLockdownInitiated = false;

        // Cancel any pending lock alarm
        browser_ext.alarms.clear("yakkl-lock-alarm").catch(error =>
          this.handleError(error as Error, 'Error clearing lock alarm')
        );
      }

      // Only trigger state change if we were not active
      if (this.previousState !== 'active') {
        log.debug('State was not active, changing to active state');
        this.handleStateChanged('active').catch(error =>
          this.handleError(error as Error, 'Error handling state change to active')
        );
      }
    } catch (error) {
      this.handleError(error as Error, 'Error in resetTimer');
    }
  }

  private async checkIdleStatus(): Promise<void> {
    // Prevent concurrent checks
    if (this.isCheckingIdle) return;

    try {
      this.isCheckingIdle = true;
      const timeSinceLastActivity = Date.now() - this.lastActivity;

      if (timeSinceLastActivity >= this.threshold && !this.isLockdownInitiated) {
        log.info(`Idle threshold reached: ${timeSinceLastActivity}ms`);
        await this.handleStateChanged('idle');
      }
    } catch (error) {
      this.handleError(error as Error, 'Error checking idle status');
    } finally {
      this.isCheckingIdle = false;
    }
  }

  async start(): Promise<void> {
    try {
      // Clear any existing interval first
      if (this.idleCheckInterval) {
        await this.stop();
      }

      // Add event listeners
      this.events.forEach(event => {
        try {
          window.addEventListener(event, this.boundResetTimer, { passive: true });
        } catch (error) {
          this.handleError(error as Error, `Error adding listener for ${event}`);
        }
      });

      // Add visibility change handler
      try {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.lastActivity = Date.now() - (this.threshold / 2);
            log.debug('Document hidden, updating last activity');
          } else {
            this.resetTimer();
            log.debug('Document visible, resetting timer');
          }
        });
      } catch (error) {
        this.handleError(error as Error, 'Error setting up visibility change listener');
      }

      // Start interval checks
      this.idleCheckInterval = window.setInterval(
        this.checkIdleStatus,
        this.checkInterval
      );

      // Perform initial state check
      await this.checkCurrentState();
    } catch (error) {
      this.handleError(error as Error, 'Error starting app-wide idle manager');
      // Attempt cleanup in case of partial initialization
      await this.stop();
    }
  }

  async stop(): Promise<void> {
    try {
      // Clear interval
      if (this.idleCheckInterval) {
        clearInterval(this.idleCheckInterval);
        this.idleCheckInterval = null;
      }

      // Remove event listeners
      this.events.forEach(event => {
        try {
          window.removeEventListener(event, this.boundResetTimer);
        } catch (error) {
          this.handleError(error as Error, `Error removing listener for ${event}`);
        }
      });
    } catch (error) {
      this.handleError(error as Error, 'Error stopping app-wide idle manager');
    }
  }

  async checkCurrentState(): Promise<IdleState> {
    try {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      const state: IdleState = timeSinceLastActivity >= this.threshold ? 'idle' : 'active';
      await this.handleStateChanged(state);
      return state;
    } catch (error) {
      this.handleError(error as Error, 'Error checking current state');
      return 'active'; // Default to active state on error
    }
  }

  protected handleError(error: Error, context: string) {
    log.error(`[AppWideIdleManager] ${context}:`, false, error);
    // Optionally reset state
    this.isLockdownInitiated = false;
    this.previousState = 'active';
  }
}
