/**
 * Core types for YAKKL Wallet Engine
 */

export interface WalletConfig {
  name: string;
  version: string;
  embedded: boolean;
  restrictions: WalletRestriction[];
  modDiscovery: boolean;
  customNetworks?: Network[];
  branding?: BrandingConfig;
  enableMods?: boolean;
  enableDiscovery?: boolean;
  storagePrefix?: string;
  logLevel?: string;
}

export type WalletRestriction = 
  | 'no-external-connections'
  | 'no-mod-discovery'
  | 'enterprise-only'
  | 'read-only';

export interface BrandingConfig {
  name: string;
  logo: string;
  theme: ThemeConfig;
  whiteLabel: boolean;
}

export interface ThemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
}

export interface Account {
  id: string;
  address: string;
  name: string;
  type: AccountType;
  publicKey: string;
  derivationPath?: string;
  ens?: string;
  username?: string;
  avatar?: string;
  createdAt: Date;
  lastUsed: Date;
  metadata: Record<string, any>;
}

export type AccountType = 
  | 'eoa'           // Externally Owned Account
  | 'contract'      // Smart Contract
  | 'multisig'      // Multi-signature
  | 'hardware'      // Hardware wallet
  | 'watched';      // Watch-only

export interface Network {
  id: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
  isMainnet: boolean;
  isCustom: boolean;
  iconUrl?: string;
  gasToken: Token;
  supportedFeatures: NetworkFeature[];
}

export type NetworkFeature = 
  | 'eip1559'       // EIP-1559 gas pricing
  | 'eip2930'       // Access lists
  | 'contracts'     // Smart contracts
  | 'tokens'        // Token transfers
  | 'nft'           // NFT support
  | 'defi'          // DeFi protocols
  | 'bridges'       // Cross-chain bridges
  | 'staking';      // Native staking

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
  coingeckoId?: string;
  isNative: boolean;
  isStable: boolean;
}

export interface Transaction {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId: number;
  type?: TransactionType;
}

export type TransactionType = 0 | 1 | 2; // Legacy, EIP-2930, EIP-1559

export interface SignedTransaction {
  transaction: Transaction;
  signature: {
    r: string;
    s: string;
    v: number;
  };
  hash: string;
  serialized: string;
}

export interface Balance {
  address: string;
  chainId: number;
  native: TokenBalance;
  tokens: TokenBalance[];
  nfts: NFTBalance[];
  totalValue: string; // USD value
  lastUpdated: Date;
}

export interface TokenBalance {
  token: Token;
  balance: string;
  value: string; // USD value
  price: string; // USD price per token
}

export interface NFTBalance {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  value?: string; // USD value if available
}

export interface TransactionHistory {
  hash: string;
  blockNumber: number;
  timestamp: Date;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  gasPrice: string;
  status: TransactionStatus;
  type: TransactionHistoryType;
  token?: Token;
  metadata: Record<string, any>;
}

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type TransactionHistoryType = 
  | 'send'
  | 'receive'
  | 'swap'
  | 'bridge'
  | 'contract'
  | 'approval'
  | 'nft';

export interface WalletEvent {
  type: string;
  data: any;
  timestamp: Date;
  source: string;
}