import type {
  IKeyManager,
  KeyOperation,
  ProviderKeyConfig,
  ProviderKeyInfo,
  KeyStats,
  KeySelectionCriteria,
  KeyRotationStrategy
} from '../interfaces/IKeyManager';

/**
 * Enhanced Key Manager with support for multiple keys per provider
 * Supports key rotation, different operation types, and secure key selection
 */
export class EnhancedKeyManager implements IKeyManager {
  private static instance: EnhancedKeyManager | null = null;
  private initialized = false;
  private providers = new Map<string, ProviderKeyConfig[]>();
  private keyStats = new Map<string, Map<string, KeyStats>>();
  private rotationStrategy: KeyRotationStrategy = {
    type: 'performance_based',
    failureThreshold: 5,
    performanceThreshold: 10000 // 10 seconds
  };

  private constructor() {}

  static getInstance(): EnhancedKeyManager {
    if (!EnhancedKeyManager.instance) {
      EnhancedKeyManager.instance = new EnhancedKeyManager();
    }
    return EnhancedKeyManager.instance;
  }

  /**
   * Initialize the key manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[EnhancedKeyManager] Already initialized, skipping');
      return;
    }

    console.log('[EnhancedKeyManager] Initializing...');
    // Load configurations from environment or storage
    await this.loadConfigurations();
    
    this.initialized = true;
    console.log('[EnhancedKeyManager] Initialization complete. Registered providers:', Array.from(this.providers.keys()));
  }

  /**
   * Load key configurations from environment variables
   */
  private async loadConfigurations(): Promise<void> {
    // Alchemy configurations
    await this.loadAlchemyKeys();
    
    // Infura configurations
    await this.loadInfuraKeys();
    
    // Other provider configurations
    await this.loadOtherProviderKeys();
  }

  /**
   * Load Alchemy API keys from environment
   */
  private async loadAlchemyKeys(): Promise<void> {
    const keys: ProviderKeyConfig[] = [];

    // Production key 1
    const prodKey1 = this.getEnvKey('ALCHEMY_API_KEY_PROD_1');
    console.log('[EnhancedKeyManager] Looking for ALCHEMY_API_KEY_PROD_1, found:', !!prodKey1);
    if (prodKey1) {
      keys.push({
        id: 'alchemy_prod_1',
        key: prodKey1,
        priority: 100,
        operations: ['read', 'write', 'archive', 'trace'],
        tier: 'scale',
        environment: 'production',
        rateLimit: {
          computeUnitsPerMonth: 300000000, // 300M CU/month
          requestsPerSecond: 25
        }
      });
    }

    // Production key 2 (backup)
    const prodKey2 = this.getEnvKey('ALCHEMY_API_KEY_PROD_2');
    if (prodKey2) {
      keys.push({
        id: 'alchemy_prod_2',
        key: prodKey2,
        priority: 90,
        operations: ['read', 'write', 'archive'],
        tier: 'growth',
        environment: 'production',
        rateLimit: {
          computeUnitsPerMonth: 100000000, // 100M CU/month
          requestsPerSecond: 10
        }
      });
    }

    // Development key
    const devKey = this.getEnvKey('ALCHEMY_API_KEY_DEV');
    if (devKey) {
      keys.push({
        id: 'alchemy_dev',
        key: devKey,
        priority: 50,
        operations: ['read'],
        tier: 'free',
        environment: 'development',
        rateLimit: {
          computeUnitsPerMonth: 25000000, // 25M CU/month
          requestsPerSecond: 5
        }
      });
    }

    if (keys.length > 0) {
      console.log('[EnhancedKeyManager] Registering Alchemy provider with', keys.length, 'keys');
      await this.registerProvider('alchemy', keys);
    } else {
      console.log('[EnhancedKeyManager] No Alchemy keys found in environment');
    }
  }

  /**
   * Load Infura API keys from environment
   */
  private async loadInfuraKeys(): Promise<void> {
    const keys: ProviderKeyConfig[] = [];

    const infuraKey = this.getEnvKey('INFURA_API_KEY');
    if (infuraKey) {
      keys.push({
        id: 'infura_main',
        key: infuraKey,
        priority: 80,
        operations: ['read', 'write', 'archive'],
        tier: 'growth',
        environment: 'production',
        rateLimit: {
          requestsPerDay: 100000,
          requestsPerSecond: 10
        }
      });
    }

    if (keys.length > 0) {
      await this.registerProvider('infura', keys);
    }
  }

