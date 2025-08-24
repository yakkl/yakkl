/**
 * Token View Store
 * 
 * Provides a token-centric view of the wallet data with:
 * - Token portfolio across all accounts and chains
 * - Price tracking and market data
 * - DeFi positions and yield farming
 * - Constellation visualization for 3D token display
 * - Token analytics and performance metrics
 */

import { derived, get, type Readable } from 'svelte/store';
import { BaseViewStore } from './base-view.store';
import type { BigNumberish } from '$lib/common/bignumber';
import { log } from '$lib/common/logger-wrapper';

/**
 * Token data structure for the view
 */
export interface TokenData {
  // Core identity
  id: string;                    // Unique identifier (chainId:address:contractAddress)
  contractAddress: string;       // Token contract address
  chainId: number;              // Chain this token exists on
  symbol: string;               // Token symbol (ETH, USDC, etc)
  name: string;                 // Full token name
  decimals: number;             // Token decimals
  logoUrl?: string;             // Token logo URL
  
  // Holdings data (aggregated across accounts)
  totalBalance: bigint;         // Total balance in smallest unit
  totalValueCents: bigint;      // Total value in cents (USD)
  holders: TokenHolder[];       // Breakdown by account
  
  // Market data
  price: number;                // Current price in USD
  marketCap?: number;           // Market capitalization
  volume24h?: number;           // 24h trading volume
  change24h?: number;           // 24h price change percentage
  change7d?: number;            // 7d price change percentage
  change30d?: number;           // 30d price change percentage
  
  // DeFi data
  isStaked: boolean;            // Whether any amount is staked
  stakedAmount?: bigint;        // Amount staked
  stakingApr?: number;          // Staking APR percentage
  liquidityPositions?: LiquidityPosition[];
  
  // Analytics
  averageBuyPrice?: number;     // Average purchase price
  realizedPnl?: bigint;         // Realized profit/loss in cents
  unrealizedPnl?: bigint;       // Unrealized profit/loss in cents
  pnlPercentage?: number;       // Total PnL percentage
  
  // Risk metrics
  volatility?: number;          // 30-day volatility
  sharpeRatio?: number;         // Risk-adjusted return
  correlationBtc?: number;      // Correlation with Bitcoin
  riskScore?: number;           // 0-100 risk score
  
  // Constellation visualization metadata
  constellation: {
    x: number;                  // X position in 3D space (-100 to 100)
    y: number;                  // Y position in 3D space (-100 to 100)
    z: number;                  // Z position in 3D space (-100 to 100)
    size: number;               // Size of token sphere (1-10)
    color: string;              // Color based on performance
    luminosity: number;         // Brightness (0-1, based on activity)
    orbitRadius?: number;       // Orbit radius for animation
    orbitSpeed?: number;        // Orbit speed (degrees/sec)
    glowIntensity?: number;     // Glow effect intensity
    pulseRate?: number;         // Pulse animation rate
    connections: string[];      // Connected token IDs (for correlation lines)
  };
  
  // Metadata
  tags: string[];               // User-defined tags
  notes?: string;               // User notes
  isFavorite: boolean;          // Marked as favorite
  isHidden: boolean;            // Hidden from main view
  addedAt: number;              // Timestamp when first added
  lastActivity: number;         // Last transaction timestamp
}

/**
 * Token holder breakdown
 */
export interface TokenHolder {
  accountAddress: string;
  balance: bigint;
  valueCents: bigint;
  percentage: number;           // Percentage of total holdings
}

/**
 * Liquidity position data
 */
export interface LiquidityPosition {
  protocol: string;             // Uniswap, Curve, etc
  poolAddress: string;
  token0: string;
  token1: string;
  liquidity: bigint;
  valueCents: bigint;
  apr: number;
  fees24h: bigint;
}

/**
 * Token view state
 */
export interface TokenViewState {
  tokens: TokenData[];
  totalValueCents: bigint;
  totalTokens: number;
  totalChains: number;
  performanceMetrics: {
    bestPerformer: string | null;
    worstPerformer: string | null;
    totalPnlCents: bigint;
    avgPnlPercentage: number;
  };
  filters: {
    search: string;
    chains: number[];
    minValue: number;
    showHidden: boolean;
    showZeroBalances: boolean;
    tags: string[];
  };
  sort: {
    field: 'value' | 'change24h' | 'balance' | 'pnl' | 'name';
    direction: 'asc' | 'desc';
  };
}

/**
 * Token View Store Implementation
 */
