/**
 * @yakkl/analytics
 * Privacy-focused analytics for YAKKL ecosystem
 */
export { AnalyticsManager, createAnalytics, analytics, type AnalyticsConfig } from './AnalyticsManager';
export { EventTracker, type TrackedEvent, type EventTrackerOptions } from './events/EventTracker';
export { MetricsCollector, globalMetrics, type Metric, type AggregatedMetric, type MetricsCollectorOptions } from './metrics/MetricsCollector';
export { PrivacyManager, privacyManager, type PrivacyLevel, type PrivacySettings, type ConsentOptions } from './privacy/PrivacyManager';
export declare const VERSION = "0.1.0";
