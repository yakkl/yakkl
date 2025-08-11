/**
 * Portfolio Rollup Service
 * Handles calculation and management of portfolio rollups across different views
 */

import type { 
	PortfolioRollup, 
	PrimaryAccountRollup, 
	WatchListRollup,
	AccountMetadata,
	RollupContext,
	ViewType
} from '$lib/types/rollup.types';
import type { 
	WalletCacheController, 
	AccountCache, 
	TokenCache 
} from '$lib/stores/wallet-cache.store';
import type { YakklWatch, YakklPrimaryAccount, YakklAccount } from '$lib/common/interfaces';
import { BigNumber, type BigNumberish } from '$lib/common/bignumber';
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
	 * Calculate the grand total portfolio across all accounts and chains
	 */
	calculateGrandTotal(cache: WalletCacheController): PortfolioRollup {
		const rollup: PortfolioRollup = {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 0,
			chainCount: 0,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date(),
			breakdown: {
				byTokenAddress: {},
				byChain: {},
				byAccount: {}
			}
		};

		const uniqueAccounts = new Set<string>();
		const uniqueChains = new Set<number>();
		const tokensByAddress: { [tokenKey: string]: BigNumberish } = {};

		// Iterate through all chains and accounts
		for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
			const chainIdNum = Number(chainId);
			uniqueChains.add(chainIdNum);
			let chainTotal = 0n;

			for (const [accountAddress, accountCache] of Object.entries(chainData)) {
				uniqueAccounts.add(accountAddress);
				
				// Skip if this is a watch account that shouldn't be included
				if (cache.accountMetadata?.watchListAccounts?.includes(accountAddress)) {
					const includeInPortfolio = cache.accountMetadata.includeInPortfolioFlags?.[accountAddress];
					if (!includeInPortfolio) {
						continue;
					}
				}

				// Add account's portfolio value
				const accountValue = BigNumber.toBigInt(accountCache.portfolio.totalValue) || 0n;
				rollup.totalValue = BigNumber.toBigInt(rollup.totalValue) + accountValue;
				chainTotal += accountValue;

				// Track by account
				const currentAccountTotal = rollup.breakdown!.byAccount![accountAddress] || 0n;
				rollup.breakdown!.byAccount![accountAddress] = BigNumber.toBigInt(currentAccountTotal) + accountValue;

				// Process tokens
				for (const token of accountCache.tokens) {
					// Calculate token value with safety check
					let tokenValue = 0n;
					try {
						if (token.value !== undefined && token.value !== null) {
							tokenValue = BigNumber.toBigInt(token.value) || 0n;
						}
					} catch (error) {
						log.debug(`[PortfolioRollup] Invalid token value for ${token.symbol}, using 0`, false);
						tokenValue = 0n;
					}
					
					if (tokenValue > 0n) {
						rollup.tokenCount++;
						
						// Native vs ERC20
						if (token.isNative) {
							rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + tokenValue;
						} else {
							rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + tokenValue;
						}

						// Track by token address
						const tokenKey = `${chainIdNum}_${token.address.toLowerCase()}`;
						const currentTokenTotal = tokensByAddress[tokenKey] || 0n;
						tokensByAddress[tokenKey] = BigNumber.toBigInt(currentTokenTotal) + tokenValue;
					}
				}
			}

			// Track by chain
			if (chainTotal > 0n) {
				rollup.breakdown!.byChain![chainIdNum] = chainTotal;
			}
		}

		// Set counts
		rollup.accountCount = uniqueAccounts.size;
		rollup.chainCount = uniqueChains.size;
		rollup.breakdown!.byTokenAddress = tokensByAddress;

		log.info('[PortfolioRollup] Grand total calculated:', false, {
			totalValue: rollup.totalValue.toString(),
			accounts: rollup.accountCount,
			chains: rollup.chainCount,
			tokens: rollup.tokenCount
		});

		return rollup;
	}

	/**
	 * Calculate rollup for a specific account across all chains
	 */
	calculateAccountRollup(address: string, cache: WalletCacheController): PortfolioRollup {
		const normalizedAddress = address.toLowerCase();
		const rollup: PortfolioRollup = {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 1,
			chainCount: 0,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date(),
			breakdown: {
				byTokenAddress: {},
				byChain: {}
			}
		};

		const uniqueChains = new Set<number>();

		// Iterate through all chains for this account
		for (const [chainId, chainData] of Object.entries(cache.chainAccountCache)) {
			const chainIdNum = Number(chainId);
			const accountCache = chainData[normalizedAddress];

			if (accountCache) {
				uniqueChains.add(chainIdNum);
				
				const accountValue = BigNumber.toBigInt(accountCache.portfolio.totalValue) || 0n;
				rollup.totalValue = BigNumber.toBigInt(rollup.totalValue) + accountValue;

				// Track by chain
				if (accountValue > 0n) {
					rollup.breakdown!.byChain![chainIdNum] = accountValue;
				}

				// Process tokens
				for (const token of accountCache.tokens) {
					// Calculate token value with safety check
					let tokenValue = 0n;
					try {
						if (token.value !== undefined && token.value !== null) {
							tokenValue = BigNumber.toBigInt(token.value) || 0n;
						}
					} catch (error) {
						log.debug(`[PortfolioRollup] Invalid token value for ${token.symbol}, using 0`, false);
						tokenValue = 0n;
					}
					
					if (tokenValue > 0n) {
						rollup.tokenCount++;
						
						// Native vs ERC20
						if (token.isNative) {
							rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + tokenValue;
						} else {
							rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + tokenValue;
						}

						// Track by token address
						const tokenKey = `${chainIdNum}_${token.address.toLowerCase()}`;
						const currentTokenTotal = rollup.breakdown!.byTokenAddress[tokenKey] || 0n;
						rollup.breakdown!.byTokenAddress[tokenKey] = BigNumber.toBigInt(currentTokenTotal) + tokenValue;
					}
				}
			}
		}

		rollup.chainCount = uniqueChains.size;

		log.debug('[PortfolioRollup] Account rollup calculated:', false, {
			address: normalizedAddress,
			totalValue: rollup.totalValue.toString(),
			chains: rollup.chainCount,
			tokens: rollup.tokenCount
		});

		return rollup;
	}

	/**
	 * Calculate rollup for a specific chain across all accounts
	 */
	calculateChainRollup(chainId: number, cache: WalletCacheController): PortfolioRollup {
		const rollup: PortfolioRollup = {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 0,
			chainCount: 1,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date(),
			breakdown: {
				byTokenAddress: {},
				byAccount: {}
			}
		};

		const chainData = cache.chainAccountCache[chainId];
		if (!chainData) {
			return rollup;
		}

		const uniqueAccounts = new Set<string>();

		// Iterate through all accounts on this chain
		for (const [accountAddress, accountCache] of Object.entries(chainData)) {
			// Skip watch accounts not included in portfolio
			if (cache.accountMetadata?.watchListAccounts?.includes(accountAddress)) {
				const includeInPortfolio = cache.accountMetadata.includeInPortfolioFlags?.[accountAddress];
				if (!includeInPortfolio) {
					continue;
				}
			}

			uniqueAccounts.add(accountAddress);
			
			const accountValue = BigNumber.toBigInt(accountCache.portfolio.totalValue) || 0n;
			rollup.totalValue = BigNumber.toBigInt(rollup.totalValue) + accountValue;

			// Track by account
			if (accountValue > 0n) {
				rollup.breakdown!.byAccount![accountAddress] = accountValue;
			}

			// Process tokens
			for (const token of accountCache.tokens) {
				// Calculate token value with safety check
				let tokenValue = 0n;
				try {
					if (token.value !== undefined && token.value !== null) {
						tokenValue = BigNumber.toBigInt(token.value) || 0n;
					}
				} catch (error) {
					log.debug(`[PortfolioRollup] Invalid token value for ${token.symbol}, using 0`, false);
					tokenValue = 0n;
				}
				
				if (tokenValue > 0n) {
					rollup.tokenCount++;
					
					// Native vs ERC20
					if (token.isNative) {
						rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + tokenValue;
					} else {
						rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + tokenValue;
					}

					// Track by token address
					const tokenKey = token.address.toLowerCase();
					const currentTokenTotal = rollup.breakdown!.byTokenAddress[tokenKey] || 0n;
					rollup.breakdown!.byTokenAddress[tokenKey] = BigNumber.toBigInt(currentTokenTotal) + tokenValue;
				}
			}
		}

		rollup.accountCount = uniqueAccounts.size;

		log.debug('[PortfolioRollup] Chain rollup calculated:', false, {
			chainId,
			totalValue: rollup.totalValue.toString(),
			accounts: rollup.accountCount,
			tokens: rollup.tokenCount
		});

		return rollup;
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
		const rollup: PortfolioRollup = {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 1,
			chainCount: 1,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date(),
			breakdown: {
				byTokenAddress: {}
			}
		};

		const accountCache = cache.chainAccountCache[chainId]?.[normalizedAddress];
		if (!accountCache) {
			return rollup;
		}

		rollup.totalValue = BigNumber.toBigInt(accountCache.portfolio.totalValue) || 0n;

		// Process tokens
		for (const token of accountCache.tokens) {
			// Calculate token value with safety check
			let tokenValue = 0n;
			try {
				if (token.value !== undefined && token.value !== null) {
					tokenValue = BigNumber.toBigInt(token.value) || 0n;
				}
			} catch (error) {
				log.debug(`[PortfolioRollup] Invalid token value for ${token.symbol}, using 0`, false);
				tokenValue = 0n;
			}
			
			if (tokenValue > 0n) {
				rollup.tokenCount++;
				
				// Native vs ERC20
				if (token.isNative) {
					rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + tokenValue;
				} else {
					rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + tokenValue;
				}

				// Track by token address
				const tokenKey = token.address.toLowerCase();
				rollup.breakdown!.byTokenAddress[tokenKey] = tokenValue;
			}
		}

		return rollup;
	}

	/**
	 * Calculate hierarchical rollup for primary account with derived accounts
	 */
	calculatePrimaryAccountHierarchy(
		primaryAddress: string,
		derivedAddresses: string[],
		cache: WalletCacheController
	): PrimaryAccountRollup {
		const normalizedPrimary = primaryAddress.toLowerCase();
		
		// Start with primary account rollup
		const primaryRollup = this.calculateAccountRollup(primaryAddress, cache);
		
		const rollup: PrimaryAccountRollup = {
			...primaryRollup,
			primaryAddress: normalizedPrimary,
			primaryValue: primaryRollup.totalValue,
			derivedAccounts: [],
			totalWithDerived: primaryRollup.totalValue
		};

		// Add derived accounts
		for (const derivedAddress of derivedAddresses) {
			const derivedRollup = this.calculateAccountRollup(derivedAddress, cache);
			
			rollup.derivedAccounts.push({
				address: derivedAddress.toLowerCase(),
				value: derivedRollup.totalValue,
				tokenCount: derivedRollup.tokenCount
			});

			// Add to total
			rollup.totalWithDerived = BigNumber.toBigInt(rollup.totalWithDerived) + 
				BigNumber.toBigInt(derivedRollup.totalValue);
			
			// Merge token counts and values
			rollup.tokenCount += derivedRollup.tokenCount;
			rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + 
				BigNumber.toBigInt(derivedRollup.nativeTokenValue);
			rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + 
				BigNumber.toBigInt(derivedRollup.erc20TokenValue);

			// Merge breakdowns
			if (derivedRollup.breakdown?.byTokenAddress) {
				for (const [tokenKey, tokenValue] of Object.entries(derivedRollup.breakdown.byTokenAddress)) {
					const currentValue = rollup.breakdown?.byTokenAddress[tokenKey] || 0n;
					if (rollup.breakdown?.byTokenAddress) {
						rollup.breakdown.byTokenAddress[tokenKey] = BigNumber.toBigInt(currentValue) + BigNumber.toBigInt(tokenValue);
					}
				}
			}

			if (derivedRollup.breakdown?.byChain) {
				for (const [chainId, chainValue] of Object.entries(derivedRollup.breakdown.byChain)) {
					const chainIdNum = Number(chainId);
					const currentValue = rollup.breakdown?.byChain?.[chainIdNum] || 0n;
					if (rollup.breakdown?.byChain) {
						rollup.breakdown.byChain[chainIdNum] = BigNumber.toBigInt(currentValue) + BigNumber.toBigInt(chainValue);
					}
				}
			}
		}

		// Update counts
		rollup.accountCount = 1 + rollup.derivedAccounts.length;
		rollup.totalValue = rollup.totalWithDerived;

		log.debug('[PortfolioRollup] Primary account hierarchy calculated:', false, {
			primaryAddress: normalizedPrimary,
			primaryValue: rollup.primaryValue.toString(),
			derivedCount: rollup.derivedAccounts.length,
			totalWithDerived: rollup.totalWithDerived.toString()
		});

		return rollup;
	}

	/**
	 * Calculate watch list rollup
	 */
	calculateWatchListRollup(
		watchAccounts: Set<string>,
		cache: WalletCacheController
	): WatchListRollup {
		const rollup: WatchListRollup = {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 0,
			chainCount: 0,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date(),
			watchAccounts: [],
			includedValue: 0n,
			excludedValue: 0n,
			breakdown: {
				byTokenAddress: {},
				byChain: {},
				byAccount: {}
			}
		};

		const uniqueChains = new Set<number>();

		for (const watchAddress of watchAccounts) {
			const normalizedAddress = watchAddress.toLowerCase();
			const includeInPortfolio = cache.accountMetadata?.includeInPortfolioFlags?.[normalizedAddress] ?? false;
			
			// Calculate rollup for this watch account
			const accountRollup = this.calculateAccountRollup(normalizedAddress, cache);
			
			const watchAccountInfo = {
				address: normalizedAddress,
				value: accountRollup.totalValue,
				includeInPortfolio
			};
			
			rollup.watchAccounts.push(watchAccountInfo);
			
			if (includeInPortfolio) {
				rollup.includedValue = BigNumber.toBigInt(rollup.includedValue) + 
					BigNumber.toBigInt(accountRollup.totalValue);
				rollup.totalValue = BigNumber.toBigInt(rollup.totalValue) + 
					BigNumber.toBigInt(accountRollup.totalValue);
				
				// Add to counts and breakdowns only if included
				rollup.tokenCount += accountRollup.tokenCount;
				rollup.nativeTokenValue = BigNumber.toBigInt(rollup.nativeTokenValue) + 
					BigNumber.toBigInt(accountRollup.nativeTokenValue);
				rollup.erc20TokenValue = BigNumber.toBigInt(rollup.erc20TokenValue) + 
					BigNumber.toBigInt(accountRollup.erc20TokenValue);
				
				// Merge breakdowns
				if (accountRollup.breakdown) {
					// Merge token breakdown
					if (accountRollup.breakdown.byTokenAddress) {
						for (const [tokenKey, tokenValue] of Object.entries(accountRollup.breakdown.byTokenAddress)) {
							const currentValue = rollup.breakdown?.byTokenAddress[tokenKey] || 0n;
							if (rollup.breakdown?.byTokenAddress) {
								rollup.breakdown.byTokenAddress[tokenKey] = BigNumber.toBigInt(currentValue) + BigNumber.toBigInt(tokenValue);
							}
						}
					}
					
					// Merge chain breakdown
					if (accountRollup.breakdown.byChain) {
						for (const [chainId, chainValue] of Object.entries(accountRollup.breakdown.byChain)) {
							const chainIdNum = Number(chainId);
							uniqueChains.add(chainIdNum);
							const currentValue = rollup.breakdown?.byChain?.[chainIdNum] || 0n;
							if (rollup.breakdown?.byChain) {
								rollup.breakdown.byChain[chainIdNum] = BigNumber.toBigInt(currentValue) + BigNumber.toBigInt(chainValue);
							}
						}
					}
				}
				
				// Track by account
				if (rollup.breakdown?.byAccount) {
					rollup.breakdown.byAccount[normalizedAddress] = accountRollup.totalValue;
				}
			} else {
				rollup.excludedValue = BigNumber.toBigInt(rollup.excludedValue) + 
					BigNumber.toBigInt(accountRollup.totalValue);
			}
		}

		rollup.accountCount = rollup.watchAccounts.filter(a => a.includeInPortfolio).length;
		rollup.chainCount = uniqueChains.size;

		log.debug('[PortfolioRollup] Watch list rollup calculated:', false, {
			totalAccounts: watchAccounts.size,
			includedAccounts: rollup.accountCount,
			includedValue: rollup.includedValue.toString(),
			excludedValue: rollup.excludedValue.toString()
		});

		return rollup;
	}

	/**
	 * Get rollup for specific view type
	 */
	getRollupForView(
		viewType: ViewType,
		cache: WalletCacheController,
		context?: RollupContext
	): PortfolioRollup {
		switch (viewType) {
			case 'current':
				// Current account on current chain
				if (!context?.accountAddress || !context?.chainId) {
					return this.getEmptyRollup();
				}
				return this.calculateAccountChainRollup(
					context.accountAddress, 
					context.chainId, 
					cache
				);

			case 'chain':
				// All accounts on current chain
				if (!context?.chainId) {
					return this.getEmptyRollup();
				}
				return this.calculateChainRollup(context.chainId, cache);

			case 'account':
				// Current account across all chains
				if (!context?.accountAddress) {
					return this.getEmptyRollup();
				}
				return this.calculateAccountRollup(context.accountAddress, cache);

			case 'all':
				// Everything
				return this.calculateGrandTotal(cache);

			case 'watchlist':
				// Watch list only
				return this.calculateWatchListRollup(
					new Set(cache.accountMetadata?.watchListAccounts || []), 
					cache
				);

			case 'hierarchy':
				// Primary with derived accounts
				if (!context?.accountAddress) {
					return this.getEmptyRollup();
				}
				const derivedAddresses = this.getDerivedAddresses(
					context.accountAddress, 
					cache.accountMetadata
				);
				return this.calculatePrimaryAccountHierarchy(
					context.accountAddress,
					derivedAddresses,
					cache
				);

			default:
				return this.getEmptyRollup();
		}
	}

	/**
	 * Get derived addresses for a primary account
	 */
	private getDerivedAddresses(primaryAddress: string, metadata?: AccountMetadata): string[] {
		if (!metadata?.derivedAccounts) {
			return [];
		}

		const normalizedPrimary = primaryAddress.toLowerCase();
		const derivedAddresses: string[] = [];

		for (const [derivedAddress, parentAddress] of Object.entries(metadata.derivedAccounts)) {
			if (parentAddress.toLowerCase() === normalizedPrimary) {
				derivedAddresses.push(derivedAddress);
			}
		}

		return derivedAddresses;
	}

	/**
	 * Get empty rollup
	 */
	private getEmptyRollup(): PortfolioRollup {
		return {
			totalValue: 0n,
			tokenCount: 0,
			accountCount: 0,
			chainCount: 0,
			nativeTokenValue: 0n,
			erc20TokenValue: 0n,
			lastCalculated: new Date()
		};
	}
}