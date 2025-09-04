import { BaseProvider } from './BaseProvider';
import type { IKeyManager } from '../../interfaces/IKeyManager';

/**
 * Base class for API key-managed providers (Alchemy, Infura, etc.)
 * Handles API key management, rate limiting, and quota tracking
 */
export abstract class ManagedProvider extends BaseProvider {
  protected keyManager: IKeyManager;
  protected providerName: string;
  protected currentKeyId?: string;
  protected rateLimitTracker: RateLimitTracker;
  protected quotaTracker: QuotaTracker;

  constructor(
    name: string,
    chainId: number,
    blockchain: string,
    supportedChainIds: number[],
    keyManager: IKeyManager,
    providerName: string
  ) {
    // Endpoint will be constructed with API key
    super(name, chainId, blockchain, supportedChainIds, '');
    this.keyManager = keyManager;
    this.providerName = providerName;
    this.rateLimitTracker = new RateLimitTracker();
    this.quotaTracker = new QuotaTracker();
  }

  /**
   * Get the current API key for the operation type
   */
  protected async getApiKey(operation: 'read' | 'write' | 'archive' | 'trace' | 'websocket' | 'any' = 'read'): Promise<string> {
    console.log(`[ManagedProvider] Getting ${operation} API key for ${this.providerName}`);
    const key = await this.keyManager.getKey(this.providerName, operation, this.chainId);
    if (!key) {
      console.error(`[ManagedProvider] No ${operation} API key available for ${this.providerName}`);
      // Try to get any key as fallback
      const anyKey = await this.keyManager.getKey(this.providerName, 'any', this.chainId);
      if (anyKey) {
        console.log(`[ManagedProvider] Using 'any' operation key as fallback for ${this.providerName}`);
        return anyKey;
      }
      throw new Error(`No ${operation} API key available for ${this.providerName}`);
    }
    console.log(`[ManagedProvider] Found API key for ${this.providerName}`);
    return key;
  }

  /**
   * Build the endpoint URL with API key
   */
  protected abstract buildEndpoint(apiKey: string): string;

  /**
   * Connect with API key management
   */
  protected async doConnect(chainId: number): Promise<void> {
    try {
      console.log(`[ManagedProvider] Connecting ${this.providerName} for chain ${chainId}`);
      // Get API key for read operations (most common)
      const apiKey = await this.getApiKey('read');
      this._endpoint = this.buildEndpoint(apiKey);
      console.log(`[ManagedProvider] Built endpoint for ${this.providerName}`);
      
      // Initialize the raw provider
      await this.initializeProvider(apiKey);
      console.log(`[ManagedProvider] Successfully connected ${this.providerName}`);
    } catch (error) {
      console.error(`[ManagedProvider] Failed to connect ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Make a request with rate limiting and quota tracking
   */
  async request<T = unknown>(method: string, params?: unknown[]): Promise<T> {
    this.validateConnection();
    
    // Check rate limits
    await this.rateLimitTracker.checkRateLimit(this.providerName);
    
    // Check quota
    if (!this.quotaTracker.canMakeRequest(this.providerName)) {
      throw new Error(`Quota exceeded for ${this.providerName}`);
    }

    const startTime = Date.now();
    
    try {
      const result = await this.makeProviderRequest<T>(method, params);
      
      // Track successful request
      const responseTime = Date.now() - startTime;
      await this.trackSuccess(method, responseTime);
      
      return result;
    } catch (error) {
      // Track failed request
      const responseTime = Date.now() - startTime;
      await this.trackFailure(method, error, responseTime);
      
      throw error;
    }
  }

  /**
   * Track successful request for metrics and key rotation
   */
  protected async trackSuccess(method: string, responseTime: number): Promise<void> {
    if (this.currentKeyId) {
      await this.keyManager.reportKeySuccess(this.providerName, this.currentKeyId);
    }
    
    this.rateLimitTracker.recordRequest(this.providerName);
    this.quotaTracker.recordRequest(this.providerName);
  }

  /**
   * Track failed request for metrics and key rotation
   */
  protected async trackFailure(method: string, error: unknown, responseTime: number): Promise<void> {
    if (this.currentKeyId) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.keyManager.reportKeyFailure(this.providerName, this.currentKeyId, errorMessage);
    }
    
    // Check if we need to rotate keys due to rate limiting or auth errors
    if (this.isRateLimitError(error) || this.isAuthError(error)) {
      await this.rotateKey();
    }
  }

  /**
   * Rotate to the next available API key
   */
  protected async rotateKey(): Promise<void> {
    try {
      await this.keyManager.rotateKey(this.providerName);
      
      // Reconnect with new key
      await this.doConnect(this.chainId);
    } catch (error) {
      console.warn(`Failed to rotate key for ${this.providerName}:`, error);
    }
  }

  /**
   * Check if error indicates rate limiting
   */
  protected isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('rate limit') || 
             message.includes('too many requests') ||
             message.includes('429');
    }
    return false;
  }

  /**
   * Check if error indicates authentication failure
   */
  protected isAuthError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('unauthorized') ||
             message.includes('forbidden') ||
             message.includes('invalid api key') ||
             message.includes('401') ||
             message.includes('403');
    }
    return false;
  }

  /**
   * Disconnect and cleanup
   */
  protected async doDisconnect(): Promise<void> {
    this.rateLimitTracker.clear(this.providerName);
    this.quotaTracker.clear(this.providerName);
    await this.cleanupProvider();
  }

  // Abstract methods for specific provider implementations
  protected abstract initializeProvider(apiKey: string): Promise<void>;
  protected abstract makeProviderRequest<T>(method: string, params?: unknown[]): Promise<T>;
  protected abstract cleanupProvider(): Promise<void>;
}

/**
 * Simple rate limit tracker
 */
class RateLimitTracker {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs = 60000; // 1 minute window
  private readonly maxRequestsPerMinute = 100; // Default limit

  async checkRateLimit(provider: string): Promise<void> {
    const now = Date.now();
    const requests = this.requests.get(provider) || [];
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      const oldestRequest = recentRequests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  recordRequest(provider: string): void {
    const now = Date.now();
    const requests = this.requests.get(provider) || [];
    requests.push(now);
    this.requests.set(provider, requests);
  }

  clear(provider: string): void {
    this.requests.delete(provider);
  }
}

/**
 * Simple quota tracker
 */
class QuotaTracker {
  private quotas: Map<string, { used: number; limit: number; resetTime: number }> = new Map();

  canMakeRequest(provider: string): boolean {
    const quota = this.quotas.get(provider);
    if (!quota) return true;
    
    // Check if quota has reset
    if (Date.now() >= quota.resetTime) {
      quota.used = 0;
      quota.resetTime = Date.now() + 24 * 60 * 60 * 1000; // Reset daily
    }
    
    return quota.used < quota.limit;
  }

  recordRequest(provider: string): void {
    const quota = this.quotas.get(provider) || {
      used: 0,
      limit: 1000000, // Default daily limit
      resetTime: Date.now() + 24 * 60 * 60 * 1000
    };
    
    quota.used++;
    this.quotas.set(provider, quota);
  }

  setLimit(provider: string, limit: number): void {
    const quota = this.quotas.get(provider) || {
      used: 0,
      limit,
      resetTime: Date.now() + 24 * 60 * 60 * 1000
    };
    
    quota.limit = limit;
    this.quotas.set(provider, quota);
  }

  clear(provider: string): void {
    this.quotas.delete(provider);
  }
}