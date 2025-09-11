import { BaseService } from './base.service';
import type { TokenDisplay, ServiceResponse } from '../types';
import type { TokenChange } from '$lib/common/interfaces';
import { get } from 'svelte/store';
import { currentAccount, currentChain, chainStore } from '$lib/stores';
import { yakklCombinedTokenStore, getYakklTokenCache } from '$lib/common/stores';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { BigNumber } from '$lib/common/bignumber';
import { DecimalMath } from '$lib/common/DecimalMath';
import { loadDefaultTokens } from '$lib/managers/tokens/loadDefaultTokens';
import { PriceManager } from '$lib/managers/PriceManager';

export class TokenService extends BaseService {
	private static instance: TokenService;

	private constructor() {
		super('TokenService');
	}

	static getInstance(): TokenService {
		if (!TokenService.instance) {
			TokenService.instance = new TokenService();
		}
		return TokenService.instance;
	}

	async getTokens(address?: string): Promise<ServiceResponse<TokenDisplay[]>> {
		try {
			// Get current chain and account
			const chain = get(currentChain);
			const chainId = chain?.chainId || 1;
			const account = get(currentAccount);

			// Get all chains for name lookup
			const chains = get(chainStore).chains;
			const chainMap = new Map(chains.map((c) => [c.chainId, c]));

			console.log('[TokenService] Getting tokens for chainId:', chainId);

			// Get tokens from store
			let combinedTokens = get(yakklCombinedTokenStore);

			console.log('[TokenService] Combined tokens from store:', combinedTokens);

			if (!combinedTokens || combinedTokens.length === 0) {
				console.log('[TokenService] No tokens found in combined store, loading defaults...');

				// Load default tokens if none exist
				await loadDefaultTokens();

				// Try again after loading defaults
				combinedTokens = get(yakklCombinedTokenStore);
				if (!combinedTokens || combinedTokens.length === 0) {
					// If still no tokens, create a minimal ETH token for display
					const ethToken: TokenDisplay = {
						symbol: 'ETH',
						name: 'Ethereum',
						icon: '/images/eth.svg',
						value: 0,
						qty: 0,
						price: 0,
						address: '0x0000000000000000000000000000000000000000',
						decimals: 18,
						color: 'bg-blue-400',
						chainId: chainId,
						chainName: 'Ethereum Mainnet'
					};
					return { success: true, data: [ethToken] };
				}
			}

			// Filter tokens by current chain
			const chainTokens = combinedTokens.filter(
				(token) => token.chainId === chainId || (!token.chainId && chainId === 1) // Default to mainnet for tokens without chainId
			);

			console.log('[TokenService] Filtered tokens for chain:', chainTokens);

			// Transform to TokenDisplay format
			const preview2Tokens: TokenDisplay[] = await Promise.all(
				chainTokens.map(async (token) => {
					// Convert balance from smallest unit (wei) to token unit using decimals
					// CRITICAL: Preserve existing quantity if no new balance is provided
					let balanceStr = String(token.balance.toString() || token.quantity.toString() || '0');
					let balance = 0n;

					// For ERC20 tokens, use cached balance from storage - NO DIRECT FETCHING
					if (!token.isNative && token.address && token.address !== '0x0000000000000000000000000000000000000000') {
						// CRITICAL: Client should NEVER fetch from blockchain directly
						// Always use cached data from background service
						console.log(`[TokenService] Using cached balance for ${token.symbol} at ${token.address}`);

						// Check if we have cached balance to use
						const quantityStr = BigNumberishUtils.toString(token.quantity.toString() || token.balance.toString() || '0');
						if (quantityStr && BigNumberishUtils.toBigInt(quantityStr) > 0n) {
							// Use the existing quantity from the token
							balance = BigNumberishUtils.toBigInt(quantityStr);
							console.log(`[TokenService] Using cached balance for ${token.symbol}: ${balance}`);
						} else if (balanceStr && !balanceStr.includes('.') && balanceStr.length > 10) {
							// Try to convert wei string to balance
							const decimals = token.decimals || 18;
							balanceStr = BigNumber.fromWei(balanceStr, decimals);
							balance = BigNumberishUtils.toBigInt(balanceStr);
							console.log(`[TokenService] Using converted cached balance for ${token.symbol}: ${balance}`);
						} else if (balanceStr) {
							// Use the balance string as-is
							balance = BigNumberishUtils.toBigInt(balanceStr) || 0n;
							console.log(`[TokenService] Using cached balance string for ${token.symbol}: ${balance}`);
						} else {
							// Only as last resort, and log it as a warning - background service will update soon
							console.warn(`[TokenService] No cached balance available for ${token.symbol}, using 0 (will be updated by background service)`);
							balance = 0n;
						}
					} else {
						// For native tokens or when no address, use existing logic
						// Check if this looks like a wei value (large integer)
						if (balanceStr && !balanceStr.includes('.') && balanceStr.length > 10) {
							// Convert from wei to ETH using BigNumber.fromWei
							const decimals = token.decimals || 18;
							balanceStr = BigNumber.fromWei(balanceStr, decimals);
							balance = BigNumberishUtils.toBigInt(balanceStr);
						} else {
							// Already in ETH units or small value
							balance = BigNumberishUtils.toBigInt(balanceStr);
						}
					}

					console.log(`[TokenService] Processing token ${token.symbol}:`, {
						isNative: token.isNative,
						tokenBalance: token.balance,
						tokenQuantity: token.quantity,
						accountBalance: account?.balance,
						hasAccount: !!account,
						convertedBalance: balance
					});

					// For native token (ETH), use the account balance
					if (token.isNative && account && account.balance) {
						balance = BigNumberishUtils.toBigInt(account.balance);
						console.log(
							`[TokenService] Using account balance for native token ${token.symbol}: ${balance} ETH`
						);
					} else if (token.isNative && (!account || !account.balance)) {
						console.warn(
							`[TokenService] Native token ${token.symbol} but no account balance available`,
							{
								hasAccount: !!account,
								accountAddress: account?.address,
								accountBalance: account?.balance,
								accountData: account
							}
						);
						// CRITICAL: Never fetch directly from blockchain in client
						// The background service will update the balance soon
						if (account?.address) {
							console.log(
								'[TokenService] Native balance not available, waiting for background service update for:',
								account.address
							);
							// Use 0 for now, background service will update it
							balance = 0n;
						}
					}

					let price = token.price?.price || 0;

					// If no price, try to get from cache
					if (price === 0) {
						try {
							const cache = await getYakklTokenCache();
							const cachedEntry = cache.find(
								(c) =>
									c.tokenAddress.toLowerCase() === token.address.toLowerCase() &&
									c.chainId === (token.chainId || chainId)
							);
							price = cachedEntry?.price || 0;

							// If still no price and it's a main token, try to get from price manager
							if (
								price === 0 &&
								['ETH', 'WETH', 'WBTC', 'USDC', 'USDT'].includes(token.symbol.toUpperCase())
							) {
								const priceManager = new PriceManager();
								const pair = `${token.symbol.toUpperCase()}-USD`;
								try {
									// Initialize the price manager before use
									await priceManager.initialize();
									const priceData = await priceManager.getMarketPrice(pair);
									price = priceData.price;
								} catch (err) {
									console.warn(`[TokenService] Could not fetch price for ${pair}:`, err);
									// Use some realistic default prices for main tokens to get UI working
									const defaultPrices: Record<string, number> = {
										ETH: 3579.97,
										WETH: 3579.97,
										WBTC: 97543.21,
										USDC: 1.0,
										USDT: 1.0,
										DAI: 1.0
									};
									price = defaultPrices[token.symbol.toUpperCase()] || 0;
								}
							}
						} catch (error) {
							console.error('[TokenService] Error fetching cached price:', error);
						}
					}

					const value = DecimalMath.of(BigNumberishUtils.toString(balance)).mul(price).toNumber();

					console.log(
						`[TokenService] Token ${token.symbol}: balance=${balance}, price=${price}, value=${value}`
					);

					const chainInfo = chainMap.get(token.chainId || chainId);
					const chainName = chainInfo
						? `${chainInfo.name} ${chainInfo.network || ''}`.trim()
						: `Network ${token.chainId || chainId}`;

					return {
						symbol: token.symbol,
						name: token.name,
						icon: token.logoURI || this.getDefaultIcon(token.symbol),
						value: value,
						qty: balance,
						balance: balance, // Add balance field with converted ETH value
						quantity: balance.toString(), // String version for display
						price: price,
						change24h: token.change ? this.getTokenChange24h(token.change) : undefined,
						address: token.address,
						decimals: token.decimals,
						color: this.getTokenColor(token.symbol),
						chainId: token.chainId,
						chainName: chainName,
						isNative: token.isNative || false
					};
				})
			);

			// Filter tokens - show all tokens with balance OR the main tokens (ETH, WETH, WBTC, stablecoins)
			const mainTokens = ['ETH', 'WETH', 'WBTC', 'USDT', 'USDC', 'DAI'];
			const activeTokens = preview2Tokens.filter(
				(t) =>
					BigNumberishUtils.compare(t.qty, 0) > 0 || mainTokens.includes(t.symbol.toUpperCase())
			);

			// Sort by value descending, but put zero-value main tokens at the end
			activeTokens.sort((a, b) => {
				// Convert values to numbers for comparison
				// Use safe conversion for potentially large token values
				const aValue = typeof a.value === 'number' ? a.value : BigNumberishUtils.toNumberSafe(a.value || 0);
				const bValue = typeof b.value === 'number' ? b.value : BigNumberishUtils.toNumberSafe(b.value || 0);

				if (aValue === 0 && bValue === 0) {
					// Both have zero value, sort main tokens first
					const aIsMain = mainTokens.includes(a.symbol.toUpperCase());
					const bIsMain = mainTokens.includes(b.symbol.toUpperCase());
					if (aIsMain && !bIsMain) return -1;
					if (!aIsMain && bIsMain) return 1;
					return 0;
				}
				return bValue - aValue;
			});

			console.log('[TokenService] Active tokens:', activeTokens);
			return { success: true, data: activeTokens };
		} catch (error) {
			return {
				success: false,
				error: this.handleError(error)
			};
		}
	}

