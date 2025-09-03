/**
 * Token and asset management interfaces
 */

import type { Address, HexString } from '../types';

export interface Token {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  logoUrl?: string; // Alternative property name
  coingeckoId?: string;
  isNative?: boolean;
  isStable?: boolean;
}

export interface TokenBalance {
  token: Token;
  balance: string; // Raw balance as string
  balanceFormatted?: string; // Human-readable balance
  balanceUSD?: number;
  value?: string; // USD value (alternative to balanceUSD)
  price?: string; // USD price per token
}

export interface NFT {
  contractAddress: Address;
  tokenId: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  animationUrl?: string;
  externalUrl?: string;
  attributes?: NFTAttribute[];
  owner: Address;
  tokenType: 'ERC721' | 'ERC1155';
  amount?: string; // For ERC1155
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  logoURI?: string;
}

export interface TokenTransfer {
  from: Address;
  to: Address;
  value: string;
  tokenAddress: Address;
  transactionHash: HexString;
  blockNumber: number;
  timestamp: number;
}