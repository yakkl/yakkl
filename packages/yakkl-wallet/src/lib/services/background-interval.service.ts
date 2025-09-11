import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { getYakklSettings, setYakklSettingsStorage } from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
// Static imports - NO DYNAMIC IMPORTS unless absolutely necessary (per project rule)
// CRITICAL: Use background-compatible services only - no Svelte stores!
import { BackgroundTransactionService } from './background/BackgroundTransactionService';
import { BackgroundPriceService } from './background/BackgroundPriceService';
import { BackgroundCacheStore } from './background/BackgroundCacheStore';
import { BackgroundCacheSyncService as CacheSyncManager } from './background/BackgroundCacheSyncService';
import { PortfolioRefreshService } from './portfolio-refresh.service';
import { portfolioCoordinator, UpdatePriority, UpdateType } from './portfolio-data-coordinator.service';

// Default intervals in milliseconds - OPTIMIZED to prevent flickering
// Prices update more frequently for market data, other data less frequently
const DEFAULT_INTERVALS = {
  transactions: 3 * 60 * 1000,    // 3 minutes for transaction history (was 5 minutes)
  prices: 15 * 1000,              // 15 seconds for market prices (testing, will be 60 seconds in production)
  portfolio: 60 * 1000,           // 1 minute for portfolio calculation (was 2 minutes, more responsive)
  rollups: 60 * 1000,             // 1 minute for rollup calculations (was 1.5 minutes)
  tokenBalances: 15 * 1000,       // 15 seconds for testing (5 minutes in production)
};

