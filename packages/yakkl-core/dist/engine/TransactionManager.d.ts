/**
 * TransactionManager - Handles transaction signing, sending, and tracking
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from './WalletEngine';
import type { Transaction, SignedTransaction, Balance, TransactionHistory } from './types';
export interface TransactionManagerEvents {
    'transaction:signed': (signedTx: SignedTransaction) => void;
    'transaction:sent': (hash: string, transaction: Transaction) => void;
    'transaction:confirmed': (hash: string, receipt: any) => void;
    'transaction:failed': (hash: string, error: Error) => void;
    'balance:updated': (address: string, balance: Balance) => void;
}
export declare class TransactionManager extends EventEmitter<TransactionManagerEvents> {
    private engine;
    private pendingTransactions;
    private transactionHistory;
    private balanceCache;
    private initialized;
    constructor(engine: WalletEngine);
    /**
     * Initialize the transaction manager
     */
    initialize(): Promise<void>;
    /**
     * Sign a transaction
     */
    sign(transaction: Transaction): Promise<SignedTransaction>;
    /**
     * Send a transaction
     */
    send(transaction: Transaction): Promise<string>;
    /**
     * Get balance for an address
     */
    getBalance(address: string): Promise<Balance>;
    /**
     * Get transaction history for an address
     */
    getHistory(address: string, limit?: number): Promise<TransactionHistory[]>;
    /**
     * Estimate gas for a transaction
     */
    estimateGas(transaction: Partial<Transaction>): Promise<string>;
    /**
     * Get current gas prices
     */
    getGasPrices(): Promise<{
        slow: string;
        standard: string;
        fast: string;
        maxFeePerGas?: string;
        maxPriorityFeePerGas?: string;
    }>;
    /**
     * Refresh balance for an address
     */
    refreshBalance(address: string): Promise<Balance>;
    /**
     * Cancel a pending transaction (if possible)
     */
    cancelTransaction(hash: string): Promise<string>;
    /**
     * Destroy the transaction manager
     */
    destroy(): Promise<void>;
    /**
     * Private methods
     */
    private monitorTransaction;
    private addToHistory;
    private determineTransactionType;
    private isBalanceCacheValid;
    private loadTransactionHistory;
    private saveTransactionHistory;
    private loadPendingTransactions;
    private savePendingTransactions;
    private ensureInitialized;
}
//# sourceMappingURL=TransactionManager.d.ts.map