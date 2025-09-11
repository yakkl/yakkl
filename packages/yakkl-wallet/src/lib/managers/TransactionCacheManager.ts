/**
 * Stub implementation of TransactionCacheManager
 * This is a temporary placeholder while migrating to the new view-based cache architecture
 * TODO: Remove once all references are updated to use view stores
 */

import { log } from '$lib/common/logger-wrapper';

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | string;  // Allow specific values or any string
  type?: string;  // Add type field for compatibility
}

export class TransactionCacheManager {
  private static instance: TransactionCacheManager;

  private constructor() {
    // log.debug('TransactionCacheManager stub initialized');
  }

  public static getInstance(): TransactionCacheManager {
    if (!TransactionCacheManager.instance) {
      TransactionCacheManager.instance = new TransactionCacheManager();
    }
    return TransactionCacheManager.instance;
  }

  // Stub methods to prevent runtime errors
  public async initialize(): Promise<void> {
    // log.debug('TransactionCacheManager stub initialize');
  }

  public async getTransactions(address: string, chainId: number): Promise<TransactionData[]> {
    // log.debug('TransactionCacheManager stub getTransactions', { address, chainId });
    return [];
  }

  public async getCachedTransactions(address: string, chainId: number): Promise<TransactionData[]> {
    // log.debug('TransactionCacheManager stub getCachedTransactions', { address, chainId });
    return [];
  }

  public async addTransaction(transaction: TransactionData): Promise<void> {
    // log.debug('TransactionCacheManager stub addTransaction', transaction);
  }

  public async updateTransaction(hash: string, updates: Partial<TransactionData>): Promise<void> {
    // log.debug('TransactionCacheManager stub updateTransaction', { hash, updates });
  }

  public async updateCache(address: string, chainId: number, transactions: TransactionData[]): Promise<void> {
    // log.debug('TransactionCacheManager stub updateCache', { address, chainId, count: transactions.length });
  }

  public async clearCache(address?: string, chainId?: number): Promise<void> {
    // log.debug('TransactionCacheManager stub clearCache', { address, chainId });
  }

  public async clear(): Promise<void> {
    // log.debug('TransactionCacheManager stub clear');
  }
}

// Export a default instance for backward compatibility
export const transactionCacheManager = TransactionCacheManager.getInstance();
