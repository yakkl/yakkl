/**
 * Stub implementation of BalanceCacheManager
 * This is a temporary placeholder while migrating to the new view-based cache architecture
 * TODO: Remove once all references are updated to use view stores
 */

import { log } from '$lib/common/logger-wrapper';

export class BalanceCacheManager {
  private static instance: BalanceCacheManager;

  private constructor() {
    log.debug('BalanceCacheManager stub initialized');
  }

  public static getInstance(): BalanceCacheManager {
    if (!BalanceCacheManager.instance) {
      BalanceCacheManager.instance = new BalanceCacheManager();
    }
    return BalanceCacheManager.instance;
  }

  // Stub methods to prevent runtime errors
  public async initialize(): Promise<void> {
    log.debug('BalanceCacheManager stub initialize');
  }

  public async getBalance(address: string, chainId: number): Promise<any> {
    log.debug('BalanceCacheManager stub getBalance', { address, chainId });
    return null;
  }

  public async setBalance(address: string, chainId: number, balance: any): Promise<void> {
    log.debug('BalanceCacheManager stub setBalance', { address, chainId, balance });
  }

  public async getCachedBalance(address: string, chainId?: number): Promise<any> {
    log.debug('BalanceCacheManager stub getCachedBalance', { address, chainId });
    return { balance: '0', timestamp: Date.now() };
  }

  public async setCachedBalance(address: string, chainId: number | bigint, balance: any): Promise<void> {
    log.debug('BalanceCacheManager stub setCachedBalance', { address, chainId, balance });
  }

  public async updatePriceForAllEntries(price: number): Promise<void> {
    log.debug('BalanceCacheManager stub updatePriceForAllEntries', { price });
  }

  public isStale(address: string, chainId?: number): boolean {
    log.debug('BalanceCacheManager stub isStale', { address, chainId });
    return false;
  }

  public async cleanupExpired(): Promise<void> {
    log.debug('BalanceCacheManager stub cleanupExpired');
  }

  public async clear(): Promise<void> {
    log.debug('BalanceCacheManager stub clear');
  }
}

// Export a default instance for backward compatibility
export const balanceCacheManager = BalanceCacheManager.getInstance();