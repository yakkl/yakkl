/**
 * Token List Management
 * Standard token definitions and utilities
 */
export interface TokenInfo {
    chainId: number;
    address: `0x${string}`;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
    tags?: string[];
    extensions?: {
        website?: string;
        description?: string;
        twitter?: string;
        coingeckoId?: string;
    };
}
export interface TokenList {
    name: string;
    timestamp: string;
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    logoURI?: string;
    keywords?: string[];
    tokens: TokenInfo[];
}
/**
 * Common ERC20 tokens
 */
export declare const commonTokens: Record<string, TokenInfo>;
/**
 * Get token by address and chain
 */
export declare function getToken(address: string, chainId: number): TokenInfo | undefined;
/**
 * Get tokens for a specific chain
 */
export declare function getTokensByChain(chainId: number): TokenInfo[];
/**
 * Get tokens by symbol
 */
export declare function getTokensBySymbol(symbol: string): TokenInfo[];
/**
 * Check if token is stablecoin
 */
export declare function isStablecoin(token: TokenInfo): boolean;
/**
 * Check if token is wrapped native
 */
export declare function isWrappedNative(token: TokenInfo): boolean;
/**
 * Format token amount
 */
export declare function formatTokenAmount(amount: bigint | string, decimals: number, displayDecimals?: number): string;
/**
 * Parse token amount
 */
export declare function parseTokenAmount(amount: string, decimals: number): bigint;
/**
 * Token list validator
 */
export declare function validateTokenList(list: any): list is TokenList;
/**
 * Merge token lists
 */
export declare function mergeTokenLists(...lists: TokenList[]): TokenList;
