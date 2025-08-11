/**
 * Lean logger for v2
 * - Debug/info logs only in development
 * - Warn/error always kept
 * - Minimal overhead
 */

// Safely check for environment variables
const isDev = (() => {
  try {
    // Check various development indicators
    // @ts-ignore
    if (typeof __DEV__ !== 'undefined') return __DEV__;
    // @ts-ignore
    if (typeof DEV_MODE !== 'undefined') return DEV_MODE === true || DEV_MODE === 'true';
    // Try to check import.meta if available
    try {
      // @ts-ignore
      if (import.meta && import.meta.env && import.meta.env.DEV) {
        // @ts-ignore
        return import.meta.env.DEV;
      }
    } catch {}
    return false;
  } catch {
    return false;
  }
})();

const LOG_LEVEL = (() => {
  try {
    // Try to check import.meta.env.VITE_LOG_LEVEL if available
    try {
      // @ts-ignore
      if (import.meta && import.meta.env && import.meta.env.VITE_LOG_LEVEL) {
        // @ts-ignore
        return import.meta.env.VITE_LOG_LEVEL;
      }
    } catch {}
    // Check for webpack-defined __LOG_LEVEL__
    // @ts-ignore
    if (typeof __LOG_LEVEL__ !== 'undefined') {
      // @ts-ignore
      return __LOG_LEVEL__.toLowerCase().replace(/['"]/g, '');
    }
    return 'warn';
  } catch {
    return 'warn';
  }
})() as 'debug' | 'info' | 'warn' | 'error';

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;

const currentLevel = LEVELS[LOG_LEVEL];

class Logger {
  private prefix: string;

  constructor(prefix = '[YAKKL]') {
    this.prefix = prefix;
  }

  debug(...args: any[]) {
    if (isDev && currentLevel <= LEVELS.debug) {
      console.debug(this.prefix, ...args);
    }
  }

  info(...args: any[]) {
    if (isDev && currentLevel <= LEVELS.info) {
      console.info(this.prefix, ...args);
    }
  }

  warn(...args: any[]) {
    // Always keep warnings
    console.warn(this.prefix, ...args);
  }

  error(...args: any[]) {
    // Always keep errors
    console.error(this.prefix, ...args);
  }

  // Create a child logger with additional prefix
  child(childPrefix: string) {
    return new Logger(`${this.prefix} ${childPrefix}`);
  }
}

// Export singleton instance
export const log = new Logger();

// Export class for creating specialized loggers
export { Logger };