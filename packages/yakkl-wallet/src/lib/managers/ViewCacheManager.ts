import { log } from '$lib/managers/Logger';
import { BalanceCacheManager } from './BalanceCacheManager';
import { AccountTokenCacheManager } from './AccountTokenCacheManager';
import { TransactionCacheManager } from './TransactionCacheManager';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { extensionTokenCacheStore } from '$lib/stores/extension-token-cache.store';
import type { TokenDisplay, TransactionDisplay } from '$lib/types';
import type { ViewType, PortfolioRollup, TransactionRollup } from '$lib/types/rollup.types';
import { get } from 'svelte/store';
import browser from 'webextension-polyfill';
import { BrowserAPIPortService } from '$lib/services/browser-api-port.service';

/**
 * View update event types
 */
export type ViewUpdateEvent = 
  | 'balances-updated'
  | 'tokens-updated'
  | 'transactions-updated'
  | 'network-changed'
  | 'account-changed'
  | 'portfolio-calculated'
  | 'cache-invalidated';

/**
 * View cache entry with metadata
 */
export interface ViewCache<T> {
  data: T;
  timestamp: number;
  viewType: ViewType;
  context: {
    chainId?: number;
    accountAddress?: string;
    [key: string]: any;
  };
}

/**
 * View update notification
 */
export interface ViewUpdateNotification {
  event: ViewUpdateEvent;
  viewType: ViewType;
  data?: any;
  timestamp: number;
  source: 'background' | 'ui' | 'sync';
}

/**
 * ViewCacheManager - Coordinates all cache operations and ensures view synchronization
 * This manager is the single source of truth for view state management
 */
export class ViewCacheManager {
  private static instance: ViewCacheManager | null = null;
  private balanceCacheManager: BalanceCacheManager;
  private tokenCacheManager: AccountTokenCacheManager;
  private transactionCacheManager: TransactionCacheManager;
  private updateListeners: Map<string, (notification: ViewUpdateNotification) => void> = new Map();
  private isBackgroundContext: boolean;
  private portService: BrowserAPIPortService | null = null;
  
  // Cache invalidation tracking
  private invalidationTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes
  
  private constructor() {
    this.balanceCacheManager = BalanceCacheManager.getInstance();
    this.tokenCacheManager = AccountTokenCacheManager.getInstance();
    this.transactionCacheManager = TransactionCacheManager.getInstance();
    this.isBackgroundContext = typeof window === 'undefined';
    
    // Initialize port service if in UI context
    if (!this.isBackgroundContext) {
      this.initializePortService();
    }
    
    // Set up message listeners for cross-context communication
    this.setupMessageListeners();
    
    log.info('[ViewCacheManager] Initialized', false, {
      context: this.isBackgroundContext ? 'background' : 'ui'
    });
  }
  
  public static getInstance(): ViewCacheManager {
    if (!ViewCacheManager.instance) {
      ViewCacheManager.instance = new ViewCacheManager();
    }
    return ViewCacheManager.instance;
  }
  
  /**
   * Initialize port service for UI context
   */
  private async initializePortService(): Promise<void> {
    try {
      this.portService = BrowserAPIPortService.getInstance();
      log.info('[ViewCacheManager] Port service initialized');
    } catch (error) {
      log.error('[ViewCacheManager] Failed to initialize port service', false, error);
    }
  }
  
  /**
   * Set up message listeners for cross-context communication
   */
  private setupMessageListeners(): void {
    // Listen for view update messages
    browser.runtime.onMessage.addListener((message, sender) => {
      if (message.type === 'VIEW_UPDATE_NOTIFICATION') {
        this.handleViewUpdateNotification(message.notification);
        return Promise.resolve({ success: true });
      }
      
      if (message.type === 'VIEW_CACHE_REQUEST') {
        return this.handleViewCacheRequest(message);
      }
      
      return false;
    });
  }
  
