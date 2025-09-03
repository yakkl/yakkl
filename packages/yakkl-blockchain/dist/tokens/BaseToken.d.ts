/**
 * Base token implementation
 */
import type { IToken, TokenInfo, TokenMetadata } from './types';
import type { BigNumberish, IProvider } from '../providers/types';
export declare abstract class BaseToken implements IToken {
    readonly address: string;
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
    readonly chainId: number;
    readonly logoURI?: string;
    readonly description?: string;
    readonly tags?: string[];
    readonly isNative?: boolean;
    readonly isStablecoin?: boolean;
    readonly isWrapped?: boolean;
    readonly isLPToken?: boolean;
    readonly website?: string;
    readonly twitter?: string;
    readonly coingeckoId?: string;
    readonly coinmarketcapId?: string;
    protected provider?: IProvider;
    constructor(info: TokenInfo, metadata?: TokenMetadata, provider?: IProvider);
    abstract getBalance(address: string): Promise<BigNumberish>;
    abstract transfer(to: string, amount: BigNumberish): Promise<string>;
    abstract approve(spender: string, amount: BigNumberish): Promise<string>;
    abstract allowance(owner: string, spender: string): Promise<BigNumberish>;
    abstract totalSupply(): Promise<BigNumberish>;
    setProvider(provider: IProvider): void;
    getProvider(): IProvider | undefined;
    /**
     * Format balance from smallest unit to human-readable
     */
    formatBalance(balance: BigNumberish): string;
    /**
     * Parse human-readable amount to smallest unit
     */
    parseAmount(amount: string | number): bigint;
    /**
     * Check if this token is the same as another
     */
    equals(other: IToken | TokenInfo): boolean;
    /**
     * Get a unique identifier for this token
     */
    getId(): string;
    /**
     * Convert to JSON representation
     */
    toJSON(): TokenInfo & Partial<TokenMetadata>;
    /**
     * Create a string representation
     */
    toString(): string;
}
