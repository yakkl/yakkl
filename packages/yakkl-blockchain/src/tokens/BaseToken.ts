/**
 * Base token implementation
 */

import type { IToken, TokenInfo, TokenMetadata } from './types';
import type { BigNumberish, ProviderInterface } from '../providers/types';

export abstract class BaseToken implements IToken {
  // TokenInfo properties
  readonly address: string;
  readonly name: string;
  readonly symbol: string;
  readonly decimals: number;
  readonly chainId: number;
  readonly logoURI?: string;
  readonly description?: string;
  readonly tags?: string[];

  // TokenMetadata properties
  readonly isNative?: boolean;
  readonly isStablecoin?: boolean;
  readonly isWrapped?: boolean;
  readonly isLPToken?: boolean;
  readonly website?: string;
  readonly twitter?: string;
  readonly coingeckoId?: string;
  readonly coinmarketcapId?: string;

  // Protected provider for blockchain interactions
  protected provider?: ProviderInterface;

  constructor(info: TokenInfo, metadata?: TokenMetadata, provider?: ProviderInterface) {
    this.address = info.address;
    this.name = info.name;
    this.symbol = info.symbol;
    this.decimals = info.decimals;
    this.chainId = info.chainId;
    this.logoURI = info.logoURI;
    this.description = info.description;
    this.tags = info.tags;

    if (metadata) {
      this.isNative = metadata.isNative;
      this.isStablecoin = metadata.isStablecoin;
      this.isWrapped = metadata.isWrapped;
      this.isLPToken = metadata.isLPToken;
      this.website = metadata.website;
      this.twitter = metadata.twitter;
      this.coingeckoId = metadata.coingeckoId;
      this.coinmarketcapId = metadata.coinmarketcapId;
    }

    this.provider = provider;
  }

  // Abstract methods that must be implemented by concrete classes
  abstract getBalance(address: string): Promise<BigNumberish>;
  abstract transfer(to: string, amount: BigNumberish): Promise<string>;
  abstract approve(spender: string, amount: BigNumberish): Promise<string>;
  abstract allowance(owner: string, spender: string): Promise<BigNumberish>;
  abstract totalSupply(): Promise<BigNumberish>;

  // Utility methods
  setProvider(provider: ProviderInterface): void {
    this.provider = provider;
  }

  getProvider(): ProviderInterface | undefined {
    return this.provider;
  }

  /**
   * Format balance from smallest unit to human-readable
   */
  formatBalance(balance: BigNumberish): string {
    const balanceStr = balance.toString();
    const divisor = BigInt(10 ** this.decimals);
    const wholePart = BigInt(balanceStr) / divisor;
    const fractionalPart = BigInt(balanceStr) % divisor;
    
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }

    // Convert fractional part to string with leading zeros
    const fractionalStr = fractionalPart.toString().padStart(this.decimals, '0');
    // Remove trailing zeros
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    if (trimmedFractional === '') {
      return wholePart.toString();
    }

    return `${wholePart}.${trimmedFractional}`;
  }

  /**
   * Parse human-readable amount to smallest unit
   */
  parseAmount(amount: string | number): bigint {
    const amountStr = amount.toString();
    const parts = amountStr.split('.');
    
    if (parts.length > 2) {
      throw new Error('Invalid amount format');
    }

    const wholePart = BigInt(parts[0] || 0);
    let fractionalPart = 0n;

    if (parts[1]) {
      // Pad or truncate fractional part to match decimals
      const fractionalStr = parts[1].padEnd(this.decimals, '0').slice(0, this.decimals);
      fractionalPart = BigInt(fractionalStr);
    }

    return wholePart * BigInt(10 ** this.decimals) + fractionalPart;
  }

  /**
   * Check if this token is the same as another
   */
  equals(other: IToken | TokenInfo): boolean {
    return (
      this.address.toLowerCase() === other.address.toLowerCase() &&
      this.chainId === other.chainId
    );
  }

  /**
   * Get a unique identifier for this token
   */
  getId(): string {
    return `${this.chainId}-${this.address.toLowerCase()}`;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): TokenInfo & Partial<TokenMetadata> {
    return {
      address: this.address,
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      chainId: this.chainId,
      logoURI: this.logoURI,
      description: this.description,
      tags: this.tags,
      isNative: this.isNative,
      isStablecoin: this.isStablecoin,
      isWrapped: this.isWrapped,
      isLPToken: this.isLPToken,
      website: this.website,
      twitter: this.twitter,
      coingeckoId: this.coingeckoId,
      coinmarketcapId: this.coinmarketcapId
    };
  }

  /**
   * Create a string representation
   */
  toString(): string {
    return `${this.symbol} (${this.name})`;
  }
}