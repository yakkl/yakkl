import { get } from 'svelte/store';
import { browser } from '$app/environment';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { currentAccount as currentAccountStore, accountStore } from '$lib/stores';
import { currentChain as currentChainStore, chainStore } from '$lib/stores';
import { TokenService } from './token.service';
import { TransactionService } from './transaction.service';
import type { TokenCache } from '$lib/stores/wallet-cache.store';
import type { TokenDisplay } from '$lib/types';
import { updateTokenPrices } from '$lib/common/tokenPriceManager';
import { getInstances } from '$lib/common';
import { log } from '$lib/common/logger-wrapper';
import { ethers } from 'ethers-v6';
import { getYakklCombinedTokens, getYakklTokenCache } from '$lib/common/stores';
import { loadDefaultTokens } from '$lib/managers/tokens/loadDefaultTokens';
import { BigNumberishUtils } from '../common/BigNumberishUtils';
import { DecimalMath } from '../common/DecimalMath';

export class CacheSyncManager {
  private static instance: CacheSyncManager;
  private tokenService: TokenService;
  private transactionService: TransactionService;

  // Auto-sync intervals
  private balanceSyncInterval: number | null = null;
  private priceSyncInterval: number | null = null;
  private transactionSyncInterval: number | null = null;

  // Sync intervals in milliseconds
  private readonly BALANCE_SYNC_INTERVAL = 30000; // 30 seconds
  private readonly PRICE_SYNC_INTERVAL = 15000; // 15 seconds
  private readonly TRANSACTION_SYNC_INTERVAL = 60000; // 60 seconds

  private constructor() {
    this.tokenService = TokenService.getInstance();
    this.transactionService = TransactionService.getInstance();
  }

  static getInstance(): CacheSyncManager {
    if (!CacheSyncManager.instance) {
      CacheSyncManager.instance = new CacheSyncManager();
    }
    return CacheSyncManager.instance;
  }

  // Initialize sync for current account/chain if cache doesn't exist
  async initializeCurrentAccount() {
    const account = get(currentAccountStore);
    const chain = get(currentChainStore);

    if (!account || !chain) return;

    // Set initializing state
    walletCacheStore.setInitializing(true);

    try {
      // Ensure default tokens are loaded first
      const combinedTokens = await getYakklCombinedTokens();
      if (!combinedTokens || combinedTokens.length === 0) {
        log.info('[CacheSync] No tokens found, loading default tokens...', false);
        await loadDefaultTokens();
      }

      const cache = walletCacheStore.getAccountCache(chain.chainId, account.address);

      if (!cache || !cache.tokens.length) {
        log.info('[CacheSync] First time load - fetching all data for', false, account.address);

        // First time accessing this account/chain
        // Create a minimal YakklAccount from AccountDisplay
        const yakklAccount = {
          address: account.address,
          name: account.username || 'Account',
          // Add minimal required properties
        } as any; // Cast to any since we only need address
        walletCacheStore.initializeAccountCache(yakklAccount, chain.chainId);

        // Add at least the native token immediately with 0 balance
        const nativeToken: TokenCache = {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '0',
          balanceLastUpdated: new Date(),
          price: 3579.97, // Default price
          priceLastUpdated: new Date(),
          value: 0,
          icon: '/images/eth.svg',
          isNative: true,
          chainId: chain.chainId
        };

        walletCacheStore.updateTokens(chain.chainId, account.address, [nativeToken]);

        // Sync all data
        await Promise.all([
          this.syncTokenBalances(chain.chainId, account.address),
          this.syncTokenPrices(chain.chainId),
          this.syncTransactions(chain.chainId, account.address)
        ]);

        // Mark as loaded
        walletCacheStore.setHasEverLoaded(true);
        log.info('[CacheSync] Initial data load completed', false);
      }
    } finally {
      // Clear initializing state
      walletCacheStore.setInitializing(false);
      log.info('[CacheSync] Initialization complete', false);
    }
  }

