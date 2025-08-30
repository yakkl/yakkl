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

export class PrivacyManager {
  private settings: PrivacySettings;
  private consent: ConsentOptions;
  private storageKey = 'yakkl_privacy_settings';
  private consentKey = 'yakkl_privacy_consent';

  constructor() {
    this.settings = this.loadSettings();
    this.consent = this.loadConsent();
  }

  /**
   * Get current privacy settings
   */
  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Update privacy settings
   */
  updateSettings(settings: Partial<PrivacySettings>): void {
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
  setPrivacyLevel(level: PrivacyLevel): void {
    this.settings.level = level;
    this.applyPrivacyLevel();
    this.saveSettings();
  }

  /**
   * Get user consent
   */
  getConsent(): ConsentOptions {
    return { ...this.consent };
  }

  /**
   * Update user consent
   */
  updateConsent(consent: Partial<ConsentOptions>): void {
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
  canTrack(category: 'error' | 'performance' | 'usage' | 'personalization'): boolean {
    if (this.settings.level === 'off') return false;

    switch (category) {
      case 'error':
        return this.settings.allowErrorTracking && this.consent.essential;
      case 'performance':
        return this.settings.allowPerformanceTracking && this.consent.performance;
      case 'usage':
        return this.settings.allowUsageTracking && this.consent.usage;
      case 'personalization':
        return this.settings.allowPersonalization && this.consent.personalization;
      default:
        return false;
    }
  }

  /**
   * Anonymize data
   */
  anonymize<T extends Record<string, any>>(data: T): T {
    if (!this.settings.anonymizeData) return data;

    const anonymized: any = { ...data };

    // Remove or hash personally identifiable information
    const piiFields = ['email', 'name', 'phone', 'address', 'ip', 'userId', 'walletAddress'];
    
    for (const field of piiFields) {
      if (field in anonymized) {
        anonymized[field] = this.hashValue(String(anonymized[field]));
      }
    }

    // Recursively anonymize nested objects
    for (const [key, value] of Object.entries(anonymized)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        anonymized[key] = this.anonymize(value);
      }
    }

    return anonymized as T;
  }

  /**
   * Apply differential privacy
   */
  applyDifferentialPrivacy(value: number, epsilon: number = 1.0): number {
    // Add Laplace noise for differential privacy
    const scale = 1 / epsilon;
    const noise = this.laplaceSample(scale);
    return value + noise;
  }

  /**
   * Reset all privacy settings
   */
  reset(): void {
    this.settings = this.getDefaultSettings();
    this.consent = this.getDefaultConsent();
    this.saveSettings();
    this.saveConsent();
  }

  /**
   * Clear all stored data
   */
  clearData(): void {
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      const storage = (globalThis as any).localStorage;
      // Clear analytics data
      const keysToRemove = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith('yakkl_analytics_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => storage.removeItem(key));
    }
  }

  /**
   * Export privacy report
   */
  exportPrivacyReport(): string {
    return JSON.stringify({
      settings: this.settings,
      consent: this.consent,
      timestamp: new Date().toISOString(),
      dataCategories: {
        essential: this.consent.essential ? 'Collected' : 'Not collected',
        performance: this.consent.performance ? 'Collected' : 'Not collected',
        usage: this.consent.usage ? 'Collected' : 'Not collected',
        personalization: this.consent.personalization ? 'Collected' : 'Not collected'
      }
    }, null, 2);
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): PrivacySettings {
    return {
      level: 'balanced',
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
  private getDefaultConsent(): ConsentOptions {
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
  private loadSettings(): PrivacySettings {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) {
      return this.getDefaultSettings();
    }

    try {
      const stored = (globalThis as any).localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }

    return this.getDefaultSettings();
  }

  /**
   * Save settings to storage
   */
  private saveSettings(): void {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;

    try {
      (globalThis as any).localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  /**
   * Load consent from storage
   */
  private loadConsent(): ConsentOptions {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) {
      return this.getDefaultConsent();
    }

    try {
      const stored = (globalThis as any).localStorage.getItem(this.consentKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load consent:', error);
    }

    return this.getDefaultConsent();
  }

  /**
   * Save consent to storage
   */
  private saveConsent(): void {
    if (typeof globalThis === 'undefined' || !(globalThis as any).localStorage) return;

    try {
      (globalThis as any).localStorage.setItem(this.consentKey, JSON.stringify(this.consent));
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  }

  /**
   * Apply privacy level presets
   */
  private applyPrivacyLevel(): void {
    switch (this.settings.level) {
      case 'off':
        this.settings.allowErrorTracking = false;
        this.settings.allowPerformanceTracking = false;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;

      case 'essential':
        this.settings.allowErrorTracking = true;
        this.settings.allowPerformanceTracking = false;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;

      case 'balanced':
        this.settings.allowErrorTracking = true;
        this.settings.allowPerformanceTracking = true;
        this.settings.allowUsageTracking = false;
        this.settings.allowPersonalization = false;
        this.settings.anonymizeData = true;
        break;

      case 'full':
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
  private updateSettingsFromConsent(): void {
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
  private hashValue(value: string): string {
    // Simple hash for demo - in production use proper crypto
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `anon_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Sample from Laplace distribution
   */
  private laplaceSample(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}

/**
 * Global privacy manager instance
 */
export const privacyManager = new PrivacyManager();