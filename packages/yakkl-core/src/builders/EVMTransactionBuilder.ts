/**
 * EVM Transaction Builder implementation
 */

import type {
  IEVMTransactionBuilder,
  IEVMTransaction,
  AccessListItem,
  TransactionValidationResult
} from '../interfaces/transaction.interface';
import type { Address, HexString } from '../types';

/**
 * EVM Transaction Builder
 */
export class EVMTransactionBuilder implements IEVMTransactionBuilder {
  private tx: Partial<IEVMTransaction> = {};

  /**
   * Reset the builder
   */
  reset(): void {
    this.tx = {};
  }

  /**
   * Set from address
   */
  setFrom(address: Address): this {
    this.tx.from = address;
    return this;
  }

  /**
   * Set to address
   */
  setTo(address: Address): this {
    this.tx.to = address;
    return this;
  }

  /**
   * Set value
   */
  setValue(value: string): this {
    this.tx.value = value;
    return this;
  }

  /**
   * Set data
   */
  setData(data: HexString): this {
    this.tx.data = data;
    return this;
  }

  /**
   * Set nonce
   */
  setNonce(nonce: number): this {
    this.tx.nonce = nonce;
    return this;
  }

  /**
   * Set gas limit
   */
  setGas(gas: string): this {
    this.tx.gas = gas;
    return this;
  }

  /**
   * Set gas price (legacy)
   */
  setGasPrice(gasPrice: string): this {
    this.tx.gasPrice = gasPrice;
    this.tx.type = 0; // Legacy transaction
    return this;
  }

  /**
   * Set max fee per gas (EIP-1559)
   */
  setMaxFeePerGas(maxFee: string): this {
    this.tx.maxFeePerGas = maxFee;
    this.tx.type = 2; // EIP-1559 transaction
    return this;
  }

  /**
   * Set max priority fee per gas (EIP-1559)
   */
  setMaxPriorityFeePerGas(maxPriorityFee: string): this {
    this.tx.maxPriorityFeePerGas = maxPriorityFee;
    this.tx.type = 2; // EIP-1559 transaction
    return this;
  }

  /**
   * Set transaction type
   */
  setType(type: 0 | 1 | 2): this {
    this.tx.type = type;
    return this;
  }

  /**
   * Set access list (EIP-2930)
   */
  setAccessList(accessList: AccessListItem[]): this {
    this.tx.accessList = accessList;
    if (this.tx.type === 0) {
      this.tx.type = 1; // Upgrade to access list transaction
    }
    return this;
  }

  /**
   * Set chain ID
   */
  setChainId(chainId: number): this {
    this.tx.chainId = chainId;
    return this;
  }

  /**
   * Build the transaction
   */
  build(): IEVMTransaction {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid transaction: ${validation.errors?.join(', ')}`);
    }

    // Set defaults
    const tx: IEVMTransaction = {
      from: this.tx.from!,
      to: this.tx.to,
      value: this.tx.value || '0',
      data: this.tx.data,
      nonce: this.tx.nonce,
      chainId: this.tx.chainId,
      gas: this.tx.gas,
      type: this.tx.type || 0,
      accessList: this.tx.accessList
    };

    // Add gas pricing based on transaction type
    if (this.tx.type === 2) {
      // EIP-1559
      tx.maxFeePerGas = this.tx.maxFeePerGas;
      tx.maxPriorityFeePerGas = this.tx.maxPriorityFeePerGas;
    } else {
      // Legacy or EIP-2930
      tx.gasPrice = this.tx.gasPrice;
    }

    return tx;
  }

  /**
   * Validate the transaction
   */
  validate(): TransactionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!this.tx.from) {
      errors.push('From address is required');
    }

    // Validate addresses
    if (this.tx.from && !this.isValidAddress(this.tx.from)) {
      errors.push('Invalid from address');
    }

    if (this.tx.to && !this.isValidAddress(this.tx.to)) {
      errors.push('Invalid to address');
    }

    // Validate value
    if (this.tx.value) {
      try {
        const valueBigInt = BigInt(this.tx.value);
        if (valueBigInt < 0n) {
          errors.push('Value cannot be negative');
        }
      } catch {
        errors.push('Invalid value format');
      }
    }

    // Validate gas
    if (this.tx.gas) {
      try {
        const gasBigInt = BigInt(this.tx.gas);
        if (gasBigInt <= 0n) {
          errors.push('Gas must be positive');
        }
        if (gasBigInt < 21000n) {
          warnings.push('Gas limit may be too low');
        }
      } catch {
        errors.push('Invalid gas format');
      }
    }

    // Validate gas pricing
    if (this.tx.type === 2) {
      // EIP-1559
      if (!this.tx.maxFeePerGas) {
        errors.push('Max fee per gas is required for EIP-1559 transactions');
      }
      if (!this.tx.maxPriorityFeePerGas) {
        errors.push('Max priority fee per gas is required for EIP-1559 transactions');
      }
      if (this.tx.maxFeePerGas && this.tx.maxPriorityFeePerGas) {
        try {
          const maxFee = BigInt(this.tx.maxFeePerGas);
          const maxPriority = BigInt(this.tx.maxPriorityFeePerGas);
          if (maxPriority > maxFee) {
            errors.push('Max priority fee cannot exceed max fee');
          }
        } catch {
          errors.push('Invalid gas fee format');
        }
      }
    } else {
      // Legacy
      if (!this.tx.gasPrice && !this.tx.to) {
        warnings.push('Gas price not set for contract deployment');
      }
    }

    // Validate data
    if (this.tx.data && !this.isValidHexString(this.tx.data)) {
      errors.push('Invalid data format');
    }

    // Contract creation specific
    if (!this.tx.to && !this.tx.data) {
      errors.push('Contract creation requires data');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Check if address is valid
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Check if hex string is valid
   */
  private isValidHexString(hex: string): boolean {
    return /^0x[a-fA-F0-9]*$/.test(hex);
  }
}