import type {
  ITransactionFetcher,
  TransactionFetchOptions,
  TokenTransferOptions,
  InternalTransactionOptions,
  TransactionHistoryResponse,
  TokenTransferResponse,
  InternalTransactionResponse,
  TransactionDetail
} from '../interfaces/ITransactionFetcher';

/**
 * Configuration for explorer providers
 */
export interface ExplorerConfig {
  name: string;
  weight: number;
  enabled: boolean;
  suspended?: boolean;
  suspendedUntil?: Date;
  failureCount: number;
  avgResponseTime: number;
  successRate: number;
  totalRequests: number;
  lastUsed?: Date;
  lastFailure?: Date;
  lastError?: string;
  supportedFeatures: string[];
}

/**
 * Explorer routing statistics
 */
export interface ExplorerStats {
  name: string;
  enabled: boolean;
  suspended: boolean;
  weight: number;
  avgResponseTime: number;
  successRate: number;
  failureCount: number;
  totalRequests: number;
  lastUsed?: Date;
  supportedFeatures: string[];
}

/**
 * Options for getting explorer
 */
export interface GetExplorerOptions {
  preferSpeed?: boolean;
  forceExplorer?: string;
  requiredFeatures?: string[];
}

/**
 * Explorer Routing Manager - Similar to ProviderRoutingManager but for transaction fetchers
 * Intelligent routing with weighted selection, failover, and feature-based selection
 */
