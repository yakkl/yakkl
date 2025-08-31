/**
 * Token service for managing tokens and balances
 */

import type {
  TokenInfo,
  TokenBalance,
  TokenPrice,
  TokenPortfolioItem,
  TokenList,
  TokenFilterOptions,
  TokenSortOptions,
  TokenServiceConfig,
  IToken
} from '../types';
import type { IProvider } from '../../providers/types';
import { ERC20Token } from '../ERC20Token';

export class TokenService {
  private provider?: IProvider;
  private config: TokenServiceConfig;
  private tokenCache: Map<string, IToken> = new Map();
  private priceCache: Map<string, TokenPrice> = new Map();
  private tokenLists: Map<string, TokenList> = new Map();

  constructor(config: TokenServiceConfig = {}, provider?: IProvider) {
    this.config = {
      autoUpdatePrices: false,
      priceUpdateInterval: 60000, // 1 minute
      cacheEnabled: true,
      cacheDuration: 300000, // 5 minutes
      ...config
    };
    this.provider = provider;

    if (this.config.autoUpdatePrices) {
      this.startPriceUpdates();
    }
  }

  /**
   * Set the provider for blockchain interactions
   */
  setProvider(provider: IProvider): void {
    this.provider = provider;
  }

  /**
   * Load a token list from URL
   */
  async loadTokenList(url: string): Promise<TokenList> {
    if (this.tokenLists.has(url)) {
      return this.tokenLists.get(url)!;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load token list from ${url}`);
    }

    const tokenList = await response.json() as TokenList;
    this.tokenLists.set(url, tokenList);

    // Cache individual tokens
    for (const token of tokenList.tokens) {
      const tokenId = this.getTokenId(token.chainId, token.address);
      if (!this.tokenCache.has(tokenId) && this.provider) {
        const erc20Token = new ERC20Token(token, undefined, this.provider);
        this.tokenCache.set(tokenId, erc20Token);
      }
    }

    return tokenList;
  }

  /**
   * Get a token by address and chain
   */
  async getToken(address: string, chainId: number): Promise<IToken | null> {
    const tokenId = this.getTokenId(chainId, address);
    
    if (this.tokenCache.has(tokenId)) {
      return this.tokenCache.get(tokenId)!;
    }

    if (!this.provider) {
      return null;
    }

    try {
      const token = await ERC20Token.fromAddress(address, chainId, this.provider);
      this.tokenCache.set(tokenId, token);
      return token;
    } catch (error) {
      console.error(`Failed to load token ${address} on chain ${chainId}:`, error);
      return null;
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(
    tokenAddress: string,
    ownerAddress: string,
    chainId: number
  ): Promise<TokenBalance | null> {
    const token = await this.getToken(tokenAddress, chainId);
    if (!token) {
      return null;
    }

    try {
      const balance = await token.getBalance(ownerAddress);
      // Cast to our ERC20Token which has toJSON
      const tokenInfo = (token as ERC20Token).toJSON() as TokenInfo;

      return {
        ...tokenInfo,
        balance,
        balanceFormatted: (token as ERC20Token).formatBalance(balance)
      };
    } catch (error) {
      console.error(`Failed to get balance for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get multiple token balances
   */
  async getTokenBalances(
    tokens: Array<{ address: string; chainId: number }>,
    ownerAddress: string
  ): Promise<TokenBalance[]> {
    const balancePromises = tokens.map(({ address, chainId }) =>
      this.getTokenBalance(address, ownerAddress, chainId)
    );

    const results = await Promise.all(balancePromises);
    return results.filter((balance): balance is TokenBalance => balance !== null);
  }

  /**
   * Get portfolio items with prices
   */
  async getPortfolio(
    ownerAddress: string,
    chainId: number,
    options?: TokenFilterOptions
  ): Promise<TokenPortfolioItem[]> {
    // Get all tokens for the chain
    const allTokens: TokenInfo[] = [];
    for (const tokenList of this.tokenLists.values()) {
      const chainTokens = tokenList.tokens.filter(t => t.chainId === chainId);
      allTokens.push(...chainTokens);
    }

    // Apply filters
    let filteredTokens = this.filterTokens(allTokens, options);

    // Get balances
    const balances = await this.getTokenBalances(
      filteredTokens.map(t => ({ address: t.address, chainId: t.chainId })),
      ownerAddress
    );

    // Convert to portfolio items
    const portfolioItems: TokenPortfolioItem[] = [];
    let totalValue = 0;

    for (const balance of balances) {
      const price = await this.getTokenPrice(balance.symbol);
      const value = price ? Number(balance.balanceFormatted || 0) * price.price : 0;
      totalValue += value;

      portfolioItems.push({
        ...balance,
        price: price?.price,
        value,
        valueUSD: value,
        change24h: price?.change24h,
        change24hPercent: price?.change24hPercent
      });
    }

    // Calculate allocations
    for (const item of portfolioItems) {
      item.allocation = totalValue > 0 ? (item.valueUSD || 0) / totalValue * 100 : 0;
    }

    return portfolioItems;
  }

  /**
   * Search for tokens
   */
  searchTokens(query: string, chainId?: number): TokenInfo[] {
    const results: TokenInfo[] = [];
    const searchLower = query.toLowerCase();

    for (const tokenList of this.tokenLists.values()) {
      const matches = tokenList.tokens.filter(token => {
        if (chainId && token.chainId !== chainId) {
          return false;
        }

        return (
          token.symbol.toLowerCase().includes(searchLower) ||
          token.name.toLowerCase().includes(searchLower) ||
          token.address.toLowerCase() === searchLower
        );
      });

      results.push(...matches);
    }

    // Remove duplicates
    const unique = new Map<string, TokenInfo>();
    for (const token of results) {
      const id = this.getTokenId(token.chainId, token.address);
      if (!unique.has(id)) {
        unique.set(id, token);
      }
    }

    return Array.from(unique.values());
  }

  /**
   * Filter tokens based on options
   */
  private filterTokens(tokens: TokenInfo[], options?: TokenFilterOptions): TokenInfo[] {
    if (!options) {
      return tokens;
    }

    return tokens.filter(token => {
      if (options.chainId && token.chainId !== options.chainId) {
        return false;
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        if (
          !token.symbol.toLowerCase().includes(searchLower) &&
          !token.name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      if (options.tags && options.tags.length > 0) {
        if (!token.tags || !options.tags.some(tag => token.tags!.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort tokens based on options
   */
  sortTokens(tokens: TokenPortfolioItem[], options: TokenSortOptions): TokenPortfolioItem[] {
    const sorted = [...tokens];
    const multiplier = options.direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (options.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'balance':
          comparison = Number(a.balance) - Number(b.balance);
          break;
        case 'value':
          comparison = (a.valueUSD || 0) - (b.valueUSD || 0);
          break;
        case 'change24h':
          comparison = (a.change24hPercent || 0) - (b.change24hPercent || 0);
          break;
      }

      return comparison * multiplier;
    });

    return sorted;
  }

  /**
   * Get token price (mock implementation - replace with actual price provider)
   */
  private async getTokenPrice(symbol: string): Promise<TokenPrice | null> {
    // Check cache
    if (this.priceCache.has(symbol)) {
      const cached = this.priceCache.get(symbol)!;
      if (Date.now() - (cached.lastUpdated || 0) < this.config.cacheDuration!) {
        return cached;
      }
    }

    // In production, fetch from a price API
    // For now, return mock data
    const mockPrice: TokenPrice = {
      symbol,
      price: Math.random() * 1000,
      currency: 'USD',
      change24h: (Math.random() - 0.5) * 100,
      change24hPercent: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 1000000,
      marketCap: Math.random() * 10000000,
      lastUpdated: Date.now()
    };

    this.priceCache.set(symbol, mockPrice);
    return mockPrice;
  }

  /**
   * Start automatic price updates
   */
  private startPriceUpdates(): void {
    setInterval(() => {
      // Update prices for all cached tokens
      for (const [symbol] of this.priceCache) {
        this.getTokenPrice(symbol);
      }
    }, this.config.priceUpdateInterval!);
  }

  /**
   * Get a unique token ID
   */
  private getTokenId(chainId: number, address: string): string {
    return `${chainId}-${address.toLowerCase()}`;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.tokenCache.clear();
    this.priceCache.clear();
    this.tokenLists.clear();
  }
}