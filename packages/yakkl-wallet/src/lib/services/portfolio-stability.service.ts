/**
 * Portfolio Stability Service
 * Manages portfolio value updates with proper state management to prevent $0.00 flickering
 * Implements optimistic updates with background validation
 */

import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import type { BigNumberish } from '$lib/common/bignumber';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { log } from '$lib/common/logger-wrapper';
import { browser_ext } from '$lib/common/environment';

/**
 * Portfolio state enum for explicit state management
 */
export enum PortfolioState {
  INITIALIZING = 'initializing',
  LOADING = 'loading',
  LOADED = 'loaded',
  UPDATING = 'updating',
  ERROR = 'error',
  STALE = 'stale'
}

/**
 * Portfolio data structure with state management
 */
export interface StablePortfolioData {
  value: BigNumberish;
  previousValue: BigNumberish;
  state: PortfolioState;
  lastUpdate: Date | null;
  lastValidValue: BigNumberish; // Last known good value
  confidence: number; // 0-100, how confident we are in the value
  source: 'cache' | 'calculated' | 'optimistic' | 'fallback';
  errorCount: number;
}

/**
 * Token data structure with stability
 */
export interface StableTokenData {
  tokens: any[];
  state: PortfolioState;
  lastUpdate: Date | null;
  lastValidTokens: any[]; // Last known good token list
  source: 'cache' | 'fetched' | 'optimistic' | 'fallback';
}

/**
 * Configuration for stability service
 */
export interface StabilityConfig {
  debounceMs: number;
  staleThresholdMs: number;
  maxErrorRetries: number;
  zeroValueDelayMs: number;
  confidenceThreshold: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: StabilityConfig = {
  debounceMs: 250, // Debounce updates by 250ms
  staleThresholdMs: 30000, // Data considered stale after 30 seconds
  maxErrorRetries: 3,
  zeroValueDelayMs: 1500, // Wait 1.5 seconds before accepting zero value
  confidenceThreshold: 70 // Minimum confidence level to display value
};

/**
 * Portfolio Stability Service
 * Singleton service that manages portfolio value stability
 */
export class PortfolioStabilityService {
  private static instance: PortfolioStabilityService;
  private config: StabilityConfig;

  // Stores for portfolio data
  private portfolioStore: Writable<StablePortfolioData>;
  private tokenStore: Writable<StableTokenData>;

  // Timers for debouncing and zero-value handling
  private updateTimer: NodeJS.Timeout | null = null;
  private zeroValueTimer: NodeJS.Timeout | null = null;

  // Track update attempts
  private updateAttempts = 0;
  private lastUpdateTime = 0;

  private constructor(config: Partial<StabilityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize stores with default values
    this.portfolioStore = writable<StablePortfolioData>({
      value: 0n,
      previousValue: 0n,
      state: PortfolioState.INITIALIZING,
      lastUpdate: null,
      lastValidValue: 0n,
      confidence: 0,
      source: 'fallback',
      errorCount: 0
    });

    this.tokenStore = writable<StableTokenData>({
      tokens: [],
      state: PortfolioState.INITIALIZING,
      lastUpdate: null,
      lastValidTokens: [],
      source: 'fallback'
    });
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<StabilityConfig>): PortfolioStabilityService {
    if (!PortfolioStabilityService.instance) {
      PortfolioStabilityService.instance = new PortfolioStabilityService(config);
    }
    return PortfolioStabilityService.instance;
  }

  /**
   * Update portfolio value with stability checks
   */
  updatePortfolioValue(
    newValue: BigNumberish,
    source: 'cache' | 'calculated' | 'optimistic' = 'calculated',
    immediate = false
  ): void {
    const currentData = get(this.portfolioStore);
    const valueBigInt = BigNumberishUtils.toBigInt(newValue);

    // Clear existing timers
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.zeroValueTimer) {
      clearTimeout(this.zeroValueTimer);
      this.zeroValueTimer = null;
    }

    // Check if this is a zero value
    if (valueBigInt === 0n) {
      // Don't immediately accept zero values
      this.handleZeroValue(currentData, source);
      return;
    }

