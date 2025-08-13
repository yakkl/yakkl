import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/managers/Logger';
import type { IdleConfig, IdleState, IdleWidth } from '$lib/common/idle/types';
import { NotificationService } from '$lib/common/notifications';
import { getYakklSettings } from '$lib/common/stores';
import type { YakklSettings } from '$lib/common/interfaces';

export abstract class IdleManagerBase {
  protected isLockdownInitiated: boolean = false;
  protected previousState: IdleState = 'active';
  protected threshold: number;
  protected lockDelay: number;
  protected checkInterval: number;
  protected stateWidth: IdleWidth;
  protected isLoginVerified: boolean = false;

  // Countdown timer properties
  protected countdownInterval: NodeJS.Timeout | null = null;
  protected countdownSeconds: number = 30;
  protected currentCountdown: number = 0;
  protected settings: YakklSettings | null = null;

  constructor(config: IdleConfig) {
    this.threshold = config.threshold;
    this.lockDelay = Math.max(0, config.lockDelay); // Ensure non-negative
    this.checkInterval = config.checkInterval || 15000; // 15 seconds default
    this.stateWidth = config.width;

    if (this.lockDelay === 0) {
      log.info('Lock delay is 0, lockdown will occur immediately upon idle state');
    }

    // Load settings asynchronously without blocking constructor
    this.loadSettings().catch(error => {
      log.warn('Failed to load idle settings in constructor, using defaults', false, error);
    });
  }

  protected async loadSettings(): Promise<void> {
    try {
      this.settings = await getYakklSettings();
      if (this.settings?.idleSettings) {
        // Convert minutes to milliseconds for threshold and lockDelay
        this.threshold = (this.settings.idleSettings.detectionMinutes || 5) * 60 * 1000;
        this.lockDelay = (this.settings.idleSettings.graceMinutes || 2) * 60 * 1000;
        this.countdownSeconds = this.settings.idleSettings.countdownSeconds || 30;
      }
    } catch (error) {
      log.warn('Failed to load idle settings, using defaults', false, error);
    }
  }

  public setLoginVerified(verified: boolean): void {
    this.isLoginVerified = verified;
    console.log('setLoginVerified:', verified);
    if (verified) {
      this.start();
    } else {
      this.stop();
    }
  }

