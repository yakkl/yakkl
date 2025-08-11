# Portfolio & Transaction Rollup Architecture

## Overview
This document outlines the comprehensive architecture for implementing a multi-level portfolio and transaction rollup system in the YAKKL wallet. The system supports multiple view types, account hierarchies, watch lists, and synchronized portfolio/transaction displays.

## Implementation Status

### Completed Features ✅
1. **Data Structures**: Complete rollup interfaces and enhanced WalletCacheController
2. **Portfolio Rollup Service**: Full calculation logic for all view types
3. **Store Integration**: Rollup methods in wallet-cache.store with automatic triggers
4. **Derived Stores**: New stores for each view type with rollup optimization
5. **Background Services**: Automatic rollup updates via background-interval.service
6. **Cache Sync**: Enhanced CacheSyncManager with rollup sync methods
7. **UI Refresh**: Message-based refresh system with timeout handling
8. **View Toggle**: Support for all 5 view types in PortfolioOverview
9. **Portfolio Refresh Service**: Handles UI refresh requests and coordinates background updates
10. **Compilation**: All TypeScript errors resolved, clean build achieved

### Architecture Principles
1. **UI Components are Pure Consumers**: Only react to walletCacheStore changes
2. **No Direct Data Updates from UI**: Refresh buttons send messages to background
3. **Atomic Updates**: Cache updates only when all data is ready
4. **Price-Driven Updates**: Prices trigger portfolio recalculation (not transactions)
5. **Immutable Transactions**: Transaction history is never modified by price changes
6. **Background Service Coordination**: All updates flow through background services
7. **Synchronized Refresh Operations**: Prevent concurrent executions from manual and interval refreshes

## Current State Analysis

### Existing Components
1. **wallet-cache.store.ts**: Basic portfolio totals per account/chain
2. **tokenTotals.ts**: Aggregates tokens from yakklCombinedTokenStore
3. **transaction.store.ts**: Transaction management with caching
4. **RecentActivity.svelte**: Transaction display with view modes
5. **PortfolioOverview.svelte**: Portfolio display component

### Key Requirements
1. **Current account values**: Active account on active chain
2. **Current chainId values**: Total for all accounts on a network
3. **All Networks values**: Grand total across everything
4. **Watch list tracking**: Accounts with `includeInPortfolio: true`
5. **Primary/Derived hierarchy**: Subtotals for account hierarchies
6. **Transaction synchronization**: Transactions match portfolio view

## Proposed Architecture

### 1. Enhanced Data Structures

#### WalletCacheController Interface Enhancement
```typescript
interface WalletCacheController {
  // Existing fields...
  activeChainId: number;
  activeAccountAddress: string;
  chainAccountCache: { [chainId: number]: { [accountAddress: string]: AccountCache; }; };
  
  // NEW: Enhanced Portfolio Rollup Structure
  portfolioRollups: {
    // Grand total across everything
    grandTotal: PortfolioRollup;
    
    // By aggregation type
    byAccount: Map<string, PortfolioRollup>;  // Per account across all chains
    byChain: Map<number, PortfolioRollup>;    // Per chain across all accounts
    byAccountChain: Map<string, PortfolioRollup>; // Per account+chain combo
    
    // Hierarchical rollups for primary/derived accounts
    primaryAccountRollups: Map<string, PrimaryAccountRollup>;
    
    // Watch list rollups (includeInPortfolio: true only)
    watchListRollup: PortfolioRollup;
    
    // Last calculation timestamp
    lastCalculated: Date;
  };
  
  // NEW: Transaction Rollups - Parallel to portfolio rollups
  transactionRollups: {
    // Transaction aggregations matching portfolio views
    byAccount: Map<string, TransactionRollup>;
    byChain: Map<number, TransactionRollup>;
    byAccountChain: Map<string, TransactionRollup>;
    
    // Hierarchical transaction rollups
    primaryAccountTransactions: Map<string, PrimaryTransactionRollup>;
    
    // Watch list transactions
    watchListTransactions: TransactionRollup;
    
    // Recent activity cache for quick UI access
    recentActivity: {
      all: TransactionDisplay[];
      byViewType: Map<string, TransactionDisplay[]>;
      lastUpdated: Date;
    };
  };
  
  // NEW: Account metadata for quick lookups
  accountMetadata: {
    primaryAccounts: Set<string>;
    derivedAccounts: Map<string, string>; // derived -> primary mapping
    watchListAccounts: Set<string>;
    includeInPortfolioFlags: Map<string, boolean>;
  };
}
```