  // Sync token balances for specific account/chain
  async syncTokenBalances(chainId: number, address: string) {
    try {
      log.info(`[CacheSync] Syncing token balances for ${address} on chain ${chainId}`, false);

      // Get fresh token data
      const response = await this.tokenService.getTokens(address);

      if (response.success && response.data) {
        // Convert to cache format
        const tokenCache: TokenCache[] = response.data.map(token => {
          const isNativeToken = token.address === '0x0000000000000000000000000000000000000000' || token.isNative === true;

          return {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: String(token.qty || token.balance || '0'), // Use qty which is the calculated balance
            balanceLastUpdated: new Date(),
            price: token.price || 0,
            priceLastUpdated: BigNumberishUtils.compare(token.price || 0, 0) > 0 ? new Date() : new Date(0), // Only set if we have a price
            price24hChange: token.change24h,
            value: typeof token.value === 'number' ? token.value : BigNumberishUtils.toNumber(token.value || 0),
            icon: token.icon,
            isNative: isNativeToken,
            chainId
          };
        });

        // ALWAYS ensure we have a native token with proper balance
        const hasNativeToken = tokenCache.some(t => t.isNative);

        if (!hasNativeToken) {
          // Get actual ETH balance from provider
          const instances = await getInstances();
          if (instances && instances[1]) {
            const provider = instances[1].getProvider();
            try {
              const balance = await provider.getBalance(address);
              const balanceFormatted = ethers.formatUnits(balance, 18);

              // Get current ETH price
              const tokenCacheEntries = await getYakklTokenCache();
              const ethPrice = tokenCacheEntries.find(entry =>
                entry.tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' &&
                entry.chainId === chainId
              )?.price || 3579.97;

              const nativeToken: TokenCache = {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
                balance: balanceFormatted,
                balanceLastUpdated: new Date(),
                price: ethPrice,
                priceLastUpdated: new Date(),
                value: DecimalMath.of(parseFloat(balanceFormatted)).mul(BigNumberishUtils.toNumber(ethPrice)).toNumber(),
                icon: '/images/eth.svg',
                isNative: true,
                chainId
              };

              tokenCache.unshift(nativeToken); // Add as first token
              log.info('[CacheSync] Added ETH with provider balance:', false, balanceFormatted);
            } catch (error) {
              log.warn('[CacheSync] Failed to get ETH balance from provider:', false, error);
              // Still add a native token with 0 balance as fallback
              const nativeToken: TokenCache = {
                address: '0x0000000000000000000000000000000000000000',
                symbol: 'ETH',
                name: 'Ethereum',
                decimals: 18,
                balance: '0',
                balanceLastUpdated: new Date(),
                price: 3579.97,
                priceLastUpdated: new Date(),
                value: 0,
                icon: '/images/eth.svg',
                isNative: true,
                chainId
              };
              tokenCache.unshift(nativeToken);
            }
          }
        } else {
          // Update existing native token balance from provider if available
          const nativeTokenIndex = tokenCache.findIndex(t => t.isNative);
          if (nativeTokenIndex >= 0) {
            const instances = await getInstances();
            if (instances && instances[1]) {
              const provider = instances[1].getProvider();
              try {
                const balance = await provider.getBalance(address);
                const balanceFormatted = ethers.formatUnits(balance, 18);

                // Update the native token with fresh balance
                tokenCache[nativeTokenIndex] = {
                  ...tokenCache[nativeTokenIndex],
                  balance: balanceFormatted,
                  balanceLastUpdated: new Date(),
                  value: DecimalMath.of(parseFloat(balanceFormatted)).mul(BigNumberishUtils.toNumber(tokenCache[nativeTokenIndex].price || 0)).toNumber()
                };

                log.info('[CacheSync] Updated existing ETH token with provider balance:', false, balanceFormatted);
              } catch (error) {
                log.warn('[CacheSync] Failed to update ETH balance from provider:', false, error);
              }
            }
          }
        }

        // Update cache with validation but allow updates if we have any meaningful data
        walletCacheStore.updateTokens(chainId, address, tokenCache);

        log.info(`[CacheSync] Updated ${tokenCache.length} tokens for ${address}`, false, tokenCache);

        // Verify dates are set
        const verifyToken = tokenCache[0];
        if (verifyToken) {
          log.info('[CacheSync] Date verification:', false, {
            balanceLastUpdated: verifyToken.balanceLastUpdated,
            priceLastUpdated: verifyToken.priceLastUpdated,
            isDate: verifyToken.balanceLastUpdated instanceof Date
          });
        }
      }
    } catch (error) {
      log.warn('[CacheSync] Error syncing token balances:', false, error);
    }
  }

  // Sync token prices for all tokens on a chain
  async syncTokenPrices(chainId: number) {
    try {
      log.info(`[CacheSync] Syncing token prices for chain ${chainId}`, false);

      // Update prices using existing price manager
      await updateTokenPrices();

      // Get updated prices from token cache store
      const tokenCache = await getYakklTokenCache();

      // Create price map
      const priceMap = new Map<string, number>();

      tokenCache
        .filter(entry => entry.chainId === chainId)
        .forEach(entry => {
          priceMap.set(entry.tokenAddress.toLowerCase(), BigNumberishUtils.toNumber(entry.price || 0));
        });

      // Update all account caches on this chain
      walletCacheStore.updateTokenPrices(chainId, priceMap);

      log.info(`[CacheSync] Updated prices for ${priceMap.size} tokens on chain ${chainId}`, false);
    } catch (error) {
      log.warn('[CacheSync] Error syncing token prices:', false, error);
    }
  }

