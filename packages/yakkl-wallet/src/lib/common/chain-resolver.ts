/**
 * YAKKL Wallet - Advanced Chain Resolution for EVM Addresses
 * Strategies to determine the most likely chain for a given address
 */

import { detectBlockchainAddress, type AddressDetectionResult } from './address-detector';

// Chain configuration with RPC endpoints and explorers
export interface ChainConfig {
	chainId: number;
	name: string;
	symbol: string;
	rpcUrl: string;
	explorerApi?: string;
	nativeCurrency: string;
	priority: number; // Higher = more likely to be checked first
}

// Activity data for an address on a specific chain
export interface ChainActivity {
	chain: string;
	hasActivity: boolean;
	balance: string;
	nonce: number;
	isContract: boolean;
	lastActivity?: Date;
	tokenCount?: number;
}

// Resolution result
export interface ChainResolutionResult {
	address: string;
	detectedFormat: AddressDetectionResult;
	probableChains: {
		chain: string;
		confidence: number;
		activity?: ChainActivity;
		reason: string;
	}[];
	recommendedChain?: string;
	allPossibleChains: string[];
}

// Common EVM chain configurations
export const EVM_CHAIN_CONFIGS: { [key: string]: ChainConfig } = {
	ETH: {
		chainId: 1,
		name: 'Ethereum Mainnet',
		symbol: 'ETH',
		rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
		explorerApi: 'https://api.etherscan.io/api',
		nativeCurrency: 'ETH',
		priority: 100
	},
	BASE: {
		chainId: 8453,
		name: 'Base',
		symbol: 'BASE',
		rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
		explorerApi: 'https://api.basescan.org/api',
		nativeCurrency: 'ETH',
		priority: 90
	},
	ARBITRUM: {
		chainId: 42161,
		name: 'Arbitrum One',
		symbol: 'ARB',
		rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY',
		explorerApi: 'https://api.arbiscan.io/api',
		nativeCurrency: 'ETH',
		priority: 85
	},
	OPTIMISM: {
		chainId: 10,
		name: 'Optimism',
		symbol: 'OP',
		rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/YOUR_KEY',
		explorerApi: 'https://api-optimistic.etherscan.io/api',
		nativeCurrency: 'ETH',
		priority: 80
	},
	MATIC: {
		chainId: 137,
		name: 'Polygon',
		symbol: 'MATIC',
		rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
		explorerApi: 'https://api.polygonscan.com/api',
		nativeCurrency: 'MATIC',
		priority: 75
	},
	BSC: {
		chainId: 56,
		name: 'BNB Smart Chain',
		symbol: 'BSC',
		rpcUrl: 'https://bsc-dataseed.binance.org',
		explorerApi: 'https://api.bscscan.com/api',
		nativeCurrency: 'BNB',
		priority: 70
	},
	AVAX: {
		chainId: 43114,
		name: 'Avalanche C-Chain',
		symbol: 'AVAX',
		rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
		explorerApi: 'https://api.snowtrace.io/api',
		nativeCurrency: 'AVAX',
		priority: 60
	}
};

/**
 * Strategy 1: Check on-chain activity across multiple chains
 * This is the most reliable but requires RPC calls
 */
async function checkOnChainActivity(
	address: string,
	chains: string[] = Object.keys(EVM_CHAIN_CONFIGS)
): Promise<ChainActivity[]> {
	const activities: ChainActivity[] = [];

	// In a real implementation, you would:
	// 1. Make parallel RPC calls to each chain
	// 2. Check balance, nonce, and code (for contracts)
	// 3. Potentially check recent transactions

	// Simulated implementation:
	const checkChain = async (chainSymbol: string): Promise<ChainActivity> => {
		const config = EVM_CHAIN_CONFIGS[chainSymbol];

		// This would be actual RPC calls in production
		// Example with ethers.js:
		/*
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const balance = await provider.getBalance(address);
    const nonce = await provider.getTransactionCount(address);
    const code = await provider.getCode(address);

    return {
      chain: chainSymbol,
      hasActivity: balance > 0n || nonce > 0,
      balance: balance.toString(),
      nonce: nonce,
      isContract: code !== '0x',
      lastActivity: nonce > 0 ? new Date() : undefined
    };
    */

		// Simulated response
		return {
			chain: chainSymbol,
			hasActivity: Math.random() > 0.7,
			balance: '0',
			nonce: 0,
			isContract: false
		};
	};

	// Check chains in parallel, prioritized by likelihood
	const sortedChains = chains.sort(
		(a, b) => (EVM_CHAIN_CONFIGS[b]?.priority || 0) - (EVM_CHAIN_CONFIGS[a]?.priority || 0)
	);

	const promises = sortedChains.map((chain) => checkChain(chain));
	const results = await Promise.allSettled(promises);

	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			activities.push(result.value);
		}
	});

	return activities;
}