// Minimum intervals to prevent too frequent updates and reduce flickering
const MIN_INTERVALS = {
  transactions: 60 * 1000,        // 1 minute minimum
  prices: 15 * 1000,              // 15 seconds minimum for testing (30 seconds for production)
  portfolio: 45 * 1000,           // 45 seconds minimum (reactive calculations)
  rollups: 45 * 1000,             // 45 seconds minimum
  tokenBalances: 15 * 1000,       // 15 seconds minimum for testing
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
    log.info('[BackgroundIntervals] Initializing background intervals');

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

    log.info('[BackgroundIntervals] Background intervals initialized');
  }

  /**
   * Check if user has valid accounts and run initial updates
   */
  private async runInitialUpdatesIfNeeded(): Promise<void> {
    try {
      log.info('[BackgroundIntervals] Checking for valid accounts to run initial updates');

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
        log.info('[BackgroundIntervals] Valid accounts found, running initial data updates');

        // FIRST: Fetch native balance immediately
        try {
          await this.fetchNativeBalance();
          log.info('[BackgroundIntervals] Native balance fetched on startup');
        } catch (error) {
          log.error('[BackgroundIntervals] Failed to fetch native balance on startup', error);
        }

        // Run initial updates immediately (not waiting for first interval)
        // These will set the running flags to prevent interval overlap

        // 1. Fetch initial transactions
        try {
          this.flags.transactionsRunning = true;
          await this.fetchAllTransactions();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial transaction fetch', error);
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
          log.error('[BackgroundIntervals] Error in initial price update', error);
        } finally {
          this.flags.pricesRunning = false;
        }

        // 3. Calculate portfolios
        try {
          this.flags.portfolioRunning = true;
          await this.updatePortfolio();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial portfolio update', error);
        } finally {
          this.flags.portfolioRunning = false;
        }

        // 4. Calculate rollups
        try {
          this.flags.rollupsRunning = true;
          await this.updateRollups();
        } catch (error) {
          log.error('[BackgroundIntervals] Error in initial rollup update', error);
        } finally {
          this.flags.rollupsRunning = false;
        }

        log.info('[BackgroundIntervals] Initial data updates completed');
      } else {
        log.info('[BackgroundIntervals] No valid accounts found, skipping initial updates');
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Error checking for initial updates', error);
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
      log.warn('[BackgroundIntervals] Failed to load interval settings, using defaults', error);
    }
  }

  /**
   * Update interval configuration dynamically
   */
  public async updateIntervals(config: IntervalConfig): Promise<void> {
    log.info('[BackgroundIntervals] Updating interval configuration', config);

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
      log.error('[BackgroundIntervals] Failed to save interval settings', error);
    }
  }

  /**
   * Set up transaction fetching interval
   */
  private setupTransactionInterval(): void {
    const callback = async () => {
      // Skip if manual refresh is pending or already running
      if (this.flags.manualRefreshPending || this.flags.transactionsRunning) {
        log.debug('[BackgroundIntervals] Skipping transaction fetch - already running or manual refresh pending');
        return;
      }

      try {
        this.flags.transactionsRunning = true;
        log.debug('[BackgroundIntervals] Starting scheduled transaction fetch');

        // Fetch transactions for all accounts
        await this.fetchAllTransactions();

        log.debug('[BackgroundIntervals] Scheduled transaction fetch completed');
      } catch (error) {
        log.error('[BackgroundIntervals] Error in transaction fetch interval', error);
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
        log.debug('[BackgroundIntervals] Skipping price update - already running');
        return;
      }

      try {
        this.flags.pricesRunning = true;
        log.debug('[BackgroundIntervals] Starting scheduled price update');

        // Fetch new prices
        const priceData = await this.fetchPriceData();

        // Queue price update through coordinator
        portfolioCoordinator.queueUpdate({
          type: UpdateType.PRICE_ONLY,
          priority: UpdatePriority.PRICE_UPDATE,
          source: 'background-interval',
          data: priceData
        });

        log.debug('[BackgroundIntervals] Scheduled price update queued');
      } catch (error) {
        log.error('[BackgroundIntervals] Error in price update interval', error);
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
        log.debug('[BackgroundIntervals] Skipping portfolio update - already running');
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
        log.debug('[BackgroundIntervals] Skipping rollup update - already running');
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
        log.debug('[BackgroundIntervals] Skipping token balance update - already running');
        return;
      }

      try {
        this.flags.tokenBalancesRunning = true;
        log.debug('[BackgroundIntervals] Starting scheduled token balance update');

        // Fetch balance data
        const balanceData = await this.fetchAllBalances();

        // Queue balance update through coordinator
        portfolioCoordinator.queueUpdate({
          type: UpdateType.BALANCE_ONLY,
          priority: UpdatePriority.INTERVAL_UPDATE,
          source: 'background-balances',
          data: balanceData
        });

        log.debug('[BackgroundIntervals] Token balance update queued');
      } catch (error) {
        log.error('[BackgroundIntervals] Error in token balance interval', error);
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
      log.debug('[BackgroundIntervals] Starting portfolio update');

      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Queue portfolio update through coordinator
      portfolioCoordinator.queueUpdate({
        type: UpdateType.ROLLUP_ONLY,
        priority: UpdatePriority.INTERVAL_UPDATE,
        source: 'background-portfolio',
        data: {}
      });

      log.debug('[BackgroundIntervals] Portfolio update queued');
    } catch (error) {
      log.error('[BackgroundIntervals] Error updating portfolio', error);
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
        log.debug('[BackgroundIntervals] Portfolio refresh in progress, skipping rollup update');
        return;
      }

      this.flags.rollupsRunning = true;
      log.debug('[BackgroundIntervals] Starting rollup update');

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

      log.debug('[BackgroundIntervals] Rollup update completed');
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
        log.debug('[BackgroundIntervals] No cache data available for transaction fetch');
        return;
      }

      console.log('fetchAllTransactions: cache>>>>>>>>>>>>>>', cache);

      // Fetch transactions for each account on each chain
      for (const [chainId, accounts] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(accounts)) {
          try {
            await this.transactionService.getTransactionHistory(address);
          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to fetch transactions for ${address} on chain ${chainId}`, error);
          }
        }
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Error fetching all transactions', error);
    }
  }

  /**
   * Fetch price data for all tokens
   * Returns price data to be processed by coordinator
   */
  private async fetchPriceData(): Promise<any> {
    try {
      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Fetch market prices
      const prices = await this.priceService.fetchLatestPrices();

      log.debug('[BackgroundIntervals] Price data fetched');
      return prices;
    } catch (error) {
      log.error('[BackgroundIntervals] Error fetching price data', false, error);
      return {};
    }
  }

  /**
   * Fetch balance data for all accounts
   * Returns balance data to be processed by coordinator
   */
  private async fetchAllBalances(): Promise<any> {
    const balanceData: Record<string, any> = {};

    try {
      log.debug('[BackgroundIntervals] Fetching token balances for all accounts');

      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Get all accounts and chains from cache
      const cache = await this.cacheStore.getCache();
      if (!cache || !cache.chainAccountCache) {
        log.debug('[BackgroundIntervals] No cache data available for balance fetch');
        return balanceData;
      }

      // Use statically imported CacheSyncManager
      const syncManager = CacheSyncManager.getInstance();

      // Fetch balances for each account on each chain
      for (const [chainId, accounts] of Object.entries(cache.chainAccountCache)) {
        for (const [address] of Object.entries(accounts)) {
          try {
            // Sync account balances directly
            await syncManager.syncAccount(Number(chainId), address);
            const balances = [];

            if (!balanceData[address]) {
              balanceData[address] = {};
            }
            balanceData[address] = balances;

            log.debug(`[BackgroundIntervals] Fetched token balances for ${address} on chain ${chainId}`);
          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to fetch balances for ${address} on chain ${chainId}`, error);
          }
        }
      }

      log.debug('[BackgroundIntervals] Token balance fetch completed');
      return balanceData;
    } catch (error) {
      log.error('[BackgroundIntervals] Error fetching token balances', error);
      return balanceData;
    }
  }

  /**
   * Update token balances for all accounts
   * Made public so it can be called from background handlers for manual updates
   */
  public async updateAllTokenBalances(): Promise<void> {
    try {
      log.debug('[BackgroundIntervals] Updating token balances for all accounts');

      // Ensure services are initialized
      this.ensureServicesInitialized();

      // Get all accounts and chains from cache
      const cache = await this.cacheStore.getCache();
      if (!cache || !cache.chainAccountCache) {
        log.debug('[BackgroundIntervals] No cache data available for balance update');
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

            log.debug(`[BackgroundIntervals] Updated token balances for ${address} on chain ${chainId}`);
          } catch (error) {
            log.warn(`[BackgroundIntervals] Failed to update balances for ${address} on chain ${chainId}`, error);
          }
        }
      }

      log.debug('[BackgroundIntervals] Token balance update completed - storage updated via syncTokenBalances');
    } catch (error) {
      log.error('[BackgroundIntervals] Error updating token balances', error);
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
    log.info('[BackgroundIntervals] Manual refresh requested:', type);

    // Set manual refresh flag
    this.flags.manualRefreshPending = true;

    try {
      switch (type) {
        case 'transactions':
          // Stop running interval temporarily
          if (this.flags.transactionsRunning) {
            log.debug('[BackgroundIntervals] Waiting for current transaction fetch to complete');
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
    log.info('[BackgroundIntervals] Starting all background intervals');

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
    log.info('[BackgroundIntervals] Stopping all background intervals');

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

      log.debug('[BackgroundIntervals] Login state:', this.isLoggedIn);
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to check login state', error);
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
        log.info('[BackgroundIntervals] Running 4AM daily offline check');

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
        log.info('[BackgroundIntervals] 4AM offline check completed');
      }
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to perform offline check', error);
    }
  }

  /**
   * Fetch native balance for currently selected account
   */
  private async fetchNativeBalance(): Promise<void> {
    try {
      // Get currently selected data from storage
      const stored = await browser.storage.local.get('yakkl-currently-selected');
      if (!stored || !stored['yakkl-currently-selected']) {
        log.debug('[BackgroundIntervals] No currently selected data for native balance');
        return;
      }

      const currentlySelected = stored['yakkl-currently-selected'] as any;
      const address = currentlySelected?.shortcuts?.address;
      const chainId = currentlySelected?.shortcuts?.chainId;

      if (!address || !chainId) {
        log.debug('[BackgroundIntervals] Missing address or chainId for native balance');
        return;
      }

      log.info('[BackgroundIntervals] Fetching native balance for', { address, chainId });

      // Import the background provider manager
      const { backgroundProviderManager } = await import('$contexts/background/services/provider-manager');

      // Ensure provider is initialized
      if (!backgroundProviderManager.isReady() || backgroundProviderManager.getCurrentChainId() !== chainId) {
        await backgroundProviderManager.initialize(chainId);
      }

      const provider = backgroundProviderManager.getProvider();
      if (!provider) {
        log.error('[BackgroundIntervals] Provider not available for native balance');
        return;
      }

      // Fetch the balance
      const balance = await provider.getBalance(address);
      const balanceString = balance.toString();

      log.info('[BackgroundIntervals] Native balance fetched:', balanceString);

      // Store in cache if different
      // Note: We'll implement differential storage in the next step
      // For now, just log that we have the balance
    } catch (error) {
      log.error('[BackgroundIntervals] Failed to fetch native balance', error);
    }
  }
}

// Export singleton instance getter
export const getBackgroundIntervalService = () => BackgroundIntervalService.getInstance();
