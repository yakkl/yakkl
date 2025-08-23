// SDK Core Chain - Main Export File
export type {
	ChainConfig,
	ChainActivity,
	ChainResolutionResult,
	AddressDetectionResult
} from './chain-resolver';

export {
	resolveChainForAddress,
	saveChainSelection,
	getSavedChainSelection,
	EVM_CHAIN_CONFIGS
} from './chain-resolver';

export {
	detectAndResolveChain,
	clearChainCache,
	getCacheSize
} from './chain-detection';