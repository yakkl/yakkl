import { get } from 'svelte/store';
// Check if we're in a browser environment
const browser = typeof window !== 'undefined';
import { walletCacheStore } from '$lib/stores/wallet-cache.store';
import { currentAccount as currentAccountStore, accountStore } from '$lib/stores';
import { currentChain as currentChainStore, chainStore } from '$lib/stores';
import { TokenService } from './token.service';
import { TransactionService } from './transaction.service';
import type { TokenCache } from '$lib/types';
import { updateTokenPrices } from '$lib/common/tokenPriceManager';
import { log } from '$lib/common/logger-wrapper';
import { formatUnits } from '$lib/utils/blockchain-bridge';
import { getYakklCombinedTokens, getYakklTokenCache } from '$lib/common/stores';
import { loadDefaultTokens } from '$lib/managers/tokens/loadDefaultTokens';
import { BigNumberishUtils } from '../common/BigNumberishUtils';
import { DecimalMath } from '../common/DecimalMath';
import Decimal from 'decimal.js';
import { compareTokenData, hasChanged } from '$lib/utils/deepCompare';
// STATIC IMPORT - NO DYNAMIC IMPORTS ALLOWED
import { sendMessage } from '$lib/messaging/client-messaging';
import { sendMessageWithPromise } from '$lib/messaging/promise-messaging';
import { nativeTokenPriceService } from './native-token-price.service';

export class CacheSyncManager {
	private static instance: CacheSyncManager;
	private tokenService: TokenService | null = null;
	private transactionService: TransactionService | null = null;

	// Auto-sync intervals
	private balanceSyncInterval: number | null = null;
	private priceSyncInterval: number | null = null;
	private transactionSyncInterval: number | null = null;

	// Sync intervals in milliseconds - OPTIMIZED for testing with reduced flickering
	private readonly BALANCE_SYNC_INTERVAL = 60000; // 1 minute for balance updates
	private readonly PRICE_SYNC_INTERVAL = 15000; // 15 seconds for price updates (testing)
	private readonly TRANSACTION_SYNC_INTERVAL = 180000; // 3 minutes for transactions

	private constructor() {
		// Delay service initialization to avoid circular dependencies
		// Services will be initialized on first use
	}

	/**
	 * Lazy initialization of services to avoid circular dependency issues
	 */
	private ensureServicesInitialized(): void {
		if (!this.tokenService) {
			this.tokenService = TokenService.getInstance();
		}
		if (!this.transactionService) {
			this.transactionService = TransactionService.getInstance();
		}
	}

	static getInstance(): CacheSyncManager {
		if (!CacheSyncManager.instance) {
			CacheSyncManager.instance = new CacheSyncManager();
		}
		return CacheSyncManager.instance;
	}

