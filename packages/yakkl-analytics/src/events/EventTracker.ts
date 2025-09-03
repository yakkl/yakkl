/**
 * Event Tracking System
 * Privacy-focused event tracking with opt-out support
 */

import type { ILogger } from '@yakkl/core';

export interface TrackedEvent {
  name: string;
  category: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

export interface EventTrackerOptions {
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number;
  endpoint?: string;
  logger?: ILogger;
  privacyMode?: 'strict' | 'balanced' | 'minimal';
}

export class EventTracker {
  private events: TrackedEvent[] = [];
  private options: Required<EventTrackerOptions>;
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;
  private isEnabled: boolean;

  constructor(options: EventTrackerOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      batchSize: options.batchSize ?? 50,
      flushInterval: options.flushInterval ?? 30000, // 30 seconds
      endpoint: options.endpoint ?? '',
      logger: options.logger ?? console,
      privacyMode: options.privacyMode ?? 'balanced'
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
  track(name: string, category: string, properties?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: TrackedEvent = {
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
  trackPageView(page: string, properties?: Record<string, any>): void {
    this.track('page_view', 'navigation', {
      page: this.sanitizePath(page),
      ...properties
    });
  }

  /**
   * Track user action
   */
  trackAction(action: string, target: string, properties?: Record<string, any>): void {
    this.track('user_action', 'interaction', {
      action,
      target,
      ...properties
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    if (this.options.privacyMode === 'strict') {
      // In strict mode, don't track errors
      return;
    }

    this.track('error', 'system', {
      message: this.sanitizeError(error.message),
      stack: this.options.privacyMode === 'minimal' ? undefined : this.sanitizeError(error.stack),
      ...context
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance', 'metrics', {
      metric,
      value,
      unit
    });
  }

  /**
   * Flush events to backend
   */
  async flush(): Promise<void> {
    if (this.events.length === 0 || !this.options.endpoint) {
      return;
    }

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await this.sendEvents(eventsToSend);
    } catch (error) {
      this.options.logger.error('Failed to send analytics events:', error);
      // Re-add events to queue if send failed
      this.events.unshift(...eventsToSend);
    }
  }

  /**
   * Enable tracking
   */
  enable(): void {
    this.isEnabled = true;
    this.startFlushTimer();
  }

  /**
   * Disable tracking
   */
  disable(): void {
    this.isEnabled = false;
    this.stopFlushTimer();
    this.events = [];
  }

  /**
   * Clear all tracked events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Destroy tracker
   */
  destroy(): void {
    this.disable();
    this.clear();
  }

  /**
   * Send events to backend
   */
  private async sendEvents(events: TrackedEvent[]): Promise<void> {
    if (!this.options.endpoint) return;

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Sanitize event name
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
  }

  /**
   * Sanitize category
   */
  private sanitizeCategory(category: string): string {
    return category.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
  }

  /**
   * Sanitize properties based on privacy mode
   */
  private sanitizeProperties(properties?: Record<string, any>): Record<string, any> | undefined {
    if (!properties) return undefined;

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Skip sensitive fields in strict mode
      if (this.options.privacyMode === 'strict') {
        if (this.isSensitiveField(key)) continue;
      }

      // Sanitize values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value === null || value === undefined) {
        sanitized[key] = null;
      } else {
        // For objects/arrays, stringify with limit
        sanitized[key] = JSON.stringify(value).substring(0, 500);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize path (remove sensitive parts)
   */
  private sanitizePath(path: string): string {
    // Remove query parameters and hashes
    return path.split('?')[0].split('#')[0];
  }

  /**
   * Sanitize error message
   */
  private sanitizeError(message?: string): string | undefined {
    if (!message) return undefined;
    
    // Remove potential sensitive data patterns
    return message
      .replace(/0x[a-fA-F0-9]+/g, '0x...')  // Hide addresses
      .replace(/\b\d{4,}\b/g, '****')       // Hide long numbers
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***') // Hide emails
      .substring(0, 500);
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(field: string): boolean {
    const sensitive = [
      'password', 'secret', 'key', 'token', 'auth',
      'private', 'seed', 'mnemonic', 'pin', 'ssn',
      'credit', 'card', 'cvv', 'address'
    ];
    
    const fieldLower = field.toLowerCase();
    return sensitive.some(s => fieldLower.includes(s));
  }

  /**
   * Sanitize string value
   */
  private sanitizeString(value: string): string {
    return value.substring(0, 200);
  }
}