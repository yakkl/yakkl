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

export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private options: Required<MetricsCollectorOptions>;
  private aggregationTimer?: NodeJS.Timeout;

  constructor(options: MetricsCollectorOptions = {}) {
    this.options = {
      aggregationInterval: options.aggregationInterval ?? 60000, // 1 minute
      maxMetrics: options.maxMetrics ?? 1000,
      calculatePercentiles: options.calculatePercentiles ?? true
    };

    this.startAggregationTimer();
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    const key = this.getMetricKey(name, tags);
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    
    metrics.push({
      name,
      value,
      unit,
      tags,
      timestamp: Date.now()
    });

    // Limit metrics array size
    if (metrics.length > this.options.maxMetrics) {
      metrics.shift();
    }
  }

  /**
   * Record timing metric
   */
  recordTiming(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(name, duration, 'ms', tags);
  }

  /**
   * Record counter metric
   */
  recordCounter(name: string, count: number = 1, tags?: Record<string, string>): void {
    this.record(name, count, 'count', tags);
  }

  /**
   * Record gauge metric
   */
  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, 'gauge', tags);
  }

  /**
   * Start timing
   */
  startTiming(): () => number {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      return duration;
    };
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const endTiming = this.startTiming();
    
    try {
      const result = await fn();
      const duration = endTiming();
      this.recordTiming(name, duration, tags);
      return result;
    } catch (error) {
      const duration = endTiming();
      this.recordTiming(name, duration, { ...tags, error: 'true' });
      throw error;
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregated(): AggregatedMetric[] {
    const aggregated: AggregatedMetric[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.length === 0) continue;

      const values = metrics.map(m => m.value);
      const sorted = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);

      const aggregate: AggregatedMetric = {
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
  getRaw(name?: string, tags?: Record<string, string>): Metric[] {
    if (!name) {
      const all: Metric[] = [];
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
  clear(name?: string, tags?: Record<string, string>): void {
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
  clearOld(maxAge: number): void {
    const cutoff = Date.now() - maxAge;

    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoff);
      
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
  export(): string {
    const aggregated = this.getAggregated();
    return JSON.stringify(aggregated, null, 2);
  }

  /**
   * Destroy collector
   */
  destroy(): void {
    this.stopAggregationTimer();
    this.clear();
  }

  /**
   * Get metric key
   */
  private getMetricKey(name: string, tags?: Record<string, string>): string {
    if (!tags || Object.keys(tags).length === 0) {
      return name;
    }

    const tagString = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');

    return `${name}#${tagString}`;
  }

  /**
   * Calculate percentile
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start aggregation timer
   */
  private startAggregationTimer(): void {
    this.stopAggregationTimer();
    
    this.aggregationTimer = setInterval(() => {
      // Clear metrics older than 5 minutes
      this.clearOld(5 * 60 * 1000);
    }, this.options.aggregationInterval);
  }

  /**
   * Stop aggregation timer
   */
  private stopAggregationTimer(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }
  }
}

/**
 * Global metrics instance
 */
export const globalMetrics = new MetricsCollector();