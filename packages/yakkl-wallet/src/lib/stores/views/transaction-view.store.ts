/**
 * Transaction View Store
 * 
 * Provides a transaction-centric view of wallet activity with:
 * - Transaction history across all accounts and chains
 * - Real-time transaction monitoring
 * - Gas analytics and optimization suggestions
 * - Flow visualization for transaction patterns
 * - Advanced filtering and categorization
 */

import { derived, get, type Readable } from 'svelte/store';
import { BaseViewStore } from './base-view.store';
import type { BigNumberish } from '$lib/common/bignumber';
import { log } from '$lib/common/logger-wrapper';

/**
 * Transaction data structure for the view
 */
export interface TransactionData {
  // Core identity
  id: string;                    // Unique identifier (chainId:hash)
  hash: string;                  // Transaction hash
  chainId: number;              // Chain this transaction occurred on
  blockNumber?: number;          // Block number (undefined if pending)
  timestamp: number;             // Transaction timestamp
  
  // Transaction parties
  from: string;                  // Sender address
  to: string;                    // Recipient address
  fromLabel?: string;            // Human-readable from label
  toLabel?: string;              // Human-readable to label
  
  // Transaction details
  value: bigint;                 // ETH/native token value in wei
  valueCents: bigint;            // Value in USD cents at time of tx
  currentValueCents?: bigint;    // Current value in USD cents
  
  // Gas details
  gasLimit: bigint;              // Gas limit
  gasUsed?: bigint;              // Actual gas used
  gasPrice: bigint;              // Gas price in wei
  maxFeePerGas?: bigint;         // EIP-1559 max fee
  maxPriorityFeePerGas?: bigint; // EIP-1559 priority fee
  gasCostWei: bigint;            // Total gas cost in wei
  gasCostCents: bigint;          // Gas cost in USD cents
  
  // Status and type
  status: 'pending' | 'confirmed' | 'failed' | 'dropped';
  confirmations: number;         // Number of confirmations
  type: TransactionType;         // Transaction type
  direction: 'in' | 'out' | 'self';  // Direction relative to user
  
  // Contract interaction
  isContract: boolean;           // Whether 'to' is a contract
  contractName?: string;         // Known contract name
  methodId?: string;             // Method signature
  functionName?: string;         // Decoded function name
  decodedInput?: any;            // Decoded input data
  
  // Token transfers
  tokenTransfers?: TokenTransfer[];
  
  // NFT transfers
  nftTransfers?: NFTTransfer[];
  
  // DeFi specific
  protocol?: string;             // DeFi protocol (Uniswap, Aave, etc)
  action?: string;               // swap, stake, lend, borrow, etc
  
  // Flow visualization metadata
  flow: {
    startX: number;              // Start X coordinate (from address)
    startY: number;              // Start Y coordinate
    endX: number;                // End X coordinate (to address)
    endY: number;                // End Y coordinate
    curveControlX: number;       // Bezier curve control point X
    curveControlY: number;       // Bezier curve control point Y
    color: string;               // Flow line color
    width: number;               // Line width (based on value)
    speed: number;               // Animation speed (1-10)
    particleCount: number;       // Number of flowing particles
    glowIntensity: number;       // Glow effect intensity
    dashPattern?: number[];      // Dash pattern for pending
  };
  
  // Categorization and metadata
  category: TransactionCategory; // Transaction category
  tags: string[];                // User-defined tags
  notes?: string;                // User notes
  isImportant: boolean;          // Marked as important
  isHidden: boolean;             // Hidden from main view
  
  // Related transactions
  relatedTxHashes?: string[];    // Related transaction hashes
  batchId?: string;              // Batch transaction ID
  sequenceIndex?: number;        // Position in batch
}

/**
 * Transaction types
 */
export type TransactionType = 
  | 'transfer'
  | 'contract_interaction'
  | 'token_transfer'
  | 'token_approval'
  | 'nft_transfer'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'lend'
  | 'borrow'
  | 'repay'
  | 'liquidation'
  | 'bridge'
  | 'deploy'
  | 'mint'
  | 'burn'
  | 'claim'
  | 'vote'
  | 'cancel'
  | 'unknown';