  protected async handleStateChanged(state: IdleState): Promise<void> {
    if (!browser_ext) return;

    console.log('handleStateChanged - state (idle):', state);

    if (state === this.previousState) return;

    console.log(`${this.stateWidth} idle state changing from ${this.previousState} to ${state} - ;;;;;;;;;;;;;`);
    this.previousState = state;

    if (!this.isLoginVerified) {
      return;
    }

    try {
      switch (state) {
        case 'active':
          this.isLockdownInitiated = false;
          await browser_ext.alarms.clear("yakkl-lock-alarm");
          await browser_ext.runtime.sendMessage({type: 'startPricingChecks'});
          break;

        case 'idle':
        case 'locked':
          if (!this.isLockdownInitiated) {
            this.isLockdownInitiated = true;

            console.log('idle/locked state detected, initiating lockdown sequence', state);

            if (this.lockDelay <= 0) {
              // Immediate lockdown
              console.log(`${state} detected, initiating immediate lockdown`);
              await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
              await browser_ext.runtime.sendMessage({type: 'lockdown'});
            } else {
              // Start grace period with countdown
              console.log(`${state} detected, starting grace period of ${this.lockDelay/60000} minutes`);
              await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});

              // Send initial notification
              await this.sendIdleNotification(
                'Idle Detected',
                `YAKKL will lock in ${this.lockDelay/60000} minutes due to inactivity.`,
                'idle-grace-period'
              );

              // Set alarm for end of grace period (start of countdown)
              browser_ext.alarms.create("yakkl-countdown-start", {
                when: Date.now() + this.lockDelay
              });

              // Update badge to show idle state
              await this.updateBadge('IDLE', 'yellow');

              log.info('Grace period started for', false, this.lockDelay / 60000, 'minutes');
            }
          }
          break;
      }
    } catch (error) {
      this.handleError(error as Error, 'Error handling state change');
      this.isLockdownInitiated = false;
      this.previousState = 'active';
    }
  }

  /**
   * Start countdown timer (called after grace period expires)
   */
  protected async startCountdown(): Promise<void> {
    if (!browser_ext) return;

    this.currentCountdown = this.countdownSeconds;

    // Send countdown notification
    await this.sendIdleNotification(
      'Final Warning!',
      `YAKKL will lock in ${this.currentCountdown} seconds!`,
      'idle-countdown'
    );

    // Play warning sound
    await this.playWarningSound();

    // Show countdown modal if enabled
    if (this.settings?.idleSettings?.showCountdownModal) {
      await browser_ext.runtime.sendMessage({
        type: 'SHOW_IDLE_COUNTDOWN',
        seconds: this.currentCountdown
      });
    }

    // Start countdown interval
    this.countdownInterval = setInterval(async () => {
      this.currentCountdown--;

      // Update badge with countdown
      const badgeColor = this.currentCountdown <= 10 ? 'red' : 'orange';
      await this.updateBadge(this.currentCountdown.toString(), badgeColor);

      // Play sound at specific points
      const soundPoints = this.settings?.idleSettings?.soundPoints || [30, 10, 5];
      if (soundPoints.includes(this.currentCountdown)) {
        await this.playWarningSound();
      }

      // Send update to UI
      await browser_ext.runtime.sendMessage({
        type: 'UPDATE_IDLE_COUNTDOWN',
        seconds: this.currentCountdown
      });

      // Check if countdown complete
      if (this.currentCountdown <= 0) {
        this.clearCountdown();
        await this.executeLockdown();
      }
    }, 1000);
  }

  /**
   * Clear countdown timer
   */
  protected clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.currentCountdown = 0;
  }

  /**
   * Execute final lockdown
   */
  protected async executeLockdown(): Promise<void> {
    if (!browser_ext) return;

    // Clear badge
    await this.updateBadge('', '');

    // Send final notification
    await this.sendIdleNotification(
      'Wallet Locked',
      'YAKKL has been locked due to inactivity.',
      'idle-locked'
    );

    // Play final sound
    await this.playWarningSound();

    // Send lockdown message
    await browser_ext.runtime.sendMessage({type: 'lockdown'});

    // Reset state
    this.isLockdownInitiated = false;
    this.previousState = 'active';
  }

  /**
   * Cancel lockdown sequence (called when activity detected)
   */
  public async cancelLockdown(): Promise<void> {
    if (!this.isLockdownInitiated) return;

    log.info('Activity detected, canceling lockdown sequence');

    // Clear alarms
    if (browser_ext) {
      await browser_ext.alarms.clear("yakkl-countdown-start");
      await browser_ext.alarms.clear("yakkl-lock-alarm");
    }

    // Clear countdown
    this.clearCountdown();

    // Clear badge
    await this.updateBadge('', '');

    // Dismiss modal
    if (browser_ext) {
      await browser_ext.runtime.sendMessage({
        type: 'DISMISS_IDLE_COUNTDOWN'
      });
    }

    // Reset state
    this.isLockdownInitiated = false;
    this.previousState = 'active';
  }

  /**
   * Helper to send notifications
   */
  protected async sendIdleNotification(
    title: string,
    message: string,
    id: string
  ): Promise<void> {
    if (!this.settings?.idleSettings?.showNotifications) return;

    try {
      // Combine title and message since sendSecurityAlert doesn't accept title separately
      const fullMessage = `${title}: ${message}`;
      await NotificationService.sendSecurityAlert(
        fullMessage,
        {
          contextMessage: 'Click to open YAKKL',
          requireInteraction: true,
          priority: 2
        },
        id
      );
    } catch (error) {
      log.warn('Failed to send idle notification:', false, error);
    }
  }

  /**
   * Helper to update badge
   */
  protected async updateBadge(text: string, color: string): Promise<void> {
    if (!browser_ext) return;

    try {
      await browser_ext.action.setBadgeText({ text });
      if (color) {
        const colors = {
          'yellow': '#FFA500',
          'orange': '#FF6B35',
          'red': '#FF0000'
        };
        await browser_ext.action.setBadgeBackgroundColor({
          color: colors[color] || color
        });
      }
    } catch (error) {
      log.warn('Failed to update badge:', false, error);
    }
  }

  /**
   * Helper to play warning sound
   */
  protected async playWarningSound(): Promise<void> {
    if (!this.settings?.idleSettings?.warningSound) return;
    if (!this.settings?.soundEnabled) return;

    try {
      // Send message to play sound in popup/UI context
      if (browser_ext) {
        await browser_ext.runtime.sendMessage({
          type: 'PLAY_SOUND',
          sound: this.settings.idleSettings.warningSound,
          volume: this.settings.idleSettings.warningVolume || 0.7
        });
      }
    } catch (error) {
      log.warn('Failed to play warning sound:', false, error);
    }
  }

  abstract start(): Promise<void>;
  abstract stop(): Promise<void>;
  abstract checkCurrentState(): Promise<IdleState>;

  getStateWidth(): IdleWidth {
    return this.stateWidth;
  }

  protected handleError(error: Error, context: string) {
    log.error(`[${this.stateWidth}] ${context}:`, false, error);
    // Optionally reset state
    this.isLockdownInitiated = false;
    this.previousState = 'active';
  }

  async setStateWidth(width: IdleWidth): Promise<void> {
    if (this.stateWidth === width) return;

    // Stop current monitoring
    this.stop();

    // Update width
    this.stateWidth = width;

    // Reset state
    this.isLockdownInitiated = false;
    this.previousState = 'active';

    // Restart with new width
    this.start();
  }
}
