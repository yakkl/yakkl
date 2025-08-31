/**
 * Blockchain Chain Configurations
 * Comprehensive chain definitions for multi-chain support
 */
export interface ChainConfig {
    id: number;
    name: string;
    network: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrls: {
        default: string[];
        public?: string[];
        infura?: string[];
        alchemy?: string[];
        quicknode?: string[];
    };
    blockExplorers: {
        default: {
            name: string;
            url: string;
            apiUrl?: string;
        };
        etherscan?: {
            name: string;
            url: string;
            apiUrl?: string;
        };
    };
    contracts?: {
        multicall3?: {
            address: `0x${string}`;
            blockCreated?: number;
        };
        ensRegistry?: {
            address: `0x${string}`;
        };
        ensUniversalResolver?: {
            address: `0x${string}`;
        };
    };
    testnet?: boolean;
    iconUrl?: string;
    chainType?: 'EVM' | 'Solana' | 'Cosmos' | 'Bitcoin';
}
/**
 * Ethereum Mainnet
 */
export declare const ethereum: ChainConfig;
/**
 * Polygon (Matic)
 */
export declare const polygon: ChainConfig;
/**
 * Arbitrum One
 */
export declare const arbitrum: ChainConfig;
/**
 * Optimism
 */
export declare const optimism: ChainConfig;
/**
 * Base
 */
export declare const base: ChainConfig;
/**
 * BNB Smart Chain
 */
export declare const bsc: ChainConfig;
/**
 * Avalanche C-Chain
 */
export declare const avalanche: ChainConfig;
/**
 * Sepolia Testnet
 */
export declare const sepolia: ChainConfig;
/**
 * All supported chains
 */
export declare const chains: {
    readonly ethereum: ChainConfig;
    readonly polygon: ChainConfig;
    readonly arbitrum: ChainConfig;
    readonly optimism: ChainConfig;
    readonly base: ChainConfig;
    readonly bsc: ChainConfig;
    readonly avalanche: ChainConfig;
    readonly sepolia: ChainConfig;
};
/**
 * Chain ID to chain config mapping
 */
export declare const chainById: Record<number, ChainConfig>;
/**
 * Get chain by ID
 */
export declare function getChainById(chainId: number): ChainConfig | undefined;
/**
 * Get chain by network name
 */
export declare function getChainByNetwork(network: string): ChainConfig | undefined;
/**
 * Check if chain is testnet
 */
export declare function isTestnet(chainId: number): boolean;
/**
 * Get all mainnet chains
 */
export declare function getMainnetChains(): ChainConfig[];
/**
 * Get all testnet chains
 */
export declare function getTestnetChains(): ChainConfig[];