class TokenViewStore extends BaseViewStore<TokenViewState> {
  constructor() {
    const initialState: TokenViewState = {
      tokens: [],
      totalValueCents: 0n,
      totalTokens: 0,
      totalChains: 0,
      performanceMetrics: {
        bestPerformer: null,
        worstPerformer: null,
        totalPnlCents: 0n,
        avgPnlPercentage: 0
      },
      filters: {
        search: '',
        chains: [],
        minValue: 0,
        showHidden: false,
        showZeroBalances: false,
        tags: []
      },
      sort: {
        field: 'value',
        direction: 'desc'
      }
    };

    super(initialState, {
      storageKey: 'view_cache_token',
      syncInterval: 60000, // 1 minute for price updates
      maxCacheAge: 180000, // 3 minutes
      enableAutoSync: true
    });
  }

  /**
   * Add or update a token
   */
  async addToken(token: TokenData): Promise<void> {
    const currentData = get(this.store);
    const existingIndex = currentData.tokens.findIndex(t => t.id === token.id);
    
    if (existingIndex >= 0) {
      currentData.tokens[existingIndex] = token;
    } else {
      currentData.tokens.push(token);
    }
    
    this.store.set(this.recalculateMetrics(currentData));
    await this.saveToStorage();
  }

  /**
   * Update multiple tokens at once
   */
  async updateTokens(tokens: TokenData[]): Promise<void> {
    const currentData = get(this.store);
    const tokenMap = new Map(currentData.tokens.map(t => [t.id, t]));
    
    // Update or add tokens
    tokens.forEach(token => {
      tokenMap.set(token.id, token);
    });
    
    currentData.tokens = Array.from(tokenMap.values());
    this.store.set(this.recalculateMetrics(currentData));
    await this.saveToStorage();
  }

  /**
   * Update token prices
   */
  async updatePrices(prices: Map<string, number>): Promise<void> {
    const currentData = get(this.store);
    
    currentData.tokens = currentData.tokens.map(token => {
      const newPrice = prices.get(token.symbol) || prices.get(token.contractAddress);
      if (newPrice && newPrice !== token.price) {
        // Recalculate value with new price
        const totalValueCents = BigInt(Math.round(
          Number(token.totalBalance) * newPrice / Math.pow(10, token.decimals) * 100
        ));
        
        return {
          ...token,
          price: newPrice,
          totalValueCents,
          holders: token.holders.map(holder => ({
            ...holder,
            valueCents: BigInt(Math.round(
              Number(holder.balance) * newPrice / Math.pow(10, token.decimals) * 100
            ))
          }))
        };
      }
      return token;
    });
    
    this.store.set(this.recalculateMetrics(currentData));
    await this.saveToStorage();
  }

  /**
   * Calculate constellation positions for tokens
   */
  calculateConstellationPositions(tokens: TokenData[]): TokenData[] {
    // Group tokens by value ranges for layered positioning
    const sorted = [...tokens].sort((a, b) => 
      Number(b.totalValueCents - a.totalValueCents)
    );
    
    const layers = {
      core: sorted.slice(0, 5),      // Top 5 tokens in center
      inner: sorted.slice(5, 15),    // Next 10 in inner ring
      outer: sorted.slice(15)        // Rest in outer ring
    };
    
    let index = 0;
    
    // Position core tokens in center sphere
    layers.core.forEach((token, i) => {
      const angle = (i / layers.core.length) * Math.PI * 2;
      const radius = 20;
      
      token.constellation = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.5, // Flatten Y axis
        z: (Math.random() - 0.5) * 30,
        size: 8 + (5 - i) * 0.5, // Larger for higher value
        color: this.getPerformanceColor(token.change24h || 0),
        luminosity: 0.8 + (token.change24h || 0) / 100,
        orbitRadius: radius,
        orbitSpeed: 0.5 + Math.random() * 0.5,
        glowIntensity: 0.7,
        pulseRate: 1 + (token.change24h || 0) / 50,
        connections: this.findCorrelatedTokens(token, tokens)
      };
    });
    
