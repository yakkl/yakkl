/**
 * Portfolio Refresh Service
 * Handles refresh requests from UI components and coordinates background updates
 */

import { BackgroundIntervalService } from './background-interval.service';
import { CacheSyncManager } from './cache-sync.service';
import { log } from '$lib/common/logger-wrapper';
import type { ViewType } from '$lib/types/rollup.types';
import { browser_ext } from '$lib/common/environment';

export class PortfolioRefreshService {
  private static instance: PortfolioRefreshService;
  private backgroundService: BackgroundIntervalService | null = null;
  private cacheSyncManager: CacheSyncManager | null = null;

  // Synchronization flags to prevent concurrent executions
  private refreshInProgress = false;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private readonly REFRESH_TIMEOUT_MS = 30000; // 30 seconds fail-safe timeout
  private readonly REFRESH_DEBOUNCE_MS = 500; // 500ms debounce for rapid requests

  private constructor() {
    this.setupMessageListener();
  }

  static getInstance(): PortfolioRefreshService {
    if (!PortfolioRefreshService.instance) {
      PortfolioRefreshService.instance = new PortfolioRefreshService();
    }
    return PortfolioRefreshService.instance;
  }

  /**
   * Ensure services are initialized
   */
  private ensureServicesInitialized(): void {
    if (!this.backgroundService) {
      this.backgroundService = BackgroundIntervalService.getInstance();
    }
    if (!this.cacheSyncManager) {
      this.cacheSyncManager = CacheSyncManager.getInstance();
    }
  }