	// Initialize sync for current account/chain if cache doesn't exist
	async initializeCurrentAccount() {
		console.log('[CacheSync] initializeCurrentAccount called');
		const account = get(currentAccountStore);
		const chain = get(currentChainStore);
		console.log('[CacheSync] Current account/chain:', { account: account?.address, chain: chain?.chainId });

		if (!account || !chain) {
			console.log('[CacheSync] No account or chain yet, skipping initialization');
			return;
		}

		// Set initializing state
		walletCacheStore.setInitializing(true);

		try {
			// Ensure default tokens are loaded first
			const combinedTokens = await getYakklCombinedTokens();
			if (!combinedTokens || combinedTokens.length === 0) {
				console.log('[CacheSync] No tokens found, loading default tokens...');
				await loadDefaultTokens();
			}

			const cache = walletCacheStore.getAccountCache(chain.chainId, account.address);
			const needsInitialization = !cache || !cache.tokens.length || cache.portfolio.totalValue === 0n;

			if (needsInitialization) {
				console.log('[CacheSync] Initializing account data for', account.address);

				// First time accessing this account/chain
				// Create a minimal YakklAccount from AccountDisplay
				const yakklAccount = {
					address: account.address,
					name: account.name || 'Account'
					// Add minimal required properties
				} as any; // Cast to any since we only need address
				walletCacheStore.initializeAccountCache(yakklAccount, chain.chainId);

				// Add at least the native token immediately with 0 balance
				// import { getNativeTokenInfo } from '$lib/utils/native-token.utils';
				// const nativeInfo = getNativeTokenInfo(chain.chainId);
				// const nativeToken: TokenCache = {
				// 	address: nativeInfo.address,
				// 	symbol: nativeInfo.symbol,
				// 	name: 'Ethereum',
				// 	decimals: 18,
				// 	balance: '0',
				// 	balanceLastUpdated: new Date(),
				// 	price: 3579.97, // Default price
				// 	priceLastUpdated: new Date(),
				// 	value: 0,
				// 	icon: '/images/eth.svg',
				// 	isNative: true,
				// 	chainId: chain.chainId
				// };

				// walletCacheStore.updateTokens(chain.chainId, account.address, [nativeToken]);

				// Sync data in proper order to ensure values are calculated correctly
				// 1. First sync token balances to get the list of tokens
				await this.syncTokenBalances(chain.chainId, account.address);

				// 2. Then sync prices for those tokens
				await this.syncTokenPrices(chain.chainId);

				// 3. Sync transactions in parallel as they don't affect values
				await this.syncTransactions(chain.chainId, account.address);

				// 4. Re-sync token balances to recalculate values with updated prices
				await this.syncTokenBalances(chain.chainId, account.address);

				// CRITICAL: Force portfolio recalculation after all data is loaded
				walletCacheStore.forcePortfolioRecalculation(chain.chainId, account.address);

				// Calculate ALL rollups on initial load to ensure everything is populated
				await walletCacheStore.calculateAllRollups();

				// Mark as loaded
				walletCacheStore.setHasEverLoaded(true);
				console.log('[CacheSync] Initial data load completed with portfolio recalculation and ALL rollups');
			} else {
				// Cache exists but ensure rollups are calculated
				const cacheState = get(walletCacheStore);
				if (!cacheState.portfolioRollups?.grandTotal || cacheState.portfolioRollups.grandTotal.totalValue === 0n) {
					console.log('[CacheSync] Cache exists but rollups need calculation');
					await walletCacheStore.calculateAllRollups();
				}
			}
		} finally {
			// Clear initializing state
			walletCacheStore.setInitializing(false);
			console.log('[CacheSync] Initialization complete');
		}
	}

