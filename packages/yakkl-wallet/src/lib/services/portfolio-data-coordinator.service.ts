/**
 * Portfolio Data Coordinator Service
 * 
 * Central coordinator for all portfolio data updates to prevent race conditions
 * and ensure data consistency across the YAKKL wallet.
 * 
 * This service acts as a single source of truth for portfolio updates,
 * managing queues, priorities, and update coordination between different
 * data sources (background services, user actions, blockchain events).
 */

import { log } from '$lib/common/logger-wrapper';
import { WalletCacheStore } from '$lib/stores/wallet-cache.store';
import { tokenStore } from '$lib/stores/token.store';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import type { BigNumberish } from '$lib/common/bignumber';
import { portfolioStability } from './portfolio-stability.service';
import type { WalletCacheController } from '$lib/types';

/**
 * Update source priorities (higher = more priority)
 */
export enum UpdatePriority {
  BACKGROUND_SYNC = 1,    // Lowest priority - background sync
  INTERVAL_UPDATE = 2,    // Regular interval updates  
  BLOCKCHAIN_EVENT = 3,   // Blockchain events (transactions)
  PRICE_UPDATE = 4,       // Market price updates
  USER_ACTION = 5,        // User-initiated actions (highest)
}

/**
 * Update types for different data
 */
export enum UpdateType {
  FULL_PORTFOLIO = 'full_portfolio',
  PRICE_ONLY = 'price_only',
  BALANCE_ONLY = 'balance_only',
  TRANSACTION = 'transaction',
  ROLLUP_ONLY = 'rollup_only',
  TOKEN_LIST = 'token_list',
}

/**
 * Update request structure
 */
export interface UpdateRequest {
  id: string;
  type: UpdateType;
  priority: UpdatePriority;
  source: string;
  timestamp: number;
  data: any;
  callback?: (success: boolean, error?: Error) => void;
  retryCount?: number;
  maxRetries?: number;
}

/**
 * Coordinator state
 */
export interface CoordinatorState {
  isProcessing: boolean;
  queueLength: number;
  lastUpdateTime: number;
  lastSuccessfulUpdate: number;
  currentUpdate: UpdateRequest | null;
  failedUpdates: number;
  successfulUpdates: number;
}

/**
 * Configuration for the coordinator
 */
