import type { IdleConfig, IdleState } from '$lib/common/idle/types';
import { IdleManagerBase } from './IdleManagerBase';
import { browser_ext } from '$lib/common/environment';
// import { log } from './Logger';

export class SystemWideIdleManager extends IdleManagerBase {
  private stateChangeListener: ((state: IdleState) => void) | null = null;

  constructor(config: IdleConfig) {
    super(config);
    if (typeof browser_ext === 'undefined') {
      throw new Error('SystemWideIdleManager must be initialized in background!');
    }
  }

  async start(): Promise<void> {
    if (!this.isLoginVerified) {
      return;
    }

    browser_ext.idle.setDetectionInterval(this.threshold);
    this.stateChangeListener = (state: IdleState) => {
      this.handleStateChanged(state);
    };
    browser_ext.idle.onStateChanged.addListener(this.stateChangeListener);
  }

  async stop(): Promise<void> {
    if (this.stateChangeListener) {
      browser_ext.idle.onStateChanged.removeListener(this.stateChangeListener);
      this.stateChangeListener = null;
    }
  }

  async checkCurrentState(): Promise<IdleState> {
    if (!this.isLoginVerified) {
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
