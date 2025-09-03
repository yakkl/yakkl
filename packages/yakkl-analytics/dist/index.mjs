class EventTracker {
  constructor(options = {}) {
    this.events = [];
    this.options = {
      enabled: options.enabled ?? true,
      batchSize: options.batchSize ?? 50,
      flushInterval: options.flushInterval ?? 3e4,
      // 30 seconds
      endpoint: options.endpoint ?? "",
      logger: options.logger ?? console,
      privacyMode: options.privacyMode ?? "balanced"
    };
    this.sessionId = this.generateSessionId();
    this.isEnabled = this.options.enabled;
    if (this.isEnabled) {
      this.startFlushTimer();
    }
  }
  /**
   * Track an event
   */
  track(name, category, properties) {
    if (!this.isEnabled) return;
    const event = {
      name: this.sanitizeName(name),
      category: this.sanitizeCategory(category),
      properties: this.sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    this.events.push(event);
    if (this.events.length >= this.options.batchSize) {
      this.flush();
    }
  }
  /**
   * Track page view
   */
  trackPageView(page, properties) {
    this.track("page_view", "navigation", {
      page: this.sanitizePath(page),
      ...properties
    });
  }
  /**
   * Track user action
   */
  trackAction(action, target, properties) {
    this.track("user_action", "interaction", {
      action,
      target,
      ...properties
    });
  }
  /**
   * Track error
   */
  trackError(error, context) {
    if (this.options.privacyMode === "strict") {
      return;
    }
    this.track("error", "system", {
      message: this.sanitizeError(error.message),
      stack: this.options.privacyMode === "minimal" ? void 0 : this.sanitizeError(error.stack),
      ...context
    });
  }
  /**
   * Track performance metric
   */
  trackPerformance(metric, value, unit = "ms") {
    this.track("performance", "metrics", {
      metric,
      value,
      unit
    });
  }
  /**
   * Flush events to backend
   */
  async flush() {
    if (this.events.length === 0 || !this.options.endpoint) {
      return;
    }
    const eventsToSend = [...this.events];
    this.events = [];
    try {
      await this.sendEvents(eventsToSend);
    } catch (error) {
      this.options.logger.error("Failed to send analytics events:", error);
      this.events.unshift(...eventsToSend);
    }
  }
  /**
   * Enable tracking
   */
  enable() {
    this.isEnabled = true;
    this.startFlushTimer();
  }
  /**
   * Disable tracking
   */
  disable() {
    this.isEnabled = false;
    this.stopFlushTimer();
    this.events = [];
  }
  /**
   * Clear all tracked events
   */
  clear() {
    this.events = [];
  }
  /**
   * Destroy tracker
   */
  destroy() {
    this.disable();
    this.clear();
  }
  /**
   * Send events to backend
   */
  async sendEvents(events) {
    if (!this.options.endpoint) return;
    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        events,
        metadata: {
          sessionId: this.sessionId,
          timestamp: Date.now(),
          privacyMode: this.options.privacyMode
        }
      })
    });
    if (!response.ok) {
      throw new Error(`Analytics request failed: ${response.status}`);
    }
  }
  /**
   * Start flush timer
   */
  startFlushTimer() {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }
  /**
   * Stop flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = void 0;
    }
  }
  /**
   * Generate session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
  /**
   * Sanitize event name
   */
  sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 100);
  }
  /**
   * Sanitize category
   */
  sanitizeCategory(category) {
    return category.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 50);
  }
  /**
   * Sanitize properties based on privacy mode
   */
  sanitizeProperties(properties) {
    if (!properties) return void 0;
    const sanitized = {};
    for (const [key, value] of Object.entries(properties)) {
      if (this.options.privacyMode === "strict") {
        if (this.isSensitiveField(key)) continue;
      }
      if (typeof value === "string") {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        sanitized[key] = value;
      } else if (value === null || value === void 0) {
        sanitized[key] = null;
      } else {
        sanitized[key] = JSON.stringify(value).substring(0, 500);
      }
    }
    return sanitized;
  }
  /**
   * Sanitize path (remove sensitive parts)
   */
  sanitizePath(path) {
    return path.split("?")[0].split("#")[0];
  }
  /**
   * Sanitize error message
   */
  sanitizeError(message) {
    if (!message) return void 0;
    return message.replace(/0x[a-fA-F0-9]+/g, "0x...").replace(/\b\d{4,}\b/g, "****").replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***").substring(0, 500);
  }
  /**
   * Check if field name is sensitive
   */
  isSensitiveField(field) {
    const sensitive = [
      "password",
      "secret",
      "key",
      "token",
      "auth",
      "private",
      "seed",
      "mnemonic",
      "pin",
      "ssn",
      "credit",
      "card",
      "cvv",
      "address"
    ];
    const fieldLower = field.toLowerCase();
    return sensitive.some((s) => fieldLower.includes(s));
  }
  /**
   * Sanitize string value
   */
  sanitizeString(value) {
    return value.substring(0, 200);
  }
}
class MetricsCollector {
  constructor(options = {}) {
    this.metrics = /* @__PURE__ */ new Map();
    this.options = {
      aggregationInterval: options.aggregationInterval ?? 6e4,
      // 1 minute
      maxMetrics: options.maxMetrics ?? 1e3,
      calculatePercentiles: options.calculatePercentiles ?? true
    };
    this.startAggregationTimer();
  }
  /**
   * Record a metric
   */
  record(name, value, unit = "count", tags) {
    const key = this.getMetricKey(name, tags);
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    const metrics = this.metrics.get(key);
    metrics.push({
      name,
      value,
      unit,
      tags,
      timestamp: Date.now()
    });
    if (metrics.length > this.options.maxMetrics) {
      metrics.shift();
    }
  }
  /**
   * Record timing metric
   */
  recordTiming(name, duration, tags) {
    this.record(name, duration, "ms", tags);
  }
  /**
   * Record counter metric
   */
  recordCounter(name, count = 1, tags) {
    this.record(name, count, "count", tags);
  }
  /**
   * Record gauge metric
   */
  recordGauge(name, value, tags) {
    this.record(name, value, "gauge", tags);
  }
  /**
   * Start timing
   */
  startTiming() {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      return duration;
    };
  }
  /**
   * Time a function execution
   */
  async timeFunction(name, fn, tags) {
    const endTiming = this.startTiming();
    try {
      const result = await fn();
      const duration = endTiming();
      this.recordTiming(name, duration, tags);
      return result;
    } catch (error) {
      const duration = endTiming();
      this.recordTiming(name, duration, { ...tags, error: "true" });
      throw error;
    }
  }
  /**
   * Get aggregated metrics
   */
  getAggregated() {
    const aggregated = [];
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;
      const values = metrics.map((m) => m.value);
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const aggregate = {
        name: metrics[0].name,
        count: metrics.length,
        sum,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: sum / metrics.length,
        tags: metrics[0].tags
      };
      if (this.options.calculatePercentiles && sorted.length > 0) {
        aggregate.p50 = this.getPercentile(sorted, 50);
        aggregate.p95 = this.getPercentile(sorted, 95);
        aggregate.p99 = this.getPercentile(sorted, 99);
      }
      aggregated.push(aggregate);
    }
    return aggregated;
  }
  /**
   * Get raw metrics
   */
  getRaw(name, tags) {
    if (!name) {
      const all = [];
      for (const metrics of this.metrics.values()) {
        all.push(...metrics);
      }
      return all;
    }
    const key = this.getMetricKey(name, tags);
    return this.metrics.get(key) || [];
  }
  /**
   * Clear metrics
   */
  clear(name, tags) {
    if (!name) {
      this.metrics.clear();
      return;
    }
    const key = this.getMetricKey(name, tags);
    this.metrics.delete(key);
  }
  /**
   * Clear old metrics
   */
  clearOld(maxAge) {
    const cutoff = Date.now() - maxAge;
    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter((m) => m.timestamp > cutoff);
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else if (filtered.length < metrics.length) {
        this.metrics.set(key, filtered);
      }
    }
  }
  /**
   * Export metrics
   */
  export() {
    const aggregated = this.getAggregated();
    return JSON.stringify(aggregated, null, 2);
  }
  /**
   * Destroy collector
   */
  destroy() {
    this.stopAggregationTimer();
    this.clear();
  }
  /**
   * Get metric key
   */
  getMetricKey(name, tags) {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }
    const tagString = Object.entries(tags).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join(",");
    return `${name}#${tagString}`;
  }
  /**
   * Calculate percentile
   */
  getPercentile(sorted, percentile) {
    const index = Math.ceil(percentile / 100 * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  /**
   * Start aggregation timer
   */
  startAggregationTimer() {
    this.stopAggregationTimer();
    this.aggregationTimer = setInterval(() => {
      this.clearOld(5 * 60 * 1e3);
    }, this.options.aggregationInterval);
  }
  /**
   * Stop aggregation timer
   */
  stopAggregationTimer() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = void 0;
    }
  }
}
const globalMetrics = new MetricsCollector();
class PrivacyManager {
  constructor() {
    this.storageKey = "yakkl_privacy_settings";
    this.consentKey = "yakkl_privacy_consent";
    this.settings = this.loadSettings();
    this.consent = this.loadConsent();
  }
  /**
   * Get current privacy settings
   */
  getSettings() {
    return { ...this.settings };
  }
  /**
   * Update privacy settings
   */
  updateSettings(settings) {
    this.settings = {
      ...this.settings,
      ...settings
    };
    this.saveSettings();
    this.applyPrivacyLevel();
  }
  /**
   * Set privacy level
   */
  setPrivacyLevel(level) {
    this.settings.level = level;
    this.applyPrivacyLevel();
    this.saveSettings();
  }
  /**
   * Get user consent
   */
  getConsent() {
    return { ...this.consent };
  }
  /**
   * Update user consent
   */
  updateConsent(consent) {
    this.consent = {
      ...this.consent,
      ...consent
    };
    this.saveConsent();
    this.updateSettingsFromConsent();
  }
  /**
   * Check if tracking is allowed
   */
  canTrack(category) {
    if (this.settings.level === "off") return false;
    switch (category) {
      case "error":
        return this.settings.allowErrorTracking && this.consent.essential;
      case "performance":
        return this.settings.allowPerformanceTracking && this.consent.performance;
      case "usage":
        return this.settings.allowUsageTracking && this.consent.usage;
      case "personalization":
        return this.settings.allowPersonalization && this.consent.personalization;
      default:
        return false;
    }
  }
  /**
   * Anonymize data
   */
  anonymize(data) {
    if (!this.settings.anonymizeData) return data;
    const anonymized = { ...data };
    const piiFields = ["email", "name", "phone", "address", "ip", "userId", "walletAddress"];
    for (const field of piiFields) {
      if (field in anonymized) {
        anonymized[field] = this.hashValue(String(anonymized[field]));
      }
    }
    for (const [key, value] of Object.entries(anonymized)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        anonymized[key] = this.anonymize(value);
      }
    }
    return anonymized;
  }
  /**
   * Apply differential privacy
   */
  applyDifferentialPrivacy(value, epsilon = 1) {
    const scale = 1 / epsilon;
    const noise = this.laplaceSample(scale);
    return value + noise;
  }
  /**
   * Reset all privacy settings
   */
  reset() {
    this.settings = this.getDefaultSettings();
    this.consent = this.getDefaultConsent();
    this.saveSettings();
    this.saveConsent();
  }
  /**
   * Clear all stored data
   */
  clearData() {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      const storage = globalThis.localStorage;
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith("yakkl_analytics_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => storage.removeItem(key));
    }
  }
  /**
   * Export privacy report
   */
  exportPrivacyReport() {
    return JSON.stringify({
      settings: this.settings,
      consent: this.consent,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      dataCategories: {
        essential: this.consent.essential ? "Collected" : "Not collected",
        performance: this.consent.performance ? "Collected" : "Not collected",
        usage: this.consent.usage ? "Collected" : "Not collected",
        personalization: this.consent.personalization ? "Collected" : "Not collected"
      }
    }, null, 2);
  }
  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      level: "balanced",
      allowErrorTracking: true,
      allowPerformanceTracking: true,
      allowUsageTracking: false,
      allowPersonalization: false,
      anonymizeData: true,
      dataRetentionDays: 30
    };
  }
  /**
   * Get default consent
   */
  getDefaultConsent() {
    return {
      essential: true,
      performance: false,
      usage: false,
      personalization: false
    };
  }
  /**
   * Load settings from storage
   */
  loadSettings() {
    if (typeof globalThis === "undefined" || !globalThis.localStorage) {
      return this.getDefaultSettings();
    }
    try {
      const stored = globalThis.localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load privacy settings:", error);
    }
    return this.getDefaultSettings();
  }
  /**
   * Save settings to storage
   */
  saveSettings() {
    if (typeof globalThis === "undefined" || !globalThis.localStorage) return;
    try {
      globalThis.localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
    }
  }
  /**
   * Load consent from storage
   */
  loadConsent() {
    if (typeof globalThis === "undefined" || !globalThis.localStorage) {
      return this.getDefaultConsent();
    }
    try {
      const stored = globalThis.localStorage.getItem(this.consentKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load consent:", error);
    }
    return this.getDefaultConsent();
  }
  /**
   * Save consent to storage
   */
  saveConsent() {
    if (typeof globalThis === "undefined" || !globalThis.localStorage) return;
    try {
      globalThis.localStorage.setItem(this.consentKey, JSON.stringify(this.consent));
    } catch (error) {
      console.error("Failed to save consent:", error);
    }
  }
  /**
   * Apply privacy level presets
   */
  applyPrivacyLevel() {
    switch (this.settings.level) {
      case "off":
        this.settings.allowErrorTracking = false;
        this.settings.allowPerformanceTracking = false;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;
      case "essential":
        this.settings.allowErrorTracking = true;
        this.settings.allowPerformanceTracking = false;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;
      case "balanced":
        this.settings.allowErrorTracking = true;
        this.settings.allowPerformanceTracking = true;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;
      case "full":
        this.settings.allowErrorTracking = true;
        this.settings.allowPerformanceTracking = true;
        this.settings.allowUsageTracking = true;
        this.settings.allowPersonalization = true;
        this.settings.anonymizeData = false;
        break;
    }
  }
  /**
   * Update settings from consent
   */
  updateSettingsFromConsent() {
    if (!this.consent.essential) {
      this.settings.allowErrorTracking = false;
    }
    if (!this.consent.performance) {
      this.settings.allowPerformanceTracking = false;
    }
    if (!this.consent.usage) {
      this.settings.allowUsageTracking = false;
    }
    if (!this.consent.personalization) {
      this.settings.allowPersonalization = false;
    }
    this.saveSettings();
  }
  /**
   * Hash value for anonymization
   */
  hashValue(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }
  /**
   * Sample from Laplace distribution
   */
  laplaceSample(scale) {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
const privacyManager = new PrivacyManager();
class AnalyticsManager {
  constructor(config = {}) {
    this.config = config;
    this.sessionStartTime = Date.now();
    this.privacyManager = new PrivacyManager();
    if (config.privacyLevel) {
      this.privacyManager.setPrivacyLevel(config.privacyLevel);
    }
    this.eventTracker = new EventTracker({
      enabled: config.enabled ?? true,
      endpoint: config.endpoint,
      ...config.eventOptions,
      privacyMode: this.mapPrivacyLevelToMode(this.privacyManager.getSettings().level)
    });
    this.metricsCollector = new MetricsCollector(config.metricsOptions);
    this.trackSessionStart();
  }
  /**
   * Track an event
   */
  track(name, category, properties) {
    if (!this.privacyManager.canTrack("usage")) return;
    const sanitized = this.privacyManager.anonymize(properties || {});
    this.eventTracker.track(name, category, sanitized);
  }
  /**
   * Track page view
   */
  trackPageView(page, properties) {
    if (!this.privacyManager.canTrack("usage")) return;
    this.eventTracker.trackPageView(page, properties);
    this.metricsCollector.recordCounter("page_views");
  }
  /**
   * Track user action
   */
  trackAction(action, target, properties) {
    if (!this.privacyManager.canTrack("usage")) return;
    this.eventTracker.trackAction(action, target, properties);
    this.metricsCollector.recordCounter("user_actions", 1, { action });
  }
  /**
   * Track error
   */
  trackError(error, context) {
    if (!this.privacyManager.canTrack("error")) return;
    this.eventTracker.trackError(error, context);
    this.metricsCollector.recordCounter("errors", 1, {
      type: error.name || "Unknown"
    });
  }
  /**
   * Track performance metric
   */
  trackPerformance(metric, value, unit = "ms") {
    if (!this.privacyManager.canTrack("performance")) return;
    this.eventTracker.trackPerformance(metric, value, unit);
    this.metricsCollector.record(metric, value, unit);
  }
  /**
   * Time a function
   */
  async timeFunction(name, fn, tags) {
    if (!this.privacyManager.canTrack("performance")) {
      return fn();
    }
    return this.metricsCollector.timeFunction(name, fn, tags);
  }
  /**
   * Get privacy manager
   */
  getPrivacyManager() {
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
  setPrivacyLevel(level) {
    this.privacyManager.setPrivacyLevel(level);
    this.mapPrivacyLevelToMode(level);
    if (level === "off") {
      this.eventTracker.disable();
    } else {
      this.eventTracker.enable();
    }
  }
  /**
   * Enable analytics
   */
  enable() {
    this.eventTracker.enable();
  }
  /**
   * Disable analytics
   */
  disable() {
    this.eventTracker.disable();
  }
  /**
   * Flush all pending data
   */
  async flush() {
    await this.eventTracker.flush();
  }
  /**
   * Clear all data
   */
  clear() {
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
  destroy() {
    this.eventTracker.destroy();
    this.metricsCollector.destroy();
  }
  /**
   * Track session start
   */
  trackSessionStart() {
    if (!this.privacyManager.canTrack("usage")) return;
    this.track("session_start", "session", {
      timestamp: this.sessionStartTime,
      privacyLevel: this.privacyManager.getSettings().level
    });
  }
  /**
   * Map privacy level to privacy mode
   */
  mapPrivacyLevelToMode(level) {
    switch (level) {
      case "off":
      case "essential":
        return "strict";
      case "balanced":
        return "balanced";
      case "full":
        return "minimal";
      default:
        return "balanced";
    }
  }
}
function createAnalytics(config) {
  return new AnalyticsManager(config);
}
const analytics = createAnalytics({
  enabled: false,
  privacyLevel: "off"
});
const VERSION = "0.1.0";
export {
  AnalyticsManager,
  EventTracker,
  MetricsCollector,
  PrivacyManager,
  VERSION,
  analytics,
  createAnalytics,
  globalMetrics,
  privacyManager
};
//# sourceMappingURL=index.mjs.map
