import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { getYakklSettings, setYakklSettingsStorage } from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import { BackgroundTransactionService } from './background/BackgroundTransactionService';
import { BackgroundPriceService } from './background/BackgroundPriceService';
import { BackgroundCacheStore } from './background/BackgroundCacheStore';
import { BackgroundCacheSyncService as CacheSyncManager } from './background/BackgroundCacheSyncService';
import { PortfolioRefreshService } from './portfolio-refresh.service';
import { portfolioCoordinator, UpdatePriority, UpdateType } from './portfolio-data-coordinator.service';
import { blockchainHandlers } from '$contexts/background/handlers/blockchain'; // STATIC IMPORT - NO DYNAMIC IMPORTS IN SERVICE WORKERS

// Default intervals in milliseconds - OPTIMIZED to prevent excessive RPC calls
// Fixed to use reasonable intervals that respect the 15-minute cache
const DEFAULT_INTERVALS = {
  transactions: 3 * 60 * 1000,    // 3 minutes for transaction history
  prices: 60 * 1000,              // 60 seconds for market prices (was 15s - too aggressive)
  portfolio: 2 * 60 * 1000,       // 2 minutes for portfolio calculation (was 60s)
  rollups: 2 * 60 * 1000,         // 2 minutes for rollup calculations (was 60s)
  tokenBalances: 5 * 60 * 1000,   // 5 MINUTES - was 15 SECONDS causing massive RPC overload!
};

// Minimum intervals to prevent too frequent updates and excessive RPC calls
const MIN_INTERVALS = {
  transactions: 60 * 1000,        // 1 minute minimum
  prices: 30 * 1000,              // 30 seconds minimum (was 15s - too aggressive)
  portfolio: 60 * 1000,           // 1 minute minimum (was 45s)
  rollups: 60 * 1000,             // 1 minute minimum (was 45s)
  tokenBalances: 2 * 60 * 1000,   // 2 MINUTES minimum - was 15 SECONDS!
};

export interface IntervalConfig {
  transactions?: number;
  prices?: number;
  portfolio?: number;
  rollups?: number;
  tokenBalances?: number;
}

export interface RefreshFlags {
  transactionsRunning: boolean;
  pricesRunning: boolean;
  portfolioRunning: boolean;
  rollupsRunning: boolean;
  tokenBalancesRunning: boolean;
  manualRefreshPending: boolean;
}

/**
 * BackgroundIntervalService manages periodic data updates in the background.
 * It coordinates transaction fetching, price updates, and portfolio calculations
 * with intelligent flag-based coordination to prevent race conditions.
 */
export class BackgroundIntervalService {
  private static instance: BackgroundIntervalService | null = null;
  private timerManager: UnifiedTimerManager;
  private transactionService: any = null;
  private priceService: any = null;
  private cacheStore: any = null;

  // Track offline checking
  private lastOfflineCheck: number = 0;
  private isLoggedIn: boolean = false;

  // Flags to prevent race conditions
  private flags: RefreshFlags = {
    transactionsRunning: false,
    pricesRunning: false,
    portfolioRunning: false,
    rollupsRunning: false,
    tokenBalancesRunning: false,
    manualRefreshPending: false,
  };

  // Current interval configuration
  private currentIntervals: IntervalConfig = { ...DEFAULT_INTERVALS };

  private constructor() {
    this.timerManager = UnifiedTimerManager.getInstance();
    // Delay service initialization to avoid circular dependency issues
    // Services will be initialized on first use
  }

  /**
   * Lazy initialization of services to avoid circular dependency issues
   */
  private ensureServicesInitialized(): void {
    if (!this.transactionService) {
      this.transactionService = BackgroundTransactionService.getInstance();
    }
    if (!this.priceService) {
      // Use the new service worker compatible BackgroundPriceService
      this.priceService = BackgroundPriceService.getInstance();
    }
    if (!this.cacheStore) {
      this.cacheStore = BackgroundCacheStore.getInstance();
    }
  }

  public static getInstance(): BackgroundIntervalService {
    if (!BackgroundIntervalService.instance) {
      BackgroundIntervalService.instance = new BackgroundIntervalService();
    }
    return BackgroundIntervalService.instance;
  }

