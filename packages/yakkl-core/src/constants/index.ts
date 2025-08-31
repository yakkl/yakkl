/**
 * Core constants for YAKKL ecosystem
 * Framework-agnostic constants that can be used across all projects
 */

// Version - should be managed per package
export const CORE_VERSION = "0.1.0";

// Blockchain Constants
export const ETH_BASE_EOA_GAS_UNITS = 21000; // Base amount of gas units for EOA transaction
export const ETH_BASE_SCA_GAS_UNITS = 45000; // Base amount of gas units for Smart Contract transaction
export const ETH_BASE_SWAP_GAS_UNITS = 500000n; // Base amount of gas units for swap transaction
export const ETH_BASE_FORCANCEL_GAS_UNITS = ETH_BASE_EOA_GAS_UNITS * 3;

// Gas Constants
export const GAS_PER_BLOB = 131072; // 2**17

// Common Addresses
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const WETH_ADDRESS_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH on Ethereum mainnet

// Basis Points (for percentage calculations)
export const BASIS_POINTS_DIVISOR = 10_000;

// Default Derivation Paths
export const DEFAULT_DERIVED_PATH_ETH = "m/44'/60'/"; // Ethereum HD wallet path

// EVM Denominations
export enum EVMDenominations {
  ETH = 'ETH',
  GWEI = 'GWEI',
  WEI = 'WEI',
}

// Token Standards
export enum TokenStandard {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  ERC777 = 'ERC777',
  BEP20 = 'BEP20',
  SPL = 'SPL', // Solana
  TRC20 = 'TRC20', // Tron
}

// Transaction Types
export enum TransactionType {
  LEGACY = 0,
  EIP2930 = 1,
  EIP1559 = 2,
}

// Common Time Constants (in milliseconds)
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

// Retry and Backoff Constants
export const DEFAULT_MAX_RETRIES = 3;
export const DEFAULT_BASE_DELAY = 1000; // milliseconds
export const DEFAULT_BACKOFF_MULTIPLIER = 2;

// Network Timeouts
export const DEFAULT_RPC_TIMEOUT = 30000; // 30 seconds
export const DEFAULT_HTTP_TIMEOUT = 60000; // 60 seconds

// Storage Versions
export const STORAGE_VERSION = 1; // For migration purposes

// Common Blockchain Networks (use ChainId from types for numeric IDs)
export const NETWORK_NAMES = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon',
  80001: 'Polygon Mumbai',
  42161: 'Arbitrum One',
  421613: 'Arbitrum Goerli',
  10: 'Optimism',
  420: 'Optimism Goerli',
  8453: 'Base',
  84531: 'Base Goerli',
  56: 'BSC',
  97: 'BSC Testnet',
  43114: 'Avalanche C-Chain',
  43113: 'Avalanche Fuji',
} as const;

// Common Token Symbols
export const NATIVE_TOKEN_SYMBOLS = {
  1: 'ETH',
  137: 'MATIC',
  56: 'BNB',
  43114: 'AVAX',
  42161: 'ETH',
  10: 'ETH',
  8453: 'ETH',
} as const;

// RPC Error Codes
export enum RPCErrorCode {
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  PARSE_ERROR = -32700,
  USER_REJECTED = 4001,
  UNAUTHORIZED = 4100,
  UNSUPPORTED_METHOD = 4200,
  DISCONNECTED = 4900,
  CHAIN_DISCONNECTED = 4901,
}

// Common MIME Types
export const MIME_TYPES = {
  JSON: 'application/json',
  FORM: 'application/x-www-form-urlencoded',
  MULTIPART: 'multipart/form-data',
  TEXT: 'text/plain',
  HTML: 'text/html',
} as const;

// Regex Patterns
export const PATTERNS = {
  ETH_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  HEX_STRING: /^0x[a-fA-F0-9]*$/,
  PRIVATE_KEY: /^0x[a-fA-F0-9]{64}$/,
  MNEMONIC_WORD: /^[a-z]+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  IPFS_HASH: /^Qm[a-zA-Z0-9]{44}$/,
} as const;

// Security Constants
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const SALT_ROUNDS = 10; // For bcrypt
export const PBKDF2_ITERATIONS = 100000;
export const SCRYPT_N = 16384;
export const SCRYPT_R = 8;
export const SCRYPT_P = 1;

// Pagination Defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  PRICE: 60, // 1 minute for price data
  BALANCE: 30, // 30 seconds for balance data
  TRANSACTION: 300, // 5 minutes for transaction data
  METADATA: 3600, // 1 hour for metadata
  STATIC: 86400, // 1 day for static data
} as const;