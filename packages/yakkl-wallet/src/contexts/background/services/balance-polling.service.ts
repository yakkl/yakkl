/**
 * Balance Polling Service for Background Context
 * Periodically fetches balance updates and notifies UI
 */

import { log } from '$lib/common/logger-wrapper';
import { simpleProvider } from './simple-provider.service';
import browser from 'webextension-polyfill';
import { getYakklCurrentlySelected } from '$lib/common/currentlySelected';

export class BalancePollingService {
  private static instance: BalancePollingService;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 30 * 1000; // 30 seconds
  private lastBalance: string | null = null;
  private isPolling = false;

  private constructor() {}

  static getInstance(): BalancePollingService {
    if (!BalancePollingService.instance) {
      BalancePollingService.instance = new BalancePollingService();
    }
    return BalancePollingService.instance;
  }

  /**
   * Start polling for balance updates
   */
  async start(): Promise<void> {
    if (this.isPolling) {
      log.debug('[BalancePolling] Already polling');
      return;
    }

    log.info('[BalancePolling] Starting balance polling service');
    this.isPolling = true;

    // Do an immediate poll
    await this.pollBalance();

    // Set up interval for subsequent polls
    this.intervalId = setInterval(async () => {
      await this.pollBalance();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPolling = false;
    log.info('[BalancePolling] Stopped balance polling service');
  }

  /**
   * Poll for balance update
   */
  private async pollBalance(): Promise<void> {
    try {
      // Get currently selected account and chain
      const currentlySelected = await getYakklCurrentlySelected();
      const address = currentlySelected?.shortcuts?.address;
      const chainId = currentlySelected?.shortcuts?.chainId || 1;

      if (!address) {
        log.debug('[BalancePolling] No account selected, skipping poll');
        return;
      }

      // Get balance from provider
      const balance = await simpleProvider.getBalance(address, chainId);

      // Check if balance changed
      if (balance !== this.lastBalance) {
        log.info('[BalancePolling] Balance changed', {
          old: this.lastBalance,
          new: balance,
          address,
          chainId
        });

        this.lastBalance = balance;

        // Store in local storage for UI to pick up
        await browser.storage.local.set({
          [`balance_${address}_${chainId}`]: balance,
          [`balance_${address}_${chainId}_updated`]: Date.now()
        });

        // Send message to all tabs/windows about the update
        try {
          // Get all tabs
          const tabs = await browser.tabs.query({});

          // Send message to each tab
          for (const tab of tabs) {
            if (tab.id) {
              browser.tabs.sendMessage(tab.id, {
                type: 'BALANCE_UPDATED',
                data: { balance, address, chainId }
              }).catch(() => {
                // Ignore errors for tabs that don't have our content script
              });
            }
          }

          // Also send to runtime for popup/sidepanel
          browser.runtime.sendMessage({
            type: 'BALANCE_UPDATED',
            data: { balance, address, chainId }
          }).catch(() => {
            // Ignore if no listeners
          });
        } catch (error) {
          log.debug('[BalancePolling] Failed to notify UI about balance update', error);
        }
      } else {
        log.debug('[BalancePolling] Balance unchanged', { balance, address, chainId });
      }
    } catch (error) {
      log.error('[BalancePolling] Failed to poll balance:', false, error);
    }
  }

  /**
   * Force an immediate balance update
   */
  async forceUpdate(): Promise<void> {
    log.info('[BalancePolling] Forcing balance update');
    await this.pollBalance();
  }
}

// Export singleton instance
export const balancePollingService = BalancePollingService.getInstance();