	async getMultiChainTokens(
		address: string,
		chainIds?: number[]
	): Promise<ServiceResponse<TokenDisplay[]>> {
		try {
			// Get supported chains
			const chains = get(chainStore).chains;

			// If no chainIds specified, get tokens from all chains
			const targetChains = chainIds || chains.map((c) => c.chainId);

			console.log('[TokenService] Getting multi-network tokens for chains:', targetChains);

			// Aggregate tokens from all chains
			const allTokens: TokenDisplay[] = [];

			for (const chainId of targetChains) {
				const response = await this.sendMessage<any[]>({
					type: 'yakkl_getTokensForChain',
					payload: { address, chainId }
				});

				if (response.success && response.data) {
					const chainTokens = response.data.map((token) => ({
						...this.transformToTokenDisplay(token),
						chainId: chainId
					}));
					allTokens.push(...chainTokens);
				}
			}

			// Group tokens by symbol and aggregate values
			const aggregatedTokens = this.aggregateTokensBySymbol(allTokens);

			console.log('[TokenService] Aggregated multi-network tokens:', aggregatedTokens);
			return { success: true, data: aggregatedTokens };
		} catch (error) {
			return {
				success: false,
				error: this.handleError(error)
			};
		}
	}

	private aggregateTokensBySymbol(tokens: TokenDisplay[]): TokenDisplay[] {
		const tokenMap = new Map<string, TokenDisplay>();

		for (const token of tokens) {
			const key = token.symbol.toUpperCase();
			if (tokenMap.has(key)) {
				const existing = tokenMap.get(key)!;
				// Aggregate quantities and values using BigNumber methods
				existing.qty = BigNumberishUtils.add(existing.qty, token.qty);
				// Convert values to numbers before adding
				const existingValue =
					typeof existing.value === 'number'
						? existing.value
						: BigNumberishUtils.toNumberSafe(existing.value || 0);
				const tokenValue =
					typeof token.value === 'number'
						? token.value
						: BigNumberishUtils.toNumberSafe(token.value || 0);
				existing.value = existingValue + tokenValue;
				// Keep the same price (should be similar across chains)
				existing.price = token.price || existing.price;
			} else {
				tokenMap.set(key, { ...token });
			}
		}

		return Array.from(tokenMap.values());
	}

