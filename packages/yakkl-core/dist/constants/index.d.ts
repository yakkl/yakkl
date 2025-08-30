/**
 * Core constants for YAKKL ecosystem
 * Framework-agnostic constants that can be used across all projects
 */
export declare const CORE_VERSION = "0.1.0";
export declare const ETH_BASE_EOA_GAS_UNITS = 21000;
export declare const ETH_BASE_SCA_GAS_UNITS = 45000;
export declare const ETH_BASE_SWAP_GAS_UNITS = 500000n;
export declare const ETH_BASE_FORCANCEL_GAS_UNITS: number;
export declare const GAS_PER_BLOB = 131072;
export declare const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const WETH_ADDRESS_MAINNET = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export declare const BASIS_POINTS_DIVISOR = 10000;
export declare const DEFAULT_DERIVED_PATH_ETH = "m/44'/60'/";
export declare enum EVMDenominations {
    ETH = "ETH",
    GWEI = "GWEI",
    WEI = "WEI"
}
export declare enum TokenStandard {
    ERC20 = "ERC20",
    ERC721 = "ERC721",
    ERC1155 = "ERC1155",
    ERC777 = "ERC777",
    BEP20 = "BEP20",
    SPL = "SPL",// Solana
    TRC20 = "TRC20"
}
export declare enum TransactionType {
    LEGACY = 0,
    EIP2930 = 1,
    EIP1559 = 2
}
export declare const SECOND = 1000;
export declare const MINUTE: number;
export declare const HOUR: number;
export declare const DAY: number;
export declare const WEEK: number;
export declare const DEFAULT_MAX_RETRIES = 3;
export declare const DEFAULT_BASE_DELAY = 1000;
export declare const DEFAULT_BACKOFF_MULTIPLIER = 2;
export declare const DEFAULT_RPC_TIMEOUT = 30000;
export declare const DEFAULT_HTTP_TIMEOUT = 60000;
export declare const STORAGE_VERSION = 1;
export declare const NETWORK_NAMES: {
    readonly 1: "Ethereum Mainnet";
    readonly 5: "Goerli Testnet";
    readonly 11155111: "Sepolia Testnet";
    readonly 137: "Polygon";
    readonly 80001: "Polygon Mumbai";
    readonly 42161: "Arbitrum One";
    readonly 421613: "Arbitrum Goerli";
    readonly 10: "Optimism";
    readonly 420: "Optimism Goerli";
    readonly 8453: "Base";
    readonly 84531: "Base Goerli";
    readonly 56: "BSC";
    readonly 97: "BSC Testnet";
    readonly 43114: "Avalanche C-Chain";
    readonly 43113: "Avalanche Fuji";
};
export declare const NATIVE_TOKEN_SYMBOLS: {
    readonly 1: "ETH";
    readonly 137: "MATIC";
    readonly 56: "BNB";
    readonly 43114: "AVAX";
    readonly 42161: "ETH";
    readonly 10: "ETH";
    readonly 8453: "ETH";
};
export declare enum RPCErrorCode {
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    PARSE_ERROR = -32700,
    USER_REJECTED = 4001,
    UNAUTHORIZED = 4100,
    UNSUPPORTED_METHOD = 4200,
    DISCONNECTED = 4900,
    CHAIN_DISCONNECTED = 4901
}
export declare const MIME_TYPES: {
    readonly JSON: "application/json";
    readonly FORM: "application/x-www-form-urlencoded";
    readonly MULTIPART: "multipart/form-data";
    readonly TEXT: "text/plain";
    readonly HTML: "text/html";
};
export declare const PATTERNS: {
    readonly ETH_ADDRESS: RegExp;
    readonly TRANSACTION_HASH: RegExp;
    readonly HEX_STRING: RegExp;
    readonly PRIVATE_KEY: RegExp;
    readonly MNEMONIC_WORD: RegExp;
    readonly EMAIL: RegExp;
    readonly URL: RegExp;
    readonly IPFS_HASH: RegExp;
};
export declare const MIN_PASSWORD_LENGTH = 8;
export declare const MAX_PASSWORD_LENGTH = 128;
export declare const SALT_ROUNDS = 10;
export declare const PBKDF2_ITERATIONS = 100000;
export declare const SCRYPT_N = 16384;
export declare const SCRYPT_R = 8;
export declare const SCRYPT_P = 1;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare const CACHE_TTL: {
    readonly PRICE: 60;
    readonly BALANCE: 30;
    readonly TRANSACTION: 300;
    readonly METADATA: 3600;
    readonly STATIC: 86400;
};
//# sourceMappingURL=index.d.ts.map