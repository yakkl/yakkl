import { browser_ext } from '$lib/common/environment';
import { log } from '$lib/plugins/Logger';
import type { IdleConfig, IdleState, IdleWidth } from '$lib/common/idle/types';
import { NotificationService } from '$lib/common/notifications';

export abstract class IdleManagerBase {
  protected isLockdownInitiated: boolean = false;
  protected previousState: IdleState = 'active';
  protected threshold: number;
  protected lockDelay: number;
  protected checkInterval: number;
  protected stateWidth: IdleWidth;
  protected isLoginVerified: boolean = false;

  constructor(config: IdleConfig) {
    this.threshold = config.threshold;
    this.lockDelay = Math.max(0, config.lockDelay); // Ensure non-negative
    this.checkInterval = config.checkInterval || 15000; // 15 seconds default
    this.stateWidth = config.width;

    if (this.lockDelay === 0) {
      log.info('Lock delay is 0, lockdown will occur immediately upon idle state');
    }
  }

  public setLoginVerified(verified: boolean): void {
    this.isLoginVerified = verified;
    log.info('setLoginVerified:', false, verified);
    if (verified) {
      this.start();
    } else {
      this.stop();
    }
  }

  protected async handleStateChanged(state: IdleState): Promise<void> {
    if (!browser_ext) return;

    if (state === this.previousState) return;

    log.info(`${this.stateWidth} idle state changing from ${this.previousState} to ${state} - ;;;;;;;;;;;;;`, false);
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

            log.info('idle/locked state detected, initiating lockdown', false, state);
            
            if (this.lockDelay <= 0) {
              // Immediate lockdown
              log.warn(`${state} detected, initiating immediate lockdown`);
              await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
              await browser_ext.runtime.sendMessage({type: 'lockdown'});
            } else {
              // Delayed lockdown
              log.warn(`${state} detected, lockdown will occur in ${this.lockDelay/1000} seconds`);
              await browser_ext.runtime.sendMessage({type: 'stopPricingChecks'});
              // Send a notication that lockdown is imminent
              try {
                log.warn(`${state} detected, sending imminent lockdown notification`);
                // Used the notication sending directly from here due to UI context.
                await NotificationService.sendSecurityAlert(
                  'YAKKL will be locked soon due to inactivity.',
                  {
                    contextMessage: 'Use YAKKL to prevent automatic lockdown',
                    requireInteraction: true,
                    priority: 2
                  },
                  'lockdown-warning' // Distinct ID for warning
                );

                browser_ext.alarms.create("yakkl-lock-alarm", {
                  when: Date.now() + this.lockDelay
                });
                log.info('Alarm set for lockdown in approx. ', false, this.lockDelay / 1000, ' seconds');
              } catch (error) {
                log.error('Error sending imminent lockdown notification:', false, error);
              }
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
