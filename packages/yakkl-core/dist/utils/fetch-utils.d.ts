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
 * Robust fetch with exponential backoff and retry logic
 */
export declare function fetchWithRetry<T = any>(url: string, options?: FetchOptions): Promise<FetchResponse<T>>;
/**
 * Convenience function for JSON APIs
 */
export declare function fetchJson<T = any>(url: string, options?: FetchOptions): Promise<T>;
/**
 * Convenience function for simple GET requests
 */
export declare function get<T = any>(url: string, options?: Omit<FetchOptions, 'method'>): Promise<FetchResponse<T>>;
/**
 * Convenience function for POST requests
 */
export declare function post<T = any>(url: string, body?: any, options?: Omit<FetchOptions, 'method' | 'body'>): Promise<FetchResponse<T>>;
/**
 * Batch fetch with concurrency control
 */
export declare function fetchBatch<T = any>(urls: string[], options?: FetchOptions & {
    concurrency?: number;
}): Promise<FetchResponse<T>[]>;
/**
 * Export default instance with sensible defaults
 */
declare const _default: {
    fetch: typeof fetchWithRetry;
    json: typeof fetchJson;
    get: typeof get;
    post: typeof post;
    batch: typeof fetchBatch;
};
export default _default;
//# sourceMappingURL=fetch-utils.d.ts.map