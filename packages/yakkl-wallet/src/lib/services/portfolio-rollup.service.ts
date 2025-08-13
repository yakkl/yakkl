/**
 * Portfolio Rollup Service
 * Handles calculation of portfolio rollups across accounts, chains, and combinations
 */

import type { WalletCacheController } from '$lib/stores/wallet-cache.store';
import type { PortfolioRollup, PrimaryAccountRollup } from '$lib/types/rollup.types';
import { BigNumber } from '$lib/common/bignumber';
import { log } from '$lib/common/logger-wrapper';

export class PortfolioRollupService {
  private static instance: PortfolioRollupService;

  private constructor() {}

  static getInstance(): PortfolioRollupService {
    if (!PortfolioRollupService.instance) {
      PortfolioRollupService.instance = new PortfolioRollupService();
    }
    return PortfolioRollupService.instance;
  }

  /**
   * Calculate rollup for a specific account across all chains
   */
  calculateAccountRollup(address: string, cache: WalletCacheController): PortfolioRollup {
    const normalizedAddress = address.toLowerCase();
    let totalValue = 0n;
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    let tokenCount = 0;
    const breakdown: any = { byChain: {}, byTokenAddress: {} };

    // Iterate through all chains for this account
    for (const chainId in cache.chainAccountCache) {
      const chainCache = cache.chainAccountCache[Number(chainId)];
      if (chainCache && chainCache[normalizedAddress]) {
        const accountCache = chainCache[normalizedAddress];
        
        // CRITICAL FIX: Calculate portfolio value from actual token values, not cached portfolio
        let accountTotal = 0n;
        accountCache.tokens.forEach(token => {
          const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
          accountTotal += tokenValue;
        });
        
        totalValue += accountTotal;
        tokenCount += accountCache.tokens.length;

        // Track breakdown by chain
        breakdown.byChain[chainId] = accountTotal;

        // Track breakdown by token and calculate native vs ERC20
        accountCache.tokens.forEach(token => {
          const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
          
          // Check if native token
          if (token.isNative) {
            nativeTokenValue += tokenValue;
          } else {
            erc20TokenValue += tokenValue;
          }
          
          if (!breakdown.byTokenAddress[token.address]) {
            breakdown.byTokenAddress[token.address] = {
              symbol: token.symbol,
              totalValue: 0n,
              chains: []
            };
          }
          breakdown.byTokenAddress[token.address].totalValue += tokenValue;
          breakdown.byTokenAddress[token.address].chains.push(Number(chainId));
        });
      }
    }

    return {
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount,
      chainCount: Object.keys(breakdown.byChain).length,
      accountCount: 1,
      breakdown,
      lastCalculated: new Date()
    };
  }

  /**
   * Calculate rollup for a specific chain across all accounts
   */
  calculateChainRollup(chainId: number, cache: WalletCacheController): PortfolioRollup {
    let totalValue = 0n;
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    let tokenCount = 0;
    let accountCount = 0;
    const breakdown: any = { byAccount: {}, byTokenAddress: {} };

    const chainCache = cache.chainAccountCache[chainId];
    if (chainCache) {
      for (const address in chainCache) {
        const accountCache = chainCache[address];
        
        // CRITICAL FIX: Calculate portfolio value from actual token values
        let accountTotal = 0n;
        accountCache.tokens.forEach(token => {
          const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
          accountTotal += tokenValue;
        });
        
        totalValue += accountTotal;
        tokenCount += accountCache.tokens.length;
        accountCount++;

        // Track breakdown by account
        breakdown.byAccount[address] = accountTotal;

        // Track breakdown by token and calculate native vs ERC20
        accountCache.tokens.forEach(token => {
          const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
          
          // Check if native token
          if (token.isNative) {
            nativeTokenValue += tokenValue;
          } else {
            erc20TokenValue += tokenValue;
          }
          
          if (!breakdown.byTokenAddress[token.address]) {
            breakdown.byTokenAddress[token.address] = {
              symbol: token.symbol,
              totalValue: 0n,
              accounts: []
            };
          }
          breakdown.byTokenAddress[token.address].totalValue += tokenValue;
          breakdown.byTokenAddress[token.address].accounts.push(address);
        });
      }
    }

    return {
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount,
      chainCount: 1,
      accountCount,
      breakdown,
      lastCalculated: new Date()
    };
  }

