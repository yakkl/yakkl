import { BaseService } from './base.service';
import { TransactionCacheManager } from '$lib/managers/TransactionCacheManager';
import { BlockchainExplorer } from '$lib/managers/providers/explorer/BlockchainExplorer';
import { notificationService } from './notification.service';
import type { TransactionDisplay, ServiceResponse } from '$lib/types';
import { get } from 'svelte/store';
import { currentAccount } from '$lib/stores/account.store';
import { currentChain } from '$lib/stores/chain.store';
import { transactionStore } from '$lib/stores/transaction.store';
import { log } from '$lib/managers/Logger';
import { browser_ext } from '$lib/common/environment';
// Check if we're in a browser environment
const browser = typeof window !== 'undefined';

interface MonitorConfig {
  pollingInterval: number; // Milliseconds between polls
  maxRetries: number; // Maximum retries on failure
  notificationEnabled: boolean; // Whether to show browser notifications
}

interface MonitorState {
  isRunning: boolean;
  lastPollTime: number;
  lastKnownTransactions: Set<string>; // Transaction hashes we've seen
  currentAddress: string | null;
  currentChainId: number | null;
  intervalId: number | null;
}

export class TransactionMonitorService extends BaseService {
  private static instance: TransactionMonitorService;
  private cacheManager: TransactionCacheManager;
  private explorer: BlockchainExplorer;

  private config: MonitorConfig = {
    pollingInterval: 30000, // 30 seconds default
    maxRetries: 3,
    notificationEnabled: true
  };

  private state: MonitorState = {
    isRunning: false,
    lastPollTime: 0,
    lastKnownTransactions: new Set(),
    currentAddress: null,
    currentChainId: null,
    intervalId: null
  };

  private constructor() {
    super('TransactionMonitorService');
    this.cacheManager = TransactionCacheManager.getInstance();
    this.explorer = BlockchainExplorer.getInstance();
    this.initialize();
  }

  static getInstance(): TransactionMonitorService {
    if (!TransactionMonitorService.instance) {
      TransactionMonitorService.instance = new TransactionMonitorService();
    }
    return TransactionMonitorService.instance;
  }

  /**
   * Initialize the monitor service
   */
  private async initialize(): Promise<void> {
    await this.cacheManager.initialize();

    // Subscribe to account changes
    currentAccount.subscribe((account) => {
      if (account?.address !== this.state.currentAddress) {
        this.state.currentAddress = account?.address || null;
        this.handleAccountChange();
      }
    });

    // Subscribe to chain changes
    currentChain.subscribe((chain) => {
      if (chain?.chainId !== this.state.currentChainId) {
        this.state.currentChainId = chain?.chainId || null;
        this.handleChainChange();
      }
    });
  }

  /**
   * Start monitoring transactions
   */
  async start(pollingInterval?: number): Promise<void> {
    if (this.state.isRunning) {
      return;
    }

    if (pollingInterval) {
      this.config.pollingInterval = pollingInterval;
    }

    this.state.isRunning = true;

    // Do an initial poll
    await this.pollTransactions();

    // Set up interval for regular polling
    if (browser) {
      this.state.intervalId = window.setInterval(() => {
        this.pollTransactions().catch(error => {
          log.error('TransactionMonitor: Poll error', false, error);
        });
      }, this.config.pollingInterval);
    }
  }

