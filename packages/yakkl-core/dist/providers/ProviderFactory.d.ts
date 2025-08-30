/**
 * Provider factory implementation for creating blockchain providers
 */
import type { IProviderFactory, IBlockchainProvider, ChainInfo, ProviderConfig } from '../interfaces/provider.interface';
import { ChainType } from '../interfaces/provider.interface';
/**
 * Registry of provider constructors
 */
type ProviderConstructor = new (chainInfo: ChainInfo, config?: ProviderConfig) => IBlockchainProvider;
/**
 * Provider factory implementation
 */
export declare class ProviderFactory implements IProviderFactory {
    private providers;
    private supportedChains;
    /**
     * Register a provider type
     */
    registerProvider(chainType: ChainType, constructor: ProviderConstructor): void;
    /**
     * Register a supported chain
     */
    registerChain(chainInfo: ChainInfo): void;
    /**
     * Create a provider instance
     */
    createProvider(chainInfo: ChainInfo, config?: ProviderConfig): IBlockchainProvider;
    /**
     * Get all supported chains
     */
    getSupportedChains(): ChainInfo[];
    /**
     * Check if a chain is supported
     */
    isChainSupported(chainId: string | number): boolean;
    /**
     * Get chain info by ID
     */
    getChainInfo(chainId: string | number): ChainInfo | undefined;
    /**
     * Clear all registrations
     */
    clear(): void;
}
/**
 * Singleton instance
 */
export declare const providerFactory: ProviderFactory;
/**
 * Default chain configurations
 */
export declare const DEFAULT_CHAINS: ChainInfo[];
/**
 * Initialize factory with default chains
 */
export declare function initializeDefaultChains(): void;
/**
 * Initialize factory with default providers
 */
export declare function initializeDefaultProviders(): void;
export {};
//# sourceMappingURL=ProviderFactory.d.ts.map