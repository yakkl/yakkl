/**
 * Transaction builder and management interfaces
 */

import type { Address, HexString } from '../types';
import type { ChainType } from './provider.interface';

/**
 * Base transaction interface
 */
export interface ITransaction {
  from: Address;
  to?: Address;
  value?: string;
  data?: HexString;
  nonce?: number;
  chainId?: string | number;
}

/**
 * EVM transaction interface
 */
export interface IEVMTransaction extends ITransaction {
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  type?: 0 | 1 | 2; // Legacy, EIP-2930, EIP-1559
  accessList?: AccessListItem[];
}

/**
 * Bitcoin transaction interface
 */
export interface IBitcoinTransaction {
  inputs: TxInput[];
  outputs: TxOutput[];
  version?: number;
  locktime?: number;
  fee?: string;
}

/**
 * Solana transaction interface
 */
export interface ISolanaTransaction {
  instructions: SolanaInstruction[];
  recentBlockhash: string;
  feePayer: string;
  signatures?: string[];
}

/**
 * Access list item for EIP-2930
 */
export interface AccessListItem {
  address: Address;
  storageKeys: HexString[];
}

/**
 * Bitcoin transaction input
 */
export interface TxInput {
  txid: string;
  vout: number;
  scriptSig?: string;
  sequence?: number;
  witness?: string[];
}

/**
 * Bitcoin transaction output
 */
export interface TxOutput {
  value: string;
  scriptPubKey: string;
  address?: Address;
}

/**
 * Solana instruction
 */
export interface SolanaInstruction {
  programId: string;
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: string;
}

/**
 * Transaction builder interface
 */
export interface ITransactionBuilder<T = ITransaction> {
  reset(): void;
  setFrom(address: Address): this;
  setTo(address: Address): this;
  setValue(value: string): this;
  setData(data: HexString): this;
  setNonce(nonce: number): this;
  build(): T;
  validate(): TransactionValidationResult;
}

/**
 * EVM transaction builder
 */
export interface IEVMTransactionBuilder extends ITransactionBuilder<IEVMTransaction> {
  setGas(gas: string): this;
  setGasPrice(gasPrice: string): this;
  setMaxFeePerGas(maxFee: string): this;
  setMaxPriorityFeePerGas(maxPriorityFee: string): this;
  setType(type: 0 | 1 | 2): this;
  setAccessList(accessList: AccessListItem[]): this;
}

/**
 * Bitcoin transaction builder
 */
export interface IBitcoinTransactionBuilder {
  reset(): void;
  addInput(input: TxInput): this;
  addOutput(output: TxOutput): this;
  setVersion(version: number): this;
  setLocktime(locktime: number): this;
  setFee(fee: string): this;
  build(): IBitcoinTransaction;
  validate(): TransactionValidationResult;
}

/**
 * Transaction validation result
 */
export interface TransactionValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Transaction serializer interface
 */
export interface ITransactionSerializer<T = ITransaction> {
  serialize(tx: T): HexString;
  deserialize(data: HexString): T;
  hash(tx: T): HexString;
}

/**
 * Transaction signer interface
 */
export interface ITransactionSigner<T = ITransaction> {
  signTransaction(tx: T, privateKey: string): Promise<SignedTransaction<T>>;
  signMessage(message: string, privateKey: string): Promise<string>;
  verifySignature(tx: SignedTransaction<T>): Promise<boolean>;
}

/**
 * Signed transaction
 */
export interface SignedTransaction<T = ITransaction> {
  transaction: T;
  signature: string | TransactionSignature;
  hash: string;
  serialized: string;
}

/**
 * Transaction signature components
 */
export interface TransactionSignature {
  r: string;
  s: string;
  v?: number | string;
  recoveryParam?: number;
}

/**
 * Transaction factory interface
 */
export interface ITransactionFactory {
  createBuilder(chainType: ChainType): ITransactionBuilder;
  createSerializer(chainType: ChainType): ITransactionSerializer;
  createSigner(chainType: ChainType): ITransactionSigner;
}

/**
 * Fee estimation interface
 */
export interface IFeeEstimator {
  estimateFee(tx: ITransaction, priority?: 'low' | 'medium' | 'high'): Promise<FeeEstimate>;
  getSuggestedGasPrice(): Promise<string>;
  getBaseFee(): Promise<string>;
}

/**
 * Fee estimate result
 */
export interface FeeEstimate {
  fee: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  confidence: 'low' | 'medium' | 'high';
  estimatedTime?: number; // seconds
}

/**
 * Transaction monitor interface
 */
export interface ITransactionMonitor {
  watchTransaction(hash: string, callbacks: TransactionCallbacks): void;
  unwatchTransaction(hash: string): void;
  getWatchedTransactions(): string[];
  isWatching(hash: string): boolean;
}

/**
 * Transaction monitoring callbacks
 */
export interface TransactionCallbacks {
  onPending?: (hash: string) => void;
  onConfirmation?: (confirmations: number) => void;
  onSuccess?: (receipt: any) => void;
  onFailure?: (error: Error) => void;
  onSpeedUp?: (newHash: string) => void;
  onCancel?: () => void;
}

/**
 * Transaction history interface
 */
export interface ITransactionHistory {
  hash: string;
  from: Address;
  to?: Address;
  value: string;
  fee?: string;
  timestamp: number;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: TransactionCategory;
  chainId: string | number;
  metadata?: Record<string, any>;
}

/**
 * Transaction category types
 */
export enum TransactionCategory {
  SEND = 'send',
  RECEIVE = 'receive',
  SWAP = 'swap',
  BRIDGE = 'bridge',
  CONTRACT_CALL = 'contract_call',
  TOKEN_TRANSFER = 'token_transfer',
  NFT_TRANSFER = 'nft_transfer',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  APPROVAL = 'approval'
}

/**
 * Transaction manager interface
 */
export interface ITransactionManager {
  // Transaction lifecycle
  createTransaction(params: any): Promise<ITransaction>;
  signTransaction(tx: ITransaction): Promise<SignedTransaction>;
  sendTransaction(signedTx: SignedTransaction): Promise<string>;
  cancelTransaction(hash: string): Promise<boolean>;
  speedUpTransaction(hash: string, newFee: string): Promise<string>;
  
  // Transaction queries
  getTransaction(hash: string): Promise<ITransactionHistory>;
  getTransactionHistory(address: Address, options?: HistoryOptions): Promise<ITransactionHistory[]>;
  getPendingTransactions(address: Address): Promise<ITransactionHistory[]>;
  
  // Fee management
  estimateFee(tx: ITransaction): Promise<FeeEstimate>;
  updateTransactionFee(tx: ITransaction, fee: FeeEstimate): ITransaction;
}

/**
 * History query options
 */
export interface HistoryOptions {
  limit?: number;
  offset?: number;
  fromBlock?: number;
  toBlock?: number;
  type?: TransactionCategory[];
  status?: ('pending' | 'confirmed' | 'failed')[];
  sortBy?: 'timestamp' | 'value' | 'fee';
  sortOrder?: 'asc' | 'desc';
}