  /**
   * Load other provider keys
   */
  private async loadOtherProviderKeys(): Promise<void> {
    // QuickNode
    const quicknodeKey = this.getEnvKey('QUICKNODE_API_KEY');
    if (quicknodeKey) {
      await this.registerProvider('quicknode', [{
        id: 'quicknode_main',
        key: quicknodeKey,
        priority: 70,
        operations: ['read', 'write', 'archive', 'trace'],
        tier: 'growth',
        environment: 'production'
      }]);
    }

    // BlockNative
    const blocknativeKey = this.getEnvKey('BLOCKNATIVE_API_KEY');
    if (blocknativeKey) {
      await this.registerProvider('blocknative', [{
        id: 'blocknative_main',
        key: blocknativeKey,
        priority: 60,
        operations: ['read'],
        tier: 'free',
        environment: 'production'
      }]);
    }
  }

  /**
   * Get environment variable key
   */
  private getEnvKey(key: string): string | null {
    // Check Vite env with VITE_ prefix first (most common in browser extension)
    const viteKey = `VITE_${key}`;
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Try with VITE_ prefix first (this is what's in our .env file)
      if (import.meta.env[viteKey]) {
        return import.meta.env[viteKey];
      }
      // Fallback to key without prefix
      if (import.meta.env[key]) {
        return import.meta.env[key];
      }
    }

    // Check process.env as fallback (for Node.js/background context)
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[viteKey]) {
        return process.env[viteKey];
      }
      if (process.env[key]) {
        return process.env[key];
      }
    }

    return null;
  }

  /**
   * Register a new provider with multiple API keys
   */
  async registerProvider(providerName: string, keys: ProviderKeyConfig[]): Promise<void> {
    this.providers.set(providerName, keys);
    
    // Initialize stats for each key
    const providerStats = new Map<string, KeyStats>();
    for (const keyConfig of keys) {
      providerStats.set(keyConfig.id, {
        id: keyConfig.id,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 100,
        avgResponseTime: 0,
        status: 'active'
      });
    }
    this.keyStats.set(providerName, providerStats);
  }

  /**
   * Get the best available key for a provider and operation type
   */
  async getKey(
    providerName: string,
    operation: KeyOperation,
    chainId?: number
  ): Promise<string | null> {
    const keys = this.providers.get(providerName);
    if (!keys || keys.length === 0) {
      return null;
    }

    // Filter keys by operation type, chain, and status
    const availableKeys = keys.filter(key => 
      this.isKeyAvailableForOperation(key, operation, chainId, providerName)
    );

    if (availableKeys.length === 0) {
      return null;
    }

    // Select best key based on strategy
    const selectedKey = this.selectBestKey(providerName, availableKeys);
    return selectedKey?.key || null;
  }

  /**
   * Check if key is available for operation
   */
  private isKeyAvailableForOperation(
    key: ProviderKeyConfig,
    operation: KeyOperation,
    chainId?: number,
    providerName?: string
  ): boolean {
    // Check if operation is supported
    if (operation !== 'any' && !key.operations.includes(operation)) {
      return false;
    }

    // Check chain ID if specified
    if (chainId && key.chainIds && !key.chainIds.includes(chainId)) {
      return false;
    }

    // Check if key is not failed (need provider name to access stats)
    if (providerName) {
      const providerStats = this.keyStats.get(providerName);
      const keyStats = providerStats?.get(key.id);
      if (keyStats && keyStats.status === 'failed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Select the best key based on rotation strategy
   */
  private selectBestKey(
    providerName: string,
    availableKeys: ProviderKeyConfig[]
  ): ProviderKeyConfig | null {
    if (availableKeys.length === 0) return null;
    if (availableKeys.length === 1) return availableKeys[0];

    const providerStats = this.keyStats.get(providerName);
    if (!providerStats) return availableKeys[0];

    switch (this.rotationStrategy.type) {
      case 'priority':
        return availableKeys.sort((a, b) => b.priority - a.priority)[0];

      case 'round_robin':
        // Simple round-robin based on usage count
        return availableKeys.sort((a, b) => {
          const statsA = providerStats.get(a.id);
          const statsB = providerStats.get(b.id);
          return (statsA?.totalRequests || 0) - (statsB?.totalRequests || 0);
        })[0];

      case 'least_used':
        return availableKeys.sort((a, b) => {
          const statsA = providerStats.get(a.id);
          const statsB = providerStats.get(b.id);
          return (statsA?.totalRequests || 0) - (statsB?.totalRequests || 0);
        })[0];

      case 'performance_based':
      default:
        return availableKeys.sort((a, b) => {
          const statsA = providerStats.get(a.id);
          const statsB = providerStats.get(b.id);
          
          // Sort by success rate first, then by response time
          const successRateDiff = (statsB?.successRate || 100) - (statsA?.successRate || 100);
          if (Math.abs(successRateDiff) > 5) { // 5% threshold
            return successRateDiff;
          }
          
          return (statsA?.avgResponseTime || 0) - (statsB?.avgResponseTime || 0);
        })[0];
    }
  }

  /**
   * Get all available keys for a provider
   */
  async getProviderKeys(providerName: string): Promise<ProviderKeyInfo[]> {
    const keys = this.providers.get(providerName);
    const stats = this.keyStats.get(providerName);
    
    if (!keys) {
      return [];
    }

    return keys.map(key => {
      const keyStats = stats?.get(key.id);
      
      return {
        id: key.id,
        priority: key.priority,
        operations: key.operations,
        chainIds: key.chainIds,
        tier: key.tier,
        environment: key.environment,
        status: keyStats?.status || 'active',
        failureCount: keyStats?.failedRequests || 0,
        lastUsed: keyStats?.lastUsed,
        usage: {
          totalRequests: keyStats?.totalRequests || 0,
          successfulRequests: keyStats?.successfulRequests || 0,
          failedRequests: keyStats?.failedRequests || 0,
          avgResponseTime: keyStats?.avgResponseTime || 0
        }
      };
    });
  }

  /**
   * Mark a key as failed
   */
  async reportKeyFailure(
    providerName: string,
    keyId: string,
    error: string
  ): Promise<void> {
    const stats = this.keyStats.get(providerName)?.get(keyId);
    if (!stats) return;

    stats.failedRequests++;
    stats.totalRequests++;
    stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    
    // Mark as failed if too many failures
    if (stats.failedRequests >= (this.rotationStrategy.failureThreshold || 5)) {
      stats.status = 'failed';
    }
  }

  /**
   * Mark a key as successful
   */
  async reportKeySuccess(providerName: string, keyId: string): Promise<void> {
    const stats = this.keyStats.get(providerName)?.get(keyId);
    if (!stats) return;

    stats.successfulRequests++;
    stats.totalRequests++;
    stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    stats.lastUsed = Date.now();
    
    // Reset status if it was failed but now succeeding
    if (stats.status === 'failed' && stats.successRate > 80) {
      stats.status = 'active';
    }
  }

  /**
   * Rotate to next available key for a provider
   */
  async rotateKey(providerName: string): Promise<void> {
    // This is handled automatically by the selection algorithm
    // Could implement explicit rotation logic here if needed
  }

  /**
   * Get key usage statistics
   */
  async getKeyStats(providerName: string): Promise<KeyStats[]> {
    const stats = this.keyStats.get(providerName);
    if (!stats) return [];
    
    return Array.from(stats.values());
  }

  /**
   * Check if provider has valid keys
   */
  async hasValidKeys(providerName: string): Promise<boolean> {
    const keys = await this.getProviderKeys(providerName);
    return keys.some(key => key.status === 'active');
  }

  /**
   * Get all registered providers
   */
  async getProviders(): Promise<string[]> {
    return Array.from(this.providers.keys());
  }

  /**
   * Health check for key manager
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!this.initialized) {
      return { healthy: false, error: 'Key manager not initialized' };
    }

    const providers = await this.getProviders();
    if (providers.length === 0) {
      return { healthy: false, error: 'No providers registered' };
    }

    // Check if at least one provider has valid keys
    for (const provider of providers) {
      if (await this.hasValidKeys(provider)) {
        return { healthy: true };
      }
    }

    return { healthy: false, error: 'No providers have valid keys' };
  }

  /**
   * Set rotation strategy
   */
  setRotationStrategy(strategy: KeyRotationStrategy): void {
    this.rotationStrategy = strategy;
  }

  /**
   * Get current rotation strategy
   */
  getRotationStrategy(): KeyRotationStrategy {
    return { ...this.rotationStrategy };
  }
}