    // Position inner ring tokens
    layers.inner.forEach((token, i) => {
      const angle = (i / layers.inner.length) * Math.PI * 2;
      const radius = 50;
      
      token.constellation = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.5,
        z: (Math.random() - 0.5) * 50,
        size: 5 + Math.random() * 2,
        color: this.getPerformanceColor(token.change24h || 0),
        luminosity: 0.6 + (token.change24h || 0) / 150,
        orbitRadius: radius,
        orbitSpeed: 0.3 + Math.random() * 0.3,
        glowIntensity: 0.5,
        pulseRate: 0.8 + (token.change24h || 0) / 100,
        connections: this.findCorrelatedTokens(token, tokens)
      };
    });
    
    // Position outer ring tokens
    layers.outer.forEach((token, i) => {
      const angle = (i / Math.max(layers.outer.length, 1)) * Math.PI * 2;
      const radius = 80;
      
      token.constellation = {
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: Math.sin(angle) * radius * 0.5 + (Math.random() - 0.5) * 10,
        z: (Math.random() - 0.5) * 70,
        size: 2 + Math.random() * 3,
        color: this.getPerformanceColor(token.change24h || 0),
        luminosity: 0.4 + (token.change24h || 0) / 200,
        orbitRadius: radius,
        orbitSpeed: 0.1 + Math.random() * 0.2,
        glowIntensity: 0.3,
        pulseRate: 0.5 + (token.change24h || 0) / 150,
        connections: []
      };
    });
    
    return sorted;
  }

  /**
   * Get color based on performance
   */
  private getPerformanceColor(change: number): string {
    if (change > 10) return '#00ff88';      // Bright green
    if (change > 5) return '#22dd66';       // Green
    if (change > 0) return '#88ff88';       // Light green
    if (change > -5) return '#ffaa44';      // Orange
    if (change > -10) return '#ff6644';     // Red-orange
    return '#ff3333';                       // Red
  }

  /**
   * Find correlated tokens for connection lines
   */
  private findCorrelatedTokens(token: TokenData, allTokens: TokenData[]): string[] {
    // Simple correlation: tokens with similar price movements
    const threshold = 5; // Within 5% change
    
    return allTokens
      .filter(t => 
        t.id !== token.id &&
        Math.abs((t.change24h || 0) - (token.change24h || 0)) < threshold
      )
      .slice(0, 3) // Max 3 connections
      .map(t => t.id);
  }

  /**
   * Recalculate view metrics
   */
  private recalculateMetrics(state: TokenViewState): TokenViewState {
    // Calculate totals
    state.totalValueCents = state.tokens.reduce(
      (sum, token) => sum + token.totalValueCents,
      0n
    );
    
    state.totalTokens = state.tokens.filter(t => Number(t.totalBalance) > 0).length;
    
    const chains = new Set(state.tokens.map(t => t.chainId));
    state.totalChains = chains.size;
    
    // Calculate performance metrics
    const tokensWithPnl = state.tokens.filter(t => t.pnlPercentage !== undefined);
    
    if (tokensWithPnl.length > 0) {
      const sorted = [...tokensWithPnl].sort((a, b) => 
        (b.pnlPercentage || 0) - (a.pnlPercentage || 0)
      );
      
      state.performanceMetrics.bestPerformer = sorted[0]?.id || null;
      state.performanceMetrics.worstPerformer = sorted[sorted.length - 1]?.id || null;
      
      state.performanceMetrics.totalPnlCents = tokensWithPnl.reduce(
        (sum, token) => sum + (token.unrealizedPnl || 0n) + (token.realizedPnl || 0n),
        0n
      );
      
      state.performanceMetrics.avgPnlPercentage = 
        tokensWithPnl.reduce((sum, t) => sum + (t.pnlPercentage || 0), 0) / 
        tokensWithPnl.length;
    }
    
    // Update constellation positions
    state.tokens = this.calculateConstellationPositions(state.tokens);
    
    return state;
  }

  /**
   * Apply filters to get filtered tokens
   */
  getFilteredTokens(): TokenData[] {
    const state = get(this.store);
    let filtered = [...state.tokens];
    
    // Apply search filter
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(token =>
        token.symbol.toLowerCase().includes(search) ||
        token.name.toLowerCase().includes(search) ||
        token.contractAddress.toLowerCase().includes(search)
      );
    }
    
    // Apply chain filter
    if (state.filters.chains.length > 0) {
      filtered = filtered.filter(token =>
        state.filters.chains.includes(token.chainId)
      );
    }
    
    // Apply minimum value filter
    if (state.filters.minValue > 0) {
      filtered = filtered.filter(token =>
        Number(token.totalValueCents) / 100 >= state.filters.minValue
      );
    }
    
    // Apply hidden filter
    if (!state.filters.showHidden) {
      filtered = filtered.filter(token => !token.isHidden);
    }
    
    // Apply zero balance filter
    if (!state.filters.showZeroBalances) {
      filtered = filtered.filter(token => token.totalBalance > 0n);
    }
    
    // Apply tag filter
    if (state.filters.tags.length > 0) {
      filtered = filtered.filter(token =>
        state.filters.tags.some(tag => token.tags.includes(tag))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (state.sort.field) {
        case 'value':
          comparison = Number(b.totalValueCents - a.totalValueCents);
          break;
        case 'change24h':
          comparison = (b.change24h || 0) - (a.change24h || 0);
          break;
        case 'balance':
          comparison = Number(b.totalBalance - a.totalBalance);
          break;
        case 'pnl':
          comparison = (b.pnlPercentage || 0) - (a.pnlPercentage || 0);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return state.sort.direction === 'asc' ? -comparison : comparison;
    });
    
    return filtered;
  }

  /**
   * Update filters
   */
  async updateFilters(filters: Partial<TokenViewState['filters']>): Promise<void> {
    const currentData = get(this.store);
    currentData.filters = { ...currentData.filters, ...filters };
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Update sort settings
   */
  async updateSort(sort: Partial<TokenViewState['sort']>): Promise<void> {
    const currentData = get(this.store);
    currentData.sort = { ...currentData.sort, ...sort };
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Toggle token favorite status
   */
  async toggleFavorite(tokenId: string): Promise<void> {
    const currentData = get(this.store);
    const token = currentData.tokens.find(t => t.id === tokenId);
    
    if (token) {
      token.isFavorite = !token.isFavorite;
      this.store.set(currentData);
      await this.saveToStorage();
    }
  }

  /**
   * Hide/show token
   */
  async toggleHidden(tokenId: string): Promise<void> {
    const currentData = get(this.store);
    const token = currentData.tokens.find(t => t.id === tokenId);
    
    if (token) {
      token.isHidden = !token.isHidden;
      this.store.set(currentData);
      await this.saveToStorage();
    }
  }

  /**
   * Add tag to token
   */
  async addTag(tokenId: string, tag: string): Promise<void> {
    const currentData = get(this.store);
    const token = currentData.tokens.find(t => t.id === tokenId);
    
    if (token && !token.tags.includes(tag)) {
      token.tags.push(tag);
      this.store.set(currentData);
      await this.saveToStorage();
    }
  }

  /**
   * Remove tag from token
   */
  async removeTag(tokenId: string, tag: string): Promise<void> {
    const currentData = get(this.store);
    const token = currentData.tokens.find(t => t.id === tokenId);
    
    if (token) {
      token.tags = token.tags.filter(t => t !== tag);
      this.store.set(currentData);
      await this.saveToStorage();
    }
  }

  /**
   * Update token notes
   */
  async updateNotes(tokenId: string, notes: string): Promise<void> {
    const currentData = get(this.store);
    const token = currentData.tokens.find(t => t.id === tokenId);
    
    if (token) {
      token.notes = notes;
      this.store.set(currentData);
      await this.saveToStorage();
    }
  }

  // Implement abstract methods from BaseViewStore
  
  protected async hydrateData(data: any): Promise<TokenViewState> {
    // Convert string values back to BigInt
    if (data.totalValueCents) {
      data.totalValueCents = BigInt(data.totalValueCents);
    }
    
    if (data.tokens) {
      data.tokens.forEach((token: any) => {
        if (token.totalBalance) token.totalBalance = BigInt(token.totalBalance);
        if (token.totalValueCents) token.totalValueCents = BigInt(token.totalValueCents);
        if (token.stakedAmount) token.stakedAmount = BigInt(token.stakedAmount);
        if (token.realizedPnl) token.realizedPnl = BigInt(token.realizedPnl);
        if (token.unrealizedPnl) token.unrealizedPnl = BigInt(token.unrealizedPnl);
        
        if (token.holders) {
          token.holders.forEach((holder: any) => {
            if (holder.balance) holder.balance = BigInt(holder.balance);
            if (holder.valueCents) holder.valueCents = BigInt(holder.valueCents);
          });
        }
        
        if (token.liquidityPositions) {
          token.liquidityPositions.forEach((pos: any) => {
            if (pos.liquidity) pos.liquidity = BigInt(pos.liquidity);
            if (pos.valueCents) pos.valuidity = BigInt(pos.valueCents);
            if (pos.fees24h) pos.fees24h = BigInt(pos.fees24h);
          });
        }
      });
    }
    
    if (data.performanceMetrics) {
      if (data.performanceMetrics.totalPnlCents) {
        data.performanceMetrics.totalPnlCents = BigInt(data.performanceMetrics.totalPnlCents);
      }
    }
    
    return data as TokenViewState;
  }
  
  protected async dehydrateData(data: TokenViewState): Promise<any> {
    // Convert BigInt to string for storage
    const dehydrated = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    return dehydrated;
  }
  
  protected mergeData(current: TokenViewState, incoming: Partial<TokenViewState>): TokenViewState {
    // Merge tokens by ID
    if (incoming.tokens) {
      const tokenMap = new Map(current.tokens.map(t => [t.id, t]));
      incoming.tokens.forEach(token => {
        tokenMap.set(token.id, token);
      });
      current.tokens = Array.from(tokenMap.values());
    }
    
    return { ...current, ...incoming };
  }
  
  protected applyDelta(current: TokenViewState, delta: any): TokenViewState {
    // Apply incremental updates
    if (delta.tokens) {
      const tokenMap = new Map(current.tokens.map(t => [t.id, t]));
      delta.tokens.forEach((tokenUpdate: any) => {
        const existing = tokenMap.get(tokenUpdate.id);
        if (existing) {
          tokenMap.set(tokenUpdate.id, { ...existing, ...tokenUpdate });
        } else {
          tokenMap.set(tokenUpdate.id, tokenUpdate);
        }
      });
      current.tokens = Array.from(tokenMap.values());
    }
    
    if (delta.totalValueCents !== undefined) {
      current.totalValueCents = delta.totalValueCents;
    }
    
    return this.recalculateMetrics(current);
  }
  
  protected validateData(data: TokenViewState): boolean {
    return (
      data.tokens !== undefined &&
      Array.isArray(data.tokens) &&
      data.totalValueCents !== undefined
    );
  }
  
  protected getDelta(oldData: TokenViewState, newData: TokenViewState): any {
    const delta: any = {};
    
    // Check for token changes
    const oldTokenMap = new Map(oldData.tokens.map(t => [t.id, t]));
    const newTokenMap = new Map(newData.tokens.map(t => [t.id, t]));
    
    const changedTokens: TokenData[] = [];
    newTokenMap.forEach((token, id) => {
      const oldToken = oldTokenMap.get(id);
      if (!oldToken || JSON.stringify(oldToken) !== JSON.stringify(token)) {
        changedTokens.push(token);
      }
    });
    
    if (changedTokens.length > 0) {
      delta.tokens = changedTokens;
    }
    
    if (oldData.totalValueCents !== newData.totalValueCents) {
      delta.totalValueCents = newData.totalValueCents;
    }
    
    return delta;
  }
  
  protected onDataUpdated(update: any): void {
    // Handle data update notifications
    log.debug('[TokenViewStore] Data updated', false, {
      type: update.type,
      tokenCount: update.data?.tokens?.length
    });
  }
  
  protected getEmptyData(): TokenViewState {
    return {
      tokens: [],
      totalValueCents: 0n,
      totalTokens: 0,
      totalChains: 0,
      performanceMetrics: {
        bestPerformer: null,
        worstPerformer: null,
        totalPnlCents: 0n,
        avgPnlPercentage: 0
      },
      filters: {
        search: '',
        chains: [],
        minValue: 0,
        showHidden: false,
        showZeroBalances: false,
        tags: []
      },
      sort: {
        field: 'value',
        direction: 'desc'
      }
    };
  }

  // Expose store for derived stores
  public get data() {
    return this.store;
  }
}

// Create and export the singleton instance
export const tokenViewStore = new TokenViewStore();

// Derived stores for specific data slices
export const tokenList = derived(
  tokenViewStore.data,
  $store => $store.tokens
);

export const favoriteTokens = derived(
  tokenViewStore.data,
  $store => $store.tokens.filter(t => t.isFavorite)
);

export const topTokens = derived(
  tokenViewStore.data,
  $store => [...$store.tokens]
    .sort((a, b) => Number(b.totalValueCents - a.totalValueCents))
    .slice(0, 10)
);

export const tokenPerformance = derived(
  tokenViewStore.data,
  $store => $store.performanceMetrics
);

export const tokenTotalValue = derived(
  tokenViewStore.data,
  $store => $store.totalValueCents
);

export const tokensByChain = derived(
  tokenViewStore.data,
  $store => {
    const byChain = new Map<number, TokenData[]>();
    
    $store.tokens.forEach(token => {
      const chainTokens = byChain.get(token.chainId) || [];
      chainTokens.push(token);
      byChain.set(token.chainId, chainTokens);
    });
    
    return byChain;
  }
);

// Constellation data for 3D visualization
export const tokenConstellation = derived(
  tokenViewStore.data,
  $store => $store.tokens.map(token => ({
    id: token.id,
    symbol: token.symbol,
    position: {
      x: token.constellation.x,
      y: token.constellation.y,
      z: token.constellation.z
    },
    size: token.constellation.size,
    color: token.constellation.color,
    luminosity: token.constellation.luminosity,
    connections: token.constellation.connections,
    value: token.totalValueCents,
    change24h: token.change24h
  }))
);