  /**
   * Initialize all background intervals
   */
  public async initialize(): Promise<void> {
    // Initialize services (lazy initialization to avoid circular dependencies)
    this.ensureServicesInitialized();

    // Load interval configuration from settings
    await this.loadIntervalConfiguration();

    // Set up intervals
    this.setupTransactionInterval();
    this.setupPriceInterval();
    this.setupPortfolioInterval();
    this.setupRollupInterval();
    this.setupTokenBalanceInterval();

    // Start all intervals
    this.startAll();

    // Check if we have valid accounts and run initial updates if we do
    await this.runInitialUpdatesIfNeeded();
  }

  /**
   * Check if user has valid accounts and run initial updates
   */
  private async runInitialUpdatesIfNeeded(): Promise<void> {
    try {
      // First check if user is logged in
      await this.checkLoginState();

      // Check if we need to do offline check (4AM daily)
      if (!this.isLoggedIn) {
        await this.checkOfflineDataRefresh();
      }

      // Get cache to check for accounts
      const cache = await this.cacheStore.getCache();

      // Check if we have any accounts in the cache
      const hasAccounts = cache?.chainAccountCache &&
        Object.keys(cache.chainAccountCache).length > 0 &&
        Object.values(cache.chainAccountCache).some(chainData =>
          Object.keys(chainData).length > 0
        );

      // Check if we have selected account (user has registered)
      const hasSelectedAccount = cache?.activeAccountAddress &&
        cache.activeAccountAddress !== '' &&
        cache.activeAccountAddress !== '0x0';

      if (hasAccounts || hasSelectedAccount) {
        // FIRST: Fetch native balance immediately
        try {
          await this.fetchNativeBalance();
        } catch (error) {
          log.error('[BackgroundIntervals] Failed to fetch native balance on startup', false, error);
        }

        // Run initial updates immediately (not waiting for first interval)
        // These will set the running flags to prevent interval overlap

        // 1. Fetch initial transactions
        try {
          this.flags.transactionsRunning = true;
          await this.fetchAllTransactions();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial transaction fetch', false, error);
        } finally {
          this.flags.transactionsRunning = false;
        }

        // 2. Update prices and balances
        try {
          this.flags.pricesRunning = true;
          const priceData = await this.fetchPriceData();
          // Queue through coordinator
          portfolioCoordinator.queueUpdate({
            type: UpdateType.PRICE_ONLY,
            priority: UpdatePriority.PRICE_UPDATE,
            source: 'initial-load',
            data: priceData
          });
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial price update', false, error);
        } finally {
          this.flags.pricesRunning = false;
        }

        // 3. Calculate portfolios
        try {
          this.flags.portfolioRunning = true;
          await this.updatePortfolio();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial portfolio update', false, error);
        } finally {
          this.flags.portfolioRunning = false;
        }

        // 4. Calculate rollups
        try {
          this.flags.rollupsRunning = true;
          await this.updateRollups();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial rollup update', false, error);
        } finally {
          this.flags.rollupsRunning = false;
        }
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Error checking for initial updates', false, error);
    }
  }

  /**
   * Load interval configuration from settings
   */
  private async loadIntervalConfiguration(): Promise<void> {
    try {
      const settings = await getYakklSettings();
      if (settings?.dataRefreshIntervals) {
        this.updateIntervals(settings.dataRefreshIntervals);
      }
    } catch (error) {
      log.warn('[BackgroundIntervals] Failed to load interval settings, using defaults', false, error);
    }
  }

  /**
   * Update interval configuration dynamically
   */
  public async updateIntervals(config: IntervalConfig): Promise<void> {
    // Validate and apply new intervals
    if (config.transactions && config.transactions >= MIN_INTERVALS.transactions) {
      this.currentIntervals.transactions = config.transactions;
      this.restartInterval('transactions');
    }

    if (config.prices && config.prices >= MIN_INTERVALS.prices) {
      this.currentIntervals.prices = config.prices;
      this.restartInterval('prices');
    }

    if (config.portfolio && config.portfolio >= MIN_INTERVALS.portfolio) {
      this.currentIntervals.portfolio = config.portfolio;
      this.restartInterval('portfolio');
    }

    if (config.rollups && config.rollups >= MIN_INTERVALS.rollups) {
      this.currentIntervals.rollups = config.rollups;
      this.restartInterval('rollups');
    }

    // Save to settings
    await this.saveIntervalConfiguration();
  }

  /**
   * Save interval configuration to settings
   */
  private async saveIntervalConfiguration(): Promise<void> {
    try {
      const settings = await getYakklSettings();
      if (settings) {
        settings.dataRefreshIntervals = this.currentIntervals;
        await setYakklSettingsStorage(settings);
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to save interval settings', false, error);
    }
  }

  /**
   * Set up transaction fetching interval
   */
  private setupTransactionInterval(): void {
    const callback = async () => {
      // Skip if manual refresh is pending or already running
      if (this.flags.manualRefreshPending || this.flags.transactionsRunning) {
        return;
      }

      try {
        this.flags.transactionsRunning = true;
        // Fetch transactions for all accounts
        await this.fetchAllTransactions();
      } catch (error) {
        log.error('[BackgroundIntervals] Error in transaction fetch interval', false, error);
      } finally {
        this.flags.transactionsRunning = false;
      }
    };

    this.timerManager.addInterval('bg-transactions', callback, this.currentIntervals.transactions!);
  }

  /**
   * Set up price update interval
   */
  private setupPriceInterval(): void {
    const callback = async () => {
      // Skip if already running
      if (this.flags.pricesRunning) {
        return;
      }

      try {
        this.flags.pricesRunning = true;
        // Fetch new prices
        const priceData = await this.fetchPriceData();

        // Queue price update through coordinator
        portfolioCoordinator.queueUpdate({
          type: UpdateType.PRICE_ONLY,
          priority: UpdatePriority.PRICE_UPDATE,
          source: 'background-interval',
          data: priceData
        });
      } catch (error) {
        log.error('[BackgroundIntervals] Error in price update interval', false, error);
      } finally {
        this.flags.pricesRunning = false;
      }
    };

    this.timerManager.addInterval('bg-prices', callback, this.currentIntervals.prices!);
  }

  /**
   * Set up portfolio calculation interval
   */
  private setupPortfolioInterval(): void {
    const callback = async () => {
      // Skip if already running
      if (this.flags.portfolioRunning) {
        return;
      }

      await this.updatePortfolio();
    };

    // Start with an offset to run between price updates
    const interval = this.currentIntervals.portfolio!;
    this.timerManager.addInterval('bg-portfolio', callback, interval);
  }

  /**
   * Set up rollup calculation interval
   */
  private setupRollupInterval(): void {
    const callback = async () => {
      // Skip if already running
      if (this.flags.rollupsRunning) {
        return;
      }

      await this.updateRollups();
    };

    this.timerManager.addInterval('bg-rollups', callback, this.currentIntervals.rollups!);
  }

  /**
   * Set up token balance fetching interval
   */
  private setupTokenBalanceInterval(): void {
    const callback = async () => {
      // Skip if already running
      if (this.flags.tokenBalancesRunning) {
        return;
      }

      try {
        this.flags.tokenBalancesRunning = true;

        // Fetch balance data
        const balanceData = await this.fetchAllBalances();

        // Queue balance update through coordinator
        portfolioCoordinator.queueUpdate({
          type: UpdateType.BALANCE_ONLY,
          priority: UpdatePriority.INTERVAL_UPDATE,
          source: 'background-balances',
          data: balanceData
        });
      } catch (error) {
        log.error('[BackgroundIntervals] Error in token balance interval', false, error);
      } finally {
        this.flags.tokenBalancesRunning = false;
      }
    };

    this.timerManager.addInterval('bg-token-balances', callback, this.currentIntervals.tokenBalances!);
  }

  /**
   * Update portfolio calculations
   */
  private async updatePortfolio(): Promise<void> {
    try {
      this.flags.portfolioRunning = true;
      // Ensure services are initialized
      this.ensureServicesInitialized();
      // Queue portfolio update through coordinator
      portfolioCoordinator.queueUpdate({
        type: UpdateType.ROLLUP_ONLY,
        priority: UpdatePriority.INTERVAL_UPDATE,
        source: 'background-portfolio',
        data: {}
      });
    } catch (error) {
      log.error('[BackgroundIntervals] Error updating portfolio', false, error);
    } finally {
      this.flags.portfolioRunning = false;
    }
  }

  /**
   * Update rollup calculations
   * This is more efficient than full portfolio recalculation
   */
  private async updateRollups(): Promise<void> {
    try {
      // Check if portfolio refresh service is already running a refresh
      // const { PortfolioRefreshService } = await import('./portfolio-refresh.service');
      const refreshService = PortfolioRefreshService.getInstance();

      if (refreshService.isRefreshInProgress()) {
        return;
      }

      this.flags.rollupsRunning = true;
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Use smart sync to determine what needs updating
      const syncManager = CacheSyncManager.getInstance();

      // Check what has changed since last rollup update
      // For now, do a full rollup sync
      // In the future, we can track changes and do incremental updates
      try {
        // Portfolio rollups are calculated automatically in background cache
        await syncManager.syncAll();
      } catch (syncError) {
        // Log the specific sync error but don't throw - let the interval continue
        log.warn('[BackgroundIntervals] Failed to sync portfolio rollups:', false, syncError);
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Error updating rollups', false, error);
    } finally {
      this.flags.rollupsRunning = false;
    }
  }

  /**
   * Fetch transactions for all accounts
   */
  private async fetchAllTransactions(): Promise<void> {
    try {
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Get all accounts and chains from cache
      const cache = await this.cacheStore.getCache();
      if (!cache || !cache.chainAccountCache) {
        return;
      }

      // Fetch transactions for each account on each chain
      for (const [chainId, accounts] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(accounts)) {
          try {
            // Use the correct method name from BackgroundTransactionService
            await this.transactionService.fetchTransactions(Number(chainId), address, 50);
          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to fetch transactions for ${address} on chain ${chainId}`, false, error);
          }
        }
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Error fetching all transactions', false, error);
    }
  }

  /**
   * Fetch price data for all tokens and calculate values
   * Uses single coordinated call to prevent duplicate API requests
   */
  private async fetchPriceData(): Promise<any> {
    try {
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Use the coordinated update method that includes caching and deduplication
      await this.priceService.updatePricesAndValues();

      return { updated: true }; // Return success indicator
    } catch (error) {
      log.error('[BackgroundIntervals] Error updating price data and values', false, error);
      return { updated: false };
    }
  }

  /**
   * Fetch balance data for all accounts
   * Returns balance data to be processed by coordinator
   */
  private async fetchAllBalances(): Promise<any> {
    const balanceData: Record<string, any> = {};

    try {
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Get all accounts and chains from cache
      const cache = await this.cacheStore.getCache();
      if (!cache || !cache.chainAccountCache) {
        return balanceData;
      }

      // Use statically imported CacheSyncManager
      const syncManager = CacheSyncManager.getInstance();

      // Fetch balances for each account on each chain
      for (const [chainId, accounts] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(accounts)) {
          try {
            // Sync account balances directly
            await syncManager.syncBalances();
            const balances = [];

            if (!balanceData[address]) {
              balanceData[address] = {};
            }
            balanceData[address] = balances;

          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to fetch balances for ${address} on chain ${chainId}`, false, error);
          }
        }
      }

      return balanceData;
    } catch (error) {
      log.error('[BackgroundIntervals] Error fetching token balances', false, error);
      return balanceData;
    }
  }

  /**
   * Update token balances for all accounts
   * Made public so it can be called from background handlers for manual updates
   */
  public async updateAllTokenBalances(): Promise<void> {
    try {
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Get all accounts and chains from cache
      const cache = await this.cacheStore.getCache();
      if (!cache || !cache.chainAccountCache) {
        return;
      }

      // Use statically imported CacheSyncManager
      const syncManager = CacheSyncManager.getInstance();

      // Update balances for each account on each chain
      for (const [chainId, accounts] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(accounts)) {
          try {
            // Sync token balances including ERC20 tokens
            // Note: syncBalances updates storage directly
            await syncManager.syncBalances();

          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to update balances for ${address} on chain ${chainId}`, false, error);
          }
        }
      }

    } catch (error) {
      log.error('[BackgroundIntervals] Error updating token balances', false, error);
    }
  }

  /**
   * Simple manual refresh for all data
   */
  public async manualRefresh(): Promise<void> {
    return this.handleManualRefresh('all');
  }

  /**
   * Handle manual refresh request
   * This is called when user clicks refresh button
   */
  public async handleManualRefresh(type: 'transactions' | 'prices' | 'all'): Promise<void> {
    // Set manual refresh flag
    this.flags.manualRefreshPending = true;

    try {
      switch (type) {
        case 'transactions':
          // Stop running interval temporarily
          if (this.flags.transactionsRunning) {
            await this.waitForFlag('transactionsRunning', false, 5000);
          }

          this.flags.transactionsRunning = true;
          await this.fetchAllTransactions();
          this.flags.transactionsRunning = false;

          // Reset interval timer
          this.restartInterval('transactions');
          break;

        case 'prices':
          if (this.flags.pricesRunning) {
            await this.waitForFlag('pricesRunning', false, 5000);
          }

          this.flags.pricesRunning = true;
          const priceData = await this.fetchPriceData();
          // Queue through coordinator
          portfolioCoordinator.queueUpdate({
            type: UpdateType.PRICE_ONLY,
            priority: UpdatePriority.USER_ACTION,
            source: 'manual-refresh',
            data: priceData
          });
          this.flags.pricesRunning = false;

          this.restartInterval('prices');
          break;

        case 'all':
          // Refresh everything in sequence
          await this.handleManualRefresh('transactions');
          await this.handleManualRefresh('prices');
          await this.updatePortfolio();
          break;
      }
    } finally {
      this.flags.manualRefreshPending = false;
    }
  }

  /**
   * Wait for a flag to reach a specific value
   */
  private async waitForFlag(
    flagName: keyof RefreshFlags,
    targetValue: boolean,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    while (this.flags[flagName] !== targetValue) {
      if (Date.now() - startTime > timeout) {
        log.warn(`[BackgroundIntervals] Timeout waiting for flag ${flagName}`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Restart a specific interval
   */
  private restartInterval(type: 'transactions' | 'prices' | 'portfolio' | 'rollups' | 'tokenBalances'): void {
    const intervalId = type === 'tokenBalances' ? 'bg-token-balances' : `bg-${type}`;

    // Stop existing interval
    this.timerManager.stopInterval(intervalId);

    // Remove and re-add with new duration
    this.timerManager.removeInterval(intervalId);

    // Re-setup the interval
    switch (type) {
      case 'transactions':
        this.setupTransactionInterval();
        break;
      case 'prices':
        this.setupPriceInterval();
        break;
      case 'portfolio':
        this.setupPortfolioInterval();
        break;
      case 'rollups':
        this.setupRollupInterval();
        break;
      case 'tokenBalances':
        this.setupTokenBalanceInterval();
        break;
    }

    // Start the new interval
    this.timerManager.startInterval(intervalId);
  }

  /**
   * Start all intervals
   */
  public startAll(): void {
    this.timerManager.startInterval('bg-transactions');
    this.timerManager.startInterval('bg-prices');
    this.timerManager.startInterval('bg-token-balances');

    // Start portfolio with a delay to offset from prices
    setTimeout(() => {
      this.timerManager.startInterval('bg-portfolio');
    }, this.currentIntervals.portfolio! / 2);

    // Start rollups with a small delay
    setTimeout(() => {
      this.timerManager.startInterval('bg-rollups');
    }, this.currentIntervals.rollups! / 3);
  }

  /**
   * Stop all intervals
   */
  public stopAll(): void {
    this.timerManager.stopInterval('bg-transactions');
    this.timerManager.stopInterval('bg-prices');
    this.timerManager.stopInterval('bg-token-balances');
    this.timerManager.stopInterval('bg-portfolio');
    this.timerManager.stopInterval('bg-rollups');
  }

  /**
   * Clean up and destroy the service
   */
  public destroy(): void {
    this.stopAll();

    this.timerManager.removeInterval('bg-transactions');
    this.timerManager.removeInterval('bg-prices');
    this.timerManager.removeInterval('bg-token-balances');
    this.timerManager.removeInterval('bg-portfolio');
    this.timerManager.removeInterval('bg-rollups');

    BackgroundIntervalService.instance = null;
  }

  /**
   * Get current interval configuration
   */
  public getIntervals(): IntervalConfig {
    return { ...this.currentIntervals };
  }

  /**
   * Get current refresh flags status
   */
  public getFlags(): RefreshFlags {
    return { ...this.flags };
  }

  /**
   * Check if user is logged in by looking for session state
   */
  private async checkLoginState(): Promise<void> {
    try {
      // This is a placeholder - you'll need to check the actual session state
      const stored = await browser.storage.local.get(['yakkl-session', 'yakkl-settings']);
      const settings = stored['yakkl-settings'] as any;
      const session = stored['yakkl-session'] as any;

      this.isLoggedIn = !!(session?.isAuthenticated || (settings && !settings.isLocked));
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to check login state', false, error);
      this.isLoggedIn = false;
    }
  }

  /**
   * Check if we should do offline data refresh (4AM daily)
   */
  private async checkOfflineDataRefresh(): Promise<void> {
    try {
      const now = Date.now();
      const currentHour = new Date().getHours();
      const lastCheckDate = new Date(this.lastOfflineCheck).toDateString();
      const todayDate = new Date().toDateString();

      // Check if it's 4AM and we haven't checked today
      if (currentHour === 4 && lastCheckDate !== todayDate) {
        // Fetch native balance
        await this.fetchNativeBalance();

        // Update prices
        const priceData = await this.fetchPriceData();
        portfolioCoordinator.queueUpdate({
          type: UpdateType.PRICE_ONLY,
          priority: UpdatePriority.INTERVAL_UPDATE,
          source: 'offline-4am-check',
          data: priceData
        });

        this.lastOfflineCheck = now;
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to perform offline check', false, error);
    }
  }

  /**
   * Fetch native balance for currently selected account
   * FIXED: Now uses the cached GET_NATIVE_BALANCE handler instead of direct provider calls
   * This prevents excessive RPC calls by leveraging the 15-minute cache
   */
  private async fetchNativeBalance(): Promise<void> {
    try {
      // Get currently selected data from storage
      const stored = await browser.storage.local.get('yakkl-currently-selected');
      if (!stored || !stored['yakkl-currently-selected']) {
        return;
      }

      const currentlySelected = stored['yakkl-currently-selected'] as any;
      const address = currentlySelected?.shortcuts?.address;
      const chainId = currentlySelected?.shortcuts?.chainId;

      if (!address || !chainId) {
        return;
      }

      log.debug('[BackgroundIntervals] Fetching native balance through CACHED handler for', false, { address, chainId });

      // Use the cached GET_NATIVE_BALANCE handler which has 15-minute caching
      // FIXED: Using static import instead of dynamic import (which breaks service workers)
      const getNativeBalanceHandler = blockchainHandlers.get('GET_NATIVE_BALANCE');

      if (!getNativeBalanceHandler) {
        log.error('[BackgroundIntervals] GET_NATIVE_BALANCE handler not found');
        return;
      }

      // Call the handler directly (we're in the background context)
      const response = await getNativeBalanceHandler({
        type: 'GET_NATIVE_BALANCE',
        data: {
          address,
          chainId
        }
      });

      if (response.success && response.data) {
        // The GET_NATIVE_BALANCE handler already updates the cache
        // No need for additional storage here
      } else {
        log.error('[BackgroundIntervals] Failed to fetch native balance:', false, response.error);
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to fetch native balance', false, error);
    }
  }
}

// Export singleton instance getter
export const getBackgroundIntervalService = () => BackgroundIntervalService.getInstance();