	// Sync token balances for specific account/chain
	async syncTokenBalances(chainId: number, address: string) {
		console.log('[CacheSync] syncTokenBalances called', { chainId, address });
		try {
			console.log(`[CacheSync] Syncing token balances for ${address} on chain ${chainId}`);

			// Ensure services are initialized
			this.ensureServicesInitialized();

			// CRITICAL FIX: Get fresh token data directly from blockchain, not from TokenService cache
			console.log('[CacheSync] About to fetchTokensDirectlyFromBlockchain...');
			const response = await this.fetchTokensDirectlyFromBlockchain(address, chainId);
			console.log('[CacheSync] fetchTokensDirectlyFromBlockchain response:', {
				success: response?.success,
				dataLength: response?.data?.length,
				error: response?.error
			});

			if (response.success && response.data) {
				// Validate response data before processing
				if (!response.data || response.data.length === 0) {
					console.warn('[CacheSync] Token service returned empty data, skipping update');
					return;
				}

				// Convert to cache format
				const tokenCache: TokenCache[] = response.data.map((token) => {
					const isNativeToken =
						token.address === '0x0000000000000000000000000000000000000000' ||
						token.isNative === true;

					// Balance is already formatted in token units from the API
					const balanceStr = token.balance;

					// CRITICAL DEBUG: Log each token conversion
					console.log(`[CacheSync] Converting token ${token.symbol}:`, {
						address: token.address,
						originalBalance: token.balance,
						balanceStr,
						balanceNum: parseFloat(balanceStr),
						price: token.price,
						isNative: isNativeToken,
						error: token.error
					});

					// Calculate value using balance * price with precision-safe arithmetic
					let calculatedValue = 0n;
					if (balanceStr && token.price) {
						// Balance is already in token units, use Decimal for precision
						const balanceDecimal = new Decimal(balanceStr);
						const valueDecimal = balanceDecimal.times(token.price);
						// Store as cents (bigint) to preserve precision
						calculatedValue = BigInt(valueDecimal.times(100).toFixed(0));
					}

					return {
						address: token.address,
						symbol: token.symbol,
						name: token.name,
						decimals: token.decimals,
						balance: balanceStr, // Store formatted balance
						balanceLastUpdated: new Date(),
						price: token.price || 0,
						priceLastUpdated:
							token.price > 0 ? new Date() : new Date(0), // Only set if we have a price
						price24hChange: token.change24h,
						value: calculatedValue, // Always use calculated value, ignore API value
						icon: token.icon,
						isNative: isNativeToken,
						chainId,
						// Add debug info for troubleshooting
						...(token.error ? { debugError: token.error } : {})
					};
				});

				// ALWAYS ensure we have a native token with proper balance
				const hasNativeToken = tokenCache.some((t) => t.isNative);

				if (!hasNativeToken) {
					// Get actual ETH balance from background service
					try {
						const response = await sendMessageWithPromise({
							type: 'GET_NATIVE_BALANCE',
							data: { address, chainId }
						});

						if (response.success && response.data) {
							const balance = response.data.balance;
							const balanceFormatted = formatUnits(balance, 18);

							// Get current ETH price
							const tokenCacheEntries = await getYakklTokenCache();
							const ethPrice =
								tokenCacheEntries.find(
									(entry) =>
										entry.tokenAddress.toLowerCase() ===
											'0x0000000000000000000000000000000000000000' && entry.chainId === chainId
								)?.price || 0;

							const nativeToken: TokenCache = {
								address: '0x0000000000000000000000000000000000000000',
								symbol: 'ETH',
								name: 'Ethereum',
								decimals: 18,
								balance: balanceFormatted,
								balanceLastUpdated: new Date(),
								price: ethPrice,
								priceLastUpdated: new Date(),
								value: DecimalMath.of(parseFloat(balanceFormatted))
									.mul(BigNumberishUtils.toNumber(ethPrice))
									.toNumber()
									.toString(),
								icon: '/images/eth.svg',
								isNative: true,
								chainId
							};

							tokenCache.unshift(nativeToken); // Add as first token
							log.info('[CacheSync] Added ETH with balance from background:', false, balanceFormatted);
						} else {
							throw new Error(response.error || 'Failed to get balance');
						}
					} catch (error) {
						log.warn('[CacheSync] Failed to get ETH balance from background:', false, error);
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
							value: '0',
							icon: '/images/eth.svg',
							isNative: true,
							chainId
						};
						tokenCache.unshift(nativeToken);
					}
				} else {
					// Update existing native token balance from provider if available
					const nativeTokenIndex = tokenCache.findIndex((t) => t.isNative);
					if (nativeTokenIndex >= 0) {
						// Remove direct provider access - use background message instead
						try {
							const response = await sendMessageWithPromise({
								type: 'GET_NATIVE_BALANCE',
								data: { address, chainId }
							});

							if (response.success && response.data) {
								// Balance already comes from background service
								const balance = response.data.balance;
								const balanceFormatted = formatUnits(balance, 18);

								// Update the native token with fresh balance
								tokenCache[nativeTokenIndex] = {
									...tokenCache[nativeTokenIndex],
									balance: balanceFormatted,
									balanceLastUpdated: new Date(),
									value: DecimalMath.of(parseFloat(balanceFormatted))
										.mul(BigNumberishUtils.toNumber(tokenCache[nativeTokenIndex].price || 0))
										.toNumber()
										.toString()
								};

								log.info(
									'[CacheSync] Updated existing ETH token with balance from background:',
									false,
									balanceFormatted
								);
							}
						} catch (error) {
							log.warn('[CacheSync] Failed to update ETH balance from background:', false, error);
						}
					}
				}

				// CRITICAL DEBUG: Log all token balances for debugging
				console.log('[CacheSync] Token balance summary:', {
					totalTokens: tokenCache.length,
					tokenDetails: tokenCache.map(t => ({
						symbol: t.symbol,
						address: t.address,
						balance: t.balance,
						balanceNum: parseFloat(t.balance),
						isZero: parseFloat(t.balance) === 0
					})),
					nonZeroCount: tokenCache.filter(t => parseFloat(t.balance) > 0).length
				});

				// Final validation before update - ensure we're not sending all zeros UNLESS this is debugging
				const hasAnyNonZeroBalance = tokenCache.some(t => {
					const balance = parseFloat(t.balance) || 0;
					return balance > 0;
				});

				// Get existing cache to check if we'd be overwriting good data
				const existingCache = walletCacheStore.getAccountCache(chainId, address);
				const hasExistingNonZeroTokens = existingCache?.tokens.some(t => {
					const balance = parseFloat(t.balance) || 0;
					return balance > 0;
				}) || false;

				console.log('[CacheSync] Balance validation:', {
					hasAnyNonZeroBalance,
					hasExistingNonZeroTokens,
					willSkipUpdate: !hasAnyNonZeroBalance && hasExistingNonZeroTokens,
					existingTokenCount: existingCache?.tokens.length || 0
				});

				// TEMPORARILY DISABLE this check for debugging - we want to see what's actually happening
				// Commenting out instead of using 'if (false)' to avoid unreachable code warning
				/*
				if (!hasAnyNonZeroBalance && hasExistingNonZeroTokens) {
					log.error(
						'[CacheSync] Token sync returned all zeros but we have existing balances - SKIPPING UPDATE',
						false,
						{
							existingTokensWithBalance: existingCache?.tokens
								.filter(t => parseFloat(t.balance) > 0)
								.map(t => `${t.symbol}: ${t.balance}`),
							newTokenCount: tokenCache.length
						}
					);
					return;
				}
				*/

				// CRITICAL FIX: Compare token data before updating to prevent unnecessary reactive updates
				if (existingCache && !compareTokenData(existingCache.tokens, tokenCache)) {
					console.debug(
						`[CacheSync] Token data unchanged for ${address} on chain ${chainId}, skipping cache update`
					);
					return;
				}

				// Update cache only if we have valid data that has actually changed
				walletCacheStore.updateTokens(chainId, address, tokenCache);

				console.log(
					`[CacheSync] Updated ${tokenCache.length} tokens for ${address}`,
					tokenCache
				);

				// Verify dates are set
				const verifyToken = tokenCache[0];
				if (verifyToken) {
					console.log('[CacheSync] Date verification:', {
						balanceLastUpdated: verifyToken.balanceLastUpdated,
						priceLastUpdated: verifyToken.priceLastUpdated,
						isDate: verifyToken.balanceLastUpdated instanceof Date
					});
				}

				// CRITICAL: Trigger price update after tokens are loaded
				// This ensures tokens have prices populated
				try {
					console.log('[CacheSync] Triggering native token price update after token sync');
					await nativeTokenPriceService.triggerUpdate();
					console.log('[CacheSync] Native token price update triggered successfully');
				} catch (error) {
					console.warn('[CacheSync] Failed to trigger price update (non-critical):', error);
				}
			}
		} catch (error) {
			console.warn('[CacheSync] Error syncing token balances:', error);
		}
	}

	/**
	 * Fetch tokens directly from blockchain bypassing TokenService cache
	 * This fixes the circular dependency issue where TokenService only returns cached data
	 */
	private async fetchTokensDirectlyFromBlockchain(address: string, chainId: number): Promise<any> {
		try {
			console.log(`[CacheSync] STARTING direct blockchain fetch for ${address} on chain ${chainId}`);

			// Import messaging service for background communication
			// Using static import from top of file - dynamic imports break service workers
			// Get native token balance from background service with retry logic
			console.log(`[CacheSync] Getting native balance for ${address} using Promise-based messaging`);

			// Retry logic with exponential backoff
			let nativeResponse = null;
			let retries = 3;
			let delay = 1000; // Start with 1 second

			while (retries > 0 && !nativeResponse?.success) {
				try {
					// Add timeout to prevent hanging
					const timeoutPromise = new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Request timeout')), 5000)
					);

					const messagePromise = sendMessageWithPromise({
						type: 'GET_NATIVE_BALANCE',
						data: { address, chainId }
					});

					nativeResponse = await Promise.race([messagePromise, timeoutPromise]) as any;

					if (nativeResponse?.success) {
						break; // Success, exit retry loop
					}
				} catch (error) {
					console.warn(`[CacheSync] Attempt ${4 - retries} failed:`, error);

					if (retries > 1) {
						console.log(`[CacheSync] Retrying in ${delay}ms...`);
						await new Promise(resolve => setTimeout(resolve, delay));
						delay *= 2; // Exponential backoff
					}
				}

				retries--;
			}

			// Handle null or undefined response
			if (!nativeResponse) {
				console.error('[CacheSync] No response from background service after retries');
				throw new Error('Background service not responding - provider may be initializing');
			}

			if (!nativeResponse.success) {
				console.error('[CacheSync] Failed to get native balance after retries:', nativeResponse.error);
				throw new Error(nativeResponse.error || 'Failed to get native balance - please try again');
			}

			const nativeBalanceFormatted = formatUnits(nativeResponse.data.balance, 18);
			console.log(`[CacheSync] Native balance: ${nativeBalanceFormatted} ETH`);

			// Get ERC20 tokens from background service
			console.log('[CacheSync] Starting ERC20 token fetch...');
			const erc20Tokens = await this.fetchERC20TokensFromBlockchain(address, chainId);
			console.log(`[CacheSync] ERC20 fetch complete: ${erc20Tokens.length} tokens`);

			// Combine native + ERC20 tokens
			const allTokens = [
				{
					address: '0x0000000000000000000000000000000000000000',
					symbol: 'ETH',
					name: 'Ethereum',
					decimals: 18,
					balance: nativeBalanceFormatted,
					isNative: true,
					chainId,
					icon: '/images/eth.svg',
					price: 0, // Will be populated by nativeTokenPriceService
					value: 0, // Will be calculated after price is fetched
				},
				...erc20Tokens
			];

			console.log(`[CacheSync] ✅ Successfully fetched ${allTokens.length} tokens directly from blockchain`, {
				nativeBalance: nativeBalanceFormatted,
				erc20Count: erc20Tokens.length,
				totalTokens: allTokens.length,
				tokensWithBalance: allTokens.filter(t => parseFloat(t.balance) > 0).length,
				tokens: allTokens.map(t => ({
					symbol: t.symbol,
					balance: t.balance,
					hasBalance: !!t.balance && t.balance !== '0'
				}))
			});
			return { success: true, data: allTokens };
		} catch (error) {
			console.error('[CacheSync] ❌ Direct blockchain fetch failed:', {
				error: error.message,
				stack: error.stack,
				address,
				chainId
			});
			return { success: false, error };
		}
	}

	/**
	 * Fetch ERC20 token balances via background service
	 */
	private async fetchERC20TokensFromBlockchain(address: string, chainId: number): Promise<any[]> {
		try {
			// Import messaging service
			// Using static import from top of file - dynamic imports break service workers

			// Get token list from combined tokens (not from cache)
			const combinedTokens = await getYakklCombinedTokens();
			console.log(`[CacheSync] Total combined tokens available: ${combinedTokens?.length || 0}`);

			const chainTokens = combinedTokens?.filter(t => t.chainId === chainId && !t.isNative) || [];
			console.log(`[CacheSync] Tokens for chain ${chainId}: ${chainTokens.length}`,
				chainTokens.map(t => `${t.symbol}(${t.address})`));

			// Test ETH balance first to verify connectivity
			try {
				const ethResponse = await sendMessageWithPromise({
					type: 'GET_NATIVE_BALANCE',
					data: { address, chainId }
				});
				if (ethResponse && ethResponse.success) {
					const ethBalance = formatUnits(ethResponse.data.balance, 18);
					console.log(`[CacheSync] ETH balance check: ${ethBalance} ETH`);
				} else {
					console.warn('[CacheSync] ETH balance check returned invalid response:', ethResponse);
				}
			} catch (ethError) {
				console.error('[CacheSync] ETH balance check failed:', ethError);
				return [];
			}

			const tokenBalances = [];
			const tokenAddresses = [
				'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
				'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
				'0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
				'0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  // WBTC
			];

			// CRITICAL: Force check the specific tokens user claims to own
			console.log(`[CacheSync] Force-checking specific tokens for account ${address}`);

			for (const tokenAddress of tokenAddresses) {
				const tokenData = chainTokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
				if (!tokenData) {
					console.warn(`[CacheSync] Token ${tokenAddress} not found in token list`);
					continue;
				}

				try {
					console.log(`[CacheSync] Checking balance for ${tokenData.symbol} at ${tokenData.address}`);

					// Use message passing instead of direct contract call
					// Send request to background service for ERC20 token data
					// Using static import from top of file - dynamic imports break service workers
					const tokenResponse = await sendMessage({
						type: 'GET_TOKEN_BALANCE',
						data: {
							address,
							tokenAddress: tokenData.address,
							chainId
						}
					});

					if (!tokenResponse) {
						console.error(`[CacheSync] No response for token ${tokenData.symbol}`);
						throw new Error('No response from background service');
					}

					if (!tokenResponse.success) {
						console.error(`[CacheSync] Failed to get balance for ${tokenData.symbol}:`, tokenResponse.error);
						throw new Error(tokenResponse.error || 'Failed to get token balance');
					}

					const balance = BigInt(tokenResponse.data.balance || '0');
					const contractDecimals = tokenResponse.data.decimals || tokenData.decimals || 18;
					const contractSymbol = tokenResponse.data.symbol || tokenData.symbol;

					console.log(`[CacheSync] ${tokenData.symbol} balance result:`, {
						balance: balance.toString(),
						contractDecimals,
						contractSymbol,
						isZero: balance === 0n
					});

					const decimals = contractDecimals || tokenData.decimals || 18;

					// Include ALL tokens, even zero balance ones for debugging
					const balanceFormatted = formatUnits(balance.toString(), decimals);
					const tokenEntry = {
						address: tokenData.address,
						symbol: tokenData.symbol,
						name: tokenData.name,
						decimals,
						balance: balanceFormatted,
						isNative: false,
						chainId,
						icon: tokenData.logoURI || tokenData.icon || '🪙',
						price: 0, // Will be set during price sync
						value: 0n // Will be calculated after price sync
					};

					tokenBalances.push(tokenEntry);

					if (balance > 0n) {
						console.log(`[CacheSync] ✅ Found balance for ${tokenData.symbol}: ${balanceFormatted}`);
					} else {
						console.log(`[CacheSync] ⚠️  Zero balance for ${tokenData.symbol}: ${balanceFormatted}`);
					}
				} catch (error) {
					console.error(`[CacheSync] ❌ Error checking ${tokenData.symbol} at ${tokenData.address}:`, error);
					// Add zero balance entry for failed tokens so we can see the issue
					tokenBalances.push({
						address: tokenData.address,
						symbol: tokenData.symbol,
						name: tokenData.name,
						decimals: tokenData.decimals || 18,
						balance: '0',
						isNative: false,
						chainId,
						icon: tokenData.logoURI || tokenData.icon || '🪙',
						error: error.message,
						price: 0,
						value: 0n
					});
				}
			}

			// ALSO check other tokens for completeness
			for (const tokenData of chainTokens) {
				if (tokenData.address === '0x0000000000000000000000000000000000000000') {
					continue; // Skip native token, already handled
				}

				// Skip if we already checked this token
				if (tokenAddresses.includes(tokenData.address)) {
					continue;
				}

				try {
					// Use message passing instead of direct contract call
					// Using static import from top of file - dynamic imports break service workers
					const tokenResponse = await sendMessage({
						type: 'GET_TOKEN_BALANCE',
						data: {
							address,
							tokenAddress: tokenData.address,
							chainId
						}
					});

					if (!tokenResponse) {
						console.error(`[CacheSync] No response for token ${tokenData.symbol}`);
						throw new Error('No response from background service');
					}

					if (!tokenResponse.success) {
						console.error(`[CacheSync] Failed to get balance for ${tokenData.symbol}:`, tokenResponse.error);
						throw new Error(tokenResponse.error || 'Failed to get token balance');
					}

					const balance = BigInt(tokenResponse.data.balance || '0');
					const decimals = tokenData.decimals || 18;

					// Only include tokens with non-zero balance
					if (balance && balance > 0n) {
						const balanceFormatted = formatUnits(balance.toString(), decimals);
						tokenBalances.push({
							address: tokenData.address,
							symbol: tokenData.symbol,
							name: tokenData.name,
							decimals,
							balance: balanceFormatted,
							isNative: false,
							chainId,
							icon: tokenData.logoURI || tokenData.icon || '🪙',
							price: 0,
							value: 0n
						});
						console.debug(`[CacheSync] Found balance for ${tokenData.symbol}: ${balanceFormatted}`);
					}
				} catch (error) {
					// This is expected for tokens the user doesn't hold
					console.debug(`[CacheSync] No balance for ${tokenData.symbol} at ${tokenData.address}`);
				}
			}

			console.log(`[CacheSync] Found ${tokenBalances.length} ERC20 tokens total (including zero balances)`);
			console.log(`[CacheSync] Non-zero balances: ${tokenBalances.filter(t => parseFloat(t.balance) > 0).length}`);
			return tokenBalances;
		} catch (error) {
			console.error('[CacheSync] ERC20 fetch failed:', error);
			return [];
		}
	}

	// Sync token prices for all tokens on a chain
	async syncTokenPrices(chainId: number) {
		try {
			console.log(`[CacheSync] Syncing token prices for chain ${chainId}`);

			// Update prices using existing price manager
			await updateTokenPrices();

			// Get updated prices from token cache store
			const tokenCache = await getYakklTokenCache();

			// Create price map
			const priceMap = new Map<string, number>();

			tokenCache
				.filter((entry) => entry.chainId === chainId)
				.forEach((entry) => {
					priceMap.set(
						entry.tokenAddress.toLowerCase(),
						BigNumberishUtils.toNumber(entry.price || 0)
					);
				});

			// CRITICAL FIX: Get current prices to compare before updating
			const currentCache = walletCacheStore.getCacheSync();
			const currentPrices = new Map<string, number>();

			// Extract current prices from all accounts on this chain
			const chainData = currentCache.chainAccountCache[chainId];
			if (chainData) {
				Object.values(chainData).forEach(accountCache => {
					accountCache.tokens.forEach(token => {
						currentPrices.set(token.address.toLowerCase(), token.price || 0);
					});
				});
			}

			// Only update if prices have actually changed
			const pricesArray = Array.from(priceMap.entries());
			const currentPricesArray = Array.from(currentPrices.entries());

			if (!hasChanged(currentPricesArray, pricesArray)) {
				console.debug(`[CacheSync] Token prices unchanged for chain ${chainId}, skipping price update`);
				return;
			}

			// Update all account caches on this chain
			walletCacheStore.updateTokenPrices(chainId, priceMap);

			console.log(`[CacheSync] Updated prices for ${priceMap.size} tokens on chain ${chainId}`);
		} catch (error) {
			console.warn('[CacheSync] Error syncing token prices:', error);
		}
	}

	// Sync transactions for specific account/chain
	async syncTransactions(chainId: number, address: string) {
		try {
			console.log(`[CacheSync] Syncing transactions for ${address} on chain ${chainId}`);

			// Ensure services are initialized
			this.ensureServicesInitialized();

			const response = await this.transactionService!.getTransactionHistory(address);

			if (response.success && response.data) {
				// Validate we have actual transaction data
				if (!response.data || response.data.length === 0) {
					// Get existing cache to check if this is suspicious
					const cache = walletCacheStore.getAccountCache(chainId, address);
					if (cache?.transactions.transactions.length > 0) {
						console.warn(
							'[CacheSync] Transaction service returned empty but we have existing transactions - SKIPPING',
							{ existingCount: cache.transactions.transactions.length }
						);
						return;
					}
				}

				// Get current last block from cache
				const cache = walletCacheStore.getAccountCache(chainId, address);
				const lastBlock = cache?.transactions.lastBlock || 0;

				// Filter only new transactions
				const newTransactions = response.data.filter((tx) => {
					const txBlockNum = parseInt(tx.blockNumber || '0');
					return txBlockNum > lastBlock && tx.chainId === chainId;
				});

				// CRITICAL FIX: Only update transactions if we actually have new ones
				if (newTransactions.length > 0) {
					const maxBlock = Math.max(
						...newTransactions.map((tx) => parseInt(tx.blockNumber || '0'))
					);
					walletCacheStore.updateTransactions(chainId, address, newTransactions, maxBlock);

					console.log(
						`[CacheSync] Added ${newTransactions.length} new transactions for ${address}`
					);
				} else {
					console.debug('[CacheSync] No new transactions to add, skipping reactive update');
				}
			}
		} catch (error) {
			console.warn('[CacheSync] Error syncing transactions:', error);
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

		// After syncing, ensure rollups are calculated
		// Note: updateAccountRollup is a no-op in v2 (handled by derived stores)
		walletCacheStore.updateAccountRollup(chain.chainId, account.address, {});
	}

	// Start auto-sync timers
	startAutoSync() {
		console.log('[CacheSync] Starting auto-sync');

		// Only start timers in browser environment
		if (!browser) {
			console.log('[CacheSync] Not in browser environment, skipping auto-sync');
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
		console.log('[CacheSync] Stopping auto-sync');

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

		console.log(`[CacheSync] Syncing all ${accounts.length} accounts on chain ${chainId}`);

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

		console.log(`[CacheSync] Syncing account ${address} across ${chains.length} chains`);

		// Sync each chain
		for (const chain of chains) {
			await this.syncTokenBalances(chain.chainId, address);
			await this.syncTransactions(chain.chainId, address);
			await this.syncTokenPrices(chain.chainId);
		}
	}

	// ============= ROLLUP SYNC METHODS =============

	/**
	 * Sync all portfolio rollups
	 * This should be called after major data updates
	 */
	async syncPortfolioRollups() {
		try {
			console.log('[CacheSync] Syncing all portfolio rollups');

			// Calculate all rollups from scratch
			await walletCacheStore.calculateAllRollups();

			console.log('[CacheSync] Portfolio rollups synced successfully');
		} catch (error) {
			console.error('[CacheSync] Failed to sync portfolio rollups:', error);
			// Re-throw the error so callers know it failed
			throw error;
		}
	}

	/**
	 * Sync rollups for a specific account
	 * More efficient than full sync when only one account changes
	 */
	async syncAccountRollups(address: string) {
		try {
			console.debug('[CacheSync] Syncing rollups for account:', address);

			const chain = get(currentChainStore);
			if (chain) {
				walletCacheStore.updateAccountRollup(chain.chainId, address, {});
			}

			console.debug('[CacheSync] Account rollups synced:', address);
		} catch (error) {
			console.error('[CacheSync] Failed to sync account rollups:', error);
		}
	}

	/**
	 * Sync rollups for a specific chain
	 * Called when chain data is updated
	 */
	async syncChainRollups(chainId: number) {
		try {
			console.debug('[CacheSync] Syncing rollups for chain:', chainId);

			walletCacheStore.updateChainRollup(chainId, {});

			console.debug('[CacheSync] Chain rollups synced:', chainId);
		} catch (error) {
			console.error('[CacheSync] Failed to sync chain rollups:', error);
		}
	}

	/**
	 * Sync watch list rollups
	 * Called when watch list changes or includeInPortfolio flags are updated
	 */
	async syncWatchListRollups() {
		try {
			console.debug('[CacheSync] Syncing watch list rollups');

			// This will be handled by calculateAllRollups for now
			// In the future, we can optimize this to only recalculate watch list
			await walletCacheStore.calculateAllRollups();

			console.debug('[CacheSync] Watch list rollups synced');
		} catch (error) {
			console.error('[CacheSync] Failed to sync watch list rollups:', error);
		}
	}

	/**
	 * Sync primary account hierarchy rollups
	 * Called when primary/derived relationships change
	 */
	async syncPrimaryAccountHierarchy() {
		try {
			console.debug('[CacheSync] Syncing primary account hierarchy rollups');

			// This will be handled by calculateAllRollups for now
			// In the future, we can optimize this to only recalculate hierarchies
			await walletCacheStore.calculateAllRollups();

			console.debug('[CacheSync] Primary account hierarchy synced');
		} catch (error) {
			console.error('[CacheSync] Failed to sync primary account hierarchy:', error);
		}
	}

	/**
	 * Smart sync that determines what needs to be updated
	 * Based on what data has changed
	 */
	async smartSync(changes: {
		tokensUpdated?: boolean;
		pricesUpdated?: boolean;
		transactionsUpdated?: boolean;
		accountsChanged?: string[];
		chainsChanged?: number[];
		watchListChanged?: boolean;
	}) {
		try {
			console.debug('[CacheSync] Smart sync initiated', changes);

			// If specific accounts changed, update their rollups
			if (changes.accountsChanged?.length) {
				for (const account of changes.accountsChanged) {
					await this.syncAccountRollups(account);
				}
			}

			// If specific chains changed, update their rollups
			if (changes.chainsChanged?.length) {
				for (const chainId of changes.chainsChanged) {
					await this.syncChainRollups(chainId);
				}
			}

			// If watch list changed, sync watch list rollups
			if (changes.watchListChanged) {
				await this.syncWatchListRollups();
			}

			// If tokens or prices updated extensively, do full sync
			if ((changes.tokensUpdated || changes.pricesUpdated) &&
				!changes.accountsChanged?.length && !changes.chainsChanged?.length) {
				await this.syncPortfolioRollups();
			}

			console.debug('[CacheSync] Smart sync completed');
		} catch (error) {
			console.error('[CacheSync] Smart sync failed:', error);
		}
	}

	/**
	 * Fetch token balances without updating storage
	 * Returns balance data for coordinator to process
	 */
	async fetchTokenBalances(chainId: number, address: string): Promise<Record<string, any>> {
		const balanceData: Record<string, any> = {};

		try {
			console.debug(`[CacheSync] Fetching token balances for ${address} on chain ${chainId}`);

			// Ensure services are initialized
			this.ensureServicesInitialized();

			// Get fresh token data directly from blockchain
			const response = await this.fetchTokensDirectlyFromBlockchain(address, chainId);

			if (response.success && response.data) {
				// Convert to balance map
				for (const token of response.data) {
					const tokenKey = token.address.toLowerCase();
					// Use the balance field which is already in correct units
					balanceData[tokenKey] = token.balance || '0';
				}
			}

			// Always ensure we have native token balance
			if (!balanceData['0x0000000000000000000000000000000000000000']) {
				// Get native balance from background service
				try {
					const response = await sendMessageWithPromise({
						type: 'GET_NATIVE_BALANCE',
						data: { address, chainId }
					});

					if (response.success && response.data) {
						const balance = response.data.balance;
						const balanceFormatted = formatUnits(balance, 18);
						balanceData['0x0000000000000000000000000000000000000000'] = balanceFormatted;
					}
				} catch (error) {
					console.warn(`[CacheSync] Failed to fetch native balance for ${address}`, error);
				}
			}

			console.debug(`[CacheSync] Fetched balances for ${Object.keys(balanceData).length} tokens`);
			return balanceData;
		} catch (error) {
			console.error(`[CacheSync] Error fetching token balances for ${address}`, error);
			return balanceData;
		}
	}
}