#### New Rollup Interfaces
```typescript
interface PortfolioRollup {
  totalValue: BigNumberish;
  tokenCount: number;
  accountCount: number;
  chainCount: number;
  nativeTokenValue: BigNumberish;
  erc20TokenValue: BigNumberish;
  lastCalculated: Date;
  breakdown?: {
    byTokenAddress: Map<string, BigNumberish>;
    byChain?: Map<number, BigNumberish>;
    byAccount?: Map<string, BigNumberish>;
  };
}

interface TransactionRollup {
  totalCount: number;
  pendingCount: number;
  confirmedCount: number;
  failedCount: number;
  totalVolume: BigNumberish;
  lastTransaction?: TransactionDisplay;
  firstTransaction?: TransactionDisplay;
  transactions: TransactionDisplay[]; // Recent subset
  hasMore: boolean;
  lastUpdated: Date;
}

interface PrimaryAccountRollup extends PortfolioRollup {
  primaryAddress: string;
  primaryValue: BigNumberish;
  derivedAccounts: Array<{
    address: string;
    value: BigNumberish;
    tokenCount: number;
  }>;
  totalWithDerived: BigNumberish;
}

interface PrimaryTransactionRollup extends TransactionRollup {
  primaryAddress: string;
  primaryTransactions: TransactionDisplay[];
  derivedTransactions: Map<string, TransactionDisplay[]>;
  aggregatedActivity: TransactionDisplay[]; // Combined and sorted
}
```

### 2. Store Layer Enhancements

#### New Store Methods (wallet-cache.store.ts)

##### Portfolio Methods
- `calculateAllRollups()` - Complete portfolio rollup recalculation
- `updateAccountRollup(address: string)` - Update single account rollup
- `updateChainRollup(chainId: number)` - Update single chain rollup  
- `updateWatchListRollup()` - Update watch list totals
- `updatePrimaryAccountRollup(primaryAddress: string)` - Update primary+derived rollup

##### Transaction Methods
- `updateTransactionRollups()` - Recalculate all transaction rollups
- `updateAccountTransactions(address: string)` - Update single account transactions
- `updateChainTransactions(chainId: number)` - Update single chain transactions
- `syncTransactionView(viewType: string)` - Sync transactions for specific view

##### Combined View Methods
- `getPortfolioView(viewType: ViewType)` - Get portfolio for view
- `getTransactionView(viewType: ViewType)` - Get transactions for view
- `getCombinedView(viewType: ViewType)` - Get both portfolio and transactions

#### New Derived Stores
```typescript
// Portfolio Stores
export const currentAccountValue = derived(...) // Current account on current chain
export const currentChainTotal = derived(...)   // All accounts on current chain  
export const grandPortfolioTotal = derived(...) // All accounts, all chains
export const watchListTotal = derived(...)      // Watch list only
export const primaryAccountHierarchy = derived(...) // Primary + derived hierarchy

// Transaction Stores (synchronized with portfolio views)
export const currentAccountTransactions = derived(...) // Existing
export const currentChainTransactions = derived(...)   // NEW: All accounts on chain
export const allNetworkTransactions = derived(...)     // NEW: All accounts, all chains
export const watchListTransactions = derived(...)      // NEW: Watch list transactions
export const primaryAccountActivityHierarchy = derived(...) // NEW: Primary + derived

// Combined View Stores
export const currentView = derived([currentAccountValue, currentAccountTransactions], ...)
export const chainView = derived([currentChainTotal, currentChainTransactions], ...)
export const portfolioView = derived([grandPortfolioTotal, allNetworkTransactions], ...)
```

### 3. Service Layer Architecture

#### Enhanced CacheSyncManager
```typescript
class CacheSyncManager {
  // Portfolio sync methods
  async syncPortfolioRollups(): Promise<void>
  async syncWatchListAccounts(): Promise<void>
  async syncPrimaryAccountHierarchy(): Promise<void>
  
  // Transaction sync methods
  async syncTransactionRollups(): Promise<void>
  async syncViewTransactions(viewType: string): Promise<void>
  async syncRecentActivity(): Promise<void>
  
  // Combined sync for view changes
  async syncViewChange(newViewType: string): Promise<void> {
    // 1. Update portfolio rollup for view
    // 2. Update transaction rollup for view
    // 3. Cache for quick switching
  }
}
```