export interface CoordinatorConfig {
  maxQueueSize: number;
  processingInterval: number;
  batchSize: number;
  maxRetries: number;
  conflictResolutionStrategy: 'latest' | 'highest_priority' | 'merge';
  debounceWindow: number;
  enableLogging: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CoordinatorConfig = {
  maxQueueSize: 100,
  processingInterval: 100, // Process queue every 100ms
  batchSize: 5,           // Process up to 5 updates in a batch
  maxRetries: 3,
  conflictResolutionStrategy: 'highest_priority',
  debounceWindow: 250,    // Debounce similar updates within 250ms
  enableLogging: true,
};

/**
 * Portfolio Data Coordinator Service
 */
export class PortfolioDataCoordinator {
  private static instance: PortfolioDataCoordinator | null = null;
  private config: CoordinatorConfig;
  private updateQueue: UpdateRequest[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastProcessedUpdates: Map<string, number> = new Map();
  private state: CoordinatorState;
  private updateLocks: Map<string, boolean> = new Map();
  private walletCacheStore: typeof WalletCacheStore;
  private tokenStore: typeof tokenStore;

  private constructor(config: Partial<CoordinatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.walletCacheStore = WalletCacheStore;
    this.tokenStore = tokenStore;
    
    this.state = {
      isProcessing: false,
      queueLength: 0,
      lastUpdateTime: 0,
      lastSuccessfulUpdate: 0,
      currentUpdate: null,
      failedUpdates: 0,
      successfulUpdates: 0,
    };

    // Start processing queue
    this.startProcessing();
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<CoordinatorConfig>): PortfolioDataCoordinator {
    if (!PortfolioDataCoordinator.instance) {
      PortfolioDataCoordinator.instance = new PortfolioDataCoordinator(config);
    }
    return PortfolioDataCoordinator.instance;
  }

  /**
   * Queue an update request
   */
  queueUpdate(request: Omit<UpdateRequest, 'id' | 'timestamp'>): string {
    const updateId = this.generateUpdateId(request.type, request.source);
    
    // Check for duplicate or similar updates within debounce window
    if (this.shouldDebounce(updateId)) {
      this.logDebug(`Debouncing update: ${updateId}`);
      return updateId;
    }

    const fullRequest: UpdateRequest = {
      ...request,
      id: updateId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: request.maxRetries || this.config.maxRetries,
    };

    // Check queue size limit
    if (this.updateQueue.length >= this.config.maxQueueSize) {
      this.logWarn('Update queue full, removing lowest priority item');
      this.removeLowestPriorityUpdate();
    }

    // Add to queue based on priority
    this.insertByPriority(fullRequest);
    
    // Update state
    this.state.queueLength = this.updateQueue.length;
    
    this.logInfo(`Queued update: ${updateId}`, {
      type: request.type,
      priority: request.priority,
      queueLength: this.state.queueLength,
    });

    // Trigger immediate processing for high priority updates
    if (request.priority >= UpdatePriority.USER_ACTION) {
      this.processQueueImmediately();
    }

    return updateId;
  }

  /**
   * Process the update queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.state.isProcessing = true;

    try {
      // Process batch of updates
      const batch = this.getNextBatch();
      
      for (const update of batch) {
        await this.processUpdate(update);
      }
    } catch (error) {
      this.logError('Error processing queue', error);
    } finally {
      this.isProcessing = false;
      this.state.isProcessing = false;
      this.state.queueLength = this.updateQueue.length;
    }
  }

  /**
   * Process a single update
   */
  private async processUpdate(update: UpdateRequest): Promise<void> {
    this.state.currentUpdate = update;
    this.state.lastUpdateTime = Date.now();

    try {
      this.logDebug(`Processing update: ${update.id}`, {
        type: update.type,
        priority: update.priority,
      });

      // Check if this type of update is already locked
      const lockKey = this.getLockKey(update.type);
      if (this.updateLocks.get(lockKey)) {
        this.logDebug(`Update locked, requeuing: ${update.id}`);
        this.requeueUpdate(update);
        return;
      }

      // Lock this update type
      this.updateLocks.set(lockKey, true);

      // Process based on update type
      let success = false;
      let error: Error | undefined;

      try {
        switch (update.type) {
          case UpdateType.FULL_PORTFOLIO:
            success = await this.processFullPortfolioUpdate(update);
            break;
          case UpdateType.PRICE_ONLY:
            success = await this.processPriceUpdate(update);
            break;
          case UpdateType.BALANCE_ONLY:
            success = await this.processBalanceUpdate(update);
            break;
          case UpdateType.TRANSACTION:
            success = await this.processTransactionUpdate(update);
            break;
          case UpdateType.ROLLUP_ONLY:
            success = await this.processRollupUpdate(update);
            break;
          case UpdateType.TOKEN_LIST:
            success = await this.processTokenListUpdate(update);
            break;
          default:
            this.logWarn(`Unknown update type: ${update.type}`);
            success = false;
        }
      } catch (err) {
        error = err as Error;
        success = false;
      } finally {
        // Release lock
        this.updateLocks.delete(lockKey);
      }

      // Handle result
      if (success) {
        this.state.successfulUpdates++;
        this.state.lastSuccessfulUpdate = Date.now();
        this.lastProcessedUpdates.set(update.id, Date.now());
        
        // Execute callback if provided
        if (update.callback) {
          update.callback(true);
        }
      } else {
        this.handleUpdateFailure(update, error);
      }

    } catch (error) {
      this.logError(`Error processing update: ${update.id}`, error);
      this.handleUpdateFailure(update, error as Error);
    } finally {
      this.state.currentUpdate = null;
    }
  }

  /**
   * Process full portfolio update
   */
  private async processFullPortfolioUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      const { data } = update;
      
      // Validate data before processing
      if (!this.validatePortfolioData(data)) {
        throw new Error('Invalid portfolio data');
      }

      // Update wallet cache store
      await this.walletCacheStore.updateFromCoordinator(data);
      
      // Update portfolio stability service
      const totalValue = this.calculateTotalValue(data);
      portfolioStability.updatePortfolioValue(totalValue, 'cache', true);
      
      this.logInfo('Full portfolio update completed', {
        source: update.source,
        totalValue: totalValue.toString(),
      });

      return true;
    } catch (error) {
      this.logError('Full portfolio update failed', error);
      return false;
    }
  }

  /**
   * Process price-only update
   */
  private async processPriceUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      const { data } = update;
      
      // Update prices in token store
      await this.tokenStore.updatePricesFromCoordinator(data);
      
      // Trigger rollup recalculation
      await this.walletCacheStore.recalculateRollupsFromPrices();
      
      this.logDebug('Price update completed', {
        source: update.source,
        tokenCount: Object.keys(data).length,
      });

