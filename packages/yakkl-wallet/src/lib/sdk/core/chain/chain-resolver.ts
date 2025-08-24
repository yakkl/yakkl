/**
 * YAKKL SDK - Advanced Chain Resolution for EVM Addresses
 * Strategies to determine the most likely chain for a given address
 */

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

// Basic address detection result
export interface AddressDetectionResult {
	success: boolean;
	address_type?: string;
	detected_chains: string[];
	confidence?: number;
	normalized_address?: string;
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
		priority: 65
	}
};

// User context for better resolution
interface UserContext {
	currentNetwork?: string;
	recentChains?: string[];
	preferences?: {
		preferredChains: string[];
	};
}

// Options for chain resolution
interface ResolutionOptions {
	quickMode?: boolean; // Skip on-chain checks
	checkOnChain?: boolean; // Check actual on-chain activity
	userContext?: UserContext;
	maxConcurrency?: number;
	timeoutMs?: number;
}

/**
 * Main function to resolve the most likely chain for an EVM address
 */
export async function resolveChainForAddress(
	address: string,
	options: ResolutionOptions = {}
): Promise<ChainResolutionResult> {
	const {
		quickMode = false,
		checkOnChain = true,
		userContext,
		maxConcurrency = 3,
		timeoutMs = 5000
	} = options;

	// Step 1: Detect basic address format
	const detectedFormat = detectBlockchainAddress(address);
	
	if (!detectedFormat.success) {
		throw new Error('Invalid address format');
	}

	// Step 2: Get possible chains based on format
	const possibleChains = getPossibleChainsForAddress(address, detectedFormat);

	// Step 3: Apply user context to prioritize chains
	const prioritizedChains = applyUserContext(possibleChains, userContext);

	// Step 4: Quick mode - return based on priorities only
	if (quickMode || !checkOnChain) {
		const probableChains = prioritizedChains.map((chain, index) => ({
			chain,
			confidence: Math.max(0.1, 1.0 - index * 0.15),
			reason: index === 0 ? 'User context preference' : 'Chain priority'
		}));

		return {
			address,
			detectedFormat,
			probableChains,
			recommendedChain: probableChains[0]?.chain,
			allPossibleChains: possibleChains
		};
	}

	// Step 5: Check on-chain activity (with concurrency control)
	const activities = await checkChainActivities(
		address,
		prioritizedChains.slice(0, maxConcurrency),
		timeoutMs
	);

	// Step 6: Score chains based on activity
	const scoredChains = scoreChainsByActivity(activities, userContext);

	// Step 7: Build final result
	const probableChains = scoredChains.map(scored => ({
		chain: scored.chain,
		confidence: scored.score,
		activity: scored.activity,
		reason: scored.reason
	}));

	return {
		address,
		detectedFormat,
		probableChains,
		recommendedChain: probableChains[0]?.chain,
		allPossibleChains: possibleChains
	};
}

/**
 * Basic blockchain address detection
 */
function detectBlockchainAddress(address: string): AddressDetectionResult {
	// Ethereum/EVM addresses
	if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
		return {
			success: true,
			address_type: 'ethereum',
			detected_chains: ['ETH', 'POLYGON', 'BASE', 'OPTIMISM', 'ARBITRUM', 'BSC', 'AVAX'],
			confidence: 1.0,
			normalized_address: address.toLowerCase()
		};
	}

	// Add other address formats as needed
	return {
		success: false,
		detected_chains: []
	};
}

/**
 * Get possible chains for an address
 */
function getPossibleChainsForAddress(
	address: string, 
	detection: AddressDetectionResult
): string[] {
	if (detection.address_type === 'ethereum') {
		// Return all EVM chains, sorted by priority
		return Object.entries(EVM_CHAIN_CONFIGS)
			.sort(([,a], [,b]) => b.priority - a.priority)
			.map(([key]) => key);
	}
	
	return detection.detected_chains;
}

