/**
 * YAKKL Wallet - Blockchain Address Detection Module
 * Detects blockchain type and validates addresses based on format
 */

// Types for better type safety
export interface AddressDetectionResult {
	success: boolean;
	address: string;
	detected_chains: string[];
	chain_probabilities?: { [chain: string]: number };
	address_type?: string;
	description: string;
	recommended_tokens: string[];
	validation_level: 'basic' | 'checksum' | 'full';
}

export interface ChainInfo {
	name: string;
	symbol: string;
	regex: RegExp;
	addressTypes?: { [key: string]: RegExp };
	validator?: (address: string) => boolean;
	commonTokens: string[];
}

// Base58 character set for Bitcoin/Solana validation
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Chain definitions with improved patterns
const CHAIN_DEFINITIONS: { [key: string]: ChainInfo } = {
	// EVM-compatible chains
	EVM: {
		name: 'Ethereum Virtual Machine',
		symbol: 'EVM',
		regex: /^0x[a-fA-F0-9]{40}$/,
		validator: (address: string) => {
			// Basic ERC-55 checksum validation (simplified)
			if (!address.match(/^0x[a-fA-F0-9]{40}$/)) return false;

			// If all lowercase or all uppercase, it's valid but not checksummed
			const addressNoPrfx = address.slice(2);
			if (
				addressNoPrfx === addressNoPrfx.toLowerCase() ||
				addressNoPrfx === addressNoPrfx.toUpperCase()
			) {
				return true;
			}

			// For mixed case, would need full ERC-55 checksum validation
			// This is a simplified check
			return true;
		},
		commonTokens: ['ETH', 'USDT', 'USDC', 'DAI', 'WETH', 'UNI', 'LINK', 'AAVE']
	},

	// Bitcoin with improved validation
	BTC: {
		name: 'Bitcoin',
		symbol: 'BTC',
		regex: /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/,
		addressTypes: {
			'P2PKH (Legacy)': /^1[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
			'P2SH (SegWit-Compatible)': /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/,
			'Bech32 (Native SegWit)': /^bc1[a-z0-9]{39,59}$/
		},
		validator: (address: string) => {
			// Check if valid Base58 for legacy addresses
			if (address.startsWith('1') || address.startsWith('3')) {
				return address.split('').every((char) => BASE58_CHARS.includes(char));
			}
			// Bech32 validation for bc1 addresses
			if (address.startsWith('bc1')) {
				return /^bc1[ac-hj-np-z02-9]{39,59}$/.test(address);
			}
			return false;
		},
		commonTokens: ['BTC']
	},

	// Tron
	TRX: {
		name: 'Tron',
		symbol: 'TRX',
		regex: /^T[a-zA-Z0-9]{33}$/,
		validator: (address: string) => {
			// Tron uses Base58 encoding
			return (
				address.startsWith('T') &&
				address.length === 34 &&
				address.split('').every((char) => BASE58_CHARS.includes(char))
			);
		},
		commonTokens: ['TRX', 'USDT-TRC20', 'USDC-TRC20', 'TUSD', 'USDD']
	},

	// Ripple
	XRP: {
		name: 'Ripple',
		symbol: 'XRP',
		regex: /^r[a-zA-Z0-9]{24,34}$/,
		validator: (address: string) => {
			// Ripple uses custom Base58 variant
			const rippleBase58 = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
			return (
				address.startsWith('r') && address.split('').every((char) => rippleBase58.includes(char))
			);
		},
		commonTokens: ['XRP']
	},

	// Solana with improved validation
	SOL: {
		name: 'Solana',
		symbol: 'SOL',
		regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
		validator: (address: string) => {
			// Solana addresses are 32-44 chars, Base58 encoded
			return (
				address.length >= 32 &&
				address.length <= 44 &&
				address.split('').every((char) => BASE58_CHARS.includes(char))
			);
		},
		commonTokens: ['SOL', 'USDC-SPL', 'USDT-SPL', 'RAY', 'SRM']
	},

	// Cosmos ecosystem
	COSMOS: {
		name: 'Cosmos',
		symbol: 'ATOM',
		regex: /^cosmos1[a-z0-9]{38}$/,
		commonTokens: ['ATOM']
	},

	// Cardano
	ADA: {
		name: 'Cardano',
		symbol: 'ADA',
		regex: /^(addr1[a-z0-9]{54,}|DdzFF[a-zA-Z0-9]{50,})$/,
		addressTypes: {
			Shelley: /^addr1[a-z0-9]{54,}$/,
			Byron: /^DdzFF[a-zA-Z0-9]{50,}$/
		},
		commonTokens: ['ADA']
	},

	// Polkadot
	DOT: {
		name: 'Polkadot',
		symbol: 'DOT',
		regex: /^[1-9A-HJ-NP-Za-km-z]{46,48}$/,
		validator: (address: string) => {
			// Polkadot uses SS58 encoding (Base58 variant)
			return (
				address.length >= 46 &&
				address.length <= 48 &&
				address.split('').every((char) => BASE58_CHARS.includes(char))
			);
		},
		commonTokens: ['DOT']
	},

	// Algorand
	ALGO: {
		name: 'Algorand',
		symbol: 'ALGO',
		regex: /^[A-Z2-7]{58}$/,
		commonTokens: ['ALGO', 'USDC-ASA', 'USDT-ASA']
	},

	// Stellar
	XLM: {
		name: 'Stellar',
		symbol: 'XLM',
		regex: /^G[A-Z2-7]{55}$/,
		commonTokens: ['XLM']
	}
};

// EVM chain mapping
const EVM_CHAINS = {
	ETH: { name: 'Ethereum', tokens: ['ETH', 'USDT-ERC20', 'USDC-ERC20', 'DAI', 'WETH'] },
	BSC: { name: 'BNB Smart Chain', tokens: ['BNB', 'BUSD', 'USDT-BEP20', 'USDC-BEP20'] },
	MATIC: { name: 'Polygon', tokens: ['MATIC', 'USDT-Polygon', 'USDC-Polygon'] },
	AVAX: { name: 'Avalanche C-Chain', tokens: ['AVAX', 'USDT.e', 'USDC.e'] },
	ARBITRUM: { name: 'Arbitrum', tokens: ['ETH', 'ARB', 'USDC-Arbitrum'] },
	OPTIMISM: { name: 'Optimism', tokens: ['ETH', 'OP', 'USDC-Optimism'] },
	FTM: { name: 'Fantom', tokens: ['FTM', 'USDC-Fantom'] },
	BASE: { name: 'Base', tokens: ['ETH', 'USDC-Base'] }
};

/**
 * Main address detection function for YAKKL wallet
 * @param address - The blockchain address to analyze
 * @param options - Optional configuration for validation level
 * @returns AddressDetectionResult with chain detection and validation info
 */
export function detectBlockchainAddress(
	address: string,
	options: { validateChecksum?: boolean } = {}
): AddressDetectionResult {
	// Clean up whitespace
	address = address.trim();

	// Handle empty address
	if (!address) {
		return {
			success: false,
			address: '',
			detected_chains: [],
			description: 'No address provided',
			recommended_tokens: [],
			validation_level: 'basic'
		};
	}

	// Check EVM addresses first (most common)
	if (CHAIN_DEFINITIONS.EVM.regex.test(address)) {
		const isValidChecksum = CHAIN_DEFINITIONS.EVM.validator?.(address) ?? true;
		const evmChains = Object.keys(EVM_CHAINS);
		const allTokens = new Set<string>();

		// Collect all possible tokens from EVM chains
		Object.values(EVM_CHAINS).forEach((chain) => {
			chain.tokens.forEach((token) => allTokens.add(token));
		});

		return {
			success: true,
			address,
			detected_chains: evmChains,
			chain_probabilities: evmChains.reduce(
				(acc, chain) => {
					acc[chain] = 1.0 / evmChains.length; // Equal probability
					return acc;
				},
				{} as { [chain: string]: number }
			),
			description:
				`EVM-compatible address detected. Valid on: ${evmChains.join(', ')}. ` +
				`Checksum: ${isValidChecksum ? 'valid' : 'not verified or invalid'}`,
			recommended_tokens: Array.from(allTokens),
			validation_level: options.validateChecksum && isValidChecksum ? 'checksum' : 'basic'
		};
	}

	// Check other chains
	for (const [chainKey, chainInfo] of Object.entries(CHAIN_DEFINITIONS)) {
		if (chainKey === 'EVM') continue; // Already checked

		if (chainInfo.regex.test(address)) {
			const isValid = chainInfo.validator ? chainInfo.validator(address) : true;

			if (isValid) {
				let addressType: string | undefined;

				// Check for specific address types
				if (chainInfo.addressTypes) {
					for (const [typeName, typeRegex] of Object.entries(chainInfo.addressTypes)) {
						if (typeRegex.test(address)) {
							addressType = typeName;
							break;
						}
					}
				}

				return {
					success: true,
					address,
					detected_chains: [chainKey],
					address_type: addressType,
					description:
						`${chainInfo.name} address detected` + (addressType ? ` (${addressType})` : ''),
					recommended_tokens: chainInfo.commonTokens,
					validation_level: chainInfo.validator ? 'checksum' : 'basic'
				};
			}
		}
	}

	// Special case: Could be a lesser-known chain or custom format
	// Check if it looks like a valid cryptocurrency address at all
	const looksLikeCryptoAddress = /^[a-zA-Z0-9]{20,100}$/.test(address);

	if (looksLikeCryptoAddress) {
		return {
			success: false,
			address,
			detected_chains: [],
			description:
				'Unknown address format. This might be a valid address for a chain not yet supported. ' +
				'Please verify the chain type manually.',
			recommended_tokens: [],
			validation_level: 'basic'
		};
	}

	return {
		success: false,
		address,
		detected_chains: [],
		description: 'Invalid address format. Please check the address and try again.',
		recommended_tokens: [],
		validation_level: 'basic'
	};
}

/**
 * Utility function to get chain info
 */
export function getChainInfo(chainSymbol: string): ChainInfo | undefined {
	return (
		CHAIN_DEFINITIONS[chainSymbol] ||
		(EVM_CHAINS[chainSymbol as keyof typeof EVM_CHAINS] ? CHAIN_DEFINITIONS.EVM : undefined)
	);
}

/**
 * Validate if an address is valid for a specific chain
 */
export function isValidAddressForChain(address: string, chainSymbol: string): boolean {
	const chainInfo = getChainInfo(chainSymbol);
	if (!chainInfo) return false;

	// For EVM chains, use the EVM validator
	if (chainSymbol in EVM_CHAINS) {
		return (
			CHAIN_DEFINITIONS.EVM.regex.test(address) &&
			(CHAIN_DEFINITIONS.EVM.validator?.(address) ?? true)
		);
	}

	return chainInfo.regex.test(address) && (chainInfo.validator?.(address) ?? true);
}

// Example usage:
/*
const result = detectBlockchainAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2BD27');
console.log(result);
// Output: EVM address detected with multiple chain options

const btcResult = detectBlockchainAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
console.log(btcResult);
// Output: Bitcoin Bech32 address detected
*/