  // Sync transactions for specific account/chain
  async syncTransactions(chainId: number, address: string) {
    try {
      log.info(`[CacheSync] Syncing transactions for ${address} on chain ${chainId}`, false);

      const response = await this.transactionService.getTransactionHistory(address);

      if (response.success && response.data) {
        // Get current last block from cache
        const cache = walletCacheStore.getAccountCache(chainId, address);
        const lastBlock = cache?.transactions.lastBlock || 0;

        // Filter only new transactions
        const newTransactions = response.data.filter(tx => {
          const txBlockNum = parseInt(tx.blockNumber || '0');
          return txBlockNum > lastBlock && tx.chainId === chainId;
        });

        if (newTransactions.length > 0) {
          const maxBlock = Math.max(...newTransactions.map(tx => parseInt(tx.blockNumber || '0')));
          walletCacheStore.updateTransactions(chainId, address, newTransactions, maxBlock);

          log.info(`[CacheSync] Added ${newTransactions.length} new transactions for ${address}`, false);
        }
      }
    } catch (error) {
      log.warn('[CacheSync] Error syncing transactions:', false, error);
    }
  }

  // Sync all data for current account/chain
  async syncCurrentAccount() {
    const account = get(currentAccountStore);
    const chain = get(currentChainStore);

    if (!account || !chain) return;

    await Promise.all([
      this.syncTokenBalances(chain.chainId, account.address),
      this.syncTokenPrices(chain.chainId),
      this.syncTransactions(chain.chainId, account.address)
    ]);
  }

  // Start auto-sync timers
  startAutoSync() {
    log.info('[CacheSync] Starting auto-sync', false);

    // Only start timers in browser environment
    if (!browser) {
      log.info('[CacheSync] Not in browser environment, skipping auto-sync', false);
      return;
    }

    // Clear any existing intervals
    this.stopAutoSync();

    // Balance sync
    this.balanceSyncInterval = window.setInterval(async () => {
      const account = get(currentAccountStore);
      const chain = get(currentChainStore);

      if (account && chain) {
        await this.syncTokenBalances(chain.chainId, account.address);
      }
    }, this.BALANCE_SYNC_INTERVAL);

    // Price sync
    this.priceSyncInterval = window.setInterval(async () => {
      const chain = get(currentChainStore);

      if (chain) {
        await this.syncTokenPrices(chain.chainId);
      }
    }, this.PRICE_SYNC_INTERVAL);

    // Transaction sync
    this.transactionSyncInterval = window.setInterval(async () => {
      const account = get(currentAccountStore);
      const chain = get(currentChainStore);

      if (account && chain) {
        await this.syncTransactions(chain.chainId, account.address);
      }
    }, this.TRANSACTION_SYNC_INTERVAL);

    // Do an initial sync
    this.syncCurrentAccount();
  }

  // Stop auto-sync timers
  stopAutoSync() {
    log.info('[CacheSync] Stopping auto-sync', false);

    // Only clear intervals in browser environment
    if (!browser) {
      return;
    }

    if (this.balanceSyncInterval) {
      clearInterval(this.balanceSyncInterval);
      this.balanceSyncInterval = null;
    }

    if (this.priceSyncInterval) {
      clearInterval(this.priceSyncInterval);
      this.priceSyncInterval = null;
    }

    if (this.transactionSyncInterval) {
      clearInterval(this.transactionSyncInterval);
      this.transactionSyncInterval = null;
    }
  }

  // Manual refresh methods
  async refreshTokens() {
    const account = get(currentAccountStore);
    const chain = get(currentChainStore);

    if (account && chain) {
      await this.syncTokenBalances(chain.chainId, account.address);
    }
  }

  async refreshPrices() {
    const chain = get(currentChainStore);

    if (chain) {
      await this.syncTokenPrices(chain.chainId);
    }
  }

  async refreshTransactions() {
    const account = get(currentAccountStore);
    const chain = get(currentChainStore);

    if (account && chain) {
      await this.syncTransactions(chain.chainId, account.address);
    }
  }

  // Sync all accounts on current chain
  async syncAllAccountsOnChain(chainId: number) {
    const accounts = get(accountStore).accounts || [];

    log.info(`[CacheSync] Syncing all ${accounts.length} accounts on chain ${chainId}`, false);

    // Sync each account
    for (const account of accounts) {
      await this.syncTokenBalances(chainId, account.address);
      await this.syncTransactions(chainId, account.address);
    }

    // Sync prices once for the chain
    await this.syncTokenPrices(chainId);
  }

  // Sync specific account across all chains
  async syncAccountAllChains(address: string) {
    const chains = get(chainStore).chains || [];

    log.info(`[CacheSync] Syncing account ${address} across ${chains.length} chains`, false);

    // Sync each chain
    for (const chain of chains) {
      await this.syncTokenBalances(chain.chainId, address);
      await this.syncTransactions(chain.chainId, address);
      await this.syncTokenPrices(chain.chainId);
    }
  }
}
