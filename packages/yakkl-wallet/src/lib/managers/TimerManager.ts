import { writable } from "svelte/store";
import { UnifiedTimerManager } from "./UnifiedTimerManager";

type TimerCallback = () => void;

export interface Timer {
  id: string;
  callback: TimerCallback;
  duration: number;
  handleIntervalID: NodeJS.Timeout | null;
}

export const timerManagerStore = writable<TimerManager | null>(null);

// TimerManager wraps UnifiedTimerManager for backward compatibility
export class TimerManager {
  private timers: Map<string, Timer> = new Map();
  private static instance: TimerManager | null = null;
  private unifiedManager: UnifiedTimerManager;

  constructor() {
    if (TimerManager.instance) {
      if (!timerManagerStore) {
        timerManagerStore.set(this);
      }
      return TimerManager.instance;
    }
    this.unifiedManager = UnifiedTimerManager.getInstance();
    TimerManager.instance = this;
    timerManagerStore.set(this);
  }

  public static getInstance(): TimerManager {
    return TimerManager.instance ?? new TimerManager();
  }

  public static clearInstance(): void {
    if (this.instance) {
      this.instance.unifiedManager.clearAll();
    }
    this.instance = null;
    timerManagerStore.set(null);
  }

  public static resetInstance(): TimerManager {
    this.clearInstance();
    return this.getInstance();
  }

  /**
   * Add a new timer.
   * @param id - Unique ID for the timer.
   * @param callback - Function to execute when the timer triggers.
   * @param duration - Duration in milliseconds.
   */
  addTimer(id: string, callback: TimerCallback, duration: number): void {
    // Store locally for backward compatibility
    this.timers.set(id, { id, callback, duration, handleIntervalID: null });
    // Delegate to unified manager
    this.unifiedManager.addInterval(id, callback, duration);
  }

  hasTimer(id: string): boolean {
    return this.timers.has(id);
  }

  /**
   * Start a timer by ID.
   */
  startTimer(id: string): void {
    this.unifiedManager.startInterval(id);
  }

  startTimerDelayed(id: string): void {
    this.unifiedManager.startInterval(id);
  }

  startTimerImmediate(id: string): void {
    this.unifiedManager.startInterval(id, true);
  }

  /**
   * Stop a timer by ID.
   */
  stopTimer(id: string): void {
    this.unifiedManager.stopInterval(id);
  }

  /**
   * Start all timers.
   */
  startAll(): void {
    this.timers.forEach((_, id) => this.unifiedManager.startInterval(id));
  }

  /**
   * Stop all timers.
   */
  stopAll(): void {
    this.timers.forEach((_, id) => this.unifiedManager.stopInterval(id));
  }

  /**
   * Remove a timer by ID.
   */
  removeTimer(id: string): void {
    this.unifiedManager.removeInterval(id);
    this.timers.delete(id);
  }

  /**
   * Remove all timers.
   */
  removeAll(): void {
    this.unifiedManager.clearAll();
    this.timers.clear();
  }

  /**
   * Check if a timer is running.
   */
  isRunning(id: string): boolean {
    return this.unifiedManager.isIntervalRunning(id);
  }

  getTimeoutID(_id: string): NodeJS.Timeout | null {
    // This method name is misleading but kept for backward compatibility
    return null; // UnifiedTimerManager doesn't expose handles directly
  }

  /**
   * List active timers.
   */
  getRunningTimers(): string[] {
    return this.unifiedManager.getRunningTimers().intervals;
  }

  /**
   * List all registered timers.
   */
  listTimers(): string[] {
    return Array.from(this.timers.keys());
  }
}

// Lazy instantiation function to prevent circular dependencies
export const getTimerManager = () => TimerManager.getInstance();