  /**
   * Stop monitoring transactions
   */
  stop(): void {
    if (!this.state.isRunning) {
      return;
    }
    this.state.isRunning = false;
    if (this.state.intervalId !== null && browser) {
      window.clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
  }

  /**
   * Configure the monitor service
   */
  configure(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };

    // If interval changed and monitor is running, restart
    if (config.pollingInterval && this.state.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Manually trigger a poll
   */
  async poll(): Promise<ServiceResponse<TransactionDisplay[]>> {
    return this.pollTransactions();
  }

  /**
   * Poll for new transactions
   */
  private async pollTransactions(): Promise<ServiceResponse<TransactionDisplay[]>> {
    if (!this.state.currentAddress || !this.state.currentChainId) {
      return { success: false, error: { hasError: true, message: 'No address or chain selected' } };
    }

    try {
      // Fetch latest transactions from blockchain
      const transactions = await this.explorer.getTransactionHistory(
        this.state.currentAddress,
        this.state.currentChainId,
        50, // Fetch more to detect new ones
        browser // isBackgroundContext
      );

      // Update cache
      await this.cacheManager.updateCache(
        this.state.currentAddress,
        this.state.currentChainId,
        transactions
      );

      // Detect new transactions
      const newTransactions = this.detectNewTransactions(transactions);

      if (newTransactions.length > 0) {
        // Show notifications for new transactions
        if (this.config.notificationEnabled) {
          for (const tx of newTransactions) {
            await this.notifyNewTransaction(tx);
          }
        }

        // Update the transaction store to trigger UI updates
        await transactionStore.refresh();
      }

      // Update last poll time
      this.state.lastPollTime = Date.now();

      // Broadcast update to all contexts if in background
      if (browser && typeof window !== 'undefined' && browser_ext.runtime) {
        try {
          await this.sendMessage({
            type: 'yakkl_transactionUpdate',
            payload: {
              address: this.state.currentAddress,
              chainId: this.state.currentChainId,
              transactions
            }
          });
        } catch (error) {
          log.debug('TransactionMonitor: Failed to broadcast update', false, error);
        }
      }

      return { success: true, data: transactions };
    } catch (error) {
      log.error('TransactionMonitor: Failed to poll transactions', false, error);
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Detect new transactions that we haven't seen before
   */
  private detectNewTransactions(transactions: TransactionDisplay[]): TransactionDisplay[] {
    const newTransactions: TransactionDisplay[] = [];

    for (const tx of transactions) {
      if (!this.state.lastKnownTransactions.has(tx.hash)) {
        // Check if this is truly new (not from initial load)
        if (this.state.lastKnownTransactions.size > 0) {
          newTransactions.push(tx);
        }
        this.state.lastKnownTransactions.add(tx.hash);
      }
    }

    return newTransactions;
  }

  /**
   * Show notification for a new transaction
   */
  private async notifyNewTransaction(transaction: TransactionDisplay): Promise<void> {
    const chain = get(currentChain);
    const account = get(currentAccount);

    if (!chain || !account) {
      return;
    }

    // Determine transaction direction and format message
    const isIncoming = transaction.to.toLowerCase() === account.address.toLowerCase();
    const direction = isIncoming ? 'Received' : 'Sent';
    const amount = transaction.value || '0';
    const symbol = chain.nativeCurrency?.symbol || 'ETH';

    const title = `${direction} ${amount} ${symbol}`;
    const message = isIncoming
      ? `From: ${this.truncateAddress(transaction.from)}`
      : `To: ${this.truncateAddress(transaction.to)}`;

    // Check if transaction was initiated from this wallet
    const isYakklTransaction = await this.isYakklInitiatedTransaction(transaction.hash);

    // Only notify if transaction was NOT initiated from YAKKL
    if (!isYakklTransaction) {
      await notificationService.show({
        title,
        message,
        type: 'info',
        duration: 10000 // 10 seconds
      });
    }
  }

  /**
   * Check if a transaction was initiated from this wallet
   */
  private async isYakklInitiatedTransaction(txHash: string): Promise<boolean> {
    try {
      // Check if we have this transaction in our pending/recent transactions
      const response = await this.sendMessage<boolean>({
        type: 'yakkl_isOwnTransaction',
        payload: { hash: txHash }
      });

      return response.data || false;
    } catch (error) {
      log.debug('TransactionMonitor: Failed to check transaction origin', false, error);
      return false;
    }
  }

  /**
   * Handle account change
   */
  private handleAccountChange(): void {
    // Clear known transactions for new account
    this.state.lastKnownTransactions.clear();
    // Restart monitoring if running
    if (this.state.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Handle chain change
   */
  private handleChainChange(): void {
    // Clear known transactions for new chain
    this.state.lastKnownTransactions.clear();
    // Restart monitoring if running
    if (this.state.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Truncate address for display
   */
  private truncateAddress(address: string): string {
    if (!address || address.length < 10) {
      return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get monitor status
   */
  getStatus(): {
    isRunning: boolean;
    lastPollTime: number;
    pollingInterval: number;
    currentAddress: string | null;
    currentChainId: number | null;
    transactionCount: number;
  } {
    return {
      isRunning: this.state.isRunning,
      lastPollTime: this.state.lastPollTime,
      pollingInterval: this.config.pollingInterval,
      currentAddress: this.state.currentAddress,
      currentChainId: this.state.currentChainId,
      transactionCount: this.state.lastKnownTransactions.size
    };
  }
}
