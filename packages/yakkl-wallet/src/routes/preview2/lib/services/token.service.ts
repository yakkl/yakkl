import { BaseService } from './base.service';
import type { Preview2Token, ServiceResponse } from '../types';
// Mock token store for Preview 2.0
const yakklCombinedTokenStore = {
  subscribe: () => () => {},
  get: (): any[] => []
};
import { get } from 'svelte/store';

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

  async getTokens(address?: string): Promise<ServiceResponse<Preview2Token[]>> {
    try {
      // Get tokens from store
      const combinedTokens = yakklCombinedTokenStore.get();
      
      if (!combinedTokens || (combinedTokens as any[]).length === 0) {
        return { success: true, data: [] };
      }

      // Transform to Preview2Token format
      const preview2Tokens: Preview2Token[] = (combinedTokens as any[]).map((token: any) => ({
        symbol: token.symbol,
        name: token.name,
        icon: token.logo || this.getDefaultIcon(token.symbol),
        value: parseFloat(token.totalValue || '0'),
        qty: parseFloat(token.totalQuantity || '0'),
        price: parseFloat(token.price || '0'),
        change24h: token.priceChange24h,
        address: token.address,
        decimals: token.decimals,
        color: this.getTokenColor(token.symbol)
      }));

      // Sort by value descending
      preview2Tokens.sort((a, b) => b.value - a.value);

      return { success: true, data: preview2Tokens };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
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
      'ETH': '/images/eth.svg',
      'BTC': '₿',
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
}