/**
 * Transaction categories
 */
export type TransactionCategory =
  | 'transfer'
  | 'defi'
  | 'nft'
  | 'gaming'
  | 'dao'
  | 'bridge'
  | 'trading'
  | 'yield'
  | 'governance'
  | 'other';

/**
 * Token transfer within a transaction
 */
export interface TokenTransfer {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  from: string;
  to: string;
  amount: bigint;
  valueCents: bigint;
}

/**
 * NFT transfer within a transaction
 */
export interface NFTTransfer {
  contractAddress: string;
  collectionName: string;
  tokenId: string;
  tokenUri?: string;
  from: string;
  to: string;
  valueCents?: bigint;
}

/**
 * Transaction view state
 */
export interface TransactionViewState {
  transactions: TransactionData[];
  pendingTransactions: TransactionData[];
  totalTransactions: number;
  totalGasSpentCents: bigint;
  averageGasCents: bigint;
  
  analytics: {
    byCategory: Map<TransactionCategory, number>;
    byType: Map<TransactionType, number>;
    byProtocol: Map<string, number>;
    byHour: Map<number, number>;      // Hour of day distribution
    byDayOfWeek: Map<number, number>; // Day of week distribution
    gasEfficiency: number;            // 0-100 score
    activityScore: number;            // 0-100 activity level
  };
  
  filters: {
    search: string;
    chains: number[];
    accounts: string[];
    dateRange: {
      start: number;
      end: number;
    };
    types: TransactionType[];
    categories: TransactionCategory[];
    status: ('pending' | 'confirmed' | 'failed')[];
    minValue: number;
    maxValue: number;
    showHidden: boolean;
  };
  
