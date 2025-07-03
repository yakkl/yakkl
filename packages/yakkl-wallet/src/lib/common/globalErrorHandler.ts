import { log } from './logger-wrapper';
import { browserSvelte } from './environment';

/**
 * Error types that we want to handle gracefully
 */
const GRACEFUL_ERROR_PATTERNS = [
  'Could not establish connection',
  'Receiving end does not exist',
  'Extension context invalidated',
  'The message port closed before a response was received',
  'Cannot access a chrome:// URL',
  'Cannot read properties of null'
];

/**
 * Determines if an error should be handled gracefully (logged as warning)
 * or if it's critical and should be re-thrown
 */
function isGracefulError(error: Error | any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  
  return GRACEFUL_ERROR_PATTERNS.some(pattern => 
    errorMessage.includes(pattern)
  );
}

/**
 * Global handler for unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const error = event.reason;
  
  if (isGracefulError(error)) {
    // These are expected errors when extension context is invalid
    log.debug('Gracefully handled promise rejection:', false, error);
    event.preventDefault(); // Prevent the error from being logged to console
  } else {
    // Critical errors should still be logged
    log.error('Unhandled promise rejection:', false, error);
    // Let it bubble up to default error handling
  }
}

/**
 * Global handler for uncaught errors
 */
function handleUncaughtError(event: ErrorEvent): void {
  const error = event.error;
  
  if (isGracefulError(error)) {
    log.debug('Gracefully handled error:', false, error);
    event.preventDefault(); // Prevent the error from being logged to console
  } else {
    log.error('Uncaught error:', false, error);
    // Let it bubble up to default error handling
  }
}

/**
 * Initializes global error handlers
 */
export function initializeGlobalErrorHandlers(): void {
  if (!browserSvelte) {
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  
  // Handle uncaught errors
  window.addEventListener('error', handleUncaughtError);
  
  log.debug('Global error handlers initialized', false);
}

/**
 * Removes global error handlers
 */
export function cleanupGlobalErrorHandlers(): void {
  if (!browserSvelte) {
    return;
  }

  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  window.removeEventListener('error', handleUncaughtError);
  
  log.debug('Global error handlers cleaned up', false);
}

/**
 * Wraps an async function to catch and handle errors gracefully
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    critical?: boolean;
    fallback?: (...args: Parameters<T>) => ReturnType<T>;
    errorMessage?: string;
  }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (isGracefulError(error) && !options?.critical) {
        log.debug(options?.errorMessage || 'Gracefully handled error:', false, error);
        
        if (options?.fallback) {
          return options.fallback(...args);
        }
        
        return null as any;
      }
      
      // Re-throw critical errors
      throw error;
    }
  }) as T;
}

/**
 * Promise wrapper that catches connection errors gracefully
 */
export function safePromise<T>(
  promise: Promise<T>,
  options?: {
    fallbackValue?: T;
    critical?: boolean;
  }
): Promise<T> {
  return promise.catch((error) => {
    if (isGracefulError(error) && !options?.critical) {
      log.debug('Promise failed gracefully:', false, error);
      return options?.fallbackValue ?? null as T;
    }
    throw error;
  }) as Promise<T>;
}