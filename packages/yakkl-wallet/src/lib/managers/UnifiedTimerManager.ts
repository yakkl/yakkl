import { log } from '$lib/managers/Logger';

type TimerCallback = () => void;
type DebouncedFunction<T extends (...args: any[]) => void> = T & { cancel: () => void };

// Use ReturnType to get the actual return type of setTimeout/setInterval in the current environment
type TimerId = ReturnType<typeof setTimeout>;

export interface Timer {
	id: string;
	callback: TimerCallback;
	duration: number;
	handle: TimerId | null;
	type: 'interval' | 'timeout';
}

// Simple singleton pattern - no events needed for service worker compatibility

export class UnifiedTimerManager {
	private intervals: Map<string, Timer> = new Map();
	private timeouts: Map<string, Timer> = new Map();
	private static instance: UnifiedTimerManager | null = null;

	constructor() {
		if (UnifiedTimerManager.instance) {
			return UnifiedTimerManager.instance;
		}
		UnifiedTimerManager.instance = this;
	}

	public static getInstance(): UnifiedTimerManager {
		return UnifiedTimerManager.instance ?? new UnifiedTimerManager();
	}

	public static clearInstance(): void {
		if (this.instance) {
			this.instance.clearAll();
		}
		this.instance = null;
	}

	public static resetInstance(): UnifiedTimerManager {
		this.clearInstance();
		return this.getInstance();
	}

	// Interval methods
	addInterval(id: string, callback: TimerCallback, duration: number): void {
		if (this.intervals.has(id)) {
			log.warn(`Interval "${id}" already exists. Clearing existing interval.`);
			this.removeInterval(id);
		}
		this.intervals.set(id, { id, callback, duration, handle: null, type: 'interval' });
	}

	startInterval(id: string, immediate = false): void {
		const timer = this.intervals.get(id);
		if (!timer) return log.error(`Interval "${id}" not found.`);
		if (timer.handle) return log.warn(`Interval "${id}" is already running.`);

		if (immediate) {
			timer.callback();
		}
		timer.handle = setInterval(timer.callback, timer.duration);
	}

	stopInterval(id: string): void {
		const timer = this.intervals.get(id);
		if (!timer) return log.warn(`Interval "${id}" not found.`);
		if (!timer.handle) return log.warn(`Interval "${id}" is not running.`);

		clearInterval(timer.handle);
		timer.handle = null;
	}

	removeInterval(id: string): void {
		this.stopInterval(id);
		this.intervals.delete(id);
	}

	// Timeout methods
	addTimeout(id: string, callback: TimerCallback, duration: number): void {
		if (this.timeouts.has(id)) {
			log.warn(`Timeout "${id}" already exists. Clearing existing timeout.`);
			this.removeTimeout(id);
		}
		this.timeouts.set(id, { id, callback, duration, handle: null, type: 'timeout' });
	}

	startTimeout(id: string): void {
		const timer = this.timeouts.get(id);
		if (!timer) return log.error(`Timeout "${id}" not found.`);
		if (timer.handle) return log.warn(`Timeout "${id}" is already running.`);

		timer.handle = setTimeout(() => {
			timer.callback();
			timer.handle = null;
		}, timer.duration);
	}

	stopTimeout(id: string): void {
		const timer = this.timeouts.get(id);
		if (!timer) return log.warn(`Timeout "${id}" not found.`);
		if (!timer.handle) return log.warn(`Timeout "${id}" is not running.`);

		clearTimeout(timer.handle);
		timer.handle = null;
	}

	removeTimeout(id: string): void {
		this.stopTimeout(id);
		this.timeouts.delete(id);
	}

	// Utility methods
	clearAll(): void {
		// Stop all intervals
		this.intervals.forEach((_, id) => this.stopInterval(id));
		this.intervals.clear();

		// Stop all timeouts
		this.timeouts.forEach((_, id) => this.stopTimeout(id));
		this.timeouts.clear();
	}

	getRunningTimers(): { intervals: string[]; timeouts: string[] } {
		const intervals = Array.from(this.intervals.entries())
			.filter(([_, timer]) => timer.handle !== null)
			.map(([id]) => id);

		const timeouts = Array.from(this.timeouts.entries())
			.filter(([_, timer]) => timer.handle !== null)
			.map(([id]) => id);

		return { intervals, timeouts };
	}

	isIntervalRunning(id: string): boolean {
		return !!this.intervals.get(id)?.handle;
	}

	isTimeoutRunning(id: string): boolean {
		return !!this.timeouts.get(id)?.handle;
	}

	// Backward compatibility methods (delegates to interval methods)
	addTimer(id: string, callback: TimerCallback, duration: number): void {
		this.addInterval(id, callback, duration);
	}

	startTimer(id: string): void {
		this.startInterval(id);
	}

	stopTimer(id: string): void {
		this.stopInterval(id);
	}

	removeTimer(id: string): void {
		this.removeInterval(id);
	}

	hasTimer(id: string): boolean {
		return this.intervals.has(id);
	}

	isRunning(id: string): boolean {
		return this.isIntervalRunning(id);
	}

	// Debounce utility
	static createDebounce<T extends (...args: any[]) => void>(
		func: T,
		delay: number
	): DebouncedFunction<T> {
		let timeoutId: TimerId | null = null;

		const debounced = ((...args: Parameters<T>) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			timeoutId = setTimeout(() => {
				func(...args);
				timeoutId = null;
			}, delay);
		}) as DebouncedFunction<T>;

		debounced.cancel = () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeoutId = null;
			}
		};

		return debounced;
	}

	// Throttle utility
	static createThrottle<T extends (...args: any[]) => void>(func: T, limit: number): T {
		let inThrottle = false;

		return ((...args: Parameters<T>) => {
			if (!inThrottle) {
				func(...args);
				inThrottle = true;
				setTimeout(() => {
					inThrottle = false;
				}, limit);
			}
		}) as T;
	}
}

// Singleton instance
export const unifiedTimerManager = UnifiedTimerManager.getInstance();
