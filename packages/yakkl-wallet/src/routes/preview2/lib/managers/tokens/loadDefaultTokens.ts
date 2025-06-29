import type { TokenData, MarketPriceData } from '$lib/common/interfaces'; // Assume the minimal TokenData interface is in a file
import { setYakklTokenDataStorage } from '$lib/common/stores';
import { log } from '$managers/Logger';
import defaultTokens from '$managers/tokens/defaultTokens.json';

/**
 * Load default tokens from JSON and populate setYakklTokensStorage.
 */
export async function loadDefaultTokens(): Promise<void> {
	try {
		// Validate and transform each token from JSON
		console.log('>>>> loadDefaultTokens');

		const tokens: TokenData[] = defaultTokens.map((token: any) => {
			if (!validateToken(token)) {
				throw new Error(`Invalid token data: ${JSON.stringify(token)}`);
			}
			return {
				address: token.address,
				name: token.name,
				symbol: token.symbol,
				decimals: token.decimals,
				chainId: token.chainId,
				isNative: token.isNative ?? false,
				isStablecoin: token.isStablecoin ?? false,
				logoURI: token.logoURI ?? '',
				description: token.description ?? '',
				balance: token.balance ?? 0n,
				quantity: token.quantity ?? 0,
				price:
					token.price ??
					({
						price: token.price?.price ?? 0,
						isNative: token.price?.isNative ?? false,
						provider: token.price?.provider ?? '',
						lastUpdated: token.price?.lastUpdated ?? 0,
						chainId: token.price?.chainId ?? 1,
						currency: token.price?.currency ?? '',
						status: token.price?.status ?? '',
						message: token.price?.message ?? ''
					} as MarketPriceData),
				change: token.change ?? [],
				value: token.value ?? 0,
				tags: token.tags ?? [],
				version: token.version ?? '',
				customDefault: 'default',
				sidepanel: token.sidepanel ?? true,
				evmCompatible: token.evmCompatible ?? true,
				url: token.url ?? ''
			};
		});

		// Update the storage and store
		await setYakklTokenDataStorage(tokens);

		// Log success information
		log.info(`Successfully loaded ${tokens.length} default tokens`, false, {
			tokenSymbols: tokens.map((t) => t.symbol)
		});
	} catch (error) {
		log.warn('Failed to load default tokens:', false, error);
	}
}

/**
 * Validate token data to ensure it matches the expected structure.
 */
function validateToken(token: any): boolean {
	// Partial validation to ensure required fields are present
	return (
		typeof token.address === 'string' &&
		typeof token.name === 'string' &&
		typeof token.symbol === 'string' &&
		typeof token.decimals === 'number' &&
		typeof token.chainId === 'number' &&
		typeof token.logoURI === 'string'
	);
}

// Example default token JSON structure for ChainLink
// {
//   "name": "ChainLink Token",
//   "address": "0x514910771AF9Ca656af840dff83E8264EcF986CA",
//   "symbol": "LINK",
//   "decimals": 18,
//   "chainId": 1,
//   "isNative": false,
//   "isStablecoin": false,
//   "url": "https://etherscan.io/token/0x514910771AF9Ca656af840dff83E8264EcF986CA",
//   "logoURI": "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png"
// },
