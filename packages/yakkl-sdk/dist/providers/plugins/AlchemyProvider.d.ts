/**
 * AlchemyProvider - Plugin for Alchemy RPC
 *
 * Extends the base provider with Alchemy-specific features:
 * - Enhanced APIs (getNFTs, getTokenBalances, etc.)
 * - Websocket subscriptions
 * - Trace APIs
 */
import { BaseProvider, ProviderType, ProviderConfig } from '../ProviderInterface';
interface AlchemyConfig extends ProviderConfig {
    apiKey: string;
    network?: string;
}
export declare class AlchemyProvider extends BaseProvider {
    readonly type = ProviderType.ALCHEMY;
    readonly name = "Alchemy";
    private url;
    private wsUrl?;
    private ws?;
    private connected;
    constructor(config: AlchemyConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    call(method: string, params: any[]): Promise<any>;
    /**
     * Get NFTs for an address
     */
    getNFTs(owner: string, options?: {
        contractAddresses?: string[];
        withMetadata?: boolean;
        pageKey?: string;
    }): Promise<any>;
    /**
     * Get token balances for an address
     */
    getTokenBalances(address: string, contractAddresses?: string[]): Promise<any>;
    /**
     * Get token metadata
     */
    getTokenMetadata(contractAddress: string): Promise<any>;
    /**
     * Get asset transfers (transaction history)
     */
    getAssetTransfers(params: {
        fromAddress?: string;
        toAddress?: string;
        category?: string[];
        withMetadata?: boolean;
        excludeZeroValue?: boolean;
        maxCount?: string;
        pageKey?: string;
    }): Promise<any>;
    /**
     * Enhanced transaction receipts
     */
    getTransactionReceipts(params: {
        blockNumber?: string;
        blockHash?: string;
    }): Promise<any>;
    /**
     * Simulate transaction execution
     */
    simulateExecution(transaction: any, blockNumber?: string): Promise<any>;
    /**
     * Batch support for Alchemy
     */
    batch(requests: Array<{
        method: string;
        params: any[];
    }>): Promise<any[]>;
    /**
     * Subscribe to events (WebSocket)
     */
    subscribe(event: string, callback: (data: any) => void): void;
    /**
     * Connect WebSocket for subscriptions
     */
    private connectWebSocket;
}
export {};
