/**
 * Analytics Manager
 * Main entry point for YAKKL analytics
 */
import { type EventTrackerOptions } from './events/EventTracker';
import { type MetricsCollectorOptions } from './metrics/MetricsCollector';
import { PrivacyManager, type PrivacyLevel } from './privacy/PrivacyManager';
export interface AnalyticsConfig {
    enabled?: boolean;
    endpoint?: string;
    privacyLevel?: PrivacyLevel;
    eventOptions?: EventTrackerOptions;
    metricsOptions?: MetricsCollectorOptions;
}
export declare class AnalyticsManager {
    private eventTracker;
    private metricsCollector;
    private privacyManager;
    private config;
    private sessionStartTime;
    constructor(config?: AnalyticsConfig);
    /**
     * Track an event
     */
    track(name: string, category: string, properties?: Record<string, any>): void;
    /**
     * Track page view
     */
    trackPageView(page: string, properties?: Record<string, any>): void;
    /**
     * Track user action
     */
    trackAction(action: string, target: string, properties?: Record<string, any>): void;
    /**
     * Track error
     */
    trackError(error: Error, context?: Record<string, any>): void;
    /**
     * Track performance metric
     */
    trackPerformance(metric: string, value: number, unit?: string): void;
    /**
     * Time a function
     */
    timeFunction<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T>;
    /**
     * Get privacy manager
     */
    getPrivacyManager(): PrivacyManager;
    /**
     * Get metrics
     */
    getMetrics(): {
        aggregated: import("./metrics/MetricsCollector").AggregatedMetric[];
        sessionDuration: number;
    };
    /**
     * Update privacy level
     */
    setPrivacyLevel(level: PrivacyLevel): void;
    /**
     * Enable analytics
     */
    enable(): void;
    /**
     * Disable analytics
     */
    disable(): void;
    /**
     * Flush all pending data
     */
    flush(): Promise<void>;
    /**
     * Clear all data
     */
    clear(): void;
    /**
     * Export analytics data
     */
    export(): {
        metrics: string;
        privacy: string;
        sessionInfo: {
            startTime: number;
            duration: number;
        };
    };
    /**
     * Destroy analytics
     */
    destroy(): void;
    /**
     * Track session start
     */
    private trackSessionStart;
    /**
     * Map privacy level to privacy mode
     */
    private mapPrivacyLevelToMode;
}
/**
 * Create analytics instance
 */
export declare function createAnalytics(config?: AnalyticsConfig): AnalyticsManager;
/**
 * Default analytics instance (disabled by default for privacy)
 */
export declare const analytics: AnalyticsManager;
