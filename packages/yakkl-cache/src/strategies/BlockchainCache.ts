/**
 * BlockchainCache - Specialized caching strategy for blockchain data
 * Implements intelligent TTL based on data mutability and cost optimization
 */

import type { CacheManager } from '../core/CacheManager';
import type { 
  CacheOptions, 
  BlockchainCacheData,
  CacheTier 
} from '../types';

export interface BlockchainQuery {
  method: string;
  params: any[];
  chainId: number;
  blockNumber?: number;
}

export interface RPCCost {
  method: string;
  computeUnits: number;
  dollarCost: number;
}

export class BlockchainCache {
  private cacheManager: CacheManager;
  private rpcCosts: Map<string, RPCCost>;
  private totalSavings: number = 0;

  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
    this.rpcCosts = this.initializeRPCCosts();
  }

  private initializeRPCCosts(): Map<string, RPCCost> {
    // Based on Alchemy compute units and pricing
    const costs = new Map<string, RPCCost>();
    
    costs.set('eth_getBalance', { method: 'eth_getBalance', computeUnits: 26, dollarCost: 0.00001 });
    costs.set('eth_call', { method: 'eth_call', computeUnits: 26, dollarCost: 0.00001 });
    costs.set('eth_getTransactionReceipt', { method: 'eth_getTransactionReceipt', computeUnits: 15, dollarCost: 0.000006 });
    costs.set('eth_getBlockByNumber', { method: 'eth_getBlockByNumber', computeUnits: 16, dollarCost: 0.000007 });
    costs.set('eth_getLogs', { method: 'eth_getLogs', computeUnits: 75, dollarCost: 0.00003 });
    costs.set('eth_gasPrice', { method: 'eth_gasPrice', computeUnits: 10, dollarCost: 0.000004 });
    costs.set('eth_estimateGas', { method: 'eth_estimateGas', computeUnits: 87, dollarCost: 0.000035 });
    costs.set('alchemy_getAssetTransfers', { method: 'alchemy_getAssetTransfers', computeUnits: 150, dollarCost: 0.00006 });
    costs.set('getNFTs', { method: 'getNFTs', computeUnits: 100, dollarCost: 0.00004 });
    
    return costs;
  }

  /**
   * Get cached blockchain data with intelligent TTL
   */
  async get<T>(query: BlockchainQuery): Promise<T | null> {
    const key = this.buildCacheKey(query);
    const options = this.getCacheOptions(query);
    
    const cached = await this.cacheManager.get<T>(key, options);
    
    if (cached) {
      // Track cost savings
      const cost = this.rpcCosts.get(query.method);
      if (cost) {
        this.totalSavings += cost.dollarCost;
      }
    }
    
    return cached;
  }

  /**
   * Cache blockchain data with appropriate strategy
   */
  async set<T>(query: BlockchainQuery, data: T): Promise<void> {
    const key = this.buildCacheKey(query);
    const options = this.getCacheOptions(query);
    
    await this.cacheManager.set(key, data, options);
  }

  /**
   * Batch multiple blockchain queries efficiently
   */
  async batchGet<T>(queries: BlockchainQuery[]): Promise<(T | null)[]> {
    const keys = queries.map(q => this.buildCacheKey(q));
    return this.cacheManager.getMany<T>(keys);
  }

  /**
   * Batch set multiple blockchain results
   */
  async batchSet<T>(queries: Array<{ query: BlockchainQuery; data: T }>): Promise<void> {
    const entries: Array<[string, T]> = queries.map(({ query, data }) => [
      this.buildCacheKey(query),
      data
    ]);
    
    await this.cacheManager.setMany(entries, {
      strategy: 'blockchain'
    });
  }

  /**
   * Invalidate cache for specific block range
   */
  async invalidateBlockRange(
    chainId: number, 
    fromBlock: number, 
    toBlock: number
  ): Promise<void> {
    const pattern = `blockchain:${chainId}:*`;
    const keys = await this.cacheManager.keys(pattern);
    
    for (const key of keys) {
      const parts = key.split(':');
      const blockNum = parseInt(parts[3] || '0');
      
      if (blockNum >= fromBlock && blockNum <= toBlock) {
        await this.cacheManager.delete(key);
      }
    }
  }

  /**
   * Get total cost savings from cache hits
   */
  getTotalSavings(): number {
    return this.totalSavings;
  }

  /**
   * Build cache key from query parameters
   */
  private buildCacheKey(query: BlockchainQuery): string {
    const params = JSON.stringify(query.params);
    const blockPart = query.blockNumber ? `:${query.blockNumber}` : '';
    return `blockchain:${query.chainId}:${query.method}${blockPart}:${this.hashString(params)}`;
  }

  /**
   * Determine cache options based on query type
   */
  private getCacheOptions(query: BlockchainQuery): CacheOptions {
    const dataType = this.getDataType(query.method);
    const mutability = this.getDataMutability(query);
    
    // Immutable data (confirmed transactions, old blocks)
    if (!mutability.mutable) {
      return {
        tier: 'cold',
        ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
        strategy: 'blockchain',
        deduplicate: true
      };
    }
    
    // Different TTLs based on data type
    switch (dataType) {
      case 'balance':
      case 'gas':
        return {
          tier: 'hot',
          ttl: 30 * 1000, // 30 seconds
          strategy: 'blockchain',
          deduplicate: true
        };
        
      case 'transaction':
        // Pending transactions
        if (!query.blockNumber) {
          return {
            tier: 'hot',
            ttl: 15 * 1000, // 15 seconds
            strategy: 'blockchain',
            deduplicate: true
          };
        }
        // Confirmed transactions
        return {
          tier: 'warm',
          ttl: 60 * 60 * 1000, // 1 hour
          strategy: 'blockchain',
          deduplicate: true
        };
        
      case 'block':
        // Recent blocks might reorg
        const isRecent = this.isRecentBlock(query.blockNumber);
        return {
          tier: isRecent ? 'warm' : 'cold',
          ttl: isRecent ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000,
          strategy: 'blockchain',
          deduplicate: true
        };
        
      case 'token':
      case 'nft':
        return {
          tier: 'warm',
          ttl: 5 * 60 * 1000, // 5 minutes
          strategy: 'blockchain',
          deduplicate: true,
          batch: true
        };
        
      case 'ens':
        return {
          tier: 'cold',
          ttl: 24 * 60 * 60 * 1000, // 24 hours
          strategy: 'blockchain',
          deduplicate: true
        };
        
      default:
        return {
          tier: 'warm',
          ttl: 60 * 1000, // 1 minute
          strategy: 'blockchain',
          deduplicate: true
        };
    }
  }

  /**
   * Determine data type from RPC method
   */
  private getDataType(method: string): BlockchainCacheData['dataType'] {
    if (method.includes('Balance')) return 'balance';
    if (method.includes('Transaction')) return 'transaction';
    if (method.includes('Block')) return 'block';
    if (method.includes('gas') || method.includes('Gas')) return 'gas';
    if (method.includes('NFT') || method.includes('nft')) return 'nft';
    if (method.includes('ens') || method.includes('ENS')) return 'ens';
    if (method.includes('Token') || method === 'eth_call') return 'token';
    return 'token';
  }

  /**
   * Determine if data is mutable
   */
  private getDataMutability(query: BlockchainQuery): { mutable: boolean } {
    // Data with specific block number is immutable (except for recent blocks that might reorg)
    if (query.blockNumber && !this.isRecentBlock(query.blockNumber)) {
      return { mutable: false };
    }
    
    // Transaction receipts for confirmed transactions are immutable
    if (query.method === 'eth_getTransactionReceipt' && query.params[0]) {
      return { mutable: false };
    }
    
    // Historical logs are immutable
    if (query.method === 'eth_getLogs' && query.params[0]?.toBlock && 
        query.params[0].toBlock !== 'latest') {
      return { mutable: false };
    }
    
    return { mutable: true };
  }

  /**
   * Check if block is recent (might reorg)
   */
  private isRecentBlock(blockNumber?: number): boolean {
    if (!blockNumber) return true;
    
    // Consider blocks less than 12 confirmations as potentially mutable
    // This is a simplified check - in production, compare with current block
    return true; // Simplified for now
  }

  /**
   * Simple string hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Optimize batch queries by deduplicating and caching
   */
  async optimizeBatchQuery<T>(
    queries: BlockchainQuery[],
    fetcher: (queries: BlockchainQuery[]) => Promise<T[]>
  ): Promise<T[]> {
    const results: (T | null)[] = new Array(queries.length);
    const uncachedQueries: Array<{ index: number; query: BlockchainQuery }> = [];
    
    // Check cache for each query
    for (let i = 0; i < queries.length; i++) {
      const cached = await this.get<T>(queries[i]);
      if (cached !== null) {
        results[i] = cached;
      } else {
        uncachedQueries.push({ index: i, query: queries[i] });
      }
    }
    
    // Fetch uncached data
    if (uncachedQueries.length > 0) {
      const fetchQueries = uncachedQueries.map(item => item.query);
      const fetchedData = await fetcher(fetchQueries);
      
      // Cache and store results
      for (let i = 0; i < uncachedQueries.length; i++) {
        const { index, query } = uncachedQueries[i];
        const data = fetchedData[i];
        
        results[index] = data;
        await this.set(query, data);
      }
    }
    
    return results as T[];
  }
}