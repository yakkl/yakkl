/**
 * Stub implementation of AccountTokenCacheManager
 * This is a temporary placeholder while migrating to the new view-based cache architecture
 * TODO: Remove once all references are updated to use view stores
 */

import { log } from '$lib/common/logger-wrapper';

export class AccountTokenCacheManager {
  private static instance: AccountTokenCacheManager;

  private constructor() {
    log.debug('AccountTokenCacheManager stub initialized');
  }

  public static getInstance(): AccountTokenCacheManager {
    if (!AccountTokenCacheManager.instance) {
      AccountTokenCacheManager.instance = new AccountTokenCacheManager();
    }
    return AccountTokenCacheManager.instance;
  }

  // Stub methods to prevent runtime errors
  public async initialize(): Promise<void> {
    log.debug('AccountTokenCacheManager stub initialize');
  }

  public async getTokens(address: string, chainId: number): Promise<any[]> {
    log.debug('AccountTokenCacheManager stub getTokens', { address, chainId });
    return [];
  }

  public async setTokens(address: string, chainId: number, tokens: any[]): Promise<void> {
    log.debug('AccountTokenCacheManager stub setTokens', { address, chainId, tokens });
  }

  public async clear(): Promise<void> {
    log.debug('AccountTokenCacheManager stub clear');
  }
}

// Export a default instance for backward compatibility
export const accountTokenCacheManager = AccountTokenCacheManager.getInstance();