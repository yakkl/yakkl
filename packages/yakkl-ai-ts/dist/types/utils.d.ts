/**
 * Utility type definitions
 */
export interface CacheConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'lfu' | 'fifo';
}
export interface CacheEntry<T> {
    key: string;
    value: T;
    timestamp: number;
    hits: number;
    size: number;
}
export interface RetryConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}
export interface PoolConfig<T> {
    factory: () => Promise<T> | T;
    maxSize: number;
    minSize?: number;
    acquireTimeout?: number;
    idleTimeout?: number;
    evictionRunInterval?: number;
    validator?: (resource: T) => boolean;
}
export interface BatchConfig {
    batchSize: number;
    batchTimeout: number;
    maxQueueSize?: number;
}
export interface QueueConfig {
    concurrency: number;
    timeout?: number;
    throwOnTimeout?: boolean;
    autoStart?: boolean;
}
export interface StreamConfig {
    highWaterMark?: number;
    encoding?: BufferEncoding;
    objectMode?: boolean;
}
export interface MetricsCollector {
    requestCount: number;
    errorCount: number;
    successCount: number;
    averageLatency: number;
    p95Latency: number;
    p99Latency: number;
    tokenUsage: {
        total: number;
        prompt: number;
        completion: number;
    };
    cost: {
        total: number;
        byProvider: Record<string, number>;
        byModel: Record<string, number>;
    };
}
export interface LogConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: 'console' | 'file' | 'both';
    filepath?: string;
    maxFileSize?: number;
    maxFiles?: number;
}
export interface TelemetryConfig {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    sampleRate?: number;
    bufferSize?: number;
    flushInterval?: number;
}
export interface ValidationRule<T> {
    field: keyof T;
    validator: (value: any) => boolean;
    message: string;
    optional?: boolean;
}
export interface ValidationResult {
    valid: boolean;
    errors: Array<{
        field: string;
        message: string;
        value?: any;
    }>;
}
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
export type Middleware<T = any> = (context: T, next: () => Promise<void>) => Promise<void>;
export type ErrorHandler = (error: Error, context?: any) => void | Promise<void>;
export type EventHandler<T = any> = (event: T) => void | Promise<void>;
export interface Plugin {
    name: string;
    version: string;
    install: (manager: any) => void | Promise<void>;
    uninstall?: () => void | Promise<void>;
}
//# sourceMappingURL=utils.d.ts.map