/**
 * BackgroundTransactionService - Background context compatible transaction service
 * 
 * NO Svelte stores - uses direct browser.storage API
 * Compatible with service worker environment
 * Fetches transactions from blockchain providers
 */

import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';
import { providers } from 'ethers';
import { BackgroundCacheStore } from './BackgroundCacheStore';

// Simple transaction data interface for background service
interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasLimit: string;
  nonce: number;
  data: string;
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  status: string;
  type: string;
  chainId: number;
}

export class BackgroundTransactionService {
  private static instance: BackgroundTransactionService | null = null;
  private cacheStore: BackgroundCacheStore;
  private providers: Map<number, providers.Provider> = new Map();

  private constructor() {
    this.cacheStore = BackgroundCacheStore.getInstance();
  }

  public static getInstance(): BackgroundTransactionService {
    if (!BackgroundTransactionService.instance) {
      BackgroundTransactionService.instance = new BackgroundTransactionService();
    }
    return BackgroundTransactionService.instance;
  }

  /**
   * Get or create provider for a chain
   */
  private async getProvider(chainId: number): Promise<providers.Provider | null> {
    try {
      // Check cached provider
      if (this.providers.has(chainId)) {
        return this.providers.get(chainId)!;
      }

      // Get provider configuration from storage
      const storage = await browser.storage.local.get(['yakklProviderConfigs', 'yakklCurrentProvider']);
      const configs = storage.yakklProviderConfigs || {};
      const currentProvider = storage.yakklCurrentProvider;

      let rpcUrl: string | undefined;

      // Try to get RPC URL based on chain
      if ((currentProvider as any)?.rpcUrl) {
        rpcUrl = (currentProvider as any).rpcUrl;
      } else if ((configs as any)[chainId]?.rpcUrl) {
        rpcUrl = (configs as any)[chainId].rpcUrl;
      } else {
        // Fallback to default public RPCs
        rpcUrl = this.getDefaultRpcUrl(chainId);
      }

      if (!rpcUrl) {
        log.error('[BackgroundTransactionService] No RPC URL for chain', false, { chainId });
        return null;
      }

      // Create provider
      const provider = new providers.JsonRpcProvider(rpcUrl);
      this.providers.set(chainId, provider);
      
      return provider;
    } catch (error) {
      log.error('[BackgroundTransactionService] Failed to get provider', false, error);
      return null;
    }
  }

  /**
   * Get default RPC URL for common chains
   */
  private getDefaultRpcUrl(chainId: number): string | undefined {
    switch (chainId) {
      case 1: // Ethereum Mainnet
        return 'https://eth.llamarpc.com';
      case 137: // Polygon
        return 'https://polygon-rpc.com';
      case 56: // BSC
        return 'https://bsc-dataseed.binance.org';
      case 43114: // Avalanche
        return 'https://api.avax.network/ext/bc/C/rpc';
      case 42161: // Arbitrum
        return 'https://arb1.arbitrum.io/rpc';
      case 10: // Optimism
        return 'https://mainnet.optimism.io';
      case 11155111: // Sepolia
        return 'https://sepolia.infura.io/v3/public';
      default:
        return undefined;
    }
  }

  /**
   * Fetch transactions for an address on a specific chain
   */
  public async fetchTransactions(
    chainId: number,
    address: string,
    limit: number = 50
  ): Promise<TransactionData[]> {
    try {
      log.debug('[BackgroundTransactionService] Fetching transactions', false, {
        chainId,
        address,
        limit
      });

      const provider = await this.getProvider(chainId);
      if (!provider) {
        log.error('[BackgroundTransactionService] No provider available', false, { chainId });
        return [];
      }

      // Get latest block number
      const latestBlock = await provider.getBlockNumber();
      
      // For now, we'll fetch recent transactions using a simple approach
      // In production, you'd want to use an indexer service like Etherscan API
      const transactions: TransactionData[] = [];
      
      // Get last N blocks (simplified approach)
      const blocksToCheck = Math.min(limit, 10); // Check last 10 blocks max
      
      for (let i = 0; i < blocksToCheck; i++) {
        try {
          const blockNumber = latestBlock - i;
          const block = await provider.getBlock(blockNumber);
          
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              // Check if transaction involves our address
              if (typeof tx === 'string') {
                // If tx is just hash, fetch full transaction
                const fullTx = await provider.getTransaction(tx);
                if (fullTx && 
                    (fullTx.from?.toLowerCase() === address.toLowerCase() || 
                     fullTx.to?.toLowerCase() === address.toLowerCase())) {
                  transactions.push(this.formatTransaction(fullTx, address, chainId));
                }
              } else if (tx && typeof tx === 'object') {
                const txObj = tx as any;
                if (txObj.from?.toLowerCase() === address.toLowerCase() || 
                    txObj.to?.toLowerCase() === address.toLowerCase()) {
                  transactions.push(this.formatTransaction(txObj, address, chainId));
                  
                  if (transactions.length >= limit) {
                    break;
                  }
                }
              }
            }
          }
          
          if (transactions.length >= limit) {
            break;
          }
        } catch (error) {
          // Continue if a single block fails
          log.debug('[BackgroundTransactionService] Failed to fetch block', false, error);
        }
      }

