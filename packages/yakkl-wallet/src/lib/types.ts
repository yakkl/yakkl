import type { PlanType } from '$lib/common/types';
import type { BigNumberish } from '$lib/common/bignumber';

// Re-export existing types from main lib
export type {
  YakklAccount,
  TokenData as Token,
  BaseTransaction as Transaction
  // NetworkType - not exported from interfaces
} from '$lib/common/interfaces';

export type {
  AccountTypeCategory,
  PlanType as ExistingPlanType
} from '$lib/common/types';

// Account display types for UI
export interface AccountDisplay {
  address: string;
  ens?: string | null;
  name?: string;
  avatar?: string | null;
  isActive: boolean;
  balance?: string;               // Keep as string for display
  plan?: PlanType;
  // Additional properties for account management
  connectedDomains?: string[];
  value?: BigNumberish;           // Changed from number - CRITICAL
  createdAt?: string;
  createDate?: string;
  chainIds?: number[];            // Stay number (chain IDs are integers)
  accountType?: string;
  tags?: string[];
  isPrimary?: boolean;
}

export interface ChainDisplay {
  key: string;
  name: string;
  network: string;
  icon: string;
  isTestnet: boolean;
  rpcUrl?: string;
  chainId: number;
  explorerUrl?: string;
  explorerApiUrl?: string;
  explorerApiKey?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
    price?: number;         // Changed from number
  };
}

export interface TokenDisplay {
  chainId?: number;               // Stay number (chain ID is integer)
  address?: string;
  isNative?: boolean;
  symbol: string;
  name: string;
  decimals: number;               // Stay number (decimal places count)
  logo?: string;
  quantity?: string;              // Keep as string - good for display
  balance?: BigNumberish; // Accept both for compatibility, prefer BigNumberish
  value?: BigNumberish;   // Accept both for compatibility, prefer BigNumberish
  price?: number;
  chainName?: string;
  icon?: string;
  qty?: BigNumberish;             // Changed from number - CRITICAL
  change24h?: number;       // Changed from number for precision
  color?: string;
}

// export interface TokenData {
//   address: string;
//   symbol: string;
//   name: string;
//   decimals: number;
//   chainId: number;
//   logo?: string;
// }

export interface TransactionDisplay {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'swap' | 'contract';
  gas?: string;
  gasPrice?: string;
  gasLimit?: string; // Added for gas limit
  gasUsed?: string;
  effectiveGasPrice?: string; // Added for EIP-1559 transactions
  blockNumber?: string;
  nonce?: number | string; // Can be either number or string
  confirmations?: number | string; // Can be either number or string
  functionName?: string;
  methodId?: string;
  txreceipt_status?: string;
  chainId?: number; // Added for multi-chain support
  symbol?: string; // Empty defaults to ETH
  tokenAddress?: string; // For token transfers
  contractAddress?: string; // For contract interactions
  category?: string; // Transaction category
  rawContract?: any; // Raw contract data
  decimal?: number; // Token decimals
  possibleSpam?: boolean; // Spam detection flag
}

export interface UserPlan {
  type: PlanType;
  trialEndsAt?: string;
  subscriptionId?: string;
  features: string[];
}

// UI State types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
  isBackgroundUpdate?: boolean;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Service response types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ErrorState;
}

// Background message types for UI communication
export interface UIMessage {
  type: 'UI_REQUEST';
  action: string;
  data?: any;
  id: string;
}

export interface UIResponse {
  type: 'UI_RESPONSE';
  success: boolean;
  data?: any;
  error?: string;
  id: string;
}

// Cache-related types
export interface TokenCache {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  price?: number;
  value?: string;
  logo?: string;
  icon?: string; // Legacy compatibility (alias for logo)
  isNative?: boolean;
  chainId?: number;
  balanceLastUpdated?: Date | string; // Legacy compatibility
  priceLastUpdated?: Date | string; // Legacy compatibility
  price24hChange?: number; // Legacy compatibility
}

export interface TransactionCache {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'send' | 'receive' | 'swap' | 'contract';
  gas?: string;
  gasPrice?: string;
  blockNumber?: string;
  chainId?: number;
}

export interface AccountCache {
  address: string;
  chainId: number;
  tokens: TokenCache[];
  transactions: TransactionCache[];
  updateDate: string;
  portfolio?: {
    totalValue: bigint;
    lastCalculated: string;
    tokenCount: number;
  };
}

export interface WalletCacheController {
  version: number;
  accounts: Record<string, AccountCache>;
  chainAccountCache?: Record<number, Record<string, any>>; // Legacy compatibility
  currentAccount: any | null; // Using any temporarily until YakklAccount is properly imported
  currentNetwork: number;
  activeAccountAddress?: string; // Legacy compatibility
  activeChainId?: number; // Legacy compatibility
  lastUpdateDate: string;
  lastSync?: string; // Legacy compatibility
  isInitializing: boolean;
  hasEverLoaded: boolean;
  portfolioRollups?: { // Legacy compatibility
    grandTotal?: { totalValue: any };
    [key: string]: any;
  };
  accountMetadata?: { // Legacy compatibility
    watchListAccounts?: any[];
    [key: string]: any;
  };
}

export interface Portfolio {
  accountId: string;
  totalValue: string;
  tokens: TokenCache[];
  lastUpdated: string;
  chains: number[];
}
