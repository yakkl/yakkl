/**
 * ProviderRoutingManager
 * Intelligent provider routing with weighted selection, overrides, and auto-failover
 * Based on PriceManager's weighted selection pattern
 */

import type { Provider } from './Provider';
import ProviderFactory from './ProviderFactory';
import { log } from '$lib/common/logger-wrapper';
import { EnhancedKeyManager } from '$lib/sdk/security/EnhancedKeyManager';

export interface ProviderConfig {
  name: string;
  weight: number;           // For weighted random selection
  enabled: boolean;         // Can disable without removing
  suspended?: boolean;      // Temporarily stop
  suspendedUntil?: Date;   // Auto-resume time
  overrideCount?: number;  // Force use count (-1 = normal, 0 = permanent, >0 = count)
  overrideUntil?: Date;    // Force use until time
  failureCount: number;     // Track failures for auto-suspend
  avgResponseTime: number;  // Performance metric
  successRate: number;      // Reliability metric (0-100)
  costTier: 'free' | 'paid'; // Cost tracking
  remainingQuota?: number;  // Free tier tracking
  totalRequests: number;    // Total requests made
  lastUsed?: Date;         // Last time provider was used
  lastFailure?: Date;      // Last failure timestamp
  lastError?: string;      // Last error message
}

export interface ProviderStats {
  name: string;
  enabled: boolean;
  suspended: boolean;
  weight: number;
  avgResponseTime: number;
  successRate: number;
  failureCount: number;
  totalRequests: number;
  lastUsed?: Date;
}

export interface GetProviderOptions {
  preferCost?: boolean;     // Prefer free tier
  preferSpeed?: boolean;    // Prefer fastest
  forceProvider?: string;   // Force specific provider
}

export class ProviderRoutingManager {
  private static instance: ProviderRoutingManager | null = null;
  private providers: Map<string, ProviderConfig> = new Map();
  private currentProvider: string | null = null;
  private providerPool: string[] = []; // Weighted pool for random selection
  private chainId: number = 1; // Default to mainnet
  private readonly MAX_FAILURES = 3; // Auto-suspend after 3 failures
  private readonly SUSPEND_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly ERROR_TRACK_WINDOW = 60 * 1000; // Track errors within 1 minute window

  private constructor() {
    this.initializeDefaultProviders();
  }

  static getInstance(): ProviderRoutingManager {
    if (!ProviderRoutingManager.instance) {
      ProviderRoutingManager.instance = new ProviderRoutingManager();
    }
    return ProviderRoutingManager.instance;
  }

  /**
   * Initialize with default providers
   */
  private initializeDefaultProviders(): void {
    // Alchemy - highest weight, most reliable
    this.addProvider({
      name: 'alchemy',
      weight: 7,  // Primary provider with good weight
      enabled: true,
      suspended: false,
      overrideCount: -1, // Normal routing
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      costTier: 'free',
      remainingQuota: 300000000, // 300M compute units per month
      totalRequests: 0
    });

    // Infura - backup provider with lower weight
    this.addProvider({
      name: 'infura',
      weight: 5,  // Lower weight as backup provider
      enabled: true,  // Enabled as backup (user will fix API keys)
      suspended: false,  // Active for failover
      overrideCount: -1,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      costTier: 'free',
      remainingQuota: 100000, // 100k requests per day
      totalRequests: 0
    });

    // QuickNode - lower weight, third option
    this.addProvider({
      name: 'quicknode',
      weight: 0,
      enabled: false, // Disabled by default until API key is configured
      suspended: false,
      overrideCount: -1,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      costTier: 'free',
      totalRequests: 0
    });

    // Rebuild the weighted pool
    this.buildWeightedPool();
  }

  /**
   * Set the chain ID for provider connections
   */
  setChainId(chainId: number): void {
    this.chainId = chainId;
  }