  sort: {
    field: 'timestamp' | 'value' | 'gas' | 'status';
    direction: 'asc' | 'desc';
  };
  
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Transaction View Store Implementation
 */
class TransactionViewStore extends BaseViewStore<TransactionViewState> {
  constructor() {
    const initialState: TransactionViewState = {
      transactions: [],
      pendingTransactions: [],
      totalTransactions: 0,
      totalGasSpentCents: 0n,
      averageGasCents: 0n,
      analytics: {
        byCategory: new Map(),
        byType: new Map(),
        byProtocol: new Map(),
        byHour: new Map(),
        byDayOfWeek: new Map(),
        gasEfficiency: 50,
        activityScore: 0
      },
      filters: {
        search: '',
        chains: [],
        accounts: [],
        dateRange: {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          end: Date.now()
        },
        types: [],
        categories: [],
        status: [],
        minValue: 0,
        maxValue: Number.MAX_SAFE_INTEGER,
        showHidden: false
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    };

    super(initialState, {
      storageKey: 'view_cache_transaction',
      syncInterval: 15000,  // 15 seconds for pending tx
      maxCacheAge: 60000,   // 1 minute
      enableAutoSync: true
    });
  }

  /**
   * Add a new transaction
   */
  async addTransaction(transaction: TransactionData): Promise<void> {
    const currentData = get(this.store);
    
    // Add flow visualization data
    transaction = this.calculateFlowVisualization(transaction, currentData.transactions);
    
    // Add to appropriate list
    if (transaction.status === 'pending') {
      currentData.pendingTransactions.push(transaction);
    } else {
      currentData.transactions.push(transaction);
    }
    
    this.store.set(this.recalculateAnalytics(currentData));
    await this.saveToStorage();
  }

  /**
   * Update transaction status
   */
  async updateTransactionStatus(
    hash: string, 
    status: TransactionData['status'],
    confirmations?: number,
    blockNumber?: number
  ): Promise<void> {
    const currentData = get(this.store);
    
    // Check pending transactions first
    const pendingIndex = currentData.pendingTransactions.findIndex(tx => tx.hash === hash);
    
    if (pendingIndex >= 0) {
      const tx = currentData.pendingTransactions[pendingIndex];
      tx.status = status;
      
      if (confirmations !== undefined) tx.confirmations = confirmations;
      if (blockNumber !== undefined) tx.blockNumber = blockNumber;
      
      // Move to confirmed if no longer pending
      if (status !== 'pending') {
        currentData.pendingTransactions.splice(pendingIndex, 1);
        currentData.transactions.push(tx);
      }
    } else {
      // Update in main transactions list
      const tx = currentData.transactions.find(t => t.hash === hash);
      if (tx) {
        tx.status = status;
        if (confirmations !== undefined) tx.confirmations = confirmations;
        if (blockNumber !== undefined) tx.blockNumber = blockNumber;
      }
    }
    
    this.store.set(this.recalculateAnalytics(currentData));
    await this.saveToStorage();
  }

  /**
   * Batch update transactions
   */
  async updateTransactions(transactions: TransactionData[]): Promise<void> {
    const currentData = get(this.store);
    const txMap = new Map(currentData.transactions.map(tx => [tx.id, tx]));
    const pendingMap = new Map(currentData.pendingTransactions.map(tx => [tx.id, tx]));
    
    transactions.forEach(tx => {
      // Add flow visualization
      tx = this.calculateFlowVisualization(tx, currentData.transactions);
      
      if (tx.status === 'pending') {
        pendingMap.set(tx.id, tx);
        txMap.delete(tx.id);
      } else {
        txMap.set(tx.id, tx);
        pendingMap.delete(tx.id);
      }
    });
    
    currentData.transactions = Array.from(txMap.values());
    currentData.pendingTransactions = Array.from(pendingMap.values());
    
    this.store.set(this.recalculateAnalytics(currentData));
    await this.saveToStorage();
  }

  /**
   * Calculate flow visualization for a transaction
   */
  private calculateFlowVisualization(
    tx: TransactionData, 
    existingTxs: TransactionData[]
  ): TransactionData {
    // Create address position map
    const addressPositions = this.calculateAddressPositions(tx, existingTxs);
    
    const fromPos = addressPositions.get(tx.from.toLowerCase()) || { x: 0, y: 0 };
    const toPos = addressPositions.get(tx.to.toLowerCase()) || { x: 100, y: 100 };
    
    // Calculate bezier curve control point for smooth flow
    const midX = (fromPos.x + toPos.x) / 2;
    const midY = (fromPos.y + toPos.y) / 2;
    const distance = Math.sqrt(
      Math.pow(toPos.x - fromPos.x, 2) + 
      Math.pow(toPos.y - fromPos.y, 2)
    );
    
    // Offset control point perpendicular to the line
    const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
    const perpAngle = angle + Math.PI / 2;
    const curveOffset = Math.min(distance * 0.3, 50);
    
    tx.flow = {
      startX: fromPos.x,
      startY: fromPos.y,
      endX: toPos.x,
      endY: toPos.y,
      curveControlX: midX + Math.cos(perpAngle) * curveOffset,
      curveControlY: midY + Math.sin(perpAngle) * curveOffset,
      color: this.getFlowColor(tx),
      width: this.getFlowWidth(tx.valueCents),
      speed: tx.status === 'pending' ? 8 : 3,
      particleCount: Math.min(Math.max(Number(tx.valueCents / 10000n), 3), 20),
      glowIntensity: tx.status === 'pending' ? 0.8 : 0.4,
      dashPattern: tx.status === 'pending' ? [5, 5] : undefined
    };
    
    return tx;
  }

  /**
   * Calculate positions for addresses in flow visualization
   */
  private calculateAddressPositions(
    tx: TransactionData,
    existingTxs: TransactionData[]
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Collect all unique addresses
    const addresses = new Set<string>();
    addresses.add(tx.from.toLowerCase());
    addresses.add(tx.to.toLowerCase());
    
    existingTxs.slice(-100).forEach(t => {
      addresses.add(t.from.toLowerCase());
      addresses.add(t.to.toLowerCase());
    });
    
    // Arrange addresses in a circular pattern
    const addressArray = Array.from(addresses);
    const angleStep = (Math.PI * 2) / addressArray.length;
    const radius = 200;
    
    addressArray.forEach((addr, index) => {
      const angle = index * angleStep;
      positions.set(addr, {
        x: 250 + Math.cos(angle) * radius,
        y: 250 + Math.sin(angle) * radius
      });
    });
    
    return positions;
  }

  /**
   * Get flow color based on transaction properties
   */
  private getFlowColor(tx: TransactionData): string {
    if (tx.status === 'failed') return '#ff3333';
    if (tx.status === 'pending') return '#ffaa33';
    
    switch (tx.type) {
      case 'swap': return '#33aaff';
      case 'stake': return '#33ff88';
      case 'nft_transfer': return '#ff33ff';
      case 'bridge': return '#aa33ff';
      default:
        return tx.direction === 'in' ? '#33ff33' : '#ff8833';
    }
  }

  /**
   * Get flow width based on value
   */
  private getFlowWidth(valueCents: bigint): number {
    const value = Number(valueCents) / 100;
    
    if (value < 10) return 1;
    if (value < 100) return 2;
    if (value < 1000) return 3;
    if (value < 10000) return 4;
    return 5;
  }

  /**
   * Recalculate analytics
   */
  private recalculateAnalytics(state: TransactionViewState): TransactionViewState {
    const allTxs = [...state.transactions, ...state.pendingTransactions];
    
    // Reset analytics
    state.analytics.byCategory.clear();
    state.analytics.byType.clear();
    state.analytics.byProtocol.clear();
    state.analytics.byHour.clear();
    state.analytics.byDayOfWeek.clear();
    
    let totalGas = 0n;
    let successfulTxs = 0;
    
    allTxs.forEach(tx => {
      // Category distribution
      const catCount = state.analytics.byCategory.get(tx.category) || 0;
      state.analytics.byCategory.set(tx.category, catCount + 1);
      
      // Type distribution
      const typeCount = state.analytics.byType.get(tx.type) || 0;
      state.analytics.byType.set(tx.type, typeCount + 1);
      
      // Protocol distribution
      if (tx.protocol) {
        const protocolCount = state.analytics.byProtocol.get(tx.protocol) || 0;
        state.analytics.byProtocol.set(tx.protocol, protocolCount + 1);
      }
      
      // Time distribution
      const date = new Date(tx.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      const hourCount = state.analytics.byHour.get(hour) || 0;
      state.analytics.byHour.set(hour, hourCount + 1);
      
      const dayCount = state.analytics.byDayOfWeek.get(dayOfWeek) || 0;
      state.analytics.byDayOfWeek.set(dayOfWeek, dayCount + 1);
      
      // Gas tracking
      if (tx.status === 'confirmed') {
        totalGas += tx.gasCostCents;
        successfulTxs++;
      }
    });
    
    // Calculate totals and averages
    state.totalTransactions = allTxs.length;
    state.totalGasSpentCents = totalGas;
    state.averageGasCents = successfulTxs > 0 ? totalGas / BigInt(successfulTxs) : 0n;
    
    // Calculate gas efficiency (mock calculation)
    const failedTxs = allTxs.filter(tx => tx.status === 'failed').length;
    state.analytics.gasEfficiency = successfulTxs > 0 
      ? Math.round((1 - failedTxs / allTxs.length) * 100)
      : 0;
    
    // Calculate activity score
    const recentTxs = allTxs.filter(tx => 
      tx.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;
    state.analytics.activityScore = Math.min(recentTxs * 10, 100);
    
    // Update pagination
    const filteredCount = this.getFilteredTransactions().length;
    state.pagination.totalPages = Math.ceil(filteredCount / state.pagination.pageSize);
    
    return state;
  }

  /**
   * Get filtered and paginated transactions
   */
  getFilteredTransactions(): TransactionData[] {
    const state = get(this.store);
    const allTxs = [...state.transactions, ...state.pendingTransactions];
    
    let filtered = allTxs;
    
    // Apply search filter
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.hash.toLowerCase().includes(search) ||
        tx.from.toLowerCase().includes(search) ||
        tx.to.toLowerCase().includes(search) ||
        tx.fromLabel?.toLowerCase().includes(search) ||
        tx.toLabel?.toLowerCase().includes(search) ||
        tx.functionName?.toLowerCase().includes(search)
      );
    }
    
    // Apply chain filter
    if (state.filters.chains.length > 0) {
      filtered = filtered.filter(tx => 
        state.filters.chains.includes(tx.chainId)
      );
    }
    
    // Apply account filter
    if (state.filters.accounts.length > 0) {
      filtered = filtered.filter(tx =>
        state.filters.accounts.includes(tx.from.toLowerCase()) ||
        state.filters.accounts.includes(tx.to.toLowerCase())
      );
    }
    
    // Apply date range filter
    filtered = filtered.filter(tx =>
      tx.timestamp >= state.filters.dateRange.start &&
      tx.timestamp <= state.filters.dateRange.end
    );
    
    // Apply type filter
    if (state.filters.types.length > 0) {
      filtered = filtered.filter(tx =>
        state.filters.types.includes(tx.type)
      );
    }
    
    // Apply category filter
    if (state.filters.categories.length > 0) {
      filtered = filtered.filter(tx =>
        state.filters.categories.includes(tx.category)
      );
    }
    
    // Apply status filter
    if (state.filters.status.length > 0) {
      filtered = filtered.filter(tx =>
        state.filters.status.includes(tx.status as any)
      );
    }
    
    // Apply value range filter
    filtered = filtered.filter(tx => {
      const value = Number(tx.valueCents) / 100;
      return value >= state.filters.minValue && value <= state.filters.maxValue;
    });
    
    // Apply hidden filter
    if (!state.filters.showHidden) {
      filtered = filtered.filter(tx => !tx.isHidden);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sort.field) {
        case 'timestamp':
          comparison = b.timestamp - a.timestamp;
          break;
        case 'value':
          comparison = Number(b.valueCents - a.valueCents);
          break;
        case 'gas':
          comparison = Number(b.gasCostCents - a.gasCostCents);
          break;
        case 'status':
          const statusOrder = { pending: 0, confirmed: 1, failed: 2, dropped: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      
      return state.sort.direction === 'asc' ? -comparison : comparison;
    });
    
    return filtered;
  }

  /**
   * Get paginated transactions
   */
  getPaginatedTransactions(): TransactionData[] {
    const filtered = this.getFilteredTransactions();
    const state = get(this.store);
    
    const start = (state.pagination.page - 1) * state.pagination.pageSize;
    const end = start + state.pagination.pageSize;
    
    return filtered.slice(start, end);
  }

  /**
   * Update filters
   */
  async updateFilters(filters: Partial<TransactionViewState['filters']>): Promise<void> {
    const currentData = get(this.store);
    currentData.filters = { ...currentData.filters, ...filters };
    currentData.pagination.page = 1; // Reset to first page
    this.store.set(this.recalculateAnalytics(currentData));
    await this.saveToStorage();
  }

  /**
   * Update pagination
   */
  async updatePagination(pagination: Partial<TransactionViewState['pagination']>): Promise<void> {
    const currentData = get(this.store);
    currentData.pagination = { ...currentData.pagination, ...pagination };
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Add tag to transaction
   */
  async addTag(txId: string, tag: string): Promise<void> {
    const currentData = get(this.store);
    const tx = [...currentData.transactions, ...currentData.pendingTransactions]
      .find(t => t.id === txId);
    
    if (tx && !tx.tags.includes(tag)) {
      tx.tags.push(tag);
      this.store.set(currentData);
    await this.saveToStorage();
    }
  }

  /**
   * Mark transaction as important
   */
  async toggleImportant(txId: string): Promise<void> {
    const currentData = get(this.store);
    const tx = [...currentData.transactions, ...currentData.pendingTransactions]
      .find(t => t.id === txId);
    
    if (tx) {
      tx.isImportant = !tx.isImportant;
      this.store.set(currentData);
    await this.saveToStorage();
    }
  }

  /**
   * Hide/show transaction
   */
  async toggleHidden(txId: string): Promise<void> {
    const currentData = get(this.store);
    const tx = [...currentData.transactions, ...currentData.pendingTransactions]
      .find(t => t.id === txId);
    
    if (tx) {
      tx.isHidden = !tx.isHidden;
      this.store.set(currentData);
    await this.saveToStorage();
    }
  }

  // Implement abstract methods from BaseViewStore
  
  protected async hydrateData(data: any): Promise<TransactionViewState> {
    // Convert string values back to BigInt
    if (data.totalGasSpentCents) {
      data.totalGasSpentCents = BigInt(data.totalGasSpentCents);
    }
    
    if (data.averageGasCents) {
      data.averageGasCents = BigInt(data.averageGasCents);
    }
    
    // Hydrate transactions
    const hydrateTransaction = (tx: any) => {
      if (tx.value) tx.value = BigInt(tx.value);
      if (tx.valueCents) tx.valueCents = BigInt(tx.valueCents);
      if (tx.currentValueCents) tx.currentValueCents = BigInt(tx.currentValueCents);
      if (tx.gasLimit) tx.gasLimit = BigInt(tx.gasLimit);
      if (tx.gasUsed) tx.gasUsed = BigInt(tx.gasUsed);
      if (tx.gasPrice) tx.gasPrice = BigInt(tx.gasPrice);
      if (tx.maxFeePerGas) tx.maxFeePerGas = BigInt(tx.maxFeePerGas);
      if (tx.maxPriorityFeePerGas) tx.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas);
      if (tx.gasCostWei) tx.gasCostWei = BigInt(tx.gasCostWei);
      if (tx.gasCostCents) tx.gasCostCents = BigInt(tx.gasCostCents);
      
      if (tx.tokenTransfers) {
        tx.tokenTransfers.forEach((transfer: any) => {
          if (transfer.amount) transfer.amount = BigInt(transfer.amount);
          if (transfer.valueCents) transfer.valueCents = BigInt(transfer.valueCents);
        });
      }
      
      if (tx.nftTransfers) {
        tx.nftTransfers.forEach((transfer: any) => {
          if (transfer.valueCents) transfer.valueCents = BigInt(transfer.valueCents);
        });
      }
      
      return tx;
    };
    
    if (data.transactions) {
      data.transactions = data.transactions.map(hydrateTransaction);
    }
    
    if (data.pendingTransactions) {
      data.pendingTransactions = data.pendingTransactions.map(hydrateTransaction);
    }
    
    // Recreate Maps
    if (data.analytics) {
      data.analytics.byCategory = new Map(Object.entries(data.analytics.byCategory || {}));
      data.analytics.byType = new Map(Object.entries(data.analytics.byType || {}));
      data.analytics.byProtocol = new Map(Object.entries(data.analytics.byProtocol || {}));
      data.analytics.byHour = new Map(Object.entries(data.analytics.byHour || {}));
      data.analytics.byDayOfWeek = new Map(Object.entries(data.analytics.byDayOfWeek || {}));
    }
    
    return data as TransactionViewState;
  }
  
  protected async dehydrateData(data: TransactionViewState): Promise<any> {
    // Convert BigInt to string and Maps to objects for storage
    const dehydrated = JSON.parse(JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }));
    