/**
 * Apply user context to prioritize chains
 */
function applyUserContext(chains: string[], userContext?: UserContext): string[] {
	if (!userContext) return chains;

	// Prioritize current network
	if (userContext.currentNetwork && chains.includes(userContext.currentNetwork)) {
		const others = chains.filter(c => c !== userContext.currentNetwork);
		return [userContext.currentNetwork!, ...others];
	}

	// Apply recent chains preference
	if (userContext.recentChains) {
		const recentSet = new Set(userContext.recentChains);
		const recent = chains.filter(c => recentSet.has(c));
		const other = chains.filter(c => !recentSet.has(c));
		return [...recent, ...other];
	}

	return chains;
}

/**
 * Check on-chain activities for multiple chains
 */
async function checkChainActivities(
	address: string,
	chains: string[],
	timeoutMs: number
): Promise<ChainActivity[]> {
	const promises = chains.map(chain => 
		PROMISE_WITH_TIMEOUT(
			checkSingleChainActivity(address, chain),
			timeoutMs
		)
	);

	const results = await Promise.allSettled(promises);
	
	return results
		.map((result, index) => {
			if (result.status === 'fulfilled') {
				return result.value;
			}
			// Return default activity for failed checks
			return {
				chain: chains[index],
				hasActivity: false,
				balance: '0',
				nonce: 0,
				isContract: false
			};
		})
		.filter(activity => activity !== null) as ChainActivity[];
}

/**
 * Check activity on a single chain
 */
async function checkSingleChainActivity(
	address: string,
	chain: string
): Promise<ChainActivity> {
	const config = EVM_CHAIN_CONFIGS[chain];
	if (!config) {
		throw new Error(`Unknown chain: ${chain}`);
	}

	// This would make actual RPC calls in a real implementation
	// For now, return mock data
	return {
		chain,
		hasActivity: false,
		balance: '0',
		nonce: 0,
		isContract: false
	};
}

/**
 * Score chains based on their activity
 */
function scoreChainsByActivity(
	activities: ChainActivity[],
	userContext?: UserContext
): Array<{
	chain: string;
	score: number;
	activity: ChainActivity;
	reason: string;
}> {
	return activities
		.map(activity => {
			let score = 0.1; // Base score
			let reason = 'No activity detected';

			// Activity scoring
			if (activity.hasActivity) {
				score += 0.4;
				reason = 'Has transaction activity';
			}

			if (parseFloat(activity.balance) > 0) {
				score += 0.3;
				reason = 'Has balance and activity';
			}

			if (activity.isContract) {
				score += 0.2;
				reason = 'Smart contract detected';
			}

			// User context bonus
			if (userContext?.currentNetwork === activity.chain) {
				score += 0.1;
			}

			return {
				chain: activity.chain,
				score: Math.min(1.0, score),
				activity,
				reason
			};
		})
		.sort((a, b) => b.score - a.score);
}

/**
 * Save user's chain selection for future reference
 */
export function saveChainSelection(address: string, chain: string): void {
	// In a real implementation, this would save to localStorage or backend
	try {
		const key = `chain_selection_${address.toLowerCase()}`;
		const data = {
			chain,
			timestamp: Date.now()
		};
		localStorage?.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.warn('Failed to save chain selection:', error);
	}
}

/**
 * Get saved chain selection
 */
export function getSavedChainSelection(address: string): string | null {
	try {
		const key = `chain_selection_${address.toLowerCase()}`;
		const data = localStorage?.getItem(key);
		if (data) {
			const parsed = JSON.parse(data);
			return parsed.chain;
		}
	} catch (error) {
		console.warn('Failed to get saved chain selection:', error);
	}
	return null;
}

// Utility function for promise timeout
function PROMISE_WITH_TIMEOUT<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => 
			setTimeout(() => reject(new Error('Timeout')), timeoutMs)
		)
	]);
}