	private transformToTokenDisplay(token: any): TokenDisplay {
		// Convert balance from smallest unit (wei) to token unit using decimals
		// CRITICAL: Preserve existing quantity if no new balance is provided
		let balanceStr = String(token.balance || token.quantity || '0');
		let balance = 0n;

		// Check if this looks like a wei value (large integer)
		if (balanceStr && !balanceStr.includes('.') && balanceStr.length > 10) {
			// Convert from wei to token unit using decimals
			const decimals = token.decimals || 18;
			balanceStr = BigNumber.fromWei(balanceStr, decimals);
			balance = BigNumberishUtils.toBigInt(balanceStr);
		} else {
			// Already in token units or small value
			balance = BigNumberishUtils.toBigInt(balanceStr);
		}

		const price = token.price?.price || 0;
		const value = balance * price;

		return {
			symbol: token.symbol,
			name: token.name,
			icon: token.logoURI || this.getDefaultIcon(token.symbol),
			value: value,
			qty: balance,
			balance: balance, // Add balance field with converted ETH value
			quantity: balance.toString(), // String version for display
			price: price,
			change24h: token.change ? this.getTokenChange24h(token.change) : undefined,
			address: token.address,
			decimals: token.decimals,
			color: this.getTokenColor(token.symbol),
			chainId: token.chainId,
			chainName: token.chainName, // Pass through if available
			isNative: token.isNative || false
		};
	}

