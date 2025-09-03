/**
 * Metrics Collection System
 * Collects and aggregates performance and usage metrics
 */
export interface Metric {
    name: string;
    value: number;
    unit: string;
    tags?: Record<string, string>;
    timestamp: number;
}
export interface AggregatedMetric {
    name: string;
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50?: number;
    p95?: number;
    p99?: number;
    tags?: Record<string, string>;
}
export interface MetricsCollectorOptions {
    aggregationInterval?: number;
    maxMetrics?: number;
    calculatePercentiles?: boolean;
}
export declare class MetricsCollector {
    private metrics;
    private options;
    private aggregationTimer?;
    constructor(options?: MetricsCollectorOptions);
    /**
     * Record a metric
     */
    record(name: string, value: number, unit?: string, tags?: Record<string, string>): void;
    /**
     * Record timing metric
     */
    recordTiming(name: string, duration: number, tags?: Record<string, string>): void;
    /**
     * Record counter metric
     */
    recordCounter(name: string, count?: number, tags?: Record<string, string>): void;
    /**
     * Record gauge metric
     */
    recordGauge(name: string, value: number, tags?: Record<string, string>): void;
    /**
     * Start timing
     */
    startTiming(): () => number;
    /**
     * Time a function execution
     */
    timeFunction<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T>;
    /**
     * Get aggregated metrics
     */
    getAggregated(): AggregatedMetric[];
    /**
     * Get raw metrics
     */
    getRaw(name?: string, tags?: Record<string, string>): Metric[];
    /**
     * Clear metrics
     */
    clear(name?: string, tags?: Record<string, string>): void;
    /**
     * Clear old metrics
     */
    clearOld(maxAge: number): void;
    /**
     * Export metrics
     */
    export(): string;
    /**
     * Destroy collector
     */
    destroy(): void;
    /**
     * Get metric key
     */
    private getMetricKey;
    /**
     * Calculate percentile
     */
    private getPercentile;
    /**
     * Start aggregation timer
     */
    private startAggregationTimer;
    /**
     * Stop aggregation timer
     */
    private stopAggregationTimer;
}
/**
 * Global metrics instance
 */
export declare const globalMetrics: MetricsCollector;
