/**
 * Robust fetch utility with exponential backoff, retry logic, and comprehensive error handling
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry attempts
 * - Request/response logging
 * - Timeout support
 * - Automatic JSON parsing
 * - CORS mode configuration
 * - Works in all environments (browser, service worker, Node.js)
 */

export interface FetchOptions extends RequestInit {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  timeout?: number;
  retryOn?: number[];
  parseJson?: boolean;
  logLevel?: 'none' | 'error' | 'warn' | 'info' | 'debug';
  onRetry?: (attempt: number, error: any) => void;
}

export interface FetchResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
  headers?: Headers;
  attempts: number;
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number, initialDelay: number, maxDelay: number): number {
  // Exponential backoff: 2^attempt * initialDelay
  const exponentialDelay = Math.min(Math.pow(2, attempt) * initialDelay, maxDelay);
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * Math.random();
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Simple logger that works in all environments
 */
function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[FetchUtils] [${timestamp}]`;

  switch (level) {
    case 'error':
      console.error(prefix, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, message, data || '');
      break;
    case 'info':
      console.info(prefix, message, data || '');
      break;
    case 'debug':
      console.log(prefix, message, data || '');
      break;
  }
}

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Robust fetch with exponential backoff and retry logic
 */
export async function fetchWithRetry<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResponse<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    timeout = 30000,
    retryOn = [408, 429, 500, 502, 503, 504],
    parseJson = true,
    logLevel = 'warn',
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: any;
  let attempts = 0;

  // Ensure headers are set properly
  const headers = new Headers(fetchOptions.headers || {});
  if (parseJson && !headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (parseJson && !headers.has('Content-Type') && fetchOptions.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    attempts = attempt + 1;

    try {
      if (attempt > 0) {
        const delay = calculateBackoff(attempt - 1, initialDelay, maxDelay);

        if (logLevel === 'debug' || logLevel === 'info') {
          log('info', `Retry attempt ${attempt}/${maxRetries} after ${delay}ms`, { url });
        }

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }

      if (logLevel === 'debug') {
        log('debug', `Fetching URL`, {
          url,
          method: fetchOptions.method || 'GET',
          attempt: attempts
        });
      }

      // Create timeout controller
      const controller = timeout ? createTimeoutController(timeout) : null;

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller?.signal || fetchOptions.signal
      });

      if (logLevel === 'debug') {
        log('debug', `Response received`, {
          url,
          status: response.status,
          attempt: attempts
        });
      }

      // Check if we should retry based on status code
      if (!response.ok && retryOn.includes(response.status) && attempt < maxRetries) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

        if (logLevel !== 'none') {
          log('warn', `Retryable error occurred`, {
            url,
            status: response.status,
            attempt: attempts
          });
        }

        continue;
      }

      // Parse response
      let data: T | undefined;

      if (parseJson) {
        try {
          const text = await response.text();
          if (text) {
            data = JSON.parse(text);
          }
        } catch (parseError) {
          if (response.ok) {
            // Only treat parse errors as failures for successful responses
            throw new Error(`Failed to parse JSON response: ${parseError}`);
          }
          // For error responses, we'll return the error status without parsed data
        }
      } else {
        data = await response.text() as any;
      }

      // Return successful response or error response
      if (response.ok) {
        if (logLevel === 'debug' || logLevel === 'info') {
          log('info', `Request successful`, { url, attempts });
        }

        return {
          data,
          status: response.status,
          headers: response.headers,
          attempts
        };
      } else {
        // Non-retryable error response
        const error = `HTTP ${response.status}: ${response.statusText}`;

        if (logLevel !== 'none') {
          log('error', `Request failed`, {
            url,
            status: response.status,
            error,
            attempts
          });
        }

        return {
          error,
          status: response.status,
          headers: response.headers,
          attempts,
          data // Include any error response data
        };
      }
    } catch (error: any) {
      lastError = error;

      // Check if it's a timeout error
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
      }

      if (logLevel !== 'none' && logLevel !== 'error') {
        log('warn', `Request error`, {
          url,
          error: lastError.message,
          attempt: attempts
        });
      }

      // If this is the last attempt, return the error
      if (attempt === maxRetries) {
        if (logLevel !== 'none') {
          log('error', `All retry attempts exhausted`, {
            url,
            error: lastError.message,
            attempts
          });
        }

        return {
          error: lastError.message,
          status: 0,
          attempts
        };
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  return {
    error: 'Unknown error occurred',
    status: 0,
    attempts
  };
}

/**
 * Convenience function for JSON APIs
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry<T>(url, {
    ...options,
    parseJson: true
  });

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.data) {
    throw new Error('No data received');
  }

  return response.data;
}

/**
 * Convenience function for simple GET requests
 */
export async function get<T = any>(
  url: string,
  options?: Omit<FetchOptions, 'method'>
): Promise<FetchResponse<T>> {
  return fetchWithRetry<T>(url, {
    ...options,
    method: 'GET'
  });
}

/**
 * Convenience function for POST requests
 */
export async function post<T = any>(
  url: string,
  body?: any,
  options?: Omit<FetchOptions, 'method' | 'body'>
): Promise<FetchResponse<T>> {
  return fetchWithRetry<T>(url, {
    ...options,
    method: 'POST',
    body: typeof body === 'object' ? JSON.stringify(body) : body
  });
}

/**
 * Batch fetch with concurrency control
 */
export async function fetchBatch<T = any>(
  urls: string[],
  options: FetchOptions & { concurrency?: number } = {}
): Promise<FetchResponse<T>[]> {
  const { concurrency = 3, ...fetchOptions } = options;

  const results: FetchResponse<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const url of urls) {
    const promise = fetchWithRetry<T>(url, fetchOptions).then(result => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.findIndex(p => p === promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Export default instance with sensible defaults
 */
export default {
  fetch: fetchWithRetry,
  json: fetchJson,
  get,
  post,
  batch: fetchBatch
};