### AI Code Assistants with real results

# 🔧 Centralizing Timer Logic in a Complex Codebase (AI-Assisted Plan)

_This AI-generated analysis outlines a clear plan to refactor and centralize all `setInterval`, `setTimeout`, and related logic into a unified timer management system._

---

## 🧠 AI Codebase Review Summary

Analyzed 74 files in: packages/yakkl-wallet/src/lib/managers
Examined: TimerManagerInterval.ts, TimerManagerTimeout.ts
Grep search for: setInterval, setTimeout, clearInterval, clearTimeout
Grep search for: TimerManager usage
Reviewed key components: SecurityWarning.svelte, TrialCountdown.svelte, SearchSortControls.svelte, and others

---

## ✅ Plan of Action: Centralize Time-Related Features

### 🔍 Current State

**Timer Managers Found:**

```ts
TimerManager.ts; // Handles intervals
TimerManagerInterval.ts; // Appears to be duplicate
TimerManagerTimeout.ts; // Handles timeouts
```

**TimerManager Usage:**

- ✅ Used in: `prices.ts`, `gas.ts`, `PriceTracker.svelte`, `Swap.svelte`, `tokenPriceManager.ts`, `iconTimer.ts`
- ❌ Most components still use raw `setInterval` or `setTimeout`

---

### 📁 High Priority Files

```text
SecurityWarning.svelte
ExtensionRSSNewsFeed.svelte
RSSNewsFeed.svelte
portListeners.ts
TrialCountdown.svelte
SearchSortControls.svelte
RotatingBanner.svelte
InAppNotifications.svelte
SecurityWarningEnhanced.svelte
```

---

### 🟡 Medium Priority Files

```text
TokenViews.svelte
EditControls.svelte
Copy.svelte
AnimateButton.svelte
uiListeners.ts
backgroundUtils.ts
Sponsorship.svelte
```

---

### 🔹 Low Priority Files

Simple one-off `setTimeout` usages across various files.

---

## 🧱 Enhancements to Timer Managers

### 1. Unified Timer Manager

```ts
export class UnifiedTimerManager {
	private intervals = new Map<string, Timer>();
	private timeouts = new Map<string, Timer>();

	addInterval(id: string, cb: TimerCallback, duration: number): void;
	startInterval(id: string): void;
	stopInterval(id: string): void;

	addTimeout(id: string, cb: TimerCallback, duration: number): void;
	startTimeout(id: string): void;
	stopTimeout(id: string): void;

	clearAll(): void;
	getRunningTimers(): { intervals: string[]; timeouts: string[] };
}
```

---

### 2. Debounce Utility

```ts
export function createDebounce<T extends (...args: any[]) => void>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void;
```

---

### 3. Countdown Timer Class

```ts
export class CountdownTimer {
	constructor(
		id: string,
		duration: number,
		onTick?: (remaining: number) => void,
		onComplete?: () => void
	);
	start(): void;
	pause(): void;
	resume(): void;
	stop(): void;
}
```

---

## 🚦 Implementation Strategy

### Phase 1: Enhance Timer Managers

- ✅ Add unified support for intervals and timeouts
- ✅ Create debounce and countdown timer utilities
- ✅ Maintain backward compatibility

### Phase 2: Migrate High-Priority Components

- Security warnings
- RSS feeds
- Background listeners
- Trial countdowns

### Phase 3: Migrate Medium-Priority Components

- UI animation timers
- Debounce search controls
- Misc. timeouts

### Phase 4: Clean Up Low Priority

- Remove lingering raw timer usage

---

## 💡 Benefits of Centralized Timing

- 🔁 Consistent behavior across the app
- 🧼 Better memory/resource cleanup
- 🔍 Easier debugging and testing
- 🚀 Performance optimizations
- 🧪 Easier mocking in tests

---

## ⚠️ Risk Mitigation

- Backward-compatible transition
- Gradual rollout (per component)
- Comprehensive testing
- Updated internal documentation
