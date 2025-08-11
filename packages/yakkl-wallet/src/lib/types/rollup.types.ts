/**
 * Rollup type definitions for portfolio and transaction aggregations
 * These types support multi-level views and account hierarchies
 */

import type { BigNumberish } from '$lib/common/bignumber';
import type { TransactionDisplay } from '$lib/types';
import type { YakklAccount, YakklPrimaryAccount, YakklWatch } from '$lib/common/interfaces';

/**
 * View types for portfolio and transaction displays
 */
export type ViewType = 'current' | 'chain' | 'account' | 'all' | 'watchlist' | 'hierarchy';

/**
 * Base portfolio rollup structure
 * Contains aggregated values and metadata for a portfolio view
 */
export interface PortfolioRollup {
  // Core values
  totalValue: BigNumberish;
  tokenCount: number;
  accountCount: number;
  chainCount: number;
  
  // Value breakdown
  nativeTokenValue: BigNumberish;
  erc20TokenValue: BigNumberish;
  
  // Metadata
  lastCalculated: Date;
  
  // Optional detailed breakdown - using objects for JSON serialization
  breakdown?: {
    byTokenAddress: { [tokenAddress: string]: BigNumberish };
    byChain?: { [chainId: number]: BigNumberish };
    byAccount?: { [accountAddress: string]: BigNumberish };
  };
}

/**
 * Transaction rollup structure
 * Contains aggregated transaction data for a specific view
 */
export interface TransactionRollup {
  // Counts
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  failedCount: number;
  
  // Volume
  totalVolume: BigNumberish;
  
  // Transaction samples
  lastTransaction?: TransactionDisplay;
  firstTransaction?: TransactionDisplay;
  transactions: TransactionDisplay[]; // Recent subset for display
  
  // Metadata
  hasMore: boolean;
  lastUpdated: Date;
}

/**
 * Primary account rollup with derived accounts
 * Extends portfolio rollup with hierarchical structure
 */
export interface PrimaryAccountRollup extends PortfolioRollup {
  // Primary account info
  primaryAddress: string;
  primaryValue: BigNumberish;
  
  // Derived accounts breakdown
  derivedAccounts: Array<{
    address: string;
    value: BigNumberish;
    tokenCount: number;
    account?: YakklAccount; // Optional full account data
  }>;
  
  // Total including derived
  totalWithDerived: BigNumberish;
}

/**
 * Primary account transaction rollup
 * Extends transaction rollup with hierarchical structure
 */
export interface PrimaryTransactionRollup extends TransactionRollup {
  // Primary account info
  primaryAddress: string;
  primaryTransactions: TransactionDisplay[];
  
  // Derived account transactions - using object for JSON serialization
  derivedTransactions: { [derivedAddress: string]: TransactionDisplay[] };
  
  // Combined activity (merged and sorted)
  aggregatedActivity: TransactionDisplay[];
}

/**
 * Watch list rollup
 * Special rollup for tracked external accounts
 */
export interface WatchListRollup extends PortfolioRollup {
  // Watch list specific
  watchAccounts: Array<{
    address: string;
    alias?: string;
    value: BigNumberish;
    includeInPortfolio: boolean;
  }>;
  
  // Totals
  includedValue: BigNumberish; // Only accounts with includeInPortfolio: true
  excludedValue: BigNumberish; // Accounts with includeInPortfolio: false
}

/**
 * Combined view data
 * Pairs portfolio and transaction data for a specific view
 */
export interface CombinedViewData {
  viewType: ViewType;
  portfolio: PortfolioRollup;
  transactions: TransactionRollup;
  lastUpdated: Date;
}

/**
 * Account metadata for efficient lookups
 */
export interface AccountMetadata {
  // Account categorization - using arrays/objects for JSON serialization
  primaryAccounts: string[];
  derivedAccounts: { [derivedAddress: string]: string }; // derived address -> primary address
  watchListAccounts: string[];
  
  // Flags
  includeInPortfolioFlags: { [accountAddress: string]: boolean };
  
  // Account details cache
  accountDetails: { [accountAddress: string]: {
    name: string;
    alias?: string;
    type: 'primary' | 'derived' | 'imported' | 'watch';
    chainIds: number[];
  }};
}

/**
 * Rollup calculation context
 * Provides necessary data for rollup calculations
 */
export interface RollupContext {
  chainId?: number;
  accountAddress?: string;
  includeWatchList?: boolean;
  includeDerived?: boolean;
  viewType: ViewType;
}

/**
 * Rollup update event
 * Emitted when rollups are recalculated
 */
export interface RollupUpdateEvent {
  type: 'portfolio' | 'transaction' | 'both';
  viewType: ViewType;
  context?: RollupContext;
  timestamp: Date;
}

/**
 * Cache entry for rollup data
 */
export interface RollupCacheEntry<T> {
  data: T;
  timestamp: Date;
  viewType: ViewType;
  context?: RollupContext;
  ttl?: number; // Time to live in milliseconds
}