/**
 * Strategy 2: Use local storage or user preferences
 */
interface UserPreferences {
	defaultChain?: string;
	recentChains: { chain: string; lastUsed: Date }[];
	addressChainHistory: { [address: string]: string[] };
}

function getUserChainPreferences(address: string): UserPreferences {
	// In a real implementation, load from localStorage or user settings
	const stored = localStorage.getItem('yakkl_chain_preferences');
	if (stored) {
		return JSON.parse(stored);
	}

	return {
		recentChains: [],
		addressChainHistory: {}
	};
}

/**
 * Strategy 3: Smart heuristics based on address patterns
 */
function getChainHeuristics(address: string): { [chain: string]: number } {
	const scores: { [chain: string]: number } = {};

	// Some heuristic examples:
	// 1. Addresses with many zeros might be vanity addresses on mainnet
	const zeroCount = (address.match(/0/g) || []).length;
	if (zeroCount > 20) {
		scores['ETH'] = 0.7;
	}

	// 2. Check if it matches known contract addresses
	const knownContracts: { [address: string]: string[] } = {
		'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': ['ETH'], // USDC on Ethereum
		'0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d': ['BSC'], // USDC on BSC
		'0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': ['MATIC'] // USDC on Polygon
		// Add more known contracts
	};

	const lowerAddress = address.toLowerCase();
	if (knownContracts[lowerAddress]) {
		knownContracts[lowerAddress].forEach((chain) => {
			scores[chain] = 1.0;
		});
	}

	return scores;
}

/**
 * Strategy 4: ENS and domain resolution
 */
async function checkDomainResolution(address: string): Promise<string[]> {
	// Check various naming services
	// ENS primarily indicates Ethereum, but also works on some L2s

	// In production, you'd resolve ENS, Unstoppable Domains, etc.
	// This is a placeholder
	return [];
}

/**
 * Main resolution function combining all strategies
 */