  /**
   * Calculate rollup for a specific account on a specific chain
   */
  calculateAccountChainRollup(
    address: string,
    chainId: number,
    cache: WalletCacheController
  ): PortfolioRollup {
    const normalizedAddress = address.toLowerCase();
    const accountCache = cache.chainAccountCache[chainId]?.[normalizedAddress];

    if (!accountCache) {
      return {
        totalValue: 0n,
        nativeTokenValue: 0n,
        erc20TokenValue: 0n,
        tokenCount: 0,
        chainCount: 0,
        accountCount: 0,
        breakdown: { byTokenAddress: {} },
        lastCalculated: new Date()
      };
    }

    // CRITICAL FIX: Calculate totalValue from actual token values, not from portfolio cache
    let totalValue = 0n;
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    const breakdown: any = { byTokenAddress: {} };

    // Track breakdown by token and calculate native vs ERC20
    accountCache.tokens.forEach(token => {
      const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
      
      // Add to total
      totalValue += tokenValue;
      
      // Check if native token
      if (token.isNative) {
        nativeTokenValue += tokenValue;
      } else {
        erc20TokenValue += tokenValue;
      }
      
      breakdown.byTokenAddress[token.address] = {
        symbol: token.symbol,
        value: tokenValue,
        balance: token.balance,
        price: token.price
      };
    });

    log.debug(`[RollupService] Account+Chain rollup: ${normalizedAddress}_${chainId}`, false, {
      totalValue: totalValue.toString(),
      nativeTokenValue: nativeTokenValue.toString(),
      erc20TokenValue: erc20TokenValue.toString(),
      tokenCount: accountCache.tokens.length
    });

    return {
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount: accountCache.tokens.length,
      chainCount: 1,
      accountCount: 1,
      breakdown,
      lastCalculated: new Date()
    };
  }

  /**
   * Calculate grand total rollup across all accounts and chains
   */
  calculateGrandTotal(cache: WalletCacheController): PortfolioRollup {
    let totalValue = 0n;
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    let tokenCount = 0;
    let accountCount = 0;
    const chainSet = new Set<number>();
    const breakdown: any = { byChain: {}, byAccount: {}, byTokenAddress: {} };

    for (const chainId in cache.chainAccountCache) {
      const chainCache = cache.chainAccountCache[Number(chainId)];
      if (chainCache) {
        chainSet.add(Number(chainId));
        
        for (const address in chainCache) {
          const accountCache = chainCache[address];
          
          // CRITICAL FIX: Calculate portfolio value from actual token values
          let accountTotal = 0n;
          accountCache.tokens.forEach(token => {
            const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
            accountTotal += tokenValue;
          });
          
          totalValue += accountTotal;
          tokenCount += accountCache.tokens.length;

          // Track breakdown by chain
          if (!breakdown.byChain[chainId]) {
            breakdown.byChain[chainId] = 0n;
          }
          breakdown.byChain[chainId] += accountTotal;

          // Track breakdown by account
          if (!breakdown.byAccount[address]) {
            breakdown.byAccount[address] = 0n;
            accountCount++;
          }
          breakdown.byAccount[address] += accountTotal;

          // Track breakdown by token and calculate native vs ERC20
          accountCache.tokens.forEach(token => {
            const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
            
            // Check if native token
            if (token.isNative) {
              nativeTokenValue += tokenValue;
            } else {
              erc20TokenValue += tokenValue;
            }
            
            if (!breakdown.byTokenAddress[token.address]) {
              breakdown.byTokenAddress[token.address] = {
                symbol: token.symbol,
                totalValue: 0n,
                chains: new Set(),
                accounts: new Set()
              };
            }
            breakdown.byTokenAddress[token.address].totalValue += tokenValue;
            breakdown.byTokenAddress[token.address].chains.add(Number(chainId));
            breakdown.byTokenAddress[token.address].accounts.add(address);
          });
        }
      }
    }

    // Convert sets to arrays in breakdown
    for (const tokenAddress in breakdown.byTokenAddress) {
      breakdown.byTokenAddress[tokenAddress].chains = Array.from(
        breakdown.byTokenAddress[tokenAddress].chains
      );
      breakdown.byTokenAddress[tokenAddress].accounts = Array.from(
        breakdown.byTokenAddress[tokenAddress].accounts
      );
    }

    return {
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount,
      chainCount: chainSet.size,
      accountCount,
      breakdown,
      lastCalculated: new Date()
    };
  }

