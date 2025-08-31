/**
 * RPC Method Definitions
 * Standard Ethereum JSON-RPC methods plus YAKKL extensions
 */

export enum StandardRPCMethods {
  // Standard Ethereum methods
  ETH_ACCOUNTS = 'eth_accounts',
  ETH_REQUEST_ACCOUNTS = 'eth_requestAccounts',
  ETH_CHAIN_ID = 'eth_chainId',
  ETH_BLOCK_NUMBER = 'eth_blockNumber',
  ETH_GET_BALANCE = 'eth_getBalance',
  ETH_GET_TRANSACTION_BY_HASH = 'eth_getTransactionByHash',
  ETH_GET_TRANSACTION_RECEIPT = 'eth_getTransactionReceipt',
  ETH_SEND_TRANSACTION = 'eth_sendTransaction',
  ETH_SIGN_TRANSACTION = 'eth_signTransaction',
  ETH_SEND_RAW_TRANSACTION = 'eth_sendRawTransaction',
  ETH_CALL = 'eth_call',
  ETH_ESTIMATE_GAS = 'eth_estimateGas',
  ETH_GAS_PRICE = 'eth_gasPrice',
  ETH_GET_CODE = 'eth_getCode',
  ETH_GET_STORAGE_AT = 'eth_getStorageAt',
  
  // Signing methods
  PERSONAL_SIGN = 'personal_sign',
  ETH_SIGN_TYPED_DATA = 'eth_signTypedData',
  ETH_SIGN_TYPED_DATA_V3 = 'eth_signTypedData_v3',
  ETH_SIGN_TYPED_DATA_V4 = 'eth_signTypedData_v4',
  
  // Wallet methods
  WALLET_SWITCH_ETHEREUM_CHAIN = 'wallet_switchEthereumChain',
  WALLET_ADD_ETHEREUM_CHAIN = 'wallet_addEthereumChain',
  WALLET_WATCH_ASSET = 'wallet_watchAsset',
  WALLET_REQUEST_PERMISSIONS = 'wallet_requestPermissions',
  WALLET_GET_PERMISSIONS = 'wallet_getPermissions'
}

export enum YAKKLRPCMethods {
  // YAKKL-specific methods
  YAKKL_GET_VERSION = 'yakkl_getVersion',
  YAKKL_GET_FEATURES = 'yakkl_getFeatures',
  YAKKL_GET_PLAN = 'yakkl_getPlan',
  YAKKL_ENABLE_FEATURE = 'yakkl_enableFeature',
  YAKKL_DISABLE_FEATURE = 'yakkl_disableFeature',
  
  // Multi-chain support
  YAKKL_GET_SUPPORTED_CHAINS = 'yakkl_getSupportedChains',
  YAKKL_SWITCH_CHAIN = 'yakkl_switchChain',
  YAKKL_ADD_CUSTOM_CHAIN = 'yakkl_addCustomChain',
  
  // Security features
  YAKKL_LOCK_WALLET = 'yakkl_lockWallet',
  YAKKL_UNLOCK_WALLET = 'yakkl_unlockWallet',
  YAKKL_SET_IDLE_TIMEOUT = 'yakkl_setIdleTimeout',
  YAKKL_EXPORT_EMERGENCY_KIT = 'yakkl_exportEmergencyKit',
  
  // Account management
  YAKKL_CREATE_ACCOUNT = 'yakkl_createAccount',
  YAKKL_IMPORT_ACCOUNT = 'yakkl_importAccount',
  YAKKL_EXPORT_ACCOUNT = 'yakkl_exportAccount',
  YAKKL_REMOVE_ACCOUNT = 'yakkl_removeAccount',
  YAKKL_SET_ACCOUNT_NAME = 'yakkl_setAccountName',
  
  // Transaction features
  YAKKL_SIMULATE_TRANSACTION = 'yakkl_simulateTransaction',
  YAKKL_GET_GAS_RECOMMENDATION = 'yakkl_getGasRecommendation',
  YAKKL_BATCH_TRANSACTIONS = 'yakkl_batchTransactions',
  
  // DeFi features
  YAKKL_GET_TOKEN_PRICE = 'yakkl_getTokenPrice',
  YAKKL_GET_SWAP_QUOTE = 'yakkl_getSwapQuote',
  YAKKL_EXECUTE_SWAP = 'yakkl_executeSwap',
  
  // Analytics
  YAKKL_GET_PORTFOLIO_VALUE = 'yakkl_getPortfolioValue',
  YAKKL_GET_TRANSACTION_HISTORY = 'yakkl_getTransactionHistory',
  YAKKL_GET_ANALYTICS = 'yakkl_getAnalytics'
}

export interface RPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface RPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: RPCError;
}

export interface RPCError {
  code: number;
  message: string;
  data?: any;
}

export const RPC_ERROR_CODES = {
  // Standard JSON-RPC errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // Ethereum provider errors
  USER_REJECTED: 4001,
  UNAUTHORIZED: 4100,
  UNSUPPORTED_METHOD: 4200,
  DISCONNECTED: 4900,
  CHAIN_DISCONNECTED: 4901,
  
  // YAKKL-specific errors
  WALLET_LOCKED: 5001,
  INVALID_CHAIN: 5002,
  INSUFFICIENT_FUNDS: 5003,
  FEATURE_DISABLED: 5004,
  PLAN_REQUIRED: 5005
} as const;

/**
 * RPC method parameter schemas
 */
export interface RPCMethodParams {
  [StandardRPCMethods.ETH_ACCOUNTS]: void;
  [StandardRPCMethods.ETH_REQUEST_ACCOUNTS]: void;
  [StandardRPCMethods.ETH_CHAIN_ID]: void;
  [StandardRPCMethods.ETH_BLOCK_NUMBER]: void;
  [StandardRPCMethods.ETH_GET_BALANCE]: [address: string, block?: string];
  [StandardRPCMethods.ETH_SEND_TRANSACTION]: [{
    from: string;
    to: string;
    value?: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    nonce?: string;
  }];
  [StandardRPCMethods.PERSONAL_SIGN]: [message: string, address: string];
  [StandardRPCMethods.ETH_SIGN_TYPED_DATA_V4]: [address: string, typedData: any];
  [StandardRPCMethods.WALLET_SWITCH_ETHEREUM_CHAIN]: [{ chainId: string }];
  [StandardRPCMethods.WALLET_ADD_ETHEREUM_CHAIN]: [{
    chainId: string;
    chainName: string;
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
    rpcUrls: string[];
    blockExplorerUrls?: string[];
  }];
}

/**
 * RPC method return types
 */
export interface RPCMethodReturns {
  [StandardRPCMethods.ETH_ACCOUNTS]: string[];
  [StandardRPCMethods.ETH_REQUEST_ACCOUNTS]: string[];
  [StandardRPCMethods.ETH_CHAIN_ID]: string;
  [StandardRPCMethods.ETH_BLOCK_NUMBER]: string;
  [StandardRPCMethods.ETH_GET_BALANCE]: string;
  [StandardRPCMethods.ETH_SEND_TRANSACTION]: string;
  [StandardRPCMethods.PERSONAL_SIGN]: string;
  [StandardRPCMethods.ETH_SIGN_TYPED_DATA_V4]: string;
  [StandardRPCMethods.WALLET_SWITCH_ETHEREUM_CHAIN]: null;
  [StandardRPCMethods.WALLET_ADD_ETHEREUM_CHAIN]: null;
}