  /**
   * Get a provider based on routing logic
   */
  async getProvider(options?: GetProviderOptions): Promise<Provider> {
    try {
      // 1. Check forced provider
      if (options?.forceProvider) {
        const config = this.providers.get(options.forceProvider);
        if (!config || !config.enabled) {
          throw new Error(`Provider ${options.forceProvider} not available`);
        }
        return await this.getProviderInstance(options.forceProvider);
      }

      // 2. Check current provider override
      if (this.currentProvider) {
        const config = this.providers.get(this.currentProvider);
        if (config && config.enabled && !config.suspended) {
          // Time-based override takes precedence
          if (config.overrideUntil && config.overrideUntil > new Date()) {
            log.debug(`[ProviderRouting] Using time-override provider: ${this.currentProvider}`);
            return await this.getProviderInstance(this.currentProvider);
          }

          // Count-based override
          if (config.overrideCount !== undefined && config.overrideCount >= 0) {
            if (config.overrideCount === 0) {
              // Permanent override
              log.debug(`[ProviderRouting] Using permanent-override provider: ${this.currentProvider}`);
              return await this.getProviderInstance(this.currentProvider);
            } else if (config.overrideCount > 0) {
              // Decrement count
              config.overrideCount--;
              log.debug(`[ProviderRouting] Using count-override provider: ${this.currentProvider}, remaining: ${config.overrideCount}`);
              return await this.getProviderInstance(this.currentProvider);
            }
          }

          // Reset to normal routing if override expired
          if (config.overrideCount === -1) {
            this.currentProvider = null;
          }
        }
      }

      // 3. Apply preference filters if specified
      let availableProviders = this.getAvailableProviders();

      if (options?.preferCost) {
        // Sort by free tier first, then by remaining quota
        availableProviders = availableProviders.sort((a, b) => {
          if (a.costTier === 'free' && b.costTier === 'paid') return -1;
          if (a.costTier === 'paid' && b.costTier === 'free') return 1;
          return (b.remainingQuota || 0) - (a.remainingQuota || 0);
        });
      } else if (options?.preferSpeed) {
        // Sort by response time (fastest first)
        availableProviders = availableProviders.filter(p => p.avgResponseTime > 0)
          .sort((a, b) => a.avgResponseTime - b.avgResponseTime);
      }

      // 4. Normal weighted random selection
      const selectedName = this.getWeightedRandomProvider(availableProviders);
      const provider = await this.getProviderInstance(selectedName);

      // Update last used
      const config = this.providers.get(selectedName);
      if (config) {
        config.lastUsed = new Date();
        config.totalRequests++;
      }

      return provider;
    } catch (error) {
      log.error('[ProviderRouting] Error getting provider:', false, error);
      throw error;
    }
  }

  /**
   * Build weighted pool for random selection (like PriceManager)
   */
  private buildWeightedPool(): void {
    this.providerPool = [];
    for (const [name, config] of this.providers) {
      if (config.enabled && !config.suspended) {
        // Check if suspension expired
        if (config.suspendedUntil && config.suspendedUntil <= new Date()) {
          config.suspended = false;
          config.suspendedUntil = undefined;
          log.info(`[ProviderRouting] Provider ${name} suspension expired, resuming`);
        }

        // Add provider name to pool based on weight
        for (let i = 0; i < config.weight; i++) {
          this.providerPool.push(name);
        }
      }
    }
    log.debug(`[ProviderRouting] Weighted pool rebuilt: ${this.providerPool.length} entries`);
  }

  /**
   * Get weighted random provider (like PriceManager's implementation)
   */
  private getWeightedRandomProvider(availableConfigs?: ProviderConfig[]): string {
    // If specific configs provided, build temporary pool
    if (availableConfigs && availableConfigs.length > 0) {
      const tempPool: string[] = [];
      for (const config of availableConfigs) {
        for (let i = 0; i < config.weight; i++) {
          tempPool.push(config.name);
        }
      }

      if (tempPool.length === 0) {
        throw new Error('No providers available in weighted pool');
      }

      const index = Math.floor(Math.random() * tempPool.length);
      return tempPool[index];
    }

    // Use default pool
    if (this.providerPool.length === 0) {
      this.buildWeightedPool(); // Try rebuilding
      if (this.providerPool.length === 0) {
        throw new Error('No providers available');
      }
    }

    const index = Math.floor(Math.random() * this.providerPool.length);
    return this.providerPool[index];
  }

  /**
   * Get available providers (not suspended or disabled)
   */
  private getAvailableProviders(): ProviderConfig[] {
    const available: ProviderConfig[] = [];
    for (const [_, config] of this.providers) {
      if (config.enabled && !config.suspended) {
        // Check if suspension expired
        if (config.suspendedUntil && config.suspendedUntil <= new Date()) {
          config.suspended = false;
          config.suspendedUntil = undefined;
        }

        if (!config.suspended) {
          available.push(config);
        }
      }
    }
    return available;
  }

  /**
   * Get provider instance (NEVER store API keys in variables)
   */
  private async getProviderInstance(name: string): Promise<Provider> {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    // Create provider with API key directly from environment
    // SECURITY: Never assign API keys to variables
    const apiKey = await this.getProviderApiKey(name);
    const provider = ProviderFactory.createProvider({
      name: config.name,
      apiKey: apiKey,
      chainId: this.chainId
    });

    return provider;
  }