  /**
   * Calculate rollup for watch list accounts
   */
  calculateWatchListRollup(
    watchListAccounts: string[],
    cache: WalletCacheController
  ): PortfolioRollup {
    let totalValue = 0n;
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    let tokenCount = 0;
    const chainSet = new Set<number>();
    const breakdown: any = { byAccount: {}, byChain: {}, byTokenAddress: {} };

    for (const address of watchListAccounts) {
      const normalizedAddress = address.toLowerCase();
      
      for (const chainId in cache.chainAccountCache) {
        const chainCache = cache.chainAccountCache[Number(chainId)];
        if (chainCache && chainCache[normalizedAddress]) {
          const accountCache = chainCache[normalizedAddress];
          chainSet.add(Number(chainId));
          
          // CRITICAL FIX: Calculate portfolio value from actual token values
          let accountTotal = 0n;
          accountCache.tokens.forEach(token => {
            const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
            accountTotal += tokenValue;
          });
          
          totalValue += accountTotal;
          tokenCount += accountCache.tokens.length;

          // Track breakdown
          if (!breakdown.byAccount[normalizedAddress]) {
            breakdown.byAccount[normalizedAddress] = 0n;
          }
          breakdown.byAccount[normalizedAddress] += accountTotal;

          if (!breakdown.byChain[chainId]) {
            breakdown.byChain[chainId] = 0n;
          }
          breakdown.byChain[chainId] += accountTotal;
          
          // Calculate native vs ERC20
          accountCache.tokens.forEach(token => {
            const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
            if (token.isNative) {
              nativeTokenValue += tokenValue;
            } else {
              erc20TokenValue += tokenValue;
            }
          });
        }
      }
    }

    return {
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount,
      chainCount: chainSet.size,
      accountCount: watchListAccounts.length,
      breakdown,
      lastCalculated: new Date()
    };
  }