    return dehydrated;
  }
  
  protected mergeData(current: TransactionViewState, incoming: Partial<TransactionViewState>): TransactionViewState {
    // Merge transactions by ID
    if (incoming.transactions || incoming.pendingTransactions) {
      const txMap = new Map(current.transactions.map(t => [t.id, t]));
      const pendingMap = new Map(current.pendingTransactions.map(t => [t.id, t]));
      
      if (incoming.transactions) {
        incoming.transactions.forEach(tx => {
          txMap.set(tx.id, tx);
          pendingMap.delete(tx.id);
        });
      }
      
      if (incoming.pendingTransactions) {
        incoming.pendingTransactions.forEach(tx => {
          pendingMap.set(tx.id, tx);
          txMap.delete(tx.id);
        });
      }
      
      current.transactions = Array.from(txMap.values());
      current.pendingTransactions = Array.from(pendingMap.values());
    }
    
    return { ...current, ...incoming };
  }
  
  protected applyDelta(current: TransactionViewState, delta: any): TransactionViewState {
    // Apply incremental updates
    if (delta.transactions) {
      const txMap = new Map(current.transactions.map(t => [t.id, t]));
      delta.transactions.forEach((txUpdate: any) => {
        const existing = txMap.get(txUpdate.id);
        if (existing) {
          txMap.set(txUpdate.id, { ...existing, ...txUpdate });
        } else {
          txMap.set(txUpdate.id, txUpdate);
        }
      });
      current.transactions = Array.from(txMap.values());
    }
    
    if (delta.pendingTransactions) {
      const pendingMap = new Map(current.pendingTransactions.map(t => [t.id, t]));
      delta.pendingTransactions.forEach((txUpdate: any) => {
        const existing = pendingMap.get(txUpdate.id);
        if (existing) {
          pendingMap.set(txUpdate.id, { ...existing, ...txUpdate });
        } else {
          pendingMap.set(txUpdate.id, txUpdate);
        }
      });
      current.pendingTransactions = Array.from(pendingMap.values());
    }
    
    return this.recalculateAnalytics(current);
  }
  
