/**
 * Blockchain provider interfaces for multi-chain support
 */

import type { Address, HexString } from '../types';
import type { TransactionSignRequest } from './wallet.interface';
import type { SignatureRequest, SignatureResult } from './crypto.interface';

/**
 * Supported blockchain types
 */
export enum ChainType {
  EVM = 'evm',
  BITCOIN = 'bitcoin',
  SOLANA = 'solana',
  COSMOS = 'cosmos',
  POLKADOT = 'polkadot',
  NEAR = 'near',
  TRON = 'tron'
}

/**
 * Chain information
 */
export interface ChainInfo {
  chainId: string | number;
  name: string;
  type: ChainType;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  isTestnet?: boolean;
  chainReference?: string; // e.g., "ethereum", "bsc", "polygon"
}

/**
 * Transaction status info
 */
export interface TransactionStatusInfo {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations?: number;
  blockNumber?: number;
  timestamp?: number;
  gasUsed?: string;
  effectiveGasPrice?: string;
  error?: string;
}

/**
 * Block information
 */
export interface Block {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  transactions: string[];
  gasLimit?: string;
  gasUsed?: string;
  baseFeePerGas?: string;
}

/**
 * Base blockchain provider interface
 */
export interface IBlockchainProvider {
  readonly chainInfo: ChainInfo;
  readonly isConnected: boolean;
  
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  switchChain(chainId: string | number): Promise<void>;
  
  // Account management
  getAccounts(): Promise<Address[]>;
  requestAccounts(): Promise<Address[]>;
  getBalance(address: Address, tokenAddress?: Address): Promise<string>;
  
  // Transaction operations
  sendTransaction(tx: TransactionSignRequest): Promise<string>;
  signTransaction(tx: TransactionSignRequest): Promise<string>;
  getTransaction(hash: string): Promise<TransactionStatusInfo>;
  estimateGas(tx: TransactionSignRequest): Promise<string>;
  getGasPrice(): Promise<string>;
  
  // Signing operations
  signMessage(request: SignatureRequest): Promise<SignatureResult>;
  signTypedData(request: SignatureRequest): Promise<SignatureResult>;
  
  // Blockchain queries
  getBlockNumber(): Promise<number>;
  getBlock(blockHashOrNumber: string | number): Promise<Block>;
  getTransactionCount(address: Address): Promise<number>;
  
  // Contract interactions
  call(tx: TransactionSignRequest): Promise<string>;
  
  // Events
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
  once(event: string, handler: (...args: any[]) => void): void;
}

/**
 * EVM-specific provider interface
 */
export interface IEVMProvider extends IBlockchainProvider {
  // EIP-1559 support
  getMaxPriorityFeePerGas(): Promise<string>;
  getFeeHistory(blockCount: number, newestBlock: string | number, rewardPercentiles: number[]): Promise<any>;
  
  // ENS support
  resolveName(ensName: string): Promise<Address | null>;
  lookupAddress(address: Address): Promise<string | null>;
  
  // Contract methods
  getCode(address: Address): Promise<string>;
  getStorageAt(address: Address, position: string): Promise<string>;
  
  // Logs and events
  getLogs(filter: {
    fromBlock?: string | number;
    toBlock?: string | number;
    address?: Address | Address[];
    topics?: string[];
  }): Promise<any[]>;
  
  // EIP-1193 compatibility
  request(args: { method: string; params?: any[] }): Promise<any>;
}

/**
 * Bitcoin-specific provider interface
 */
export interface IBitcoinProvider extends IBlockchainProvider {
  // UTXO management
  getUTXOs(address: Address): Promise<UTXO[]>;
  
  // Bitcoin-specific transaction building
  createTransaction(inputs: UTXO[], outputs: Output[], changeAddress: Address): Promise<any>;
  broadcastTransaction(signedTx: string): Promise<string>;
  
  // Address types
  getAddressType(address: Address): 'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr';
  
  // Fee estimation
  estimateFeeRate(priority: 'low' | 'medium' | 'high'): Promise<number>;
}

/**
 * Solana-specific provider interface
 */
export interface ISolanaProvider extends IBlockchainProvider {
  // Program interactions
  getAccountInfo(publicKey: string): Promise<any>;
  getProgramAccounts(programId: string, filters?: any[]): Promise<any[]>;
  
  // Transaction building
  getRecentBlockhash(): Promise<{ blockhash: string; feeCalculator: any }>;
  sendRawTransaction(signedTx: string): Promise<string>;
  
  // Token operations
  getTokenAccountsByOwner(owner: string, mint?: string): Promise<any[]>;
  getTokenSupply(mint: string): Promise<string>;
  
  // Staking
  getStakeActivation(publicKey: string): Promise<any>;
  getValidators(): Promise<any[]>;
}

/**
 * UTXO structure for Bitcoin-like chains
 */
export interface UTXO {
  txid: string;
  vout: number;
  value: string;
  scriptPubKey: string;
  confirmations: number;
}

/**
 * Output structure for Bitcoin transactions
 */
export interface Output {
  address: Address;
  value: string;
}

/**
 * Provider factory interface
 */
export interface IProviderFactory {
  createProvider(chainInfo: ChainInfo, config?: ProviderConfig): IBlockchainProvider;
  getSupportedChains(): ChainInfo[];
  isChainSupported(chainId: string | number): boolean;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  rpcUrl?: string;
  apiKey?: string;
  timeout?: number;
  retryCount?: number;
  headers?: Record<string, string>;
  customProvider?: any; // For injecting custom provider instances
}

/**
 * Provider events
 */
export interface ProviderEvents {
  connect: (chainId: string | number) => void;
  disconnect: (error?: Error) => void;
  chainChanged: (chainId: string | number) => void;
  accountsChanged: (accounts: Address[]) => void;
  message: (message: any) => void;
  error: (error: Error) => void;
}

/**
 * Multi-provider manager interface
 */
export interface IMultiProviderManager {
  addProvider(chainId: string | number, provider: IBlockchainProvider): void;
  removeProvider(chainId: string | number): void;
  getProvider(chainId: string | number): IBlockchainProvider | undefined;
  getAllProviders(): Map<string | number, IBlockchainProvider>;
  setActiveProvider(chainId: string | number): void;
  getActiveProvider(): IBlockchainProvider | undefined;
}