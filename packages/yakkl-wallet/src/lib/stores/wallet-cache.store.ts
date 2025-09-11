/**
 * wallet-cache.store.ts - Redirects to modern v2 implementation
 * This file maintains backward compatibility while using the new @yakkl/cache system
 */

// Re-export everything from the v2 implementation
export * from './wallet-cache-v2.store';

// Explicitly re-export commonly used items for clarity
export { 
  walletCacheStore,
  currentAccountTokens,
  currentAccountTransactions,
  currentPortfolioValue,
  currentAccount as currentAccountFromCache 
} from './wallet-cache-v2.store';

// Re-export types from types.ts for backward compatibility
export type { WalletCacheController, TokenCache, TransactionCache, AccountCache } from '$lib/types';

// For default import compatibility
import { walletCacheStore as store } from './wallet-cache-v2.store';
export default store;

// Log migration
if (typeof window !== 'undefined') {
  console.log('[Cache Migration] Using new @yakkl/cache-based implementation');
}