    // Calculate confidence based on various factors
    const confidence = this.calculateConfidence(valueBigInt, currentData, source);

    // Determine if we should update immediately or debounce
    const shouldUpdateImmediately = immediate ||
      currentData.state === PortfolioState.INITIALIZING ||
      currentData.value === 0n ||
      confidence >= 90;

    if (shouldUpdateImmediately) {
      this.applyPortfolioUpdate(valueBigInt, source, confidence);
    } else {
      // Debounce the update
      this.updateTimer = setTimeout(() => {
        this.applyPortfolioUpdate(valueBigInt, source, confidence);
      }, this.config.debounceMs);
    }
  }

  /**
   * Handle zero value updates with delay
   */
  private handleZeroValue(currentData: StablePortfolioData, source: string): void {
    // If we have a valid value, don't immediately switch to zero
    const lastValidBigInt = BigNumberishUtils.toBigInt(currentData.lastValidValue);
    if (lastValidBigInt > 0n) {
      log.debug('[PortfolioStability] Zero value detected, waiting before accepting', false, {
        lastValid: currentData.lastValidValue.toString(),
        source
      });

      // Set state to updating to indicate pending change
      this.portfolioStore.update(data => ({
        ...data,
        state: PortfolioState.UPDATING
      }));

      // Wait before accepting zero value
      this.zeroValueTimer = setTimeout(() => {
        const latestData = get(this.portfolioStore);
        // Only update to zero if we're still in updating state (no new values came in)
        if (latestData.state === PortfolioState.UPDATING) {
          this.applyPortfolioUpdate(0n, source as any, 50); // Low confidence for zero
        }
      }, this.config.zeroValueDelayMs);
    } else {
      // No previous valid value, accept zero immediately
      this.applyPortfolioUpdate(0n, source as any, 30);
    }
  }

