/**
 * EVM Transaction Builder implementation
 */
import type { IEVMTransactionBuilder, IEVMTransaction, AccessListItem, TransactionValidationResult } from '../interfaces/transaction.interface';
import type { Address, HexString } from '../types';
/**
 * EVM Transaction Builder
 */
export declare class EVMTransactionBuilder implements IEVMTransactionBuilder {
    private tx;
    /**
     * Reset the builder
     */
    reset(): void;
    /**
     * Set from address
     */
    setFrom(address: Address): this;
    /**
     * Set to address
     */
    setTo(address: Address): this;
    /**
     * Set value
     */
    setValue(value: string): this;
    /**
     * Set data
     */
    setData(data: HexString): this;
    /**
     * Set nonce
     */
    setNonce(nonce: number): this;
    /**
     * Set gas limit
     */
    setGas(gas: string): this;
    /**
     * Set gas price (legacy)
     */
    setGasPrice(gasPrice: string): this;
    /**
     * Set max fee per gas (EIP-1559)
     */
    setMaxFeePerGas(maxFee: string): this;
    /**
     * Set max priority fee per gas (EIP-1559)
     */
    setMaxPriorityFeePerGas(maxPriorityFee: string): this;
    /**
     * Set transaction type
     */
    setType(type: 0 | 1 | 2): this;
    /**
     * Set access list (EIP-2930)
     */
    setAccessList(accessList: AccessListItem[]): this;
    /**
     * Set chain ID
     */
    setChainId(chainId: number): this;
    /**
     * Build the transaction
     */
    build(): IEVMTransaction;
    /**
     * Validate the transaction
     */
    validate(): TransactionValidationResult;
    /**
     * Check if address is valid
     */
    private isValidAddress;
    /**
     * Check if hex string is valid
     */
    private isValidHexString;
}
//# sourceMappingURL=EVMTransactionBuilder.d.ts.map