#### New Portfolio Rollup Service
```typescript
class PortfolioRollupService {
  // Core calculation methods
  calculateGrandTotal(cache: WalletCacheController): PortfolioRollup
  calculateAccountRollup(address: string, cache: WalletCacheController): PortfolioRollup
  calculateChainRollup(chainId: number, cache: WalletCacheController): PortfolioRollup
  calculatePrimaryAccountHierarchy(primaryAddress: string): PrimaryAccountRollup
  calculateWatchListRollup(watchList: YakklWatch[]): PortfolioRollup
  
  // Incremental update methods
  incrementalUpdateForTokenChange(token: TokenCache): void
  incrementalUpdateForPriceChange(priceMap: Map<string, number>): void
  
  // Validation
  validateRollupConsistency(rollup: PortfolioRollup): boolean
}
```

#### Enhanced TransactionCacheManager
```typescript
class TransactionCacheManager {
  // View-specific caching
  async getCachedTransactionsForView(viewType: string): Promise<TransactionDisplay[]>
  async cacheTransactionsForView(viewType: string, transactions: TransactionDisplay[]): Promise<void>
  
  // Rollup caching
  async getCachedTransactionRollup(rollupType: string): Promise<TransactionRollup>
  async cacheTransactionRollup(rollupType: string, rollup: TransactionRollup): Promise<void>
  
  // Intelligent prefetching
  async prefetchAdjacentViews(currentView: string): Promise<void>
}
```

#### New Portfolio-Transaction Coordinator
```typescript
class PortfolioTransactionCoordinator {
  // Coordinate updates between portfolio and transactions
  async onViewChange(viewType: ViewType): Promise<void>
  async onAccountChange(address: string): Promise<void>
  async onChainChange(chainId: number): Promise<void>
  
  // Ensure consistency
  async syncPortfolioAndTransactions(): Promise<void>
  async validateDataConsistency(): Promise<boolean>
  
  // Batch operations
  async batchUpdateForMultipleChanges(changes: Change[]): Promise<void>
}
```

### 4. Background Service Updates

#### Enhanced Background Interval Service
```typescript
const INTERVALS = {
  transactions: 15 * 60 * 1000,  // 15 minutes
  prices: 5 * 60 * 1000,          // 5 minutes
  portfolio: 2.5 * 60 * 1000,     // 2.5 minutes
  rollups: 1 * 60 * 1000,         // 1 minute - NEW
};

class BackgroundIntervalService {
  // New rollup interval
  private setupRollupInterval(): void {
    this.timerManager.createTimer('rollup-updates', async () => {
      await this.updateAllRollups();
    }, this.currentIntervals.rollups);
  }
  
  private async updateAllRollups(): Promise<void> {
    // 1. Check if data has changed since last rollup
    // 2. Calculate only changed rollups
    // 3. Update persistent storage
    // 4. Trigger store updates
  }
}
```

### 5. UI Component Integration

#### PortfolioOverview.svelte
```svelte
<script lang="ts">
  import { ViewMode } from '$lib/types';
  
  // Shared view mode with RecentActivity
  export let viewMode: ViewMode = 'current_account';
  
  // Portfolio values based on view mode
  let portfolioValue = $derived.by(() => {
    switch (viewMode) {
      case 'current_account':
        return $currentAccountValue;
      case 'single_network':
        return $currentChainTotal;
      case 'all_networks':
        return $grandPortfolioTotal;
      case 'watchlist':
        return $watchListTotal;
    }
  });
  
  // Handle view change
  function handleViewChange(newMode: ViewMode) {
    viewMode = newMode;
    portfolioTransactionCoordinator.onViewChange(newMode);
  }
</script>
```

#### RecentActivity.svelte
```svelte
<script lang="ts">
  // Receive view mode from parent or PortfolioOverview
  export let viewMode: ViewMode = 'current_account';
  
  // Transactions based on view mode
  let transactions = $derived.by(() => {
    switch (viewMode) {
      case 'current_account':
        return $currentAccountTransactions;
      case 'single_network':
        return $currentChainTransactions;
      case 'all_networks':
        return $allNetworkTransactions;
      case 'watchlist':
        return $watchListTransactions;
    }
  });
</script>
```

### 6. Data Flow