export class ExplorerRoutingManager {
  private static instance: ExplorerRoutingManager | null = null;
  private explorers = new Map<string, ExplorerConfig>();
  private explorerInstances = new Map<string, ITransactionFetcher>();
  private currentExplorer: string | null = null;
  private explorerPool: string[] = [];
  private chainId: number = 1;
  private readonly MAX_FAILURES = 3;
  private readonly SUSPEND_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeDefaultExplorers();
  }

  static getInstance(): ExplorerRoutingManager {
    if (!ExplorerRoutingManager.instance) {
      ExplorerRoutingManager.instance = new ExplorerRoutingManager();
    }
    return ExplorerRoutingManager.instance;
  }

  /**
   * Initialize with default explorer configurations
   */
  private initializeDefaultExplorers(): void {
    // Alchemy Explorer - highest weight, most features
    this.addExplorer({
      name: 'alchemy',
      weight: 10,
      enabled: true,
      suspended: false,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      supportedFeatures: ['transactions', 'token-transfers', 'internal-txs', 'nft', 'enhanced']
    });

    // Etherscan Explorer - reliable fallback
    this.addExplorer({
      name: 'etherscan',
      weight: 8,
      enabled: true,
      suspended: false,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      supportedFeatures: ['transactions', 'token-transfers', 'internal-txs']
    });

    // Moralis Explorer - additional option
    this.addExplorer({
      name: 'moralis',
      weight: 6,
      enabled: false, // Disabled by default until configured
      suspended: false,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      supportedFeatures: ['transactions', 'token-transfers', 'nft']
    });

    // Covalent Explorer - data-rich option
    this.addExplorer({
      name: 'covalent',
      weight: 5,
      enabled: false, // Disabled by default until configured
      suspended: false,
      failureCount: 0,
      avgResponseTime: 0,
      successRate: 100,
      totalRequests: 0,
      supportedFeatures: ['transactions', 'token-transfers', 'defi']
    });

    this.buildWeightedPool();
  }

  /**
   * Set the chain ID for explorer connections
   */
  setChainId(chainId: number): void {
    this.chainId = chainId;
  }

  /**
   * Register an explorer instance
   */
  registerExplorer(name: string, explorer: ITransactionFetcher): void {
    this.explorerInstances.set(name, explorer);
    
    // Enable the explorer if it was registered
    const config = this.explorers.get(name);
    if (config) {
      config.enabled = true;
      this.buildWeightedPool();
    }
  }

  /**
   * Get an explorer based on routing logic
   */
  async getExplorer(options: GetExplorerOptions = {}): Promise<ITransactionFetcher> {
    try {
      // 1. Check forced explorer
      if (options.forceExplorer) {
        const instance = this.explorerInstances.get(options.forceExplorer);
        if (!instance) {
          throw new Error(`Explorer ${options.forceExplorer} not available`);
        }
        return instance;
      }

      // 2. Filter by required features
      let availableExplorers = this.getAvailableExplorers();
      
      if (options.requiredFeatures && options.requiredFeatures.length > 0) {
        availableExplorers = availableExplorers.filter(config => 
          options.requiredFeatures!.every(feature => 
            config.supportedFeatures.includes(feature)
          )
        );
      }

      // 3. Apply speed preference
      if (options.preferSpeed) {
        availableExplorers = availableExplorers
          .filter(e => e.avgResponseTime > 0)
          .sort((a, b) => a.avgResponseTime - b.avgResponseTime);
      }

      // 4. Weighted random selection
      const selectedName = this.getWeightedRandomExplorer(availableExplorers);
      const explorer = this.explorerInstances.get(selectedName);
      
      if (!explorer) {
        throw new Error(`Explorer ${selectedName} instance not found`);
      }

      // Update last used
      const config = this.explorers.get(selectedName);
      if (config) {
        config.lastUsed = new Date();
        config.totalRequests++;
      }

      return explorer;
    } catch (error) {
      console.error('[ExplorerRouting] Error getting explorer:', error);
      throw error;
    }
  }

  /**
   * Get transaction history with automatic failover
   */
  async getTransactionHistory(
    address: string,
    options: TransactionFetchOptions = {}
  ): Promise<TransactionHistoryResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    // Try up to 3 different explorers
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const explorer = await this.getExplorer({
          requiredFeatures: ['transactions']
        });
        
        const result = await explorer.getTransactionHistory(address, options);
        
        // Record success
        const responseTime = Date.now() - startTime;
        await this.recordSuccess(explorer.name, responseTime);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Record failure and try next explorer
        const responseTime = Date.now() - startTime;
        await this.recordFailure('unknown', lastError, responseTime);
      }
    }
    
    throw lastError || new Error('All explorers failed');
  }

  /**
   * Get token transfers with automatic failover
   */
  async getTokenTransfers(
    address: string,
    options: TokenTransferOptions = {}
  ): Promise<TokenTransferResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const explorer = await this.getExplorer({
          requiredFeatures: ['token-transfers']
        });
        
        const result = await explorer.getTokenTransfers(address, options);
        
        const responseTime = Date.now() - startTime;
        await this.recordSuccess(explorer.name, responseTime);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const responseTime = Date.now() - startTime;
        await this.recordFailure('unknown', lastError, responseTime);
      }
    }
    
    throw lastError || new Error('All explorers failed');
  }

  /**
   * Get internal transactions with automatic failover
   */
  async getInternalTransactions(
    address: string,
    options: InternalTransactionOptions = {}
  ): Promise<InternalTransactionResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const explorer = await this.getExplorer({
          requiredFeatures: ['internal-txs']
        });
        
        const result = await explorer.getInternalTransactions(address, options);
        
        const responseTime = Date.now() - startTime;
        await this.recordSuccess(explorer.name, responseTime);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const responseTime = Date.now() - startTime;
        await this.recordFailure('unknown', lastError, responseTime);
      }
    }
    
    throw lastError || new Error('All explorers failed');
  }

  /**
   * Get transaction by hash with automatic failover
   */
  async getTransactionByHash(txHash: string): Promise<TransactionDetail> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const explorer = await this.getExplorer();
        
        const result = await explorer.getTransactionByHash(txHash);
        
        const responseTime = Date.now() - startTime;
        await this.recordSuccess(explorer.name, responseTime);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const responseTime = Date.now() - startTime;
        await this.recordFailure('unknown', lastError, responseTime);
      }
    }
    
    throw lastError || new Error('All explorers failed');
  }

  /**
   * Build weighted pool for random selection
   */
  private buildWeightedPool(): void {
    this.explorerPool = [];
    for (const [name, config] of this.explorers) {
      if (config.enabled && !config.suspended && this.explorerInstances.has(name)) {
        // Check if suspension expired
        if (config.suspendedUntil && config.suspendedUntil <= new Date()) {
          config.suspended = false;
          config.suspendedUntil = undefined;
        }

        // Add explorer name to pool based on weight
        for (let i = 0; i < config.weight; i++) {
          this.explorerPool.push(name);
        }
      }
    }
  }

  /**
   * Get weighted random explorer
   */
  private getWeightedRandomExplorer(availableConfigs?: ExplorerConfig[]): string {
    // If specific configs provided, build temporary pool
    if (availableConfigs && availableConfigs.length > 0) {
      const tempPool: string[] = [];
      for (const config of availableConfigs) {
        if (this.explorerInstances.has(config.name)) {
          for (let i = 0; i < config.weight; i++) {
            tempPool.push(config.name);
          }
        }
      }

      if (tempPool.length === 0) {
        throw new Error('No explorers available in weighted pool');
      }

      const index = Math.floor(Math.random() * tempPool.length);
      return tempPool[index];
    }

    // Use default pool
    if (this.explorerPool.length === 0) {
      this.buildWeightedPool();
      if (this.explorerPool.length === 0) {
        throw new Error('No explorers available');
      }
    }

    const index = Math.floor(Math.random() * this.explorerPool.length);
    return this.explorerPool[index];
  }

  /**
   * Get available explorers (not suspended or disabled)
   */
  private getAvailableExplorers(): ExplorerConfig[] {
    const available: ExplorerConfig[] = [];
    for (const [name, config] of this.explorers) {
      if (config.enabled && !config.suspended && this.explorerInstances.has(name)) {
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
   * Record successful request
   */
  private async recordSuccess(explorerName: string, responseTime: number): Promise<void> {
    const config = this.explorers.get(explorerName);
    if (!config) return;

    // Update metrics
    config.avgResponseTime = config.totalRequests > 0 
      ? (config.avgResponseTime * (config.totalRequests - 1) + responseTime) / config.totalRequests
      : responseTime;
    
    const successfulRequests = Math.round((config.successRate / 100) * (config.totalRequests - 1)) + 1;
    config.successRate = (successfulRequests / config.totalRequests) * 100;
    
    // Reset failure count on success
    if (config.failureCount > 0) {
      config.failureCount = 0;
      config.lastError = undefined;
    }
  }

  /**
   * Record failed request
   */
  private async recordFailure(explorerName: string, error: Error, responseTime: number): Promise<void> {
    const config = this.explorers.get(explorerName);
    if (!config) return;

    config.failureCount++;
    config.lastFailure = new Date();
    config.lastError = error.message;
    
    // Update success rate
    const successfulRequests = Math.round((config.successRate / 100) * (config.totalRequests - 1));
    config.successRate = config.totalRequests > 0 
      ? (successfulRequests / config.totalRequests) * 100
      : 0;

    // Auto-suspend after max failures
    if (config.failureCount >= this.MAX_FAILURES) {
      this.suspendExplorer(explorerName, new Date(Date.now() + this.SUSPEND_DURATION));
    }
  }

  /**
   * Add a new explorer configuration
   */
  addExplorer(config: ExplorerConfig): void {
    this.explorers.set(config.name, config);
    
    if (config.enabled && !config.suspended) {
      this.buildWeightedPool();
    }
  }

  /**
   * Suspend an explorer temporarily
   */
  suspendExplorer(name: string, until?: Date): void {
    const config = this.explorers.get(name);
    if (!config) return;

    config.suspended = true;
    config.suspendedUntil = until || new Date(Date.now() + this.SUSPEND_DURATION);
    
    this.buildWeightedPool();
  }

  /**
   * Resume a suspended explorer
   */
  resumeExplorer(name: string): void {
    const config = this.explorers.get(name);
    if (!config) return;

    config.suspended = false;
    config.suspendedUntil = undefined;
    config.failureCount = 0;
    
    this.buildWeightedPool();
  }

  /**
   * Get all explorer statistics
   */
  getAllExplorerStats(): ExplorerStats[] {
    const stats: ExplorerStats[] = [];
    for (const [name, config] of this.explorers) {
      stats.push({
        name: config.name,
        enabled: config.enabled,
        suspended: config.suspended || false,
        weight: config.weight,
        avgResponseTime: config.avgResponseTime,
        successRate: config.successRate,
        failureCount: config.failureCount,
        totalRequests: config.totalRequests,
        lastUsed: config.lastUsed,
        supportedFeatures: config.supportedFeatures
      });
    }
    return stats;
  }

  /**
   * Health check for all explorers
   */
  async healthCheck(): Promise<{ healthy: boolean; explorerCount: number; healthyCount: number }> {
    const explorers = Array.from(this.explorerInstances.values());
    const healthResults = await Promise.allSettled(
      explorers.map(explorer => explorer.healthCheck())
    );
    
    const healthyCount = healthResults
      .filter(result => result.status === 'fulfilled' && result.value.healthy)
      .length;
    
    return {
      healthy: healthyCount > 0,
      explorerCount: explorers.length,
      healthyCount
    };
  }
}

// Export singleton instance getter
export const explorerRoutingManager = ExplorerRoutingManager.getInstance();