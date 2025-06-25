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

// Preview2 specific types
export interface Preview2Account {
  address: string;
  ens?: string | null;
  username?: string;
  avatar?: string | null;
  isActive: boolean;
  balance?: string;
  plan?: PlanType;
}

export interface Preview2Chain {
  key: string;
  name: string;
  network: string;
  icon: string;
  isTestnet: boolean;
  rpcUrl?: string;
  chainId: number;
}

export interface Preview2Token {
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
}

export interface Preview2Transaction {
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
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
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

// Background message types specific to preview2
export interface Preview2Message {
  type: 'PREVIEW2_REQUEST';
  action: string;
  data?: any;
  id: string;
}

export interface Preview2Response {
  type: 'PREVIEW2_RESPONSE';
  success: boolean;
  data?: any;
  error?: string;
  id: string;
}