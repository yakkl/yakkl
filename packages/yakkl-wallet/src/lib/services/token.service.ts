import { BaseService } from './base.service';
import type { TokenDisplay, ServiceResponse } from '../types';
import { yakklCombinedTokenStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import type { TokenChange } from '$lib/common/interfaces';

export class TokenService extends BaseService {
  private static instance: TokenService;

  private constructor() {
    super();
  }

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  async getTokens(address?: string): Promise<ServiceResponse<TokenDisplay[]>> {
    try {
      // Get current chain
      const { currentChain } = await import('../stores/chain.store');
      const { get: getStore } = await import('svelte/store');
      const chain = getStore(currentChain);
      const chainId = chain?.chainId || 1;
      
      console.log('[TokenService] Getting tokens for chainId:', chainId);
      
      // Get tokens from store
      const combinedTokens = get(yakklCombinedTokenStore);
      
      console.log('[TokenService] Combined tokens from store:', combinedTokens);
      
      if (!combinedTokens || combinedTokens.length === 0) {
        console.log('[TokenService] No tokens found in combined store');
        return { success: true, data: [] };
      }

      // Filter tokens by current chain
      const chainTokens = combinedTokens.filter(token => 
        token.chainId === chainId || 
        (!token.chainId && chainId === 1) // Default to mainnet for tokens without chainId
      );
      
      console.log('[TokenService] Filtered tokens for chain:', chainTokens);

      // Transform to TokenDisplay format
      const preview2Tokens: TokenDisplay[] = chainTokens.map((token) => {
        const balance = parseFloat(String(token.balance || token.quantity || '0'));
        const price = token.price?.price || 0;
        const value = balance * price;
        
        console.log(`[TokenService] Token ${token.symbol}: balance=${balance}, price=${price}, value=${value}`);
        
        return {
          symbol: token.symbol,
          name: token.name,
          icon: token.logoURI || this.getDefaultIcon(token.symbol),
          value: value,
          qty: balance,
          price: price,
          change24h: token.change ? this.getTokenChange24h(token.change) : undefined,
          address: token.address,
          decimals: token.decimals,
          color: this.getTokenColor(token.symbol),
          chainId: token.chainId
        };
      });

      // Filter tokens - show all tokens with balance OR the main tokens (ETH, WETH, stablecoins)
      const mainTokens = ['ETH', 'WETH', 'USDT', 'USDC', 'DAI'];
      const activeTokens = preview2Tokens.filter(t => 
        t.qty > 0 || mainTokens.includes(t.symbol.toUpperCase())
      );
      
      // Sort by value descending, but put zero-value main tokens at the end
      activeTokens.sort((a, b) => {
        if (a.value === 0 && b.value === 0) {
          // Both have zero value, sort main tokens first
          const aIsMain = mainTokens.includes(a.symbol.toUpperCase());
          const bIsMain = mainTokens.includes(b.symbol.toUpperCase());
          if (aIsMain && !bIsMain) return -1;
          if (!aIsMain && bIsMain) return 1;
          return 0;
        }
        return b.value - a.value;
      });

      console.log('[TokenService] Active tokens:', activeTokens);
      return { success: true, data: activeTokens };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async getMultiChainTokens(address: string, chainIds?: number[]): Promise<ServiceResponse<TokenDisplay[]>> {
    try {
      // Get supported chains
      const { chainStore } = await import('../stores/chain.store');
      const { get } = await import('svelte/store');
      const chains = get(chainStore).chains;
      
      // If no chainIds specified, get tokens from all chains
      const targetChains = chainIds || chains.map(c => c.chainId);
      
      console.log('[TokenService] Getting multi-chain tokens for chains:', targetChains);
      
      // Aggregate tokens from all chains
      const allTokens: TokenDisplay[] = [];
      
      for (const chainId of targetChains) {
        const response = await this.sendMessage<any[]>({
          method: 'yakkl_getTokensForChain',
          params: [address, chainId]
        });
        
        if (response.success && response.data) {
          const chainTokens = response.data.map(token => ({
            ...this.transformToTokenDisplay(token),
            chainId: chainId
          }));
          allTokens.push(...chainTokens);
        }
      }
      
      // Group tokens by symbol and aggregate values
      const aggregatedTokens = this.aggregateTokensBySymbol(allTokens);
      
      console.log('[TokenService] Aggregated multi-chain tokens:', aggregatedTokens);
      return { success: true, data: aggregatedTokens };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  private aggregateTokensBySymbol(tokens: TokenDisplay[]): TokenDisplay[] {
    const tokenMap = new Map<string, TokenDisplay>();
    
    for (const token of tokens) {
      const key = token.symbol.toUpperCase();
      if (tokenMap.has(key)) {
        const existing = tokenMap.get(key)!;
        // Aggregate quantities and values
        existing.qty += token.qty;
        existing.value += token.value;
        // Keep the same price (should be similar across chains)
        existing.price = token.price || existing.price;
      } else {
        tokenMap.set(key, { ...token });
      }
    }
    
    return Array.from(tokenMap.values());
  }

  private transformToTokenDisplay(token: any): TokenDisplay {
    const balance = parseFloat(String(token.balance || token.quantity || '0'));
    const price = token.price?.price || 0;
    const value = balance * price;
    
    return {
      symbol: token.symbol,
      name: token.name,
      icon: token.logoURI || this.getDefaultIcon(token.symbol),
      value: value,
      qty: balance,
      price: price,
      change24h: token.change ? this.getTokenChange24h(token.change) : undefined,
      address: token.address,
      decimals: token.decimals,
      color: this.getTokenColor(token.symbol)
    };
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<ServiceResponse<string>> {
    try {
      const response = await this.sendMessage<string>({
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` // balanceOf(address)
        }, 'latest']
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  async refreshTokenPrices(): Promise<ServiceResponse<boolean>> {
    try {
      // This would typically call an API to get latest prices
      // For now, we'll just trigger a refresh of the token store
      const response = await this.sendMessage<boolean>({
        method: 'yakkl_refreshTokenPrices'
      });

      return response;
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  private getDefaultIcon(symbol: string): string {
    // Map common tokens to emojis or default icons
    const iconMap: Record<string, string> = {
      'ETH': '/images/ethereum.svg',
      'BTC': '/images/bitcoin.svg',
      'USDT': '💵',
      'USDC': '💰',
      'DAI': '🏦',
      'LINK': '🔗',
      'UNI': '🦄',
      'AAVE': '👻',
      'COMP': '🏛️',
      'MKR': '🏭',
      'SUSHI': '🍣',
      'YFI': '🌾',
      'PEPE': '🐸'
    };

    return iconMap[symbol.toUpperCase()] || '🪙';
  }

  private getTokenColor(symbol: string): string {
    // Map tokens to colors for visual distinction
    const colorMap: Record<string, string> = {
      'ETH': 'bg-blue-400',
      'BTC': 'bg-orange-400',
      'USDT': 'bg-green-400',
      'USDC': 'bg-blue-500',
      'DAI': 'bg-yellow-400',
      'LINK': 'bg-indigo-400',
      'UNI': 'bg-pink-400',
      'AAVE': 'bg-purple-400',
      'COMP': 'bg-teal-400',
      'MKR': 'bg-cyan-400',
      'SUSHI': 'bg-rose-400',
      'YFI': 'bg-amber-400',
      'PEPE': 'bg-green-500'
    };

    return colorMap[symbol.toUpperCase()] || 'bg-gray-400';
  }

  private getTokenChange24h(changes: TokenChange[]): number | undefined {
    const change24h = changes.find(c => c.timeline === '24h');
    return change24h?.percentChange;
  }
}