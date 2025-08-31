/**
 * Privacy Management System
 * Controls data collection and implements privacy features
 */
export type PrivacyLevel = 'off' | 'essential' | 'balanced' | 'full';
export interface PrivacySettings {
    level: PrivacyLevel;
    allowErrorTracking: boolean;
    allowPerformanceTracking: boolean;
    allowUsageTracking: boolean;
    allowPersonalization: boolean;
    anonymizeData: boolean;
    dataRetentionDays: number;
}
export interface ConsentOptions {
    essential: boolean;
    performance: boolean;
    usage: boolean;
    personalization: boolean;
}
export declare class PrivacyManager {
    private settings;
    private consent;
    private storageKey;
    private consentKey;
    constructor();
    /**
     * Get current privacy settings
     */
    getSettings(): PrivacySettings;
    /**
     * Update privacy settings
     */
    updateSettings(settings: Partial<PrivacySettings>): void;
    /**
     * Set privacy level
     */
    setPrivacyLevel(level: PrivacyLevel): void;
    /**
     * Get user consent
     */
    getConsent(): ConsentOptions;
    /**
     * Update user consent
     */
    updateConsent(consent: Partial<ConsentOptions>): void;
    /**
     * Check if tracking is allowed
     */
    canTrack(category: 'error' | 'performance' | 'usage' | 'personalization'): boolean;
    /**
     * Anonymize data
     */
    anonymize<T extends Record<string, any>>(data: T): T;
    /**
     * Apply differential privacy
     */
    applyDifferentialPrivacy(value: number, epsilon?: number): number;
    /**
     * Reset all privacy settings
     */
    reset(): void;
    /**
     * Clear all stored data
     */
    clearData(): void;
    /**
     * Export privacy report
     */
    exportPrivacyReport(): string;
    /**
     * Get default settings
     */
    private getDefaultSettings;
    /**
     * Get default consent
     */
    private getDefaultConsent;
    /**
     * Load settings from storage
     */
    private loadSettings;
    /**
     * Save settings to storage
     */
    private saveSettings;
    /**
     * Load consent from storage
     */
    private loadConsent;
    /**
     * Save consent to storage
     */
    private saveConsent;
    /**
     * Apply privacy level presets
     */
    private applyPrivacyLevel;
    /**
     * Update settings from consent
     */
    private updateSettingsFromConsent;
    /**
     * Hash value for anonymization
     */
    private hashValue;
    /**
     * Sample from Laplace distribution
     */
    private laplaceSample;
}
/**
 * Global privacy manager instance
 */
export declare const privacyManager: PrivacyManager;
