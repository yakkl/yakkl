/**
 * Lean logger for v2
 * - Debug/info logs only in development
 * - Warn/error always kept
 * - Minimal overhead
 */

const isDev = import.meta.env.DEV;
const LOG_LEVEL = (import.meta.env.VITE_LOG_LEVEL || 'warn') as 'debug' | 'info' | 'warn' | 'error';

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