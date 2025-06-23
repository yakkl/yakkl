/* eslint-disable @typescript-eslint/no-explicit-any */
// balanceUtils.ts
import type { SwapToken } from '$lib/common/interfaces';
import type { Provider } from '$managers/Provider';
import type { TokenService } from '$lib/managers/blockchains/evm/TokenService';
import { log } from '$lib/managers/Logger';

// Helper function to determine if an error should be shown to the user
function shouldShowErrorToUser(error: any): boolean {
	const errorMessage = error?.message || error?.toString() || '';

	// Network/API errors that should be handled silently
	const networkErrors = [
		'missing response',
		'timeout',
		'TIMEOUT',
		'SERVER_ERROR',
		'NETWORK_ERROR',
		'Failed to fetch',
		'fetch',
		'Connection failed',
		'Request timeout',
		'eth_getBalance',
		'call revert exception',
		'alchemy.com',
		'infura.io',
		'requestBody',
		'serverError',
		'code=SERVER_ERROR',
		'version=web/',
		'JsonRpcError',
		'RPC Error',
		'getBalance',
		'Balance fetch'
	];

	return !networkErrors.some((pattern) =>
		errorMessage.toLowerCase().includes(pattern.toLowerCase())
	);
}

export async function getTokenBalance(
	token: SwapToken,
	address: string,
	provider: Provider | null,
	tokenService: TokenService<any> | null // TokenService and may want to change this for specific blockchain
): Promise<bigint> {
	// Needs a better return type. It needs to be a BigNumberish plus a code and message. This would allow for 0n to be returned and for the code and message to be used to determine if there was an error or not
	try {
		if (!token) return 0n;
		if (token.isNative) {
			// token.isNative needs to be implemented!
			if (!provider) return 0n;
			const retBal = await provider.getBalance(address);
			token.balance = retBal;

			// Update cache with native token balance
			const { balanceCacheManager } = await import('$lib/managers/BalanceCacheManager');
			const { yakklPricingStore } = await import('$lib/common/stores');
			const { get } = await import('svelte/store');
			const currentPrice = get(yakklPricingStore)?.price;
			if (currentPrice) {
				balanceCacheManager.setCachedBalance(address, retBal, currentPrice);
			}

			return retBal;
		}

		if (!tokenService) return 0n;
		const retBal = await tokenService.getBalance(token.address, address); // address is the user's address. This checks the contract to see if it has the given userAddress registered and if it has a balance
		token.balance = retBal;

		// Update cache with token balance (for non-native tokens)
		// Note: This is for individual token balances, not ETH balance
		// You may want to create a separate token balance cache if needed

		return retBal;
	} catch (error) {
		// Only log non-network errors, suppress network timeouts
		if (shouldShowErrorToUser(error)) {
			log.error('getTokenBalance - error', false, error);
		}
		return 0n;
	}
}