  /**
   * Apply portfolio update to store
   */
  private applyPortfolioUpdate(
    value: bigint,
    source: 'cache' | 'calculated' | 'optimistic' | 'fallback',
    confidence: number
  ): void {
    this.portfolioStore.update(data => {
      const newData: StablePortfolioData = {
        value,
        previousValue: data.value,
        state: PortfolioState.LOADED,
        lastUpdate: new Date(),
        lastValidValue: value > 0n ? value : data.lastValidValue,
        confidence,
        source,
        errorCount: 0
      };

      log.debug('[PortfolioStability] Portfolio updated', false, {
        value: value.toString(),
        confidence,
        source,
        previousValue: data.value.toString()
      });

      return newData;
    });

    // Reset update attempts on successful update
    this.updateAttempts = 0;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Calculate confidence level for a value
   */
  private calculateConfidence(
    value: bigint,
    currentData: StablePortfolioData,
    source: string
  ): number {
    let confidence = 50; // Base confidence

    // Source-based confidence
    switch (source) {
      case 'cache':
        confidence += 40;
        break;
      case 'calculated':
        confidence += 30;
        break;
      case 'optimistic':
        confidence += 10;
        break;
      default:
        confidence += 0;
    }

    // Value consistency check
    const lastValidBigInt = BigNumberishUtils.toBigInt(currentData.lastValidValue);
    if (lastValidBigInt > 0n && value > 0n) {
      const change = Math.abs(Number(value - lastValidBigInt)) / Number(lastValidBigInt);
      if (change < 0.1) { // Less than 10% change
        confidence += 10;
      } else if (change > 0.5) { // More than 50% change
        confidence -= 20;
      }
    }

    // Time-based confidence (fresher is better)
    if (currentData.lastUpdate) {
      const age = Date.now() - currentData.lastUpdate.getTime();
      if (age < 5000) { // Less than 5 seconds old
        confidence += 5;
      } else if (age > this.config.staleThresholdMs) {
        confidence -= 10;
      }
    }

    // Error history
    if (currentData.errorCount > 0) {
      confidence -= currentData.errorCount * 5;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Update token list with stability
   */
  updateTokenList(tokens: any[], source: 'cache' | 'fetched' | 'optimistic' = 'fetched'): void {
    const currentData = get(this.tokenStore);

    // Don't update to empty list if we have valid tokens
    if (tokens.length === 0 && currentData.lastValidTokens.length > 0) {
      log.warn('[PortfolioStability] Empty token list received, keeping last valid', false);
      return;
    }

    this.tokenStore.update(data => ({
      tokens,
      state: PortfolioState.LOADED,
      lastUpdate: new Date(),
      lastValidTokens: tokens.length > 0 ? tokens : data.lastValidTokens,
      source
    }));
  }

  /**
   * Set portfolio state
   */
  setState(state: PortfolioState): void {
    this.portfolioStore.update(data => ({ ...data, state }));
  }

  /**
   * Set token state
   */
  setTokenState(state: PortfolioState): void {
    this.tokenStore.update(data => ({ ...data, state }));
  }

  /**
   * Handle error state
   */
  handleError(error: any): void {
    this.portfolioStore.update(data => ({
      ...data,
      state: PortfolioState.ERROR,
      errorCount: data.errorCount + 1
    }));

    log.error('[PortfolioStability] Error occurred', false, error);
  }

  /**
   * Get stable portfolio value (read-only)
   */
  getStableValue(): Readable<BigNumberish> {
    return derived(this.portfolioStore, $data => {
      // Return last valid value if confidence is too low
      const lastValidBigInt = BigNumberishUtils.toBigInt($data.lastValidValue);
      if ($data.confidence < this.config.confidenceThreshold && lastValidBigInt > 0n) {
        return $data.lastValidValue;
      }
      return $data.value;
    });
  }

  /**
   * Get portfolio state (read-only)
   */
  getPortfolioState(): Readable<PortfolioState> {
    return derived(this.portfolioStore, $data => $data.state);
  }

  /**
   * Get stable token list (read-only)
   */
  getStableTokens(): Readable<any[]> {
    return derived(this.tokenStore, $data => {
      // Return last valid tokens if current list is empty
      if ($data.tokens.length === 0 && $data.lastValidTokens.length > 0) {
        return $data.lastValidTokens;
      }
      return $data.tokens;
    });
  }

  /**
   * Get full portfolio data (read-only)
   */
  getPortfolioData(): Readable<StablePortfolioData> {
    return derived(this.portfolioStore, $data => $data);
  }

  /**
   * Get full token data (read-only)
   */
  getTokenData(): Readable<StableTokenData> {
    return derived(this.tokenStore, $data => $data);
  }

  /**
   * Check if data is stale
   */
  isStale(): boolean {
    const data = get(this.portfolioStore);
    if (!data.lastUpdate) return true;

    const age = Date.now() - data.lastUpdate.getTime();
    return age > this.config.staleThresholdMs;
  }

  /**
   * Force refresh if data is stale
   */
  async refreshIfStale(): Promise<void> {
    if (this.isStale()) {
      this.setState(PortfolioState.LOADING);
      // Trigger refresh through message to background
      if (typeof window !== 'undefined' && browser_ext.runtime?.sendMessage) {
        await browser_ext.runtime.sendMessage({
          type: 'REFRESH_PORTFOLIO_DATA',
          userInitiated: false,
          reason: 'stale_data'
        });
      }
    }
  }

  /**
   * Reset service state
   */
  reset(): void {
    // Clear timers
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    if (this.zeroValueTimer) {
      clearTimeout(this.zeroValueTimer);
      this.zeroValueTimer = null;
    }

    // Reset stores
    this.portfolioStore.set({
      value: 0n,
      previousValue: 0n,
      state: PortfolioState.INITIALIZING,
      lastUpdate: null,
      lastValidValue: 0n,
      confidence: 0,
      source: 'fallback',
      errorCount: 0
    });

    this.tokenStore.set({
      tokens: [],
      state: PortfolioState.INITIALIZING,
      lastUpdate: null,
      lastValidTokens: [],
      source: 'fallback'
    });

    // Reset counters
    this.updateAttempts = 0;
    this.lastUpdateTime = 0;
  }
}

// Export singleton instance
export const portfolioStability = PortfolioStabilityService.getInstance();