  /**
   * Calculate rollup for primary account hierarchy
   */
  calculatePrimaryAccountHierarchy(
    primaryAddress: string,
    subAccounts: string[],
    cache: WalletCacheController
  ): PrimaryAccountRollup {
    const normalizedPrimary = primaryAddress.toLowerCase();
    let primaryValue = 0n;
    let totalValue = 0n;
    let tokenCount = 0;
    const chainSet = new Set<number>();
    const breakdown: any = { byAccount: {}, byChain: {}, byTokenAddress: {} };
    const derivedAccountsData: Array<{
      address: string;
      value: bigint;
      tokenCount: number;
    }> = [];

    // Calculate primary account value
    for (const chainId in cache.chainAccountCache) {
      const chainCache = cache.chainAccountCache[Number(chainId)];
      if (chainCache && chainCache[normalizedPrimary]) {
        const accountCache = chainCache[normalizedPrimary];
        chainSet.add(Number(chainId));
        
        const portfolioValue = BigNumber.toBigInt(accountCache.portfolio?.totalValue || 0) || 0n;
        primaryValue += portfolioValue;
        totalValue += portfolioValue;
        tokenCount += accountCache.tokens.length;

        if (!breakdown.byAccount[normalizedPrimary]) {
          breakdown.byAccount[normalizedPrimary] = 0n;
        }
        breakdown.byAccount[normalizedPrimary] += portfolioValue;

        if (!breakdown.byChain[chainId]) {
          breakdown.byChain[chainId] = 0n;
        }
        breakdown.byChain[chainId] += portfolioValue;
      }
    }

    // Calculate derived accounts values
    for (const address of subAccounts) {
      const normalizedAddress = address.toLowerCase();
      let accountValue = 0n;
      let accountTokenCount = 0;
      
      for (const chainId in cache.chainAccountCache) {
        const chainCache = cache.chainAccountCache[Number(chainId)];
        if (chainCache && chainCache[normalizedAddress]) {
          const accountCache = chainCache[normalizedAddress];
          chainSet.add(Number(chainId));
          
          const portfolioValue = BigNumber.toBigInt(accountCache.portfolio?.totalValue || 0) || 0n;
          accountValue += portfolioValue;
          totalValue += portfolioValue;
          accountTokenCount += accountCache.tokens.length;
          tokenCount += accountCache.tokens.length;

          if (!breakdown.byAccount[normalizedAddress]) {
            breakdown.byAccount[normalizedAddress] = 0n;
          }
          breakdown.byAccount[normalizedAddress] += portfolioValue;

          if (!breakdown.byChain[chainId]) {
            breakdown.byChain[chainId] = 0n;
          }
          breakdown.byChain[chainId] += portfolioValue;
        }
      }

      if (accountValue > 0n || accountTokenCount > 0) {
        derivedAccountsData.push({
          address,
          value: accountValue,
          tokenCount: accountTokenCount
        });
      }
    }

    // Calculate native vs ERC20 split
    let nativeTokenValue = 0n;
    let erc20TokenValue = 0n;
    
    // Go through all accounts again to calculate native vs ERC20
    for (const address of [primaryAddress, ...subAccounts]) {
      const normalizedAddr = address.toLowerCase();
      for (const chainId in cache.chainAccountCache) {
        const chainCache = cache.chainAccountCache[Number(chainId)];
        if (chainCache && chainCache[normalizedAddr]) {
          const accountCache = chainCache[normalizedAddr];
          accountCache.tokens.forEach(token => {
            const tokenValue = BigNumber.toBigInt(token.value || 0) || 0n;
            if (token.isNative) {
              nativeTokenValue += tokenValue;
            } else {
              erc20TokenValue += tokenValue;
            }
          });
        }
      }
    }
    
    return {
      // Base PortfolioRollup properties
      totalValue,
      nativeTokenValue,
      erc20TokenValue,
      tokenCount,
      chainCount: chainSet.size,
      accountCount: 1 + subAccounts.length,
      breakdown,
      lastCalculated: new Date(),
      
      // PrimaryAccountRollup specific properties
      primaryAddress,
      primaryValue,
      derivedAccounts: derivedAccountsData,
      totalWithDerived: totalValue
    };
  }

  /**
   * Get rollup for a specific view type
   * This method determines the appropriate rollup based on the view context
   */
  getRollupForView(
    viewType: string,
    state: any,
    context: WalletCacheController
  ): PortfolioRollup | null {
    log.debug(`[RollupService] Getting rollup for view: ${viewType}`, false, { state });

    switch (viewType) {
      case 'grandTotal':
        return this.calculateGrandTotal(context);
      
      case 'account':
        if (!state?.address) {
          log.warn('[RollupService] No address provided for account view');
          return null;
        }
        return this.calculateAccountRollup(state.address, context);
      
      case 'chain':
        if (state?.chainId === undefined) {
          log.warn('[RollupService] No chainId provided for chain view');
          return null;
        }
        return this.calculateChainRollup(state.chainId, context);
      
      case 'accountChain':
        if (!state?.address || state?.chainId === undefined) {
          log.warn('[RollupService] Missing address or chainId for account+chain view');
          return null;
        }
        return this.calculateAccountChainRollup(state.address, state.chainId, context);
      
      case 'watchList':
        if (!context.accountMetadata?.watchListAccounts) {
          log.warn('[RollupService] No watch list accounts available');
          return null;
        }
        return this.calculateWatchListRollup(
          context.accountMetadata.watchListAccounts,
          context
        );
      
      case 'hierarchy':
        if (!state?.primaryAddress) {
          log.warn('[RollupService] No primary address for hierarchy view');
          return null;
        }
        const subAccounts = state.subAccounts || [];
        return this.calculatePrimaryAccountHierarchy(
          state.primaryAddress,
          subAccounts,
          context
        );
      
      default:
        log.warn(`[RollupService] Unknown view type: ${viewType}`);
        return null;
    }
  }
}