```
User Action (View Change)
        ↓
Portfolio-Transaction Coordinator
        ↓
    ┌───┴───┐
    ↓       ↓
Portfolio  Transaction
Service    Service
    ↓       ↓
Calculate  Fetch/Filter
Rollups    Transactions
    ↓       ↓
    └───┬───┘
        ↓
Update Cache Store
        ↓
Persist to Storage
        ↓
Update Svelte Stores
        ↓
    ┌───┴───┐
    ↓       ↓
Portfolio  Recent
Overview   Activity
```

### 7. Implementation Phases

#### Phase 1: Data Structure & Interfaces (2-3 days)
- [ ] Update WalletCacheController interface
- [ ] Add rollup interfaces
- [ ] Add metadata tracking structures
- [ ] Update existing interfaces for compatibility

#### Phase 2: Core Rollup Logic (3-4 days)
- [ ] Implement PortfolioRollupService
- [ ] Add rollup calculation methods to wallet-cache.store
- [ ] Implement efficient aggregation algorithms
- [ ] Add transaction rollup calculations

#### Phase 3: Service Integration (3-4 days)
- [ ] Create PortfolioTransactionCoordinator
- [ ] Enhance TransactionCacheManager
- [ ] Update CacheSyncManager
- [ ] Add coordination flags and smart scheduling

#### Phase 4: Store Synchronization (2-3 days)
- [ ] Create synchronized derived stores
- [ ] Implement view-based filtering
- [ ] Add combined view stores
- [ ] Ensure reactive updates

#### Phase 5: UI Component Updates (2-3 days)
- [ ] Sync PortfolioOverview and RecentActivity
- [ ] Implement seamless view switching
- [ ] Add loading states
- [ ] Update component props and events

#### Phase 6: Testing & Optimization (2-3 days)
- [ ] Performance testing with large datasets
- [ ] Implement incremental updates
- [ ] Add view prefetching
- [ ] Optimize memory usage

### 8. Performance Considerations

#### Caching Strategy
- **Memory Cache**: Recent rollups for active views
- **Persistent Cache**: All rollups with timestamps
- **Prefetch Strategy**: Adjacent views based on user patterns
- **Invalidation**: Smart invalidation based on data changes

#### Optimization Techniques
1. **Incremental Updates**: Only recalculate affected rollups
2. **Batch Processing**: Group multiple updates
3. **Lazy Loading**: Calculate non-visible rollups on demand
4. **Web Workers**: Heavy calculations off main thread
5. **Debouncing**: Prevent excessive recalculations

### 9. Race Condition Prevention

#### Synchronization Mechanisms
```typescript
class RollupSemaphore {
  private locks: Map<string, boolean> = new Map();
  private queue: Map<string, Function[]> = new Map();
  
  async acquireLock(key: string): Promise<void>
  releaseLock(key: string): void
  
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T>
}
```

#### Update Coordination
- Use semaphores for rollup calculations
- Queue rollup update requests
- Ensure atomic updates
- Version tracking for consistency

### 10. Account Hierarchy Support

#### Primary/Derived Account Structure
```typescript
interface AccountHierarchy {
  primary: YakklPrimaryAccount;
  derived: YakklAccount[];
  
  // Rollup data
  primaryValue: BigNumberish;
  derivedValues: Map<string, BigNumberish>;
  totalValue: BigNumberish;
  
  // Transaction data
  primaryTransactions: TransactionDisplay[];
  derivedTransactions: Map<string, TransactionDisplay[]>;
  allTransactions: TransactionDisplay[]; // Merged and sorted
}
```

#### Hierarchy Calculations
1. Identify primary accounts
2. Map derived accounts to primaries
3. Calculate individual values
4. Aggregate hierarchically
5. Maintain subtotals at each level

### 11. Watch List Integration

#### Watch List Management
```typescript
interface WatchListManager {
  // Track watch list accounts
  watchAccounts: Set<string>;
  includeInPortfolioFlags: Map<string, boolean>;
  
  // Methods
  addWatchAccount(account: YakklWatch): void
  removeWatchAccount(address: string): void
  toggleIncludeInPortfolio(address: string): void
  
  // Rollup integration
  getWatchListRollup(): PortfolioRollup
  getWatchListTransactions(): TransactionDisplay[]
}
```

### 12. Benefits & Features

#### Key Benefits
1. **Unified Experience**: Portfolio and transactions always synchronized
2. **Performance**: Pre-calculated rollups with intelligent caching
3. **Scalability**: Handles unlimited accounts/chains/transactions
4. **Flexibility**: Multiple view types with seamless switching
5. **Audit Trail**: Complete transaction history with hierarchy
6. **Real-time Updates**: Live pending transaction monitoring
7. **Institutional Ready**: Full account hierarchy with subtotals

