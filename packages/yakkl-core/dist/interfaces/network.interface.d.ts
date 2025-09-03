/**
 * Network-related interfaces for blockchain interaction
 */
import type { Address, HexString } from '../types';
export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any[];
    id: number | string;
}
export interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
    id: number | string;
}
export interface RequestArguments {
    method: string;
    params?: any[];
}
export interface NetworkProvider {
    request(args: RequestArguments): Promise<any>;
    send(method: string, params?: any[]): Promise<any>;
    getChainId(): number;
    getNetwork(): Promise<NetworkInfo>;
}
export interface NetworkInfo {
    chainId: number;
    name: string;
    ensAddress?: Address;
}
export interface BlockInfo {
    number: number;
    hash: HexString;
    timestamp: number;
    gasLimit: string;
    gasUsed: string;
    baseFeePerGas?: string;
}
//# sourceMappingURL=network.interface.d.ts.map