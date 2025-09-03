/**
 * @yakkl/analytics
 * Privacy-focused analytics for YAKKL ecosystem
 */

// Main analytics manager
export { 
  AnalyticsManager, 
  createAnalytics, 
  analytics,
  type AnalyticsConfig 
} from './AnalyticsManager';

// Event tracking
export {
  EventTracker,
  type TrackedEvent,
  type EventTrackerOptions
} from './events/EventTracker';

// Metrics collection  
export {
  MetricsCollector,
  globalMetrics,
  type Metric,
  type AggregatedMetric,
  type MetricsCollectorOptions
} from './metrics/MetricsCollector';

// Privacy management
export {
  PrivacyManager,
  privacyManager,
  type PrivacyLevel,
  type PrivacySettings,
  type ConsentOptions
} from './privacy/PrivacyManager';

// Version
export const VERSION = '0.1.0';