#### Advanced Features
- Multi-level account hierarchies (primary/derived)
- Watch list with portfolio inclusion toggle
- Cross-chain aggregation
- Historical data tracking
- Export capabilities for reporting
- Customizable view preferences

### 13. Migration Strategy

#### Data Migration
1. Detect existing cache format
2. Transform to new structure
3. Calculate initial rollups
4. Validate data integrity
5. Clean up old format

#### Backward Compatibility
- Maintain existing store APIs
- Gradual deprecation of old methods
- Feature flags for rollout
- Fallback mechanisms

### 14. Testing Strategy

#### Unit Tests
- Rollup calculation accuracy
- Store synchronization
- Service coordination
- Cache management

#### Integration Tests
- View switching scenarios
- Data update flows
- Cross-component communication
- Performance benchmarks

#### E2E Tests
- User workflows
- Multi-account scenarios
- Large dataset handling
- Real-time updates

### 15. Security Considerations

#### Data Protection
- Encrypt sensitive rollup data
- Validate all calculations
- Audit trail for changes
- Secure cache storage

#### Performance Security
- Rate limiting on calculations
- Memory usage monitoring
- DOS prevention
- Resource throttling

## Conclusion

This architecture provides a comprehensive solution for portfolio and transaction rollups that scales from personal to institutional use. The synchronized views, hierarchical support, and performance optimizations ensure a smooth user experience while maintaining data accuracy and consistency.

## Refresh Synchronization Architecture

### Overview
The refresh synchronization system prevents race conditions and duplicate executions when multiple sources trigger data refreshes simultaneously (user clicks, background intervals, etc.).

### Key Components

#### 1. Synchronization Flags
- **refreshInProgress**: Boolean flag indicating if a refresh is currently running
- **refreshTimeout**: Fail-safe timeout (30s) to automatically reset the flag
- **userInitiated**: Distinguishes between user-triggered and interval-triggered refreshes

#### 2. Refresh Sources
- **User-Initiated**: Triggered by clicking refresh button in UI
- **Interval-Based**: Automatic background intervals (transactions, prices, portfolio, rollups)
- **Initial Load**: Immediate execution when valid accounts are detected

#### 3. Synchronization Flow
```
User clicks refresh / Interval fires
        ↓
Check refreshInProgress flag
        ↓
    ┌───┴───┐
    ↓       ↓
  False    True
    ↓       ↓
Set flag   Skip
to true    (return)
    ↓
Execute refresh
    ↓
Clear flag
    ↓
Notify UI
```

#### 4. UI Loading State Management
- Loading animation ONLY shows for user-initiated refreshes
- Background interval refreshes don't trigger loading animation
- Loading state cleared when refresh completes or times out

#### 5. Fail-Safe Mechanisms
- **Timeout Reset**: 30-second timeout automatically resets flag if refresh hangs
- **Error Handling**: Flag always cleared in finally blocks
- **Debouncing**: 500ms debounce for rapid refresh requests

#### 6. Implementation Details

##### PortfolioOverview.svelte
```typescript
// Track if refresh was user-initiated
let isUserInitiatedRefresh = $state(false);

// Only show loading animation for user clicks
if (isUserInitiatedRefresh) {
  loading = true;
}
```

##### PortfolioRefreshService
```typescript
// Check and set synchronization flag
if (this.refreshInProgress) {
  return; // Skip if already running
}
this.refreshInProgress = true;

// Set fail-safe timeout
setTimeout(() => {
  this.refreshInProgress = false;
}, 30000);

// Always clear flag in finally
finally {
  this.refreshInProgress = false;
}
```

##### BackgroundIntervalService
```typescript
// Check refresh service before running intervals
if (refreshService.isRefreshInProgress()) {
  return; // Skip interval execution
}
```

### Benefits
1. **No Duplicate Executions**: Prevents multiple refreshes from running simultaneously
2. **Optimized Performance**: Reduces unnecessary API calls and computations
3. **Better UX**: Loading states only show when user expects them
4. **Reliability**: Fail-safe mechanisms ensure system doesn't get stuck
5. **Clear Separation**: User actions and background processes are properly coordinated

## Next Steps

1. Review and approve architecture
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews
5. Iterative testing and refinement