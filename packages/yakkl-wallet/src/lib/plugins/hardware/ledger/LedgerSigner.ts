// Ledger transaction and message signing

import type {
  TransactionData,
  SignedTransaction,
  TypedData,
  TransactionBatch
} from '../common/HardwareWalletTypes';
import { HardwareWalletError } from '../common/HardwareWalletTypes';
import { LedgerEthereumApp } from './LedgerEthereumApp';

export class LedgerSigner {
  private ethApp: LedgerEthereumApp;

  constructor(ethApp: LedgerEthereumApp) {
    this.ethApp = ethApp;
  }

  async signTransaction(
    deviceId: string,
    derivationPath: string,
    transaction: TransactionData
  ): Promise<SignedTransaction> {
    // Validate transaction
    this.validateTransaction(transaction);

    // Sign the transaction
    return await this.ethApp.signTransaction(deviceId, derivationPath, transaction);
  }

  async signMessage(
    deviceId: string,
    derivationPath: string,
    message: string
  ): Promise<string> {
    if (!message || message.length === 0) {
      throw new HardwareWalletError(
        'Message cannot be empty',
        'INVALID_MESSAGE',
        'ledger'
      );
    }

    return await this.ethApp.signMessage(deviceId, derivationPath, message);
  }

  async signTypedData(
    deviceId: string,
    derivationPath: string,
    typedData: TypedData
  ): Promise<string> {
    // Validate typed data structure
    if (!typedData.domain || !typedData.types || !typedData.message) {
      throw new HardwareWalletError(
        'Invalid typed data structure',
        'INVALID_TYPED_DATA',
        'ledger'
      );
    }

    return await this.ethApp.signTypedData(deviceId, derivationPath, typedData);
  }

  async bulkSignTransactions(
    deviceId: string,
    transactions: TransactionBatch[]
  ): Promise<SignedTransaction[]> {
    const signatures: SignedTransaction[] = [];

    // Sign transactions sequentially
    // Ledger doesn't support true bulk signing, but we can optimize the UX
    for (const batch of transactions) {
      try {
        const signature = await this.signTransaction(
          deviceId,
          batch.derivationPath,
          batch.transaction
        );
        signatures.push(signature);
      } catch (error) {
        // If any transaction fails, throw with context
        throw new HardwareWalletError(
          `Failed to sign transaction ${signatures.length + 1} of ${transactions.length}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'BULK_SIGN_FAILED',
          'ledger'
        );
      }
    }

    return signatures;
  }

  async verifyAddress(
    deviceId: string,
    derivationPath: string
  ): Promise<boolean> {
    try {
      // Request address with display flag set to true
      await this.ethApp.getAddress(deviceId, derivationPath, true);

      // If the user confirms on device, the operation succeeds
      return true;
    } catch (error) {
      // User rejected or other error
      return false;
    }
  }

  private validateTransaction(tx: TransactionData): void {
    // Validate required fields
    if (!tx.to && (!tx.data || tx.data === '0x')) {
      throw new HardwareWalletError(
        'Transaction must have a recipient (to) or data',
        'INVALID_TRANSACTION',
        'ledger'
      );
    }

    if (!tx.chainId) {
      throw new HardwareWalletError(
        'Chain ID is required',
        'MISSING_CHAIN_ID',
        'ledger'
      );
    }

    // Validate address format
    if (tx.to && !this.isValidAddress(tx.to)) {
      throw new HardwareWalletError(
        'Invalid recipient address',
        'INVALID_ADDRESS',
        'ledger'
      );
    }

    // Validate numeric values
    const numericFields = ['value', 'gasLimit', 'gasPrice', 'maxFeePerGas', 'maxPriorityFeePerGas', 'nonce'];
    for (const field of numericFields) {
      const value = tx[field as keyof TransactionData];
      if (value && !this.isValidHexNumber(value.toString())) {
        throw new HardwareWalletError(
          `Invalid ${field} value`,
          'INVALID_VALUE',
          'ledger'
        );
      }
    }
  }

  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private isValidHexNumber(value: string): boolean {
    return /^0x[a-fA-F0-9]+$/.test(value);
  }
}
