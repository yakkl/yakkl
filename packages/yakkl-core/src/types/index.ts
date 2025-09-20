/**
 * Core type definitions for YAKKL ecosystem
 * Framework-agnostic types that can be used across all projects
 */

// Re-export BigNumberish from utils
export type { BigNumberish, Numeric } from '../utils/BigNumber';

// System Theme Types
export enum SystemTheme {
	DARK = 'dark',
	LIGHT = 'light',
	SYSTEM = 'system'
}

// Account Types
export enum AccountTypeCategory {
	PRIMARY = 'primary',
	SUB = 'sub',
	CONTRACT = 'contract',
	IMPORTED = 'imported'
}

export enum AccountTypeStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive',
	DELETED = 'deleted'
}

// Registration/Membership Types
export enum RegisteredType {
	EXPLORER_MEMBER = 'explorer_member',
	FOUNDING_MEMBER = 'founding_member',
	EARLY_ADOPTER = 'early_adopter',
	YAKKL_PRO = 'yakkl_pro',
	YAKKL_PRO_PLUS = 'yakkl_pro_plus',
	INSTITUTION = 'institution',
	BETA = 'beta',
	NONE = 'none'
}

// Network Chain IDs
export enum ChainId {
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

// Common Error Types
export interface ErrorBody {
	error?: string;
	reason?: string;
	body?: string;
	code?: string | number;
	[key: string]: unknown;
}

// Generic Result Type
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

// Generic Async Result Type
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

// Address Type
export type Address = `0x${string}`;

// Transaction Status
export enum TransactionStatus {
	PENDING = 'pending',
	CONFIRMED = 'confirmed',
	FAILED = 'failed',
	DROPPED = 'dropped',
	REPLACED = 'replaced'
}

// Token Types
export interface TokenInfo {
	address: Address;
	symbol: string;
	name: string;
	decimals: number;
	chainId: number;
	logoURI?: string;
}

// TokenBalance and NetworkConfig are now exported from interfaces module

// Time Types
export type Timestamp = number; // Unix timestamp in seconds
export type Milliseconds = number; // Duration in milliseconds

// Pagination Types
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

// Sort Direction
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

// Generic Status
export enum Status {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Hex and Bytes Types
export type HexString = `0x${string}`;

// Bytes-like data that can be either hex string or uint8array
export type BytesLike = HexString | Uint8Array;

// Common Blockchain Types
// BlockTag can be a number, hex string, or specific tags like 'latest', 'earliest', 'pending'
export type BlockTag = number | string | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized';

// BlockInfo is now exported from interfaces module

export interface TransactionRequest {
	from?: Address;
	to?: Address;
	value?: string; // BigNumberish as string
	data?: HexString;
	nonce?: number;
	gasLimit?: string; // BigNumberish as string
	gasPrice?: string; // BigNumberish as string
	maxFeePerGas?: string; // BigNumberish as string
	maxPriorityFeePerGas?: string; // BigNumberish as string
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
	logs: Array<any>; // Can be refined based on needs
	logsBloom?: HexString;
	root?: string;
	byzantium?: boolean;
	type?: number;
	confirmations?: number;
}

// Type Guards
export function isAddress(value: any): value is Address {
	return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isHexString(value: any): value is HexString {
	return typeof value === 'string' && /^0x[a-fA-F0-9]*$/.test(value);
}

export function isTransactionHash(value: any): value is HexString {
	return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}