  /**
   * Get provider API key directly from environment
   * SECURITY: This should only be called from background context
   */
  private async getProviderApiKey(name: string): Promise<string | null> {
    // Use EnhancedKeyManager for secure key access
    try {
      const keyManager = EnhancedKeyManager.getInstance();
      await keyManager.initialize();
      return await keyManager.getKey(name.toLowerCase(), 'read');
    } catch (error) {
      console.warn(`Failed to get API key for ${name}:`, error);
      return null;
    }
  }

  /**
   * Set provider override
   */
  setProviderOverride(name: string, count: number, until?: Date): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.overrideCount = count;
    config.overrideUntil = until;
    this.currentProvider = name;

    log.info(`[ProviderRouting] Override set for ${name}: count=${count}, until=${until?.toISOString()}`);
  }

  /**
   * Suspend a provider temporarily
   */
  suspendProvider(name: string, until?: Date): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.suspended = true;
    config.suspendedUntil = until || new Date(Date.now() + this.SUSPEND_DURATION);

    // Rebuild pool to exclude suspended provider
    this.buildWeightedPool();

    log.warn(`[ProviderRouting] Provider ${name} suspended until ${config.suspendedUntil.toISOString()}`);
  }

  /**
   * Resume a suspended provider
   */
  resumeProvider(name: string): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.suspended = false;
    config.suspendedUntil = undefined;
    config.failureCount = 0; // Reset failure count

    // Rebuild pool to include resumed provider
    this.buildWeightedPool();

    log.info(`[ProviderRouting] Provider ${name} resumed`);
  }

  /**
   * Disable a provider
   */
  disableProvider(name: string): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.enabled = false;

    // Clear override if this was the current provider
    if (this.currentProvider === name) {
      this.currentProvider = null;
    }

    // Rebuild pool
    this.buildWeightedPool();

    log.info(`[ProviderRouting] Provider ${name} disabled`);
  }

  /**
   * Enable a provider
   */
  enableProvider(name: string): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.enabled = true;

    // Rebuild pool
    this.buildWeightedPool();

    log.info(`[ProviderRouting] Provider ${name} enabled`);
  }

  /**
   * Remove a provider
   */
  removeProvider(name: string): void {
    if (this.currentProvider === name) {
      this.currentProvider = null;
    }

    this.providers.delete(name);
    this.buildWeightedPool();

    log.info(`[ProviderRouting] Provider ${name} removed`);
  }

  /**
   * Add a new provider
   */
  addProvider(config: ProviderConfig): void {
    this.providers.set(config.name, config);

    if (config.enabled && !config.suspended) {
      this.buildWeightedPool();
    }

    log.info(`[ProviderRouting] Provider ${config.name} added with weight ${config.weight}`);
  }

  /**
   * Set provider weight
   */
  setProviderWeight(name: string, weight: number): void {
    const config = this.providers.get(name);
    if (!config) {
      throw new Error(`Provider ${name} not found`);
    }

    config.weight = Math.max(1, weight); // Minimum weight of 1
    this.buildWeightedPool();

    log.info(`[ProviderRouting] Provider ${name} weight set to ${config.weight}`);
  }

  /**
   * Record provider metrics
   */
  recordProviderMetrics(name: string, responseTime: number, success: boolean): void {
    const config = this.providers.get(name);
    if (!config) return;

    // Update average response time (rolling average)
    if (config.totalRequests > 0) {
      config.avgResponseTime = (config.avgResponseTime * (config.totalRequests - 1) + responseTime) / config.totalRequests;
    } else {
      config.avgResponseTime = responseTime;
    }

    // Update success rate
    if (success) {
      config.successRate = ((config.successRate * (config.totalRequests - 1)) + 100) / config.totalRequests;
    } else {
      config.failureCount++;
      config.successRate = ((config.successRate * (config.totalRequests - 1)) + 0) / config.totalRequests;

      // Auto-suspend after max failures
      if (config.failureCount >= this.MAX_FAILURES) {
        this.suspendProvider(name, new Date(Date.now() + this.SUSPEND_DURATION));
        log.warn(`[ProviderRouting] Provider ${name} auto-suspended after ${this.MAX_FAILURES} failures`);
      }
    }

    // Decrement quota if tracking
    if (config.remainingQuota !== undefined && config.remainingQuota > 0) {
      config.remainingQuota--;
    }
  }

  /**
   * Get provider statistics
   */
  getProviderStats(name: string): ProviderStats | null {
    const config = this.providers.get(name);
    if (!config) return null;

    return {
      name: config.name,
      enabled: config.enabled,
      suspended: config.suspended || false,
      weight: config.weight,
      avgResponseTime: config.avgResponseTime,
      successRate: config.successRate,
      failureCount: config.failureCount,
      totalRequests: config.totalRequests,
      lastUsed: config.lastUsed
    };
  }

  /**
   * Get all provider statistics
   */
  getAllProviderStats(): ProviderStats[] {
    const stats: ProviderStats[] = [];
    for (const [name, _] of this.providers) {
      const stat = this.getProviderStats(name);
      if (stat) stats.push(stat);
    }
    return stats;
  }

  /**
   * Get current provider name
   */
  getCurrentProvider(): string | null {
    return this.currentProvider;
  }

  /**
   * Track provider failure - called on ANY error
   */
  trackProviderFailure(providerName: string, error: any): void {
    const config = this.providers.get(providerName);
    if (!config) return;

    // Store error details
    config.lastFailure = new Date();
    config.lastError = error?.message || error?.toString() || 'Unknown error';
    config.failureCount++;

    log.warn(`[ProviderRouting] Provider ${providerName} failed (${config.failureCount}/${this.MAX_FAILURES}):`, config.lastError);

    // Record failure metrics
    this.recordProviderMetrics(providerName, 0, false);

    // Auto-suspend if max failures reached
    if (config.failureCount >= this.MAX_FAILURES) {
      this.suspendProvider(providerName);
      log.error(`[ProviderRouting] Provider ${providerName} suspended after ${this.MAX_FAILURES} failures`);
    }
  }

  /**
   * Reset provider status after successful request
   */
  resetProviderStatus(providerName: string): void {
    const config = this.providers.get(providerName);
    if (!config) return;

    // Only reset if there were recent failures
    if (config.failureCount > 0) {
      log.info(`[ProviderRouting] Provider ${providerName} recovered, resetting failure count`);
      config.failureCount = 0;
      config.lastError = undefined;
    }
  }

  /**
   * Get healthy providers (not failed or suspended)
   */
  getHealthyProviders(): string[] {
    const healthy: string[] = [];
    const now = new Date();

    for (const [name, config] of this.providers) {
      if (!config.enabled || config.suspended) continue;

      // Check if suspension expired
      if (config.suspendedUntil && config.suspendedUntil <= now) {
        config.suspended = false;
        config.suspendedUntil = undefined;
        config.failureCount = 0; // Reset on resume
        log.info(`[ProviderRouting] Provider ${name} suspension expired`);
      }

      // Include if healthy (no recent failures or low failure rate)
      if (!config.suspended && config.failureCount < this.MAX_FAILURES) {
        healthy.push(name);
      }
    }

    return healthy;
  }

  /**
   * Handle provider failure with auto-failover
   */
  async handleProviderFailure(failedProvider: string, error?: any): Promise<Provider> {
    log.warn(`[ProviderRouting] Provider ${failedProvider} failed, attempting failover`);

    // Track the failure (works for ANY error type)
    this.trackProviderFailure(failedProvider, error);

    // Check if this is an authentication error (401 or auth popup)
    const isAuthError = error && (
      error.code === 401 ||
      error.message?.includes('401') ||
      error.message?.includes('Unauthorized') ||
      error.message?.includes('authentication') ||
      error.message?.includes('API key')
    );

    if (isAuthError) {
      log.error(`[ProviderRouting] Authentication error for ${failedProvider}, disabling provider`);
      // Immediately disable provider to prevent further auth popups
      this.disableProvider(failedProvider);
    }

    // Get healthy providers excluding the failed one
    const healthyProviders = this.getHealthyProviders()
      .filter(name => name !== failedProvider);

    if (healthyProviders.length === 0) {
      log.error('[ProviderRouting] No healthy providers available');
      throw new Error('All providers failed. Please check your RPC configuration.');
    }

    // Get configs for healthy providers
    const availableConfigs = healthyProviders
      .map(name => this.providers.get(name))
      .filter((config): config is ProviderConfig => config !== undefined);

    // Select next provider using weighted random selection
    const nextProvider = this.getWeightedRandomProvider(availableConfigs);
    log.info(`[ProviderRouting] Failing over to provider: ${nextProvider}`);

    return await this.getProviderInstance(nextProvider);
  }

  /**
   * Reset all provider metrics
   */
  resetMetrics(): void {
    for (const [_, config] of this.providers) {
      config.failureCount = 0;
      config.avgResponseTime = 0;
      config.successRate = 100;
      config.totalRequests = 0;
      config.lastUsed = undefined;
    }
    log.info('[ProviderRouting] All provider metrics reset');
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(name: string): ProviderConfig | null {
    return this.providers.get(name) || null;
  }
}

// Export singleton instance getter
export const providerRoutingManager = ProviderRoutingManager.getInstance();
