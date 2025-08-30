/**
 * Wallet and account management interfaces
 */

import type { Address, HexString } from '../types';

export interface Account {
  address: Address;
  privateKey?: string;
  publicKey?: string;
  mnemonic?: string;
}

export interface WalletAccount extends Account {
  id: string;
  name: string;
  type: AccountType;
  derivationPath?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export enum AccountType {
  IMPORTED = 'imported',
  HD_WALLET = 'hd_wallet',
  HARDWARE = 'hardware',
  WATCH_ONLY = 'watch_only'
}

export interface WalletState {
  accounts: WalletAccount[];
  activeAccountId: string | null;
  networks: NetworkConfig[];
  activeNetworkId: string;
  isLocked: boolean;
}

export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  explorerUrl?: string;
  isTestnet?: boolean;
}

// SignatureRequest is now in crypto.interface.ts

export interface TransactionSignRequest {
  from: Address;
  to?: Address;
  value?: string;
  data?: HexString;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
}