export async function resolveChainForAddress(
	address: string,
	options: {
		checkOnChain?: boolean;
		quickMode?: boolean;
		userContext?: {
			recentTransaction?: { chain: string; timestamp: Date };
			currentNetwork?: string;
		};
	} = {}
): Promise<ChainResolutionResult> {
	// First, detect the basic format
	const formatDetection = detectBlockchainAddress(address);

	// If not an EVM address, return the detection result
	if (!formatDetection.detected_chains.includes('ETH')) {
		return {
			address,
			detectedFormat: formatDetection,
			probableChains: formatDetection.detected_chains.map((chain) => ({
				chain,
				confidence: 1.0,
				reason: 'Unique address format for this chain'
			})),
			recommendedChain: formatDetection.detected_chains[0],
			allPossibleChains: formatDetection.detected_chains
		};
	}

	// For EVM addresses, we need to be smarter
	const probableChains: ChainResolutionResult['probableChains'] = [];

	// 1. Check user context (highest priority)
	if (options.userContext?.currentNetwork) {
		probableChains.push({
			chain: options.userContext.currentNetwork,
			confidence: 0.9,
			reason: 'Currently selected network'
		});
	}

	if (options.userContext?.recentTransaction) {
		const hoursSinceTransaction =
			(Date.now() - options.userContext.recentTransaction.timestamp.getTime()) / (1000 * 60 * 60);

		if (hoursSinceTransaction < 1) {
			probableChains.push({
				chain: options.userContext.recentTransaction.chain,
				confidence: 0.85,
				reason: 'Recent transaction on this chain'
			});
		}
	}

	// 2. Check user preferences
	const preferences = getUserChainPreferences(address);
	if (preferences.addressChainHistory[address]) {
		preferences.addressChainHistory[address].forEach((chain, index) => {
			probableChains.push({
				chain,
				confidence: 0.7 - index * 0.1,
				reason: 'Previously used on this chain'
			});
		});
	}

	// 3. Apply heuristics
	const heuristics = getChainHeuristics(address);
	Object.entries(heuristics).forEach(([chain, score]) => {
		if (score > 0.5) {
			probableChains.push({
				chain,
				confidence: score,
				reason: 'Address pattern analysis'
			});
		}
	});

	// 4. Check on-chain activity (if enabled and not in quick mode)
	if (options.checkOnChain && !options.quickMode) {
		const activities = await checkOnChainActivity(address);

		activities.forEach((activity) => {
			if (activity.hasActivity) {
				probableChains.push({
					chain: activity.chain,
					confidence: activity.isContract ? 0.95 : 0.8,
					activity,
					reason: activity.isContract ? 'Contract deployed' : 'Has transaction history'
				});
			}
		});
	}

	// Sort by confidence and remove duplicates
	const chainMap = new Map<string, (typeof probableChains)[0]>();
	probableChains.forEach((item) => {
		const existing = chainMap.get(item.chain);
		if (!existing || existing.confidence < item.confidence) {
			chainMap.set(item.chain, item);
		}
	});

	const sortedChains = Array.from(chainMap.values()).sort((a, b) => b.confidence - a.confidence);

	return {
		address,
		detectedFormat: formatDetection,
		probableChains: sortedChains,
		recommendedChain: sortedChains[0]?.chain,
		allPossibleChains: Object.keys(EVM_CHAIN_CONFIGS)
	};
}

/**
 * Save user's chain selection for future reference
 */
export function saveChainSelection(address: string, chain: string): void {
	const preferences = getUserChainPreferences(address);

	// Update address history
	if (!preferences.addressChainHistory[address]) {
		preferences.addressChainHistory[address] = [];
	}

	// Remove if exists and add to front
	preferences.addressChainHistory[address] = [
		chain,
		...preferences.addressChainHistory[address].filter((c) => c !== chain)
	].slice(0, 5);

	// Update recent chains
	preferences.recentChains = [
		{ chain, lastUsed: new Date() },
		...preferences.recentChains.filter((rc) => rc.chain !== chain)
	].slice(0, 10);

	localStorage.setItem('yakkl_chain_preferences', JSON.stringify(preferences));
}

/**
 * UI Helper: Get chain selection UI data
 */
export function getChainSelectionUI(resolution: ChainResolutionResult) {
	return {
		primaryOptions: resolution.probableChains.slice(0, 3).map((pc) => ({
			chain: pc.chain,
			name: EVM_CHAIN_CONFIGS[pc.chain]?.name || pc.chain,
			confidence: pc.confidence,
			badge: pc.confidence > 0.8 ? 'Likely' : pc.confidence > 0.6 ? 'Possible' : 'Maybe',
			description: pc.reason
		})),
		otherOptions: resolution.allPossibleChains
			.filter((chain) => !resolution.probableChains.find((pc) => pc.chain === chain))
			.map((chain) => ({
				chain,
				name: EVM_CHAIN_CONFIGS[chain]?.name || chain
			}))
	};
}

// Example usage:
/*
// Quick check with user context
const resolution = await resolveChainForAddress(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f2BD27',
  {
    quickMode: true,
    userContext: {
      currentNetwork: 'BASE'
    }
  }
);

console.log(`Recommended chain: ${resolution.recommendedChain}`);
console.log('Probable chains:', resolution.probableChains);

// Full check with on-chain verification
const fullResolution = await resolveChainForAddress(
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract
  {
    checkOnChain: true
  }
);

// Save user's selection
saveChainSelection('0x742d35Cc6634C0532925a3b844Bc9e7595f2BD27', 'BASE');
*/
