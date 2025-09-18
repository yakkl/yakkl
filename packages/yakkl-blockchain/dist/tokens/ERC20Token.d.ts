/**
 * ERC20 token implementation
 */
import { BaseToken } from './BaseToken';
import type { TokenInfo, TokenMetadata } from './types';
import type { BigNumberish, ProviderInterface } from '../providers/types';
export declare class ERC20Token extends BaseToken {
    constructor(info: TokenInfo, metadata?: TokenMetadata, provider?: ProviderInterface);
    /**
     * Get token name from contract (IERC20 method)
     */
    getName(): Promise<string>;
    /**
     * Get token symbol from contract (IERC20 method)
     */
    getSymbol(): Promise<string>;
    /**
     * Get token decimals from contract (IERC20 method)
     */
    getDecimals(): Promise<number>;
    /**
     * Get total supply of the token
     */
    totalSupply(): Promise<BigNumberish>;
    /**
     * Get balance of an address
     */
    balanceOf(account: string): Promise<BigNumberish>;
    /**
     * Get balance implementation
     */
    getBalance(address: string): Promise<BigNumberish>;
    /**
     * Transfer tokens to another address
     */
    transfer(to: string, amount: BigNumberish): Promise<string>;
    /**
     * Get allowance for a spender
     */
    allowance(owner: string, spender: string): Promise<BigNumberish>;
    /**
     * Approve a spender to use tokens
     */
    approve(spender: string, amount: BigNumberish): Promise<string>;
    /**
     * Transfer tokens from one address to another (requires approval)
     */
    transferFrom(from: string, to: string, amount: BigNumberish): Promise<boolean>;
    /**
     * Encode function data for contract calls
     * This is a simplified version - in production, use ethers.js or similar
     */
    private encodeFunctionData;
    /**
     * Decode function result from contract call
     * This is a simplified version - in production, use ethers.js or similar
     */
    private decodeFunctionResult;
    /**
     * Create an ERC20 token instance from an address
     */
    static fromAddress(address: string, chainId: number, provider: ProviderInterface): Promise<ERC20Token>;
}
