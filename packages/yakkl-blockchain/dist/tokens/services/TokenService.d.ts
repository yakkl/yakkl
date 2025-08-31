/**
 * Token service for managing tokens and balances
 */
import type { TokenInfo, TokenBalance, TokenPortfolioItem, TokenList, TokenFilterOptions, TokenSortOptions, TokenServiceConfig, IToken } from '../types';
import type { IProvider } from '../../providers/types';
export declare class TokenService {
    private provider?;
    private config;
    private tokenCache;
    private priceCache;
    private tokenLists;
    constructor(config?: TokenServiceConfig, provider?: IProvider);
    /**
     * Set the provider for blockchain interactions
     */
    setProvider(provider: IProvider): void;
    /**
     * Load a token list from URL
     */
    loadTokenList(url: string): Promise<TokenList>;
    /**
     * Get a token by address and chain
     */
    getToken(address: string, chainId: number): Promise<IToken | null>;
    /**
     * Get token balance for an address
     */
    getTokenBalance(tokenAddress: string, ownerAddress: string, chainId: number): Promise<TokenBalance | null>;
    /**
     * Get multiple token balances
     */
    getTokenBalances(tokens: Array<{
        address: string;
        chainId: number;
    }>, ownerAddress: string): Promise<TokenBalance[]>;
    /**
     * Get portfolio items with prices
     */
    getPortfolio(ownerAddress: string, chainId: number, options?: TokenFilterOptions): Promise<TokenPortfolioItem[]>;
    /**
     * Search for tokens
     */
    searchTokens(query: string, chainId?: number): TokenInfo[];
    /**
     * Filter tokens based on options
     */
    private filterTokens;
    /**
     * Sort tokens based on options
     */
    sortTokens(tokens: TokenPortfolioItem[], options: TokenSortOptions): TokenPortfolioItem[];
    /**
     * Get token price (mock implementation - replace with actual price provider)
     */
    private getTokenPrice;
    /**
     * Start automatic price updates
     */
    private startPriceUpdates;
    /**
     * Get a unique token ID
     */
    private getTokenId;
    /**
     * Clear all caches
     */
    clearCache(): void;
}
