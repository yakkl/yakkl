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
  username?: string;
  avatar?: string | null;
  isActive: boolean;
  balance?: string;
  plan?: PlanType;
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
}

export interface TokenDisplay {
  symbol: string;
  name?: string;
  icon?: string;
  value: number;
  qty: number;
  price?: number;
  change24h?: number;
  color?: string;
  address?: string;
  decimals?: number;
  chainId?: number;
}

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
}

export enum PlanType {
  Basic = 'basic_member',
  FoundingMember = 'founding_member',
  EarlyAdopter = 'early_adopter',
  Pro = 'yakkl_pro',
  Enterprise = 'enterprise'
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