	async getTokenBalance(
		tokenAddress: string,
		walletAddress: string
	): Promise<ServiceResponse<string>> {
		try {
			console.log(`[TokenService] getTokenBalance - requesting from background for token: ${tokenAddress}, wallet: ${walletAddress}`);

			// CRITICAL: Client must NEVER make direct blockchain calls
			// Always route through background service
			const response = await this.sendMessage<string>({
				type: 'yakkl_getTokenBalance',
				payload: {
					tokenAddress,
					walletAddress,
					chainId: get(currentChain)?.chainId || 1
				}
			});

			console.log(`[TokenService] Background response:`, response);
			return response;
		} catch (error) {
			console.error('[TokenService] getTokenBalance error:', error);
			return {
				success: false,
				error: this.handleError(error)
			};
		}
	}

	async refreshTokenPrices(): Promise<ServiceResponse<boolean>> {
		try {
			// Request price refresh from background service
			console.log('[TokenService] Requesting price refresh from background service');

			const response = await this.sendMessage<boolean>({
				type: 'yakkl_refreshTokenPrices',
				payload: {}
			});

			if (response.success) {
				console.log('[TokenService] Price refresh requested successfully');
				// The background service will update the stores, which will trigger reactive updates
			}

			return response;
		} catch (error) {
			return {
				success: false,
				error: this.handleError(error)
			};
		}
	}

	private getDefaultIcon(symbol: string): string {
		// Map common tokens to emojis or default icons
		const iconMap: Record<string, string> = {
			ETH: '/images/eth.svg',
			BTC: '/images/bitcoin.svg',
			USDT: '💵',
			USDC: '💰',
			DAI: '🏦',
			LINK: '🔗',
			UNI: '🦄',
			AAVE: '👻',
			COMP: '🏛️',
			MKR: '🏭',
			SUSHI: '🍣',
			YFI: '🌾',
			PEPE: '🐸'
		};

		return iconMap[symbol.toUpperCase()] || '🪙';
	}

	private getTokenColor(symbol: string): string {
		// Map tokens to colors for visual distinction
		const colorMap: Record<string, string> = {
			ETH: 'bg-blue-400',
			BTC: 'bg-orange-400',
			USDT: 'bg-green-400',
			USDC: 'bg-blue-500',
			DAI: 'bg-yellow-400',
			LINK: 'bg-indigo-400',
			UNI: 'bg-pink-400',
			AAVE: 'bg-purple-400',
			COMP: 'bg-teal-400',
			MKR: 'bg-cyan-400',
			SUSHI: 'bg-rose-400',
			YFI: 'bg-amber-400',
			PEPE: 'bg-green-500'
		};

		return colorMap[symbol.toUpperCase()] || 'bg-gray-400';
	}

	private getTokenChange24h(changes: TokenChange[]): number | undefined {
		const change24h = changes.find((c) => c.timeline === '24h');
		return change24h?.percentChange
			? BigNumberishUtils.toNumber(change24h.percentChange)
			: undefined;
	}

	/**
	 * Stop the token service and cleanup resources
	 */
	async stop(): Promise<void> {
		console.log('[TokenService] Stopping service...');
		// Add any cleanup logic here if needed
		// For now, just log that we're stopping
		// In the future, could clear intervals, subscriptions, etc.
	}
}
