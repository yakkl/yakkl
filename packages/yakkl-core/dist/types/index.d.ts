/**
 * Core type definitions for YAKKL ecosystem
 * Framework-agnostic types that can be used across all projects
 */
export type { BigNumberish, Numeric } from '../utils/BigNumber';
export declare enum SystemTheme {
    DARK = "dark",
    LIGHT = "light",
    SYSTEM = "system"
}
export declare enum AccountTypeCategory {
    PRIMARY = "primary",
    SUB = "sub",
    CONTRACT = "contract",
    IMPORTED = "imported"
}
export declare enum AccountTypeStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    DELETED = "deleted"
}
export declare enum RegisteredType {
    EXPLORER_MEMBER = "explorer_member",
    FOUNDING_MEMBER = "founding_member",
    EARLY_ADOPTER = "early_adopter",
    YAKKL_PRO = "yakkl_pro",
    YAKKL_PRO_PLUS = "yakkl_pro_plus",
    INSTITUTION = "institution",
    BETA = "beta",
    NONE = "none"
}
export declare enum ChainId {
    ETHEREUM = 1,
    GOERLI = 5,
    SEPOLIA = 11155111,
    POLYGON = 137,
    POLYGON_MUMBAI = 80001,
    ARBITRUM = 42161,
    ARBITRUM_GOERLI = 421613,
    OPTIMISM = 10,
    OPTIMISM_GOERLI = 420,
    BASE = 8453,
    BASE_GOERLI = 84531,
    BSC = 56,
    BSC_TESTNET = 97,
    AVALANCHE = 43114,
    AVALANCHE_FUJI = 43113
}
export interface ErrorBody {
    error?: string;
    reason?: string;
    body?: string;
    code?: string | number;
    [key: string]: unknown;
}
export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
export type Address = `0x${string}`;
export declare enum TransactionStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    FAILED = "failed",
    DROPPED = "dropped",
    REPLACED = "replaced"
}
export interface TokenInfo {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    chainId: number;
    logoURI?: string;
}
export type Timestamp = number;
export type Milliseconds = number;
export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export declare enum SortDirection {
    ASC = "asc",
    DESC = "desc"
}
export declare enum Status {
    IDLE = "idle",
    LOADING = "loading",
    SUCCESS = "success",
    ERROR = "error"
}
export type HexString = `0x${string}`;
export type BytesLike = HexString | Uint8Array;
export type BlockTag = number | string | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';
export interface TransactionRequest {
    from?: Address;
    to?: Address;
    value?: string;
    data?: HexString;
    nonce?: number;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    chainId?: number;
}
export interface TransactionReceipt {
    transactionHash: HexString;
    transactionIndex: number;
    blockHash: HexString;
    blockNumber: number;
    from: Address;
    to: Address | null;
    contractAddress?: string;
    cumulativeGasUsed: string;
    gasUsed: string;
    effectiveGasPrice?: string;
    status?: 0 | 1 | null;
    logs: Array<any>;
    logsBloom?: HexString;
    root?: string;
    byzantium?: boolean;
    type?: number;
    confirmations?: number;
}
export declare function isAddress(value: any): value is Address;
export declare function isHexString(value: any): value is HexString;
export declare function isTransactionHash(value: any): value is HexString;
//# sourceMappingURL=index.d.ts.map