      return true;
    } catch (error) {
      this.logError('Price update failed', error);
      return false;
    }
  }

  /**
   * Process balance-only update
   */
  private async processBalanceUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      const { data } = update;
      
      // Update balances in token store
      await this.tokenStore.updateBalancesFromCoordinator(data);
      
      // Trigger portfolio recalculation
      await this.walletCacheStore.recalculatePortfoliosFromBalances();
      
      this.logDebug('Balance update completed', {
        source: update.source,
        addressCount: Object.keys(data).length,
      });

      return true;
    } catch (error) {
      this.logError('Balance update failed', error);
      return false;
    }
  }

  /**
   * Process transaction update
   */
  private async processTransactionUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      const { data } = update;
      
      // Update transaction in cache
      await this.walletCacheStore.updateTransactionFromCoordinator(data);
      
      this.logDebug('Transaction update completed', {
        source: update.source,
        txHash: data.hash,
      });

      return true;
    } catch (error) {
      this.logError('Transaction update failed', error);
      return false;
    }
  }

  /**
   * Process rollup-only update
   */
  private async processRollupUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      // Just recalculate rollups without updating underlying data
      await this.walletCacheStore.calculateAllRollups();
      
      this.logDebug('Rollup update completed', {
        source: update.source,
      });

      return true;
    } catch (error) {
      this.logError('Rollup update failed', error);
      return false;
    }
  }

  /**
   * Process token list update
   */
  private async processTokenListUpdate(update: UpdateRequest): Promise<boolean> {
    try {
      const { data } = update;
      
      // Update token list in stability service
      portfolioStability.updateTokenList(data.tokens, 'cache');
      
      // Update token store
      await this.tokenStore.updateTokenListFromCoordinator(data);
      
      this.logDebug('Token list update completed', {
        source: update.source,
        tokenCount: data.tokens?.length || 0,
      });

      return true;
    } catch (error) {
      this.logError('Token list update failed', error);
      return false;
    }
  }

  /**
   * Handle update failure
   */
  private handleUpdateFailure(update: UpdateRequest, error?: Error): void {
    this.state.failedUpdates++;
    
    update.retryCount = (update.retryCount || 0) + 1;
    
    if (update.retryCount < (update.maxRetries || this.config.maxRetries)) {
      this.logWarn(`Update failed, retrying (${update.retryCount}/${update.maxRetries}): ${update.id}`);
      
      // Requeue with lower priority
      update.priority = Math.max(1, update.priority - 1);
      this.insertByPriority(update);
    } else {
      this.logError(`Update failed after max retries: ${update.id}`, error);
      
      // Execute failure callback if provided
      if (update.callback) {
        update.callback(false, error);
      }
    }
  }

  /**
   * Validate portfolio data
   */
  private validatePortfolioData(data: any): boolean {
    if (!data) return false;
    
    // Check for required fields - only require chainAccountCache
    if (!data.chainAccountCache) {
      this.logWarn('Rejecting portfolio data: missing chainAccountCache');
      return false;
    }
    
    // If we have existing data with value, don't accept empty replacement
    const currentCache = this.walletCacheStore.getCacheSync();
    if (currentCache?.portfolioRollups?.grandTotal?.totalValue) {
      const currentTotal = BigNumberishUtils.toBigInt(currentCache.portfolioRollups.grandTotal.totalValue);
      if (currentTotal > 0n && data.portfolioRollups?.grandTotal?.totalValue !== undefined) {
        const newTotal = BigNumberishUtils.toBigInt(data.portfolioRollups.grandTotal.totalValue);
        if (newTotal === 0n) {
          this.logWarn('Rejecting zero portfolio value when current value is non-zero');
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Calculate total portfolio value
   */
  private calculateTotalValue(data: any): BigNumberish {
    try {
      return data.portfolioRollups?.grandTotal?.totalValue || 0n;
    } catch {
      return 0n;
    }
  }

  /**
   * Insert update by priority
   */
  private insertByPriority(update: UpdateRequest): void {
    // Find insertion point based on priority
    let insertIndex = this.updateQueue.length;
    
    for (let i = 0; i < this.updateQueue.length; i++) {
      if (update.priority > this.updateQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.updateQueue.splice(insertIndex, 0, update);
  }

  /**
   * Remove lowest priority update
   */
  private removeLowestPriorityUpdate(): void {
    if (this.updateQueue.length === 0) return;
    
    // Find lowest priority item
    let lowestIndex = 0;
    let lowestPriority = this.updateQueue[0].priority;
    
    for (let i = 1; i < this.updateQueue.length; i++) {
      if (this.updateQueue[i].priority < lowestPriority) {
        lowestIndex = i;
        lowestPriority = this.updateQueue[i].priority;
      }
    }
    
    const removed = this.updateQueue.splice(lowestIndex, 1)[0];
    this.logDebug(`Removed low priority update: ${removed.id}`);
  }

  /**
   * Get next batch of updates to process
   */
  private getNextBatch(): UpdateRequest[] {
    const batch = this.updateQueue.splice(0, this.config.batchSize);
    
    // Apply conflict resolution if needed
    if (this.config.conflictResolutionStrategy !== 'merge') {
      return this.resolveConflicts(batch);
    }
    
    return batch;
  }

  /**
   * Resolve conflicts in batch
   */
  private resolveConflicts(batch: UpdateRequest[]): UpdateRequest[] {
    const resolved: UpdateRequest[] = [];
    const typeMap = new Map<UpdateType, UpdateRequest[]>();
    
    // Group by type
    for (const update of batch) {
      const existing = typeMap.get(update.type) || [];
      existing.push(update);
      typeMap.set(update.type, existing);
    }
    
    // Resolve conflicts based on strategy
    for (const [type, updates] of typeMap) {
      if (updates.length === 1) {
        resolved.push(updates[0]);
      } else {
        // Multiple updates of same type - resolve conflict
        if (this.config.conflictResolutionStrategy === 'latest') {
          // Keep latest
          resolved.push(updates[updates.length - 1]);
        } else if (this.config.conflictResolutionStrategy === 'highest_priority') {
          // Keep highest priority
          const highest = updates.reduce((prev, curr) => 
            curr.priority > prev.priority ? curr : prev
          );
          resolved.push(highest);
        }
        
        // Requeue others
        for (const update of updates) {
          if (update !== resolved[resolved.length - 1]) {
            this.requeueUpdate(update);
          }
        }
      }
    }
    
    return resolved;
  }

  /**
   * Requeue an update
   */
  private requeueUpdate(update: UpdateRequest): void {
    // Add back to queue with slight delay
    setTimeout(() => {
      this.insertByPriority(update);
    }, 100);
  }

  /**
   * Check if update should be debounced
   */
  private shouldDebounce(updateId: string): boolean {
    const lastProcessed = this.lastProcessedUpdates.get(updateId);
    if (!lastProcessed) return false;
    
    const timeSinceLastProcessed = Date.now() - lastProcessed;
    return timeSinceLastProcessed < this.config.debounceWindow;
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(type: UpdateType, source: string): string {
    return `${type}-${source}-${Date.now()}`;
  }

  /**
   * Get lock key for update type
   */
  private getLockKey(type: UpdateType): string {
    // Group related update types
    switch (type) {
      case UpdateType.PRICE_ONLY:
      case UpdateType.BALANCE_ONLY:
        return 'token-data';
      case UpdateType.FULL_PORTFOLIO:
      case UpdateType.ROLLUP_ONLY:
        return 'portfolio';
      default:
        return type;
    }
  }

  /**
   * Start processing timer
   */
  private startProcessing(): void {
    if (this.processingTimer) return;
    
    this.processingTimer = setInterval(() => {
      this.processQueue();
    }, this.config.processingInterval);
  }

  /**
   * Stop processing timer
   */
  private stopProcessing(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Process queue immediately (for high priority updates)
   */
  private processQueueImmediately(): void {
    // Process immediately using setTimeout(0) instead of setImmediate
    // setImmediate is not available in browser/service worker contexts
    setTimeout(() => {
      this.processQueue();
    }, 0);
  }

  /**
   * Get coordinator state
   */
  getState(): Readonly<CoordinatorState> {
    return { ...this.state };
  }

  /**
   * Clear all pending updates
   */
  clearQueue(): void {
    this.updateQueue = [];
    this.state.queueLength = 0;
    this.logInfo('Update queue cleared');
  }

  /**
   * Reset coordinator
   */
  reset(): void {
    this.clearQueue();
    this.updateLocks.clear();
    this.lastProcessedUpdates.clear();
    this.state = {
      isProcessing: false,
      queueLength: 0,
      lastUpdateTime: 0,
      lastSuccessfulUpdate: 0,
      currentUpdate: null,
      failedUpdates: 0,
      successfulUpdates: 0,
    };
    this.logInfo('Coordinator reset');
  }

  /**
   * Destroy coordinator
   */
  destroy(): void {
    this.stopProcessing();
    this.clearQueue();
    PortfolioDataCoordinator.instance = null;
  }

  // Logging helpers
  private logInfo(message: string, data?: any): void {
    if (this.config.enableLogging) {
      log.info(`[PortfolioCoordinator] ${message}`, false, data);
    }
  }

  private logDebug(message: string, data?: any): void {
    if (this.config.enableLogging) {
      log.debug(`[PortfolioCoordinator] ${message}`, false, data);
    }
  }

  private logWarn(message: string, data?: any): void {
    if (this.config.enableLogging) {
      log.warn(`[PortfolioCoordinator] ${message}`, false, data);
    }
  }

  private logError(message: string, error?: any): void {
    if (this.config.enableLogging) {
      log.error(`[PortfolioCoordinator] ${message}`, false, error);
    }
  }
}

// Export singleton getter
export const portfolioCoordinator = PortfolioDataCoordinator.getInstance();