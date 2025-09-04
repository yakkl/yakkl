/**
 * Timing utilities for controlling reactive updates
 */

/**
 * Debounce a function - delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function debounced(...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      fn(...args);
    }, wait);
  };
}

/**
 * Throttle a function - ensures it's called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;
  
  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Request animation frame wrapper for smooth updates
 */
export function rafUpdate(fn: () => void): () => void {
  let rafId: number | null = null;
  
  const update = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      rafId = null;
      fn();
    });
  };
  
  update();
  
  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

/**
 * Delay execution by specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a timeout that can be cancelled
 */
export function createTimeout(fn: () => void, ms: number): () => void {
  const timeout = setTimeout(fn, ms);
  return () => clearTimeout(timeout);
}