  /**
   * Setup message listener for refresh requests
   */
  private setupMessageListener(): void {
    // Only setup in background context
    if (typeof window !== 'undefined' && browser_ext.runtime?.onMessage) {
      browser_ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const typedMessage = message as { type: string; viewMode?: string; chainId?: number; address?: string; userInitiated?: boolean; };
        if (typedMessage.type === 'REFRESH_PORTFOLIO_DATA') {
          this.handleRefreshRequest(typedMessage)
            .then(async () => {
              // Send completion message back to UI
              await this.notifyRefreshComplete();
            })
            .catch(error => {
              log.error('[PortfolioRefresh] Error handling refresh request:', false, error);
            });

          // Return true to indicate async response
          return true;
        }
      });
    }
  }

  /**
   * Handle refresh request from UI
   */
  private async handleRefreshRequest(message: {
    type: string;
    viewMode?: string;
    chainId?: number;
    address?: string;
    userInitiated?: boolean;
  }): Promise<void> {
    // Check if refresh is already in progress
    if (this.refreshInProgress) {
      log.info('[PortfolioRefresh] Refresh already in progress, skipping request', false);
      // If it's a user-initiated request, still notify completion to clear UI loading state
      if (message.userInitiated) {
        setTimeout(() => this.notifyRefreshComplete(), 100);
      }
      return;
    }

    // Set the flag to indicate refresh is in progress
    this.refreshInProgress = true;

    // Set fail-safe timeout to reset flag
    this.setRefreshTimeout();

    log.info('[PortfolioRefresh] Handling refresh request', false, {
      viewMode: message.viewMode,
      chainId: message.chainId,
      address: message.address,
      userInitiated: message.userInitiated
    });

    this.ensureServicesInitialized();

    try {
      // Map UI view mode names to ViewType
      let viewType: ViewType = 'current';
      switch (message.viewMode) {
        case 'current_account':
        case 'current':
          viewType = 'current';
          break;
        case 'single_network':
        case 'chain':
          viewType = 'chain';
          break;
        case 'all_networks':
        case 'all':
          viewType = 'all';
          break;
        case 'watch_list':
        case 'watchlist':
          viewType = 'watchlist';
          break;
        case 'hierarchy':
          viewType = 'hierarchy';
          break;
      }

      switch (viewType) {
        case 'current':
          // Refresh current account on current chain
          if (message.chainId && message.address) {
            await this.refreshAccountData(message.address, message.chainId);
          }
          break;

        case 'chain':
          // Refresh all accounts on current chain
          if (message.chainId) {
            await this.refreshChainData(message.chainId);
          }
          break;

        case 'all':
          // Refresh everything
          await this.refreshAllData();
          break;

        case 'watchlist':
          // Refresh watch list accounts
          await this.refreshWatchListData();
          break;

        case 'hierarchy':
          // Refresh primary/derived hierarchy
          if (message.address) {
            await this.refreshHierarchyData(message.address);
          }
          break;

        default:
          // Default to refreshing current account
          if (message.chainId && message.address) {
            await this.refreshAccountData(message.address, message.chainId);
          }
      }

      // After data refresh, trigger rollup recalculation
      await this.cacheSyncManager!.syncPortfolioRollups();

    } catch (error) {
      log.error('[PortfolioRefresh] Error during refresh:', false, error);
      throw error;
    } finally {
      // Always reset the flag and clear timeout
      this.clearRefreshState();
    }
  }

  /**
   * Refresh data for a specific account on a specific chain
   */
  private async refreshAccountData(address: string, chainId: number): Promise<void> {
    log.debug('[PortfolioRefresh] Refreshing account data', false, { address, chainId });

    // Trigger balance and price updates (these preserve transaction data)
    await this.cacheSyncManager!.syncTokenBalances(chainId, address);
    await this.cacheSyncManager!.syncTokenPrices(chainId);

    // CRITICAL: Preserve transaction data during refresh
    // Only sync new transactions, don't clear existing ones
    await this.cacheSyncManager!.syncTransactions(chainId, address);

    // Update rollups for this account
    await this.cacheSyncManager!.syncAccountRollups(address);
  }

  /**
   * Refresh data for all accounts on a specific chain
   */
  private async refreshChainData(chainId: number): Promise<void> {
    log.debug('[PortfolioRefresh] Refreshing chain data', false, { chainId });

    // CRITICAL: Sync all accounts on this chain but preserve transaction data
    await this.cacheSyncManager!.syncAllAccountsOnChain(chainId);

    // Update rollups for this chain
    await this.cacheSyncManager!.syncChainRollups(chainId);
  }

  /**
   * Refresh all data
   */
  private async refreshAllData(): Promise<void> {
    log.debug('[PortfolioRefresh] Refreshing all data', false);

    // CRITICAL: Trigger full refresh but preserve transaction data
    // Use smart sync to avoid clearing transactions
    await this.cacheSyncManager!.smartSync({
      tokensUpdated: true,
      pricesUpdated: true,
      transactionsUpdated: false // Don't clear transactions
    });

    // Recalculate all rollups
    await this.cacheSyncManager!.syncPortfolioRollups();
  }

  /**
   * Refresh watch list data
   */
  private async refreshWatchListData(): Promise<void> {
    log.debug('[PortfolioRefresh] Refreshing watch list data', false);

    // Get watch list accounts and refresh their data
    // This would need to be implemented based on how watch list is stored
    await this.cacheSyncManager!.syncWatchListRollups();
  }

  /**
   * Refresh hierarchy data
   */
  private async refreshHierarchyData(primaryAddress: string): Promise<void> {
    log.debug('[PortfolioRefresh] Refreshing hierarchy data', false, { primaryAddress });

    // Refresh primary and derived accounts
    await this.cacheSyncManager!.syncAccountRollups(primaryAddress);
    await this.cacheSyncManager!.syncPrimaryAccountHierarchy();
  }

  /**
   * Notify UI that refresh is complete
   */
  private async notifyRefreshComplete(): Promise<void> {
    // Send message to all runtime contexts using Promise-based API
    if (typeof window !== 'undefined' && browser_ext.runtime) {
      try {
        await browser_ext.runtime.sendMessage({
          type: 'PORTFOLIO_DATA_REFRESHED',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        log.debug('[PortfolioRefresh] Failed to send refresh complete message', false);
      }
    }

    // Also broadcast to all tabs using callback style
    // if (typeof window !== 'undefined' && browser_ext.tabs?.query) {
    //   browser_ext.tabs.query({}, (tabs) => {
    //     if (tabs) {
    //       tabs.forEach(tab => {
    //         if (tab.id) {
    //           try {
    //             chrome.tabs.sendMessage(
    //               tab.id,
    //               {
    //                 type: 'PORTFOLIO_DATA_REFRESHED',
    //                 timestamp: new Date().toISOString()
    //               },
    //               {}, // Empty options object
    //               (response) => {
    //                 // Ignore errors for tabs without content scripts
    //                 if (chrome.runtime.lastError) {
    //                   // Expected for tabs without content scripts
    //                 }
    //               }
    //             );
    //           } catch (error) {
    //             // Ignore errors for tabs without content scripts
    //           }
    //         }
    //       });
    //     }
    //   });
    // }
  }

  /**
   * Set fail-safe timeout to reset refresh flag
   */
  private setRefreshTimeout(): void {
    // Clear existing timeout if any
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Set new timeout
    this.refreshTimeout = setTimeout(() => {
      log.warn('[PortfolioRefresh] Refresh timeout reached, resetting flag', false);
      this.clearRefreshState();
    }, this.REFRESH_TIMEOUT_MS);
  }

  /**
   * Clear refresh state and timeout
   */
  private clearRefreshState(): void {
    this.refreshInProgress = false;
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Trigger a manual refresh (called by background intervals)
   */
  async triggerManualRefresh(viewMode?: ViewType): Promise<void> {
    await this.handleRefreshRequest({
      type: 'REFRESH_PORTFOLIO_DATA',
      viewMode: viewMode || 'all',
      userInitiated: false // Mark as interval-based
    });
  }

  /**
   * Check if refresh is currently in progress
   */
  public isRefreshInProgress(): boolean {
    return this.refreshInProgress;
  }
}

// Export singleton instance
export const portfolioRefreshService = PortfolioRefreshService.getInstance();
