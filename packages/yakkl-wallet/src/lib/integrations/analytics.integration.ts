/**
 * Analytics Integration
 * Privacy-focused analytics using @yakkl/analytics
 */

import { createAnalytics, type AnalyticsManager } from '@yakkl/analytics';

let analytics: AnalyticsManager | null = null;

/**
 * Initialize analytics with user preferences
 */
export function initializeAnalytics(): AnalyticsManager {
  // Default configuration - can be updated later with user preferences
  analytics = createAnalytics({
    enabled: false, // Disabled by default for privacy
    privacyLevel: 'balanced',
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || '',
    eventOptions: {
      batchSize: 50,
      flushInterval: 30000
    },
    metricsOptions: {
      aggregationInterval: 60000,
      calculatePercentiles: true
    }
  });

  return analytics;
}

/**
 * Track wallet events
 */
export function trackEvent(name: string, category: string, properties?: Record<string, any>): void {
  analytics?.track(name, category, properties);
}

/**
 * Track errors
 */
export function trackError(error: Error, context?: Record<string, any>): void {
  analytics?.trackError(error, context);
}

/**
 * Track performance metrics
 */
export function trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
  analytics?.trackPerformance(metric, value, unit);
}

/**
 * Get analytics instance
 */
export function getAnalytics(): AnalyticsManager | null {
  return analytics;
}

// Export types
export type { PrivacyLevel, PrivacySettings, ConsentOptions } from '@yakkl/analytics';