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
export declare class EventTracker {
    private events;
    private options;
    private flushTimer?;
    private sessionId;
    private isEnabled;
    constructor(options?: EventTrackerOptions);
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
     * Flush events to backend
     */
    flush(): Promise<void>;
    /**
     * Enable tracking
     */
    enable(): void;
    /**
     * Disable tracking
     */
    disable(): void;
    /**
     * Clear all tracked events
     */
    clear(): void;
    /**
     * Destroy tracker
     */
    destroy(): void;
    /**
     * Send events to backend
     */
    private sendEvents;
    /**
     * Start flush timer
     */
    private startFlushTimer;
    /**
     * Stop flush timer
     */
    private stopFlushTimer;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Sanitize event name
     */
    private sanitizeName;
    /**
     * Sanitize category
     */
    private sanitizeCategory;
    /**
     * Sanitize properties based on privacy mode
     */
    private sanitizeProperties;
    /**
     * Sanitize path (remove sensitive parts)
     */
    private sanitizePath;
    /**
     * Sanitize error message
     */
    private sanitizeError;
    /**
     * Check if field name is sensitive
     */
    private isSensitiveField;
    /**
     * Sanitize string value
     */
    private sanitizeString;
}
