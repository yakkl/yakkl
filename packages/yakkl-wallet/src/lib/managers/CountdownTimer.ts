import { writable, type Writable } from "svelte/store";
import { UnifiedTimerManager } from "./UnifiedTimerManager";

export interface CountdownState {
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  progress: number; // 0-100 percentage
}

export class CountdownTimer {
  private id: string;
  private duration: number;
  private remaining: number;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private onTick?: (remaining: number) => void;
  private onComplete?: () => void;
  private timerManager: UnifiedTimerManager;
  
  public store: Writable<CountdownState>;

  constructor(
    id: string,
    duration: number,
    onTick?: (remaining: number) => void,
    onComplete?: () => void
  ) {
    this.id = `countdown-${id}`;
    this.duration = duration;
    this.remaining = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.timerManager = UnifiedTimerManager.getInstance();
    
    this.store = writable<CountdownState>({
      remaining: duration,
      isRunning: false,
      isPaused: false,
      progress: 0
    });
  }

  start(): void {
    if (this.isRunning && !this.isPaused) return;

    if (this.isPaused) {
      // Resume from paused state
      this.startTime = Date.now() - (this.duration - this.remaining);
      this.isPaused = false;
    } else {
      // Start fresh
      this.startTime = Date.now();
      this.remaining = this.duration;
    }

    this.isRunning = true;
    this.updateStore();

    // Add interval for ticking
    this.timerManager.addInterval(this.id, () => this.tick(), 100);
    this.timerManager.startInterval(this.id);
  }

  private tick(): void {
    if (!this.isRunning || this.isPaused) return;

    const elapsed = Date.now() - this.startTime;
    this.remaining = Math.max(0, this.duration - elapsed);
    
    const progress = ((this.duration - this.remaining) / this.duration) * 100;
    
    this.updateStore();
    
    if (this.onTick) {
      this.onTick(Math.ceil(this.remaining / 1000)); // Return seconds
    }

    if (this.remaining <= 0) {
      this.complete();
    }
  }

  private complete(): void {
    this.stop();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    
    this.isPaused = true;
    this.pausedTime = Date.now();
    this.timerManager.stopInterval(this.id);
    this.updateStore();
  }

  resume(): void {
    if (!this.isPaused) return;
    this.start();
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.remaining = this.duration;
    this.timerManager.stopInterval(this.id);
    this.timerManager.removeInterval(this.id);
    this.updateStore();
  }

  reset(): void {
    this.stop();
    this.remaining = this.duration;
    this.updateStore();
  }

  getRemainingSeconds(): number {
    return Math.ceil(this.remaining / 1000);
  }

  getRemainingTime(): { minutes: number; seconds: number } {
    const totalSeconds = this.getRemainingSeconds();
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60
    };
  }

  getProgress(): number {
    return ((this.duration - this.remaining) / this.duration) * 100;
  }

  private updateStore(): void {
    this.store.set({
      remaining: this.remaining,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      progress: this.getProgress()
    });
  }

  destroy(): void {
    this.stop();
  }
}

// Factory function for creating countdown timers
export function createCountdownTimer(
  id: string,
  durationInSeconds: number,
  onTick?: (remaining: number) => void,
  onComplete?: () => void
): CountdownTimer {
  return new CountdownTimer(id, durationInSeconds * 1000, onTick, onComplete);
}