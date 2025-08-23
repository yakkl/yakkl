// AlchemyTransactionFetcher.ts - Fetch transaction history using SDK AlchemyExplorer
import type { TransactionDisplay } from '$lib/types';
import { log } from '$lib/managers/Logger';
import { blockchainServiceManager } from '$lib/sdk/BlockchainServiceManager';
import { explorerRoutingManager } from '$lib/sdk/routing/ExplorerRoutingManager';

/**
 * @deprecated Use explorerRoutingManager or blockchainServiceManager instead
 * This class is maintained for backwards compatibility during migration
 */
export class AlchemyTransactionFetcher {
  private static instance: AlchemyTransactionFetcher;
  private cache: Map<string, { data: TransactionDisplay[], timestamp: number }> = new Map();
  private CACHE_DURATION = 60000; // 1 minute cache

  private constructor() {}

  static getInstance(): AlchemyTransactionFetcher {
    if (!AlchemyTransactionFetcher.instance) {
      AlchemyTransactionFetcher.instance = new AlchemyTransactionFetcher();
    }
    return AlchemyTransactionFetcher.instance;
  }

  /**
   * Get transaction history using the new SDK explorer routing
   */
  async getTransactionHistory(
    address: string,
    chainId: number,
    limit: number = 100,
    isBackgroundContext: boolean = false
  ): Promise<TransactionDisplay[]> {
    try {
      // Check cache first
      const cacheKey = `${chainId}-${address}-${limit}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        log.debug('Returning cached transaction history', false);
        return cached.data;
      }

      // Ensure service manager is initialized
      if (!blockchainServiceManager) {
        log.error('BlockchainServiceManager not available');
        return [];
      }

      // Switch to the correct chain if needed
      await blockchainServiceManager.switchChain(chainId);

      // Use the SDK explorer routing manager
      const transactions = await explorerRoutingManager.getTransactionHistory(address, {
        limit,
        txType: 'all'
      });

      // Convert to legacy format if needed
      const transactionDisplays = this.convertToTransactionDisplay(transactions.transactions || []);

      // Cache the result
      this.cache.set(cacheKey, {
        data: transactionDisplays,
        timestamp: Date.now()
      });

      return transactionDisplays;
    } catch (error) {
      log.error('Failed to get transaction history via SDK:', false, { address, chainId, error });
      return [];
    }
  }

  /**
   * Get token transfers using the new SDK explorer routing
   */
  async getTokenTransfers(
    address: string,
    chainId: number,
    contractAddress?: string,
    limit: number = 100
  ): Promise<TransactionDisplay[]> {
    try {
      const cacheKey = `tokens-${chainId}-${address}-${contractAddress || 'all'}-${limit}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        log.debug('Returning cached token transfers', false);
        return cached.data;
      }

      // Switch to the correct chain if needed
      await blockchainServiceManager.switchChain(chainId);

      // Use the SDK explorer routing manager
      const transfers = await explorerRoutingManager.getTokenTransfers(address, {
        contractAddress,
        tokenType: 'erc20',
        limit
      });

      // Convert to legacy format if needed
      const transactionDisplays = this.convertToTransactionDisplay(transfers.transfers || []);

      // Cache the result
      this.cache.set(cacheKey, {
        data: transactionDisplays,
        timestamp: Date.now()
      });

      return transactionDisplays;
    } catch (error) {
      log.error('Failed to get token transfers via SDK:', false, { address, chainId, error });
      return [];
    }
  }

  /**
   * Get internal transactions using the new SDK explorer routing
   */
  async getInternalTransactions(
    address: string,
    chainId: number,
    limit: number = 100
  ): Promise<TransactionDisplay[]> {
    try {
      const cacheKey = `internal-${chainId}-${address}-${limit}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        log.debug('Returning cached internal transactions', false);
        return cached.data;
      }

      // Switch to the correct chain if needed
      await blockchainServiceManager.switchChain(chainId);

      // Use the SDK explorer routing manager
      const transactions = await explorerRoutingManager.getInternalTransactions(address, {
        limit
      });

      // Convert to legacy format if needed
      const transactionDisplays = this.convertToTransactionDisplay(transactions.transactions || []);

      // Cache the result
      this.cache.set(cacheKey, {
        data: transactionDisplays,
        timestamp: Date.now()
      });

      return transactionDisplays;
    } catch (error) {
      log.error('Failed to get internal transactions via SDK:', false, { address, chainId, error });
      return [];
    }
  }

  /**
   * Convert SDK transaction format to legacy TransactionDisplay format
   * This is a temporary bridge during migration
   */
  private convertToTransactionDisplay(transactions: any[]): TransactionDisplay[] {
    return transactions.map(tx => {
      // Map SDK transaction format to TransactionDisplay
      // This will depend on the exact structure returned by the SDK
      return {
        hash: tx.hash || '',
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value || '0',
        timestamp: tx.timestamp || Date.now(),
        status: tx.isError === '0' ? 'confirmed' : 'failed' as 'pending' | 'confirmed' | 'failed',
        type: tx.to ? 'send' : 'receive' as 'send' | 'receive' | 'swap' | 'contract',
        gas: tx.gas || '0',
        gasPrice: tx.gasPrice || '0',
        gasUsed: tx.gasUsed || '0',
        blockNumber: tx.blockNumber?.toString() || '0',
        methodId: tx.methodId || '',
        functionName: tx.functionName || '',
        symbol: tx.tokenSymbol || '',
      };
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// For backwards compatibility, export the singleton instance
export const alchemyTransactionFetcher = AlchemyTransactionFetcher.getInstance();