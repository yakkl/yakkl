import type { IdleConfig, IdleState } from '$lib/common/idle/types';
import { IdleManagerBase } from './IdleManagerBase';
import { browser_ext } from '$lib/common/environment';

export class SystemWideIdleManager extends IdleManagerBase {
  private stateChangeListener: ((state: IdleState) => void) | null = null;

  constructor(config: IdleConfig) {
    super(config);
    // Don't throw immediately, just log a warning
    // The browser_ext might be available later
    if (!browser_ext) {
      console.warn('SystemWideIdleManager: browser_ext not available at construction');
    }
  }

  async start(): Promise<void> {
    console.log('SystemWideIdleManager - start:');
    if (!this.isLoginVerified) {
      return;
    }

    // Check if browser_ext is available
    if (!browser_ext || !browser_ext.idle) {
      console.warn('SystemWideIdleManager: browser_ext.idle not available, cannot start');
      return;
    }

    console.log('start - setting detection interval:', this.threshold);

    browser_ext.idle.setDetectionInterval(this.threshold);
    this.stateChangeListener = (state: IdleState) => {
      this.handleStateChanged(state);
    };
    browser_ext.idle.onStateChanged.addListener(this.stateChangeListener);
  }

  async stop(): Promise<void> {
    if (this.stateChangeListener && browser_ext?.idle) {
      browser_ext.idle.onStateChanged.removeListener(this.stateChangeListener);
      this.stateChangeListener = null;
    }
  }

  async checkCurrentState(): Promise<IdleState> {
    if (!this.isLoginVerified) {
      return 'active';
    }

    if (!browser_ext?.idle) {
      console.warn('SystemWideIdleManager: browser_ext.idle not available for checkCurrentState');
      return 'active';
    }

    const state = await browser_ext.idle.queryState(this.threshold);
    return state === 'idle' ? 'idle' : 'active';
  }

  setLoginVerified(verified: boolean): void {
    this.isLoginVerified = verified;
    if (verified) {
      this.start();
    } else {
      this.stop();
    }
  }
}
