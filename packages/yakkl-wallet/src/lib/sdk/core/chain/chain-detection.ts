// SDK Core Chain Detection Utilities
// Simplified version without Svelte dependencies for SDK use

import type { ChainResolutionResult, ChainConfig, ChainActivity } from './chain-resolver';
import { resolveChainForAddress, saveChainSelection } from './chain-resolver';

// Re-export types
export type {
	ChainConfig,
	ChainActivity,
	ChainResolutionResult
} from './chain-resolver';

// Export the core functions
export {
	resolveChainForAddress,
	saveChainSelection,
} from './chain-resolver';

// Enhanced chain detection with basic caching
const chainResolutionCache = new Map<string, ChainResolutionResult>();

export async function detectAndResolveChain(
	address: string,
	options: {
		useCache?: boolean;
		quickMode?: boolean;
		forceRefresh?: boolean;
		currentNetwork?: string;
	} = {}
): Promise<ChainResolutionResult | null> {
	// Check cache first
	if (options.useCache && !options.forceRefresh) {
		const cached = chainResolutionCache.get(address);
		if (cached) {
			return cached;
		}
	}

	// Detect basic format
	const detection = detectBlockchainAddress(address);
	if (!detection.success) {
		return null;
	}

	// For non-EVM addresses, return simple result
	if (!detection.detected_chains.includes('ETH')) {
		const result: ChainResolutionResult = {
			address,
			detectedFormat: detection,
			probableChains: detection.detected_chains.map((chain) => ({
				chain,
				confidence: 1.0,
				reason: 'Unique address format'
			})),
			recommendedChain: detection.detected_chains[0],
			allPossibleChains: detection.detected_chains
		};

		// Update cache
		chainResolutionCache.set(address, result);

		return result;
	}

	// For EVM addresses, do full resolution
	const result = await resolveChainForAddress(address, {
		quickMode: options.quickMode,
		checkOnChain: !options.quickMode,
		userContext: {
			currentNetwork: options.currentNetwork
		}
	});

	// Update cache
	chainResolutionCache.set(address, result);

	return result;
}

// Basic address format detection
function detectBlockchainAddress(address: string): {
	success: boolean;
	detected_chains: string[];
	address_type?: string;
} {
	// Ethereum/EVM addresses
	if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
		return {
			success: true,
			detected_chains: ['ETH', 'POLYGON', 'BASE', 'OPTIMISM', 'ARBITRUM'],
			address_type: 'ethereum'
		};
	}

	// Bitcoin addresses
	if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address)) {
		return {
			success: true,
			detected_chains: ['BTC'],
			address_type: 'bitcoin'
		};
	}

	// Solana addresses
	if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
		return {
			success: true,
			detected_chains: ['SOL'],
			address_type: 'solana'
		};
	}

	return {
		success: false,
		detected_chains: []
	};
}

// Clear cache utility
export function clearChainCache(): void {
	chainResolutionCache.clear();
}

// Get cache size
export function getCacheSize(): number {
	return chainResolutionCache.size;
}