  protected validateData(data: TransactionViewState): boolean {
    return (
      data.transactions !== undefined &&
      Array.isArray(data.transactions) &&
      data.pendingTransactions !== undefined &&
      Array.isArray(data.pendingTransactions)
    );
  }
  
  protected getDelta(oldData: TransactionViewState, newData: TransactionViewState): any {
    const delta: any = {};
    
    // Check for transaction changes
    if (JSON.stringify(oldData.transactions) !== JSON.stringify(newData.transactions)) {
      delta.transactions = newData.transactions;
    }
    
    if (JSON.stringify(oldData.pendingTransactions) !== JSON.stringify(newData.pendingTransactions)) {
      delta.pendingTransactions = newData.pendingTransactions;
    }
    
    return delta;
  }
  
  protected onDataUpdated(update: any): void {
    // Handle data update notifications
    log.debug('[TransactionViewStore] Data updated', false, {
      type: update.type,
      txCount: update.data?.transactions?.length,
      pendingCount: update.data?.pendingTransactions?.length
    });
  }
  
  protected getEmptyData(): TransactionViewState {
    return {
      transactions: [],
      pendingTransactions: [],
      totalTransactions: 0,
      totalGasSpentCents: 0n,
      averageGasCents: 0n,
      analytics: {
        byCategory: new Map(),
        byType: new Map(),
        byProtocol: new Map(),
        byHour: new Map(),
        byDayOfWeek: new Map(),
        gasEfficiency: 50,
        activityScore: 0
      },
      filters: {
        search: '',
        chains: [],
        accounts: [],
        dateRange: {
          start: Date.now() - 30 * 24 * 60 * 60 * 1000,
          end: Date.now()
        },
        types: [],
        categories: [],
        status: [],
        minValue: 0,
        maxValue: Number.MAX_SAFE_INTEGER,
        showHidden: false
      },
      sort: {
        field: 'timestamp',
        direction: 'desc'
      },
      pagination: {
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    };
  }

  // Expose store for derived stores
  public get data() {
    return this.store;
  }
}

// Create and export the singleton instance
export const transactionViewStore = new TransactionViewStore();

// Derived stores
export const pendingTransactions = derived(
  transactionViewStore.data,
  $store => $store.pendingTransactions
);

export const recentTransactions = derived(
  transactionViewStore.data,
  $store => [...$store.transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)
);

export const transactionAnalytics = derived(
  transactionViewStore.data,
  $store => $store.analytics
);

export const transactionFlowData = derived(
  transactionViewStore.data,
  $store => [...$store.transactions, ...$store.pendingTransactions]
    .slice(-50) // Last 50 for performance
    .map(tx => ({
      id: tx.id,
      from: tx.from,
      to: tx.to,
      flow: tx.flow,
      status: tx.status,
      value: tx.valueCents,
      timestamp: tx.timestamp
    }))
);