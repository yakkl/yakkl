/**
 * Provider types and interfaces for blockchain interactions
 *
 * This file re-exports types from @yakkl/core for backward compatibility.
 * The core types have been consolidated in yakkl-core for consistency across packages.
 */
import { ChainType } from '@yakkl/core';
import type { ProviderInterface, EVMProviderInterface, BitcoinProviderInterface, SolanaProviderInterface, BlockTag, BigNumberish, TransactionRequest, TransactionResponse, TransactionReceipt, FeeData, Log, Filter, Block, BlockWithTransactions, ChainInfo, ProviderConfig, ProviderCostMetrics, ProviderHealthMetrics, ProviderMetadata } from '@yakkl/core';
export type { BlockTag, BigNumberish, TransactionRequest, TransactionResponse, TransactionReceipt, FeeData, Log, Filter, Block, BlockWithTransactions, ChainInfo, ProviderConfig, ProviderCostMetrics, ProviderHealthMetrics, ProviderMetadata };
export { ChainType };
export type { ProviderInterface, EVMProviderInterface, BitcoinProviderInterface, SolanaProviderInterface };
/**
 * @deprecated Use ProviderInterface instead. IProvider is kept for backward compatibility only.
 */
export type IProvider = ProviderInterface;
export type EventType = string | Array<string | string[]> | Filter;
export type Listener = (...args: any[]) => void;
export interface NetworkProviderConfig extends ProviderConfig {
    name: string;
    blockchains: string[];
    chainIds: number[];
    url?: string;
    priority?: number;
}
export interface PriceData {
    symbol: string;
    price: number;
    currency: string;
    timestamp: number;
    change24h?: number;
    volume24h?: number;
    marketCap?: number;
}
export interface PriceProviderConfig {
    apiKey?: string;
    baseUrl?: string;
    symbols?: string[];
    currency?: string;
    interval?: number;
}
export interface GasEstimate {
    slow: bigint;
    standard: bigint;
    fast: bigint;
    baseFee?: bigint;
    priority?: {
        slow: bigint;
        standard: bigint;
        fast: bigint;
    };
}
