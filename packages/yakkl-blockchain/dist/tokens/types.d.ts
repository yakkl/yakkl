/**
 * Token types and interfaces for @yakkl/blockchain
 */
import type { BigNumberish } from '../providers/types';
export interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
    logoURI?: string;
    description?: string;
    tags?: string[];
}
export interface TokenBalance extends TokenInfo {
    balance: BigNumberish;
    balanceFormatted?: string;
    balanceUSD?: number;
}
export interface TokenPrice {
    symbol: string;
    price: number;
    currency: string;
    change24h?: number;
    change24hPercent?: number;
    volume24h?: number;
    marketCap?: number;
    lastUpdated?: number;
}
export interface TokenMetadata {
    isNative?: boolean;
    isStablecoin?: boolean;
    isWrapped?: boolean;
    isLPToken?: boolean;
    website?: string;
    twitter?: string;
    coingeckoId?: string;
    coinmarketcapId?: string;
}
export interface IToken extends TokenInfo, TokenMetadata {
    getBalance(address: string): Promise<BigNumberish>;
    transfer(to: string, amount: BigNumberish): Promise<string>;
    approve(spender: string, amount: BigNumberish): Promise<string>;
    allowance(owner: string, spender: string): Promise<BigNumberish>;
    totalSupply(): Promise<BigNumberish>;
}
export interface TokenList {
    name: string;
    timestamp: string;
    version: {
        major: number;
        minor: number;
        patch: number;
    };
    tags?: Record<string, {
        name: string;
        description: string;
    }>;
    logoURI?: string;
    keywords?: string[];
    tokens: TokenInfo[];
}
export interface TokenTransfer {
    from: string;
    to: string;
    value: BigNumberish;
    token: TokenInfo;
    transactionHash: string;
    blockNumber: number;
    timestamp?: number;
}
export interface TokenApproval {
    owner: string;
    spender: string;
    value: BigNumberish;
    token: TokenInfo;
    transactionHash: string;
    blockNumber: number;
    timestamp?: number;
}
export interface TokenSwap {
    tokenIn: TokenInfo;
    tokenOut: TokenInfo;
    amountIn: BigNumberish;
    amountOut: BigNumberish;
    path?: string[];
    protocol?: string;
    slippage?: number;
    deadline?: number;
}
export interface TokenPortfolioItem extends TokenBalance {
    price?: number;
    value?: number;
    valueUSD?: number;
    change24h?: number;
    change24hPercent?: number;
    allocation?: number;
}
export interface TokenSearchResult extends TokenInfo {
    score?: number;
    verified?: boolean;
    warning?: string;
}
export interface IERC20 {
    name(): Promise<string>;
    symbol(): Promise<string>;
    decimals(): Promise<number>;
    totalSupply(): Promise<BigNumberish>;
    balanceOf(account: string): Promise<BigNumberish>;
    transfer(to: string, amount: BigNumberish): Promise<boolean>;
    allowance(owner: string, spender: string): Promise<BigNumberish>;
    approve(spender: string, amount: BigNumberish): Promise<boolean>;
    transferFrom(from: string, to: string, amount: BigNumberish): Promise<boolean>;
}
export interface IERC721 {
    name(): Promise<string>;
    symbol(): Promise<string>;
    tokenURI(tokenId: BigNumberish): Promise<string>;
    ownerOf(tokenId: BigNumberish): Promise<string>;
    balanceOf(owner: string): Promise<BigNumberish>;
    approve(to: string, tokenId: BigNumberish): Promise<void>;
    getApproved(tokenId: BigNumberish): Promise<string>;
    setApprovalForAll(operator: string, approved: boolean): Promise<void>;
    isApprovedForAll(owner: string, operator: string): Promise<boolean>;
    transferFrom(from: string, to: string, tokenId: BigNumberish): Promise<void>;
    safeTransferFrom(from: string, to: string, tokenId: BigNumberish): Promise<void>;
}
export interface TokenServiceConfig {
    defaultTokenListUrl?: string;
    customTokenLists?: string[];
    autoUpdatePrices?: boolean;
    priceUpdateInterval?: number;
    cacheEnabled?: boolean;
    cacheDuration?: number;
}
export interface TokenFilterOptions {
    chainId?: number;
    isNative?: boolean;
    isStablecoin?: boolean;
    hasBalance?: boolean;
    minValue?: number;
    search?: string;
    tags?: string[];
    verified?: boolean;
}
export interface TokenSortOptions {
    field: 'name' | 'symbol' | 'balance' | 'value' | 'change24h';
    direction: 'asc' | 'desc';
}