  /**
   * Handle incoming view update notifications
   */
  private handleViewUpdateNotification(notification: ViewUpdateNotification): void {
    // Notify all registered listeners
    this.updateListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        log.error('[ViewCacheManager] Error in update listener', false, error);
      }
    });
    
    // Update relevant caches based on notification
    switch (notification.event) {
      case 'balances-updated':
        this.refreshBalanceViews();
        break;
      case 'tokens-updated':
        this.refreshTokenViews();
        break;
      case 'transactions-updated':
        this.refreshTransactionViews();
        break;
      case 'network-changed':
      case 'account-changed':
        this.invalidateAllViews();
        break;
      case 'portfolio-calculated':
        this.updatePortfolioViews(notification.data);
        break;
    }
  }
  
  /**
   * Handle view cache requests from other contexts
   */
  private async handleViewCacheRequest(message: any): Promise<any> {
    const { viewType, context } = message;
    
    try {
      switch (viewType) {
        case 'accounts':
          return await this.getAccountsView(context);
        case 'tokens':
          return await this.getTokensView(context);
        case 'transactions':
          return await this.getTransactionsView(context);
        case 'portfolio':
          return await this.getPortfolioView(context);
        default:
          throw new Error(`Unknown view type: ${viewType}`);
      }
    } catch (error) {
      log.error('[ViewCacheManager] Error handling cache request', false, error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  /**
   * Register a listener for view updates
   */
  public registerUpdateListener(id: string, listener: (notification: ViewUpdateNotification) => void): void {
    this.updateListeners.set(id, listener);
    log.debug('[ViewCacheManager] Registered update listener', false, { id });
  }
  
  /**
   * Unregister a listener
   */
  public unregisterUpdateListener(id: string): void {
    this.updateListeners.delete(id);
    log.debug('[ViewCacheManager] Unregistered update listener', false, { id });
  }
  
  /**
   * Broadcast a view update notification
   */
  private async broadcastUpdate(event: ViewUpdateEvent, viewType: ViewType, data?: any): Promise<void> {
    const notification: ViewUpdateNotification = {
      event,
      viewType,
      data,
      timestamp: Date.now(),
      source: this.isBackgroundContext ? 'background' : 'ui'
    };
    
    // Notify local listeners
    this.handleViewUpdateNotification(notification);
    
    // Broadcast to other contexts
    try {
      await browser.runtime.sendMessage({
        type: 'VIEW_UPDATE_NOTIFICATION',
        notification
      });
    } catch (error) {
      // Ignore errors if no listeners
      if (!error?.message?.includes('Could not establish connection')) {
        log.warn('[ViewCacheManager] Failed to broadcast update', false, error);
      }
    }
  }
  
  /**
   * Get accounts view with fresh data
   */
  public async getAccountsView(context?: { chainId?: number }): Promise<ViewCache<any>> {
    const cacheKey = `accounts_${context?.chainId || 'all'}`;
    
    try {
      // Get wallet cache data
      const walletCache = get(walletCacheStore);
      
      // Extract accounts from chainAccountCache
      const accountsMap = new Map<string, any>();
      
      // Iterate through all chains to collect unique accounts
      if (walletCache.chainAccountCache) {
        for (const [chainId, chainAccounts] of Object.entries(walletCache.chainAccountCache)) {
          for (const [address, accountCache] of Object.entries(chainAccounts)) {
            if (!accountsMap.has(address)) {
              accountsMap.set(address, accountCache.account);
            }
          }
        }
      }
      
      let accounts = Array.from(accountsMap.values());
      
      // Filter accounts based on context
      if (context?.chainId) {
        // Filter accounts that have activity on this chain
        accounts = accounts.filter(account => {
          const cache = walletCache.chainAccountCache?.[context.chainId]?.[account.address];
          return cache && (cache.tokens.length > 0);
        });
      }
      
      return {
        data: accounts,
        timestamp: Date.now(),
        viewType: 'accounts' as ViewType,
        context: context || {}
      };
    } catch (error) {
      log.error('[ViewCacheManager] Error getting accounts view', false, error);
      throw error;
    }
  }
  
  /**
   * Get tokens view with fresh data
   */
  public async getTokensView(context?: { chainId?: number; accountAddress?: string }): Promise<ViewCache<TokenDisplay[]>> {
    const cacheKey = `tokens_${context?.chainId || 'all'}_${context?.accountAddress || 'all'}`;
    
    try {
      // Check if we have fresh cached data
      if (context?.accountAddress) {
        const cachedTokens = this.tokenCacheManager.getCachedTokensForAccount(context.accountAddress);
        if (cachedTokens && !this.tokenCacheManager.isAccountTokensStale(context.accountAddress)) {
          // Convert TokenData to TokenDisplay format
          const displayTokens: TokenDisplay[] = cachedTokens.map(token => ({
            ...token,
            quantity: token.quantity?.toString() || '0',
            value: token.value || 0,
            price: typeof token.price === 'number' 
              ? token.price 
              : (token.price as any)?.price || 0
          }));
          return {
            data: displayTokens,
            timestamp: Date.now(),
            viewType: 'tokens' as ViewType,
            context: context || {}
          };
        }
      }
      
      // Otherwise get from extension token cache store
      const tokenCache = get(extensionTokenCacheStore);
      let tokens: TokenDisplay[] = [];
      
      if (context?.accountAddress && context?.chainId) {
        // Single account, single chain
        tokens = tokenCache.current_account?.tokens || [];
      } else if (context?.chainId) {
        // All accounts, single chain
        tokens = tokenCache.single_network?.tokens || [];
      } else {
        // All accounts, all chains
        tokens = tokenCache.all_networks?.tokens || [];
      }
      
      return {
        data: tokens,
        timestamp: Date.now(),
        viewType: 'tokens' as ViewType,
        context: context || {}
      };
    } catch (error) {
      log.error('[ViewCacheManager] Error getting tokens view', false, error);
      throw error;
    }
  }
  
  /**
   * Get transactions view with fresh data
   */
  public async getTransactionsView(context?: { chainId?: number; accountAddress?: string }): Promise<ViewCache<TransactionDisplay[]>> {
    const cacheKey = `transactions_${context?.chainId || 'all'}_${context?.accountAddress || 'all'}`;
    
    try {
      // Get from transaction cache manager
      let transactions: TransactionDisplay[] = [];
      
      if (context?.accountAddress && context?.chainId) {
        const cached = await this.transactionCacheManager.getCachedTransactions(
          context.accountAddress,
          context.chainId
        );
        transactions = cached || [];
      } else {
        // Get all transactions from wallet cache
        const walletCache = get(walletCacheStore);
        const rollupKey = context?.chainId ? 
          `byChain.${context.chainId}` : 
          'grandTotal';
        
        const rollup = walletCache.transactionRollups?.[rollupKey];
        transactions = rollup?.recentTransactions || [];
      }
      
      return {
        data: transactions,
        timestamp: Date.now(),
        viewType: 'transactions' as ViewType,
        context: context || {}
      };
    } catch (error) {
      log.error('[ViewCacheManager] Error getting transactions view', false, error);
      throw error;
    }
  }
  
  /**
   * Get portfolio view with rollup data
   */
  public async getPortfolioView(context?: { viewType?: 'account' | 'chain' | 'watchlist' }): Promise<ViewCache<PortfolioRollup>> {
    try {
      const walletCache = get(walletCacheStore);
      let portfolioData: PortfolioRollup;
      
      switch (context?.viewType) {
        case 'watchlist':
          portfolioData = walletCache.portfolioRollups?.watchListRollup || {} as PortfolioRollup;
          break;
        case 'account':
          // Return grand total for account view
          portfolioData = walletCache.portfolioRollups?.grandTotal || {} as PortfolioRollup;
          break;
        case 'chain':
          // Return grand total for chain view
          portfolioData = walletCache.portfolioRollups?.grandTotal || {} as PortfolioRollup;
          break;
        default:
          portfolioData = walletCache.portfolioRollups?.grandTotal || {} as PortfolioRollup;
      }
      
      return {
        data: portfolioData,
        timestamp: Date.now(),
        viewType: 'portfolio' as ViewType,
        context: context || {}
      };
    } catch (error) {
      log.error('[ViewCacheManager] Error getting portfolio view', false, error);
      throw error;
    }
  }
  
  /**
   * Refresh balance views
   */
  private async refreshBalanceViews(): Promise<void> {
    await this.broadcastUpdate('balances-updated', 'accounts' as ViewType);
  }
  
  /**
   * Refresh token views
   */
  private async refreshTokenViews(): Promise<void> {
    await this.broadcastUpdate('tokens-updated', 'tokens' as ViewType);
  }
  
  /**
   * Refresh transaction views
   */
  private async refreshTransactionViews(): Promise<void> {
    await this.broadcastUpdate('transactions-updated', 'transactions' as ViewType);
  }
  
  /**
   * Update portfolio views with new data
   */
  private async updatePortfolioViews(data: any): Promise<void> {
    await this.broadcastUpdate('portfolio-calculated', 'portfolio' as ViewType, data);
  }
  
  /**
   * Invalidate all views (e.g., on network or account change)
   */
  public async invalidateAllViews(): Promise<void> {
    // Clear all cache managers
    await this.balanceCacheManager.clearCache();
    this.tokenCacheManager.clearAllCache();
    await this.transactionCacheManager.clearAllCaches();
    
    // Clear extension token cache
    extensionTokenCacheStore.clearForFirstTimeSetup();
    
    // Broadcast invalidation
    await this.broadcastUpdate('cache-invalidated', 'all' as ViewType);
    
    log.info('[ViewCacheManager] All views invalidated');
  }
  
  /**
   * Force refresh all views from background service
   */
  public async forceRefreshAllViews(): Promise<void> {
    if (this.portService) {
      try {
        await this.portService.runtimeSendMessage({
          type: 'YAKKL_REFRESH_REQUEST',
          refreshType: 'all'
        });
        log.info('[ViewCacheManager] Force refresh initiated');
      } catch (error) {
        log.error('[ViewCacheManager] Failed to force refresh', false, error);
      }
    } else if (this.isBackgroundContext) {
      // If in background, trigger refresh directly
      const { BackgroundIntervalService } = await import('$lib/services/background-interval.service');
      const intervalService = BackgroundIntervalService.getInstance();
      await intervalService.handleManualRefresh('all');
    }
  }
  
  /**
   * Set up automatic cache invalidation for a key
   */
  private setupCacheInvalidation(key: string, ttl: number = this.CACHE_TTL): void {
    // Clear existing timer if any
    if (this.invalidationTimers.has(key)) {
      clearTimeout(this.invalidationTimers.get(key)!);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.invalidationTimers.delete(key);
      log.debug('[ViewCacheManager] Cache expired', false, { key });
    }, ttl);
    
    this.invalidationTimers.set(key, timer);
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    // Clear all timers
    this.invalidationTimers.forEach(timer => clearTimeout(timer));
    this.invalidationTimers.clear();
    
    // Clear listeners
    this.updateListeners.clear();
    
    // Port service doesn't need explicit disconnect
    this.portService = null;
    
    log.info('[ViewCacheManager] Destroyed');
  }
}