      log.info('[BackgroundTransactionService] Fetched transactions', false, {
        chainId,
        address,
        count: transactions.length
      });

      return transactions;
    } catch (error) {
      log.error('[BackgroundTransactionService] Failed to fetch transactions', false, error);
      return [];
    }
  }

  /**
   * Format transaction for storage
   */
  private formatTransaction(tx: any, userAddress: string, chainId: number): TransactionData {
    const isOutgoing = tx.from?.toLowerCase() === userAddress.toLowerCase();
    
    return {
      hash: tx.hash,
      from: tx.from || '',
      to: tx.to || '',
      value: tx.value?.toString() || '0',
      gasPrice: tx.gasPrice?.toString() || '0',
      gasLimit: tx.gasLimit?.toString() || '0',
      nonce: tx.nonce || 0,
      data: tx.data || '0x',
      blockNumber: tx.blockNumber || 0,
      blockHash: tx.blockHash || '',
      timestamp: Date.now(), // Would need to fetch block timestamp
      status: 'confirmed', // Simplified - would need receipt for actual status
      type: isOutgoing ? 'send' : 'receive',
      chainId,
      // Additional fields can be added as needed
    } as TransactionData;
  }

  /**
   * Fetch and update transactions for all accounts
   */
  public async fetchAllTransactions(): Promise<void> {
    try {
      log.info('[BackgroundTransactionService] Starting transaction fetch for all accounts');
      
      const cache = await this.cacheStore.getCache();
      if (!cache?.chainAccountCache) {
        log.debug('[BackgroundTransactionService] No accounts in cache');
        return;
      }

      let totalFetched = 0;

      // Process each chain and account
      for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
        for (const [address, accountData] of Object.entries(chainData)) {
          try {
            const transactions = await this.fetchTransactions(
              Number(chainId),
              address,
              50 // Fetch last 50 transactions
            );

            if (transactions.length > 0) {
              // Update cache with new transactions
              await this.cacheStore.updateTransactions(
                Number(chainId),
                address,
                transactions
              );
              
              totalFetched += transactions.length;
            }
          } catch (error) {
            log.error('[BackgroundTransactionService] Failed to fetch for account', false, {
              chainId,
              address,
              error
            });
          }
        }
      }

      log.info('[BackgroundTransactionService] Transaction fetch complete', false, {
        totalFetched
      });
    } catch (error) {
      log.error('[BackgroundTransactionService] Failed to fetch all transactions', false, error);
    }
  }

  /**
   * Fetch transactions for active account only
   */
  public async fetchActiveAccountTransactions(): Promise<TransactionData[]> {
    try {
      const activeAccount = await this.cacheStore.getActiveAccount();
      
      if (!activeAccount) {
        log.debug('[BackgroundTransactionService] No active account');
        return [];
      }

      const transactions = await this.fetchTransactions(
        activeAccount.chainId,
        activeAccount.address
      );

      // Update cache
      if (transactions.length > 0) {
        await this.cacheStore.updateTransactions(
          activeAccount.chainId,
          activeAccount.address,
          transactions
        );
      }

      return transactions;
    } catch (error) {
      log.error('[BackgroundTransactionService] Failed to fetch active account transactions', false, error);
      return [];
    }
  }

  /**
   * Check for pending transactions
   */
  public async checkPendingTransactions(): Promise<void> {
    try {
      // Get pending transactions from storage
      const storage = await browser.storage.local.get('yakklPendingTransactions');
      const pendingTxs = storage.yakklPendingTransactions || {};

      for (const [txHash, txData] of Object.entries(pendingTxs)) {
        try {
          const provider = await this.getProvider((txData as any).chainId);
          if (!provider) continue;

          const receipt = await provider.getTransactionReceipt(txHash);
          
          if (receipt) {
            // Transaction is confirmed, remove from pending
            delete pendingTxs[txHash];
            
            log.info('[BackgroundTransactionService] Transaction confirmed', false, {
              hash: txHash,
              status: receipt.status
            });
          }
        } catch (error) {
          // Transaction might still be pending
          log.debug('[BackgroundTransactionService] Transaction still pending', false, { txHash });
        }
      }

      // Update pending transactions
      await browser.storage.local.set({ yakklPendingTransactions: pendingTxs });
    } catch (error) {
      log.error('[BackgroundTransactionService] Failed to check pending transactions', false, error);
    }
  }

  /**
   * Clear provider cache (useful when switching networks)
   */
  public clearProviderCache(): void {
    this.providers.clear();
    log.debug('[BackgroundTransactionService] Provider cache cleared');
  }
}

// Export singleton instance
export const backgroundTransactionService = BackgroundTransactionService.getInstance();