import type { IdleConfig, IdleState } from '$lib/common/idle/types';
import { IdleManagerBase } from './IdleManagerBase';
import { browser_ext } from '$lib/common/environment';
// import { log } from './Logger';

export class SystemWideIdleManager extends IdleManagerBase {
  constructor(config: IdleConfig) {
    super({ ...config, width: 'system-wide' });
    this.handleStateChanged = this.handleStateChanged.bind(this);
  }

  start(): void {
    if (!browser_ext) return;
    
    try {
      const detectionIntervalSeconds = Math.floor(this.threshold / 1000);

      browser_ext.idle.setDetectionInterval(detectionIntervalSeconds);

      if (!browser_ext.idle.onStateChanged.hasListener(this.handleStateChanged)) {
        browser_ext.idle.onStateChanged.addListener(this.handleStateChanged);
      }

      this.checkCurrentState().catch(error =>
        this.handleError(error as Error, 'Error checking initial state')
      );
    } catch (error) {
      this.handleError(error as Error, 'Error starting system-wide idle manager');
    }
  }

  stop(): void {
    if (!browser_ext) return;
    if (browser_ext.idle.onStateChanged.hasListener(this.handleStateChanged)) {
      browser_ext.idle.onStateChanged.removeListener(this.handleStateChanged);
    }
  }

  async checkCurrentState(): Promise<void> {
    if (!browser_ext) return;
    try {
      const detectionIntervalSeconds = Math.floor(this.threshold / 1000);
      const state = await browser_ext.idle.queryState(detectionIntervalSeconds);

      // Important: If we're active, ensure any pending lockdown is canceled
      if (state === 'active' && this.isLockdownInitiated) {
        this.isLockdownInitiated = false;
        await browser_ext.alarms.clear("yakkl-lock-alarm");
      }

      await this.handleStateChanged(state as IdleState);
    } catch (error) {
      this.handleError(error as Error, 'Error checking current state');
    }
  }
}
