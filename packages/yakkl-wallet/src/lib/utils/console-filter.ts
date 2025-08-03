// Console filter utility to suppress specific warnings/errors
export function setupConsoleFilters() {
  if (typeof window === 'undefined') return;

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Track if we've already patched to avoid double-patching
  if ((console as any).__filtered) return;
  (console as any).__filtered = true;

  // Patterns to filter out
  const filterPatterns = [
    // Svelte hydration warnings
    /hydration_mismatch/i,
    /node_invalid_placement_ssr/i,
    /cannot be a child of/i,

    // CSP warnings that are expected in extension context
    /Refused to execute inline script/i,
    /Content Security Policy/i,

    // Bits UI specific warnings
    /bits-ui.*floating-layer/i,

    // Other common extension warnings
    /Extension context invalidated/i,
    /Unchecked runtime.lastError/i
  ];

  // Override console.warn
  console.warn = (...args) => {
    const message = args.join(' ');

    // Check if this error should be filtered
    const shouldFilter = filterPatterns.some(pattern => pattern.test(message));

    if (!shouldFilter) {
      originalError.apply(console, args);
    } else {
      // Optionally log to a debug channel
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_CONSOLE === 'true') {
        originalLog('[Filtered Error]', ...args);
      }
    }
  };

  // Override console.warn
  console.warn = (...args) => {
    const message = args.join(' ');

    const shouldFilter = filterPatterns.some(pattern => pattern.test(message));

    if (!shouldFilter) {
      originalWarn.apply(console, args);
    } else {
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_CONSOLE === 'true') {
        originalLog('[Filtered Warning]', ...args);
      }
    }
  };

  // For production, you might want to capture these filtered errors
  // for monitoring purposes
  if (import.meta.env.PROD) {
    window.addEventListener('error', (event) => {
      const shouldFilter = filterPatterns.some(pattern =>
        pattern.test(event.message) || pattern.test(event.error?.stack || '')
      );

      if (shouldFilter) {
        event.preventDefault(); // Prevent the default error handling
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const shouldFilter = filterPatterns.some(pattern =>
        pattern.test(event.reason?.message || '') ||
        pattern.test(event.reason?.stack || '')
      );

      if (shouldFilter) {
        event.preventDefault();
      }
    });
  }
}

// Restore original console methods (useful for debugging)
export function restoreConsole() {
  if (typeof window === 'undefined') return;

  // Note: This requires storing the originals in a broader scope
  // For now, just reload the page to restore
  window.location.reload();
}
