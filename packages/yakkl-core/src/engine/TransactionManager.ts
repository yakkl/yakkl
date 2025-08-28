/**
 * TransactionManager - Handles transaction signing, sending, and tracking
 */

import { EventEmitter } from 'eventemitter3';
import { ethers } from 'ethers';
const { Wallet } = ethers;
import type { WalletEngine } from './WalletEngine';
import type { 
  Transaction, 
  SignedTransaction, 
  Balance, 
  TokenBalance, 
  NFTBalance,
  TransactionHistory,
  TransactionStatus,
  TransactionHistoryType
} from './types';

export interface TransactionManagerEvents {
  'transaction:signed': (signedTx: SignedTransaction) => void;
  'transaction:sent': (hash: string, transaction: Transaction) => void;
  'transaction:confirmed': (hash: string, receipt: any) => void;
  'transaction:failed': (hash: string, error: Error) => void;
  'balance:updated': (address: string, balance: Balance) => void;
}

export class TransactionManager extends EventEmitter<TransactionManagerEvents> {
  private engine: WalletEngine;
  private pendingTransactions = new Map<string, Transaction>();
  private transactionHistory = new Map<string, TransactionHistory[]>();
  private balanceCache = new Map<string, Balance>();
  private initialized = false;

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
  }

  /**
   * Initialize the transaction manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load transaction history from storage
      await this.loadTransactionHistory();
      
      // Load pending transactions
      await this.loadPendingTransactions();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize TransactionManager: ${error}`);
    }
  }

  /**
   * Sign a transaction
   */
  async sign(transaction: Transaction): Promise<SignedTransaction> {
    this.ensureInitialized();

    try {
      // Get current account
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) {
        throw new Error('No account selected');
      }

      // Get account private key
      const privateKey = await this.engine.accounts.getPrivateKey(currentAccount.id);
      const wallet = new ethers.Wallet(privateKey);

      // Get current network provider
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error('No network provider available');
      }

      const connectedWallet = wallet.connect(provider);

      // Prepare transaction
      const txRequest = {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
        gasLimit: transaction.gasLimit,
        gasPrice: transaction.gasPrice,
        maxFeePerGas: transaction.maxFeePerGas,
        maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
        nonce: transaction.nonce,
        type: transaction.type
      };

      // Fill in missing fields
      const populatedTx = await connectedWallet.populateTransaction(txRequest);

      // Sign the transaction
      const signedTxResponse = await connectedWallet.signTransaction(populatedTx);

      // Parse the signed transaction
      const parsedTx = ethers.utils.parseTransaction(signedTxResponse);

      const signedTransaction: SignedTransaction = {
        transaction: {
          ...transaction,
          gasLimit: populatedTx.gasLimit?.toString(),
          gasPrice: populatedTx.gasPrice?.toString(),
          maxFeePerGas: populatedTx.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: populatedTx.maxPriorityFeePerGas?.toString(),
          nonce: populatedTx.nonce ? Number(populatedTx.nonce) : 0
        },
        signature: {
          r: parsedTx.r!,
          s: parsedTx.s!,
          v: parsedTx.v || 0
        },
        hash: parsedTx.hash!,
        serialized: signedTxResponse
      };

      this.emit('transaction:signed', signedTransaction);
      return signedTransaction;
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Send a transaction
   */
  async send(transaction: Transaction): Promise<string> {
    this.ensureInitialized();

    try {
      // Sign the transaction first
      const signedTx = await this.sign(transaction);

      // Get provider
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error('No network provider available');
      }

      // Send the transaction
      const txResponse = await provider.broadcastTransaction(signedTx.serialized);
      const hash = txResponse.hash;

      // Store as pending
      this.pendingTransactions.set(hash, transaction);
      await this.savePendingTransactions();

      // Start monitoring
      this.monitorTransaction(hash, txResponse);

      this.emit('transaction:sent', hash, transaction);
      return hash;
    } catch (error) {
      throw new Error(`Failed to send transaction: ${error}`);
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<Balance> {
    this.ensureInitialized();

    try {
      // Check cache first (with TTL)
      const cached = this.balanceCache.get(address);
      if (cached && this.isBalanceCacheValid(cached)) {
        return cached;
      }

      // Get current network
      const network = this.engine.networks.getCurrent();
      if (!network) {
        throw new Error('No network selected');
      }

      // Get provider
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error('No network provider available');
      }

      // Get native balance
      const nativeBalance = await provider.getBalance(address);

      // Create balance object
      const balance: Balance = {
        address,
        chainId: network.chainId,
        native: {
          token: network.gasToken,
          balance: nativeBalance.toString(),
          value: '0', // Would calculate USD value in production
          price: '0'
        },
        tokens: [], // Would load ERC-20 tokens in production
        nfts: [], // Would load NFTs in production
        totalValue: '0', // Would calculate total USD value
        lastUpdated: new Date()
      };

      // Cache the result
      this.balanceCache.set(address, balance);

      this.emit('balance:updated', address, balance);
      return balance;
    } catch (error) {
      throw new Error(`Failed to get balance: ${error}`);
    }
  }

  /**
   * Get transaction history for an address
   */
  async getHistory(address: string, limit = 50): Promise<TransactionHistory[]> {
    this.ensureInitialized();

    const history = this.transactionHistory.get(address) || [];
    return history.slice(0, limit);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: Partial<Transaction>): Promise<string> {
    this.ensureInitialized();

    try {
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error('No network provider available');
      }

      const gasEstimate = await provider.estimateGas({
        to: transaction.to,
        value: transaction.value,
        data: transaction.data
      });

      return gasEstimate.toString();
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }

  /**
   * Get current gas prices
   */
  async getGasPrices(): Promise<{
    slow: string;
    standard: string;
    fast: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    this.ensureInitialized();

    try {
      const provider = this.engine.networks.getProvider();
      if (!provider) {
        throw new Error('No network provider available');
      }

      const feeData = await provider.getFeeData();

      // For EIP-1559 networks  
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        const baseFee = feeData.maxFeePerGas.sub(feeData.maxPriorityFeePerGas);
        const slowPriority = feeData.maxPriorityFeePerGas.div(2);
        const fastPriority = feeData.maxPriorityFeePerGas.mul(2);

        return {
          slow: baseFee.add(slowPriority).toString(),
          standard: feeData.maxFeePerGas.toString(),
          fast: baseFee.add(fastPriority).toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString()
        };
      }

      // For legacy networks
      const gasPrice = feeData.gasPrice || 0n;
      return {
        slow: (gasPrice * 8n / 10n).toString(), // 80% of current
        standard: gasPrice.toString(),
        fast: (gasPrice * 12n / 10n).toString() // 120% of current
      };
    } catch (error) {
      throw new Error(`Failed to get gas prices: ${error}`);
    }
  }

  /**
   * Refresh balance for an address
   */
  async refreshBalance(address: string): Promise<Balance> {
    // Clear cache and fetch fresh balance
    this.balanceCache.delete(address);
    return this.getBalance(address);
  }

  /**
   * Cancel a pending transaction (if possible)
   */
  async cancelTransaction(hash: string): Promise<string> {
    this.ensureInitialized();

    const pendingTx = this.pendingTransactions.get(hash);
    if (!pendingTx) {
      throw new Error('Transaction not found or already confirmed');
    }

    try {
      // Create cancellation transaction (send 0 ETH to self with higher gas)
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) {
        throw new Error('No account selected');
      }

      const gasPrices = await this.getGasPrices();
      const cancelTx: Transaction = {
        to: currentAccount.address,
        value: '0',
        chainId: pendingTx.chainId,
        nonce: pendingTx.nonce,
        gasLimit: '21000',
        // Use higher gas price to prioritize cancellation
        gasPrice: (BigInt(gasPrices.fast) * 11n / 10n).toString() // 110% of fast
      };

      return this.send(cancelTx);
    } catch (error) {
      throw new Error(`Failed to cancel transaction: ${error}`);
    }
  }

  /**
   * Destroy the transaction manager
   */
  async destroy(): Promise<void> {
    this.pendingTransactions.clear();
    this.transactionHistory.clear();
    this.balanceCache.clear();
    this.initialized = false;
    this.removeAllListeners();
  }

  /**
   * Private methods
   */
  private async monitorTransaction(hash: string, txResponse: any): Promise<void> {
    try {
      const receipt = await txResponse.wait();
      
      // Remove from pending
      this.pendingTransactions.delete(hash);
      await this.savePendingTransactions();

      // Add to history
      await this.addToHistory(hash, receipt);

      if (receipt.status === 1) {
        this.emit('transaction:confirmed', hash, receipt);
      } else {
        this.emit('transaction:failed', hash, new Error('Transaction reverted'));
      }
    } catch (error) {
      this.emit('transaction:failed', hash, error as Error);
    }
  }

  private async addToHistory(hash: string, receipt: any): Promise<void> {
    try {
      const currentAccount = this.engine.getCurrentAccount();
      if (!currentAccount) return;

      const provider = this.engine.networks.getProvider();
      if (!provider) return;

      const tx = await provider.getTransaction(hash);
      if (!tx) return;

      const block = await provider.getBlock(receipt.blockNumber);
      
      const historyItem: TransactionHistory = {
        hash: hash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(block!.timestamp * 1000),
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value.toString(),
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString() || '0',
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        type: this.determineTransactionType(tx),
        metadata: {
          blockHash: receipt.blockHash,
          transactionIndex: receipt.transactionIndex,
          logs: receipt.logs
        }
      };

      // Add to history for the account
      const address = currentAccount.address;
      const existing = this.transactionHistory.get(address) || [];
      existing.unshift(historyItem); // Add to beginning
      
      // Keep only last 1000 transactions
      if (existing.length > 1000) {
        existing.splice(1000);
      }
      
      this.transactionHistory.set(address, existing);
      await this.saveTransactionHistory();
    } catch (error) {
      console.error('Failed to add transaction to history:', error);
    }
  }

  private determineTransactionType(tx: any): TransactionHistoryType {
    if (tx.data && tx.data !== '0x') {
      // Has data, likely a contract interaction
      return 'contract';
    }
    
    if (tx.value && BigInt(tx.value) > 0) {
      // Has value, it's a transfer
      return 'send'; // Could be 'receive' depending on perspective
    }
    
    return 'send';
  }

  private isBalanceCacheValid(balance: Balance): boolean {
    const now = new Date();
    const age = now.getTime() - balance.lastUpdated.getTime();
    return age < 30000; // 30 seconds cache
  }

  private async loadTransactionHistory(): Promise<void> {
    try {
      const stored = localStorage.getItem('yakkl:transactionHistory');
      if (stored) {
        const data = JSON.parse(stored);
        for (const [address, history] of Object.entries(data)) {
          // Convert date strings back to Date objects
          const typedHistory = (history as any[]).map(item => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          this.transactionHistory.set(address, typedHistory);
        }
      }
    } catch (error) {
      console.warn('Failed to load transaction history:', error);
    }
  }

  private async saveTransactionHistory(): Promise<void> {
    try {
      const data = Object.fromEntries(this.transactionHistory);
      localStorage.setItem('yakkl:transactionHistory', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save transaction history:', error);
    }
  }

  private async loadPendingTransactions(): Promise<void> {
    try {
      const stored = localStorage.getItem('yakkl:pendingTransactions');
      if (stored) {
        const data = JSON.parse(stored);
        this.pendingTransactions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load pending transactions:', error);
    }
  }

  private async savePendingTransactions(): Promise<void> {
    try {
      const data = Object.fromEntries(this.pendingTransactions);
      localStorage.setItem('yakkl:pendingTransactions', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save pending transactions:', error);
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TransactionManager not initialized');
    }
  }
}