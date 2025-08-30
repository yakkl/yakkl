/**
 * Analytics Manager
 * Main entry point for YAKKL analytics
 */

import { EventTracker, type EventTrackerOptions } from './events/EventTracker';
import { MetricsCollector, type MetricsCollectorOptions } from './metrics/MetricsCollector';
import { PrivacyManager, type PrivacyLevel } from './privacy/PrivacyManager';

export interface AnalyticsConfig {
  enabled?: boolean;
  endpoint?: string;
  privacyLevel?: PrivacyLevel;
  eventOptions?: EventTrackerOptions;
  metricsOptions?: MetricsCollectorOptions;
}

export class AnalyticsManager {
  private eventTracker: EventTracker;
  private metricsCollector: MetricsCollector;
  private privacyManager: PrivacyManager;
  private config: AnalyticsConfig;
  private sessionStartTime: number;

  constructor(config: AnalyticsConfig = {}) {
    this.config = config;
    this.sessionStartTime = Date.now();

    // Initialize privacy manager
    this.privacyManager = new PrivacyManager();
    if (config.privacyLevel) {
      this.privacyManager.setPrivacyLevel(config.privacyLevel);
    }

    // Initialize event tracker
    this.eventTracker = new EventTracker({
      enabled: config.enabled ?? true,
      endpoint: config.endpoint,
      ...config.eventOptions,
      privacyMode: this.mapPrivacyLevelToMode(this.privacyManager.getSettings().level)
    });

    // Initialize metrics collector
    this.metricsCollector = new MetricsCollector(config.metricsOptions);

    // Track session start
    this.trackSessionStart();
  }

  /**
   * Track an event
   */
  track(name: string, category: string, properties?: Record<string, any>): void {
    if (!this.privacyManager.canTrack('usage')) return;

    const sanitized = this.privacyManager.anonymize(properties || {});
    this.eventTracker.track(name, category, sanitized);
  }

  /**
   * Track page view
   */
  trackPageView(page: string, properties?: Record<string, any>): void {
    if (!this.privacyManager.canTrack('usage')) return;

    this.eventTracker.trackPageView(page, properties);
    this.metricsCollector.recordCounter('page_views');
  }

  /**
   * Track user action
   */
  trackAction(action: string, target: string, properties?: Record<string, any>): void {
    if (!this.privacyManager.canTrack('usage')) return;

    this.eventTracker.trackAction(action, target, properties);
    this.metricsCollector.recordCounter('user_actions', 1, { action });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (!this.privacyManager.canTrack('error')) return;

    this.eventTracker.trackError(error, context);
    this.metricsCollector.recordCounter('errors', 1, { 
      type: error.name || 'Unknown'
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    if (!this.privacyManager.canTrack('performance')) return;

    this.eventTracker.trackPerformance(metric, value, unit);
    this.metricsCollector.record(metric, value, unit);
  }

  /**
   * Time a function
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    if (!this.privacyManager.canTrack('performance')) {
      return fn();
    }

    return this.metricsCollector.timeFunction(name, fn, tags);
  }

  /**
   * Get privacy manager
   */
  getPrivacyManager(): PrivacyManager {
    return this.privacyManager;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      aggregated: this.metricsCollector.getAggregated(),
      sessionDuration: Date.now() - this.sessionStartTime
    };
  }

  /**
   * Update privacy level
   */
  setPrivacyLevel(level: PrivacyLevel): void {
    this.privacyManager.setPrivacyLevel(level);
    
    // Update event tracker privacy mode
    const mode = this.mapPrivacyLevelToMode(level);
    
    if (level === 'off') {
      this.eventTracker.disable();
    } else {
      this.eventTracker.enable();
    }
  }

  /**
   * Enable analytics
   */
  enable(): void {
    this.eventTracker.enable();
  }

  /**
   * Disable analytics
   */
  disable(): void {
    this.eventTracker.disable();
  }

  /**
   * Flush all pending data
   */
  async flush(): Promise<void> {
    await this.eventTracker.flush();
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.eventTracker.clear();
    this.metricsCollector.clear();
    this.privacyManager.clearData();
  }

  /**
   * Export analytics data
   */
  export() {
    return {
      metrics: this.metricsCollector.export(),
      privacy: this.privacyManager.exportPrivacyReport(),
      sessionInfo: {
        startTime: this.sessionStartTime,
        duration: Date.now() - this.sessionStartTime
      }
    };
  }

  /**
   * Destroy analytics
   */
  destroy(): void {
    this.eventTracker.destroy();
    this.metricsCollector.destroy();
  }

  /**
   * Track session start
   */
  private trackSessionStart(): void {
    if (!this.privacyManager.canTrack('usage')) return;

    this.track('session_start', 'session', {
      timestamp: this.sessionStartTime,
      privacyLevel: this.privacyManager.getSettings().level
    });
  }

  /**
   * Map privacy level to privacy mode
   */
  private mapPrivacyLevelToMode(level: PrivacyLevel): 'strict' | 'balanced' | 'minimal' {
    switch (level) {
      case 'off':
      case 'essential':
        return 'strict';
      case 'balanced':
        return 'balanced';
      case 'full':
        return 'minimal';
      default:
        return 'balanced';
    }
  }
}

/**
 * Create analytics instance
 */
export function createAnalytics(config?: AnalyticsConfig): AnalyticsManager {
  return new AnalyticsManager(config);
}

/**
 * Default analytics instance (disabled by default for privacy)
 */
export const analytics = createAnalytics({
  enabled: false,
  privacyLevel: 'off'
});