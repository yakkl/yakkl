/**
 * Portfolio View Store
 * 
 * Provides a comprehensive portfolio overview with:
 * - Total portfolio value across all accounts, chains, and tokens
 * - Historical performance tracking
 * - Asset allocation breakdown
 * - Galaxy visualization for portfolio universe
 * - AI-powered insights and recommendations
 */

import { derived, get, type Readable } from 'svelte/store';
import { BaseViewStore } from './base-view.store';
import type { BigNumberish } from '$lib/common/bignumber';
import { log } from '$lib/common/logger-wrapper';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

/**
 * Portfolio data structure
 */
export interface PortfolioData {
  // Total values
  totalValueCents: bigint;              // Total portfolio value in USD cents
  totalValueFormatted: string;          // Formatted for display
  totalAccounts: number;                // Number of accounts
  totalChains: number;                  // Number of active chains
  totalTokens: number;                  // Number of unique tokens held
  totalTransactions: number;            // Total transaction count
  
  // Performance metrics
  performance: {
    change24h: bigint;                   // 24h change in cents
    change24hPercent: number;            // 24h change percentage
    change7d: bigint;                   // 7d change in cents
    change7dPercent: number;             // 7d change percentage
    change30d: bigint;                  // 30d change in cents
    change30dPercent: number;            // 30d change percentage
    allTimeHigh: bigint;                // ATH value in cents
    allTimeHighDate: number;             // ATH timestamp
    allTimeLow: bigint;                 // ATL value in cents
    allTimeLowDate: number;              // ATL timestamp
  };
  
  // Asset allocation
  allocation: {
    byChain: AllocationBreakdown[];     // Breakdown by blockchain
    byToken: AllocationBreakdown[];     // Breakdown by token
    byCategory: AllocationBreakdown[];  // Breakdown by category (DeFi, NFT, etc)
    byAccount: AllocationBreakdown[];   // Breakdown by account
  };
  
  // Historical data (for charts)
  history: {
    hourly: HistoricalDataPoint[];      // Last 24 hours
    daily: HistoricalDataPoint[];       // Last 30 days
    weekly: HistoricalDataPoint[];      // Last 52 weeks
    monthly: HistoricalDataPoint[];     // Last 12 months
  };
  
  // Risk metrics
  risk: {
    score: number;                       // Overall risk score (0-100)
    volatility: number;                  // Portfolio volatility
    sharpeRatio: number;                 // Risk-adjusted return
    maxDrawdown: number;                 // Maximum drawdown percentage
    diversificationScore: number;        // 0-100, higher is better
    concentrationRisk: string;          // 'low' | 'medium' | 'high'
  };
  
  // DeFi positions summary
  defi: {
    totalStakedCents: bigint;           // Total value staked
    totalLendingCents: bigint;          // Total value lent
    totalBorrowingCents: bigint;        // Total value borrowed
    totalLiquidityCents: bigint;        // Total in liquidity pools
    averageApr: number;                  // Average APR across positions
    protocols: string[];                 // Active protocols
  };
  
  // NFT summary
  nfts: {
    totalCount: number;                  // Total NFT count
    totalValueCents: bigint;            // Total NFT value
    collections: number;                 // Number of collections
    topCollection: string | null;       // Most valuable collection
  };
  
  // Activity summary
  activity: {
    lastTransaction: number;             // Last transaction timestamp
    transactionsToday: number;          // Transactions in last 24h
    transactionsThisWeek: number;       // Transactions in last 7d
    gasSpentTodayCents: bigint;         // Gas spent today
    gasSpentThisWeekCents: bigint;      // Gas spent this week
    mostActiveChain: string | null;     // Most used chain
    mostTradedToken: string | null;     // Most traded token
  };
  
  // AI insights
  insights: {
    suggestions: InsightSuggestion[];    // AI-generated suggestions
    alerts: InsightAlert[];             // Important alerts
    opportunities: Opportunity[];        // Investment opportunities
    lastUpdated: number;                // Last AI analysis timestamp
  };
  
  // Galaxy visualization metadata
  galaxy: {
    centerMass: {                       // Central portfolio mass
      size: number;                      // Size based on total value
      color: string;                     // Color based on performance
      luminosity: number;                // Brightness
      rotationSpeed: number;             // Rotation animation
    };
    orbits: GalaxyOrbit[];              // Orbital rings for categories
    stars: GalaxyStar[];                // Individual assets as stars
    nebulae: GalaxyNebula[];            // Risk/opportunity clouds
    connections: GalaxyConnection[];     // Asset correlations
    viewAngle: { x: number; y: number; z: number }; // 3D view angle
  };
  
  // User preferences
  preferences: {
    displayCurrency: string;             // USD, EUR, etc
    hideSmallBalances: boolean;         // Hide dust amounts
    consolidateByToken: boolean;        // Group same token across chains
    showTestnets: boolean;              // Include testnet values
  };
}

/**
 * Allocation breakdown
 */
export interface AllocationBreakdown {
  id: string;
  name: string;
  valueCents: bigint;
  percentage: number;
  change24h: number;
  color: string;
}

/**
 * Historical data point
 */
export interface HistoricalDataPoint {
  timestamp: number;
  valueCents: bigint;
  change: number;
}

/**
 * AI-generated suggestion
 */
export interface InsightSuggestion {
  id: string;
  type: 'rebalance' | 'opportunity' | 'risk' | 'gas' | 'yield';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
  potentialSavings?: bigint;
}

/**
 * Alert from AI analysis
 */
export interface InsightAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: number;
}

/**
 * Investment opportunity
 */
export interface Opportunity {
  id: string;
  protocol: string;
  type: 'yield' | 'arbitrage' | 'airdrop' | 'staking';
  apr: number;
  risk: 'low' | 'medium' | 'high';
  description: string;
  requiredAmount: bigint;
}

/**
 * Galaxy orbital ring
 */
export interface GalaxyOrbit {
  radius: number;
  category: string;
  color: string;
  width: number;
  dashPattern?: number[];
  rotationSpeed: number;
}

/**
 * Galaxy star (asset)
 */
export interface GalaxyStar {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  brightness: number;
  twinkleRate: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  type: 'token' | 'nft' | 'defi' | 'chain';
}

/**
 * Galaxy nebula (risk/opportunity zone)
 */
export interface GalaxyNebula {
  id: string;
  type: 'risk' | 'opportunity';
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  opacity: number;
  particles: number;
}

/**
 * Galaxy connection line
 */
export interface GalaxyConnection {
  from: string;
  to: string;
  strength: number;
  color: string;
  animated: boolean;
}

/**
 * Portfolio view state
 */
export interface PortfolioViewState extends PortfolioData {
  isLoading: boolean;
  lastSync: number;
  syncError: string | null;
}

/**
 * Portfolio View Store Implementation
 */
class PortfolioViewStore extends BaseViewStore<PortfolioViewState> {
  // Expose store for derived stores
  public get data() {
    return this.store;
  }
  
  constructor() {
    const initialState: PortfolioViewState = {
      totalValueCents: 0n,
      totalValueFormatted: '$0.00',
      totalAccounts: 0,
      totalChains: 0,
      totalTokens: 0,
      totalTransactions: 0,
      
      performance: {
        change24h: 0n,
        change24hPercent: 0,
        change7d: 0n,
        change7dPercent: 0,
        change30d: 0n,
        change30dPercent: 0,
        allTimeHigh: 0n,
        allTimeHighDate: 0,
        allTimeLow: 0n,
        allTimeLowDate: 0
      },
      
      allocation: {
        byChain: [],
        byToken: [],
        byCategory: [],
        byAccount: []
      },
      
      history: {
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      },
      
      risk: {
        score: 50,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        diversificationScore: 50,
        concentrationRisk: 'medium'
      },
      
      defi: {
        totalStakedCents: 0n,
        totalLendingCents: 0n,
        totalBorrowingCents: 0n,
        totalLiquidityCents: 0n,
        averageApr: 0,
        protocols: []
      },
      
      nfts: {
        totalCount: 0,
        totalValueCents: 0n,
        collections: 0,
        topCollection: null
      },
      
      activity: {
        lastTransaction: 0,
        transactionsToday: 0,
        transactionsThisWeek: 0,
        gasSpentTodayCents: 0n,
        gasSpentThisWeekCents: 0n,
        mostActiveChain: null,
        mostTradedToken: null
      },
      
      insights: {
        suggestions: [],
        alerts: [],
        opportunities: [],
        lastUpdated: 0
      },
      
      galaxy: {
        centerMass: {
          size: 50,
          color: '#4444ff',
          luminosity: 0.8,
          rotationSpeed: 0.5
        },
        orbits: [],
        stars: [],
        nebulae: [],
        connections: [],
        viewAngle: { x: 0, y: 0, z: 0 }
      },
      
      preferences: {
        displayCurrency: 'USD',
        hideSmallBalances: false,
        consolidateByToken: true,
        showTestnets: false
      },
      
      isLoading: false,
      lastSync: 0,
      syncError: null
    };

    super(initialState, {
      storageKey: 'view_cache_portfolio',
      syncInterval: 120000, // 2 minutes
      maxCacheAge: 600000,  // 10 minutes
      enableAutoSync: true
    });
  }

  /**
   * Aggregate data from other view stores
   */
  async aggregateFromViews(
    accounts: any[],
    tokens: any[],
    transactions: any[],
    networks: any[]
  ): Promise<void> {
    const currentData = get(this.store);
    
    // Calculate totals
    currentData.totalAccounts = accounts.length;
    currentData.totalTokens = tokens.filter(t => Number(t.totalBalance) > 0).length;
    currentData.totalTransactions = transactions.length;
    currentData.totalChains = new Set(tokens.map(t => t.chainId)).size;
    
    // Calculate total value
    currentData.totalValueCents = tokens.reduce(
      (sum, token) => sum + (token.totalValueCents || 0n),
      0n
    );
    
    // Format for display
    currentData.totalValueFormatted = this.formatCurrency(currentData.totalValueCents);
    
    // Calculate allocations
    currentData.allocation = this.calculateAllocations(accounts, tokens, networks);
    
    // Calculate performance (would need historical data)
    currentData.performance = this.calculatePerformance(tokens);
    
    // Calculate risk metrics
    currentData.risk = this.calculateRiskMetrics(tokens, currentData.allocation);
    
    // Calculate DeFi summary
    currentData.defi = this.calculateDefiSummary(tokens);
    
    // Calculate activity summary
    currentData.activity = this.calculateActivitySummary(transactions);
    
    // Generate galaxy visualization
    currentData.galaxy = this.generateGalaxyVisualization(
      accounts,
      tokens,
      currentData.allocation,
      currentData.risk
    );
    
    // Generate AI insights (mock for now)
    currentData.insights = await this.generateInsights(currentData);
    
    currentData.lastSync = Date.now();
    currentData.isLoading = false;
    
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Format currency for display
   */
  private formatCurrency(cents: bigint): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(Number(cents) / 100);
  }

  /**
   * Calculate allocation breakdowns
   */
  private calculateAllocations(accounts: any[], tokens: any[], networks: any[]): PortfolioData['allocation'] {
    const totalValue = tokens.reduce((sum, t) => sum + Number(t.totalValueCents || 0), 0);
    
    // By token allocation
    const byToken: AllocationBreakdown[] = tokens
      .filter(t => BigNumberishUtils.toNumberSafe(t.totalValueCents) > 0)
      .sort((a, b) => BigNumberishUtils.compareSafe(b.totalValueCents, a.totalValueCents))
      .slice(0, 10)
      .map((token, index) => ({
        id: token.id,
        name: token.symbol,
        valueCents: token.totalValueCents,
        percentage: (Number(token.totalValueCents) / totalValue) * 100,
        change24h: token.change24h || 0,
        color: this.getColorForIndex(index)
      }));
    
    // By chain allocation
    const chainMap = new Map<number, bigint>();
    tokens.forEach(token => {
      const current = chainMap.get(token.chainId) || 0n;
      chainMap.set(token.chainId, current + token.totalValueCents);
    });
    
    const byChain: AllocationBreakdown[] = Array.from(chainMap.entries())
      .sort((a, b) => BigNumberishUtils.compareSafe(b[1], a[1]))
      .map(([chainId, value], index) => {
        const network = networks.find(n => n.chainId === chainId);
        return {
          id: String(chainId),
          name: network?.name || `Chain ${chainId}`,
          valueCents: value,
          percentage: (Number(value) / totalValue) * 100,
          change24h: 0, // Would need historical data
          color: this.getColorForIndex(index)
        };
      });
    
    // By account allocation
    const byAccount: AllocationBreakdown[] = accounts
      .sort((a, b) => BigNumberishUtils.compareSafe(b.totalValueCents, a.totalValueCents))
      .map((account, index) => ({
        id: account.address,
        name: account.alias || `Account ${index + 1}`,
        valueCents: account.totalValueCents,
        percentage: (Number(account.totalValueCents) / totalValue) * 100,
        change24h: account.change24h || 0,
        color: account.color || this.getColorForIndex(index)
      }));
    
    // By category (simplified)
    const categories = [
      { name: 'Tokens', value: tokens.reduce((s, t) => s + t.totalValueCents, 0n) },
      { name: 'DeFi', value: 0n }, // Would need DeFi position data
      { name: 'NFTs', value: 0n }  // Would need NFT data
    ];
    
    const byCategory: AllocationBreakdown[] = categories
      .filter(c => c.value > 0n)
      .map((cat, index) => ({
        id: cat.name.toLowerCase(),
        name: cat.name,
        valueCents: cat.value,
        percentage: (Number(cat.value) / totalValue) * 100,
        change24h: 0,
        color: this.getColorForIndex(index)
      }));
    
    return { byToken, byChain, byCategory, byAccount };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformance(tokens: any[]): PortfolioData['performance'] {
    // Mock implementation - would need historical data
    const totalValue = tokens.reduce((sum, t) => sum + (t.totalValueCents || 0n), 0n);
    
    return {
      change24h: BigInt(Math.round(Number(totalValue) * 0.02)), // Mock 2% change
      change24hPercent: 2.0,
      change7d: BigInt(Math.round(Number(totalValue) * 0.05)),
      change7dPercent: 5.0,
      change30d: BigInt(Math.round(Number(totalValue) * 0.10)),
      change30dPercent: 10.0,
      allTimeHigh: totalValue + (totalValue / 10n),
      allTimeHighDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
      allTimeLow: totalValue - (totalValue / 5n),
      allTimeLowDate: Date.now() - 30 * 24 * 60 * 60 * 1000
    };
  }

  /**
   * Calculate risk metrics
   */
  private calculateRiskMetrics(tokens: any[], allocation: PortfolioData['allocation']): PortfolioData['risk'] {
    // Calculate concentration risk
    const topTokenPercent = allocation.byToken[0]?.percentage || 0;
    const concentrationRisk = 
      topTokenPercent > 50 ? 'high' :
      topTokenPercent > 30 ? 'medium' : 'low';
    
    // Calculate diversification score
    const tokenCount = tokens.filter(t => Number(t.totalBalance) > 0).length;
    const diversificationScore = Math.min(tokenCount * 10, 100);
    
    return {
      score: 50 + Math.round((diversificationScore - 50) / 2),
      volatility: 15.5, // Mock value
      sharpeRatio: 1.2, // Mock value
      maxDrawdown: 12.3, // Mock value
      diversificationScore,
      concentrationRisk
    };
  }

  /**
   * Calculate DeFi summary
   */
  private calculateDefiSummary(tokens: any[]): PortfolioData['defi'] {
    // Mock implementation - would need actual DeFi position data
    return {
      totalStakedCents: 0n,
      totalLendingCents: 0n,
      totalBorrowingCents: 0n,
      totalLiquidityCents: 0n,
      averageApr: 0,
      protocols: []
    };
  }

  /**
   * Calculate activity summary
   */
  private calculateActivitySummary(transactions: any[]): PortfolioData['activity'] {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const todayTxs = transactions.filter(tx => tx.timestamp > oneDayAgo);
    const weekTxs = transactions.filter(tx => tx.timestamp > oneWeekAgo);
    
    return {
      lastTransaction: transactions[0]?.timestamp || 0,
      transactionsToday: todayTxs.length,
      transactionsThisWeek: weekTxs.length,
      gasSpentTodayCents: todayTxs.reduce((sum, tx) => sum + (tx.gasCostCents || 0n), 0n),
      gasSpentThisWeekCents: weekTxs.reduce((sum, tx) => sum + (tx.gasCostCents || 0n), 0n),
      mostActiveChain: null, // Would need to calculate
      mostTradedToken: null  // Would need to calculate
    };
  }

  /**
   * Generate galaxy visualization
   */
  private generateGalaxyVisualization(
    accounts: any[],
    tokens: any[],
    allocation: PortfolioData['allocation'],
    risk: PortfolioData['risk']
  ): PortfolioData['galaxy'] {
    // Create orbital rings for categories
    const orbits: GalaxyOrbit[] = [
      {
        radius: 100,
        category: 'Core Holdings',
        color: '#4444ff',
        width: 2,
        rotationSpeed: 0.5
      },
      {
        radius: 200,
        category: 'Secondary Assets',
        color: '#44ff44',
        width: 1.5,
        rotationSpeed: 0.3
      },
      {
        radius: 300,
        category: 'Small Positions',
        color: '#ff4444',
        width: 1,
        dashPattern: [5, 5],
        rotationSpeed: 0.1
      }
    ];
    
    // Create stars for assets
    const stars: GalaxyStar[] = [];
    
    // Add account stars (larger, in center)
    accounts.forEach((account, index) => {
      const angle = (index / accounts.length) * Math.PI * 2;
      const radius = 50 + Math.random() * 50;
      
      stars.push({
        id: account.address,
        name: account.alias || `Account ${index + 1}`,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 50,
        size: 5 + (Number(account.totalValueCents) / 100000),
        color: account.color || '#ffaa44',
        brightness: 0.8,
        twinkleRate: 1 + Math.random(),
        type: 'chain'
      });
    });
    
    // Add token stars
    tokens.slice(0, 50).forEach((token, index) => {
      const orbitIndex = 
        index < 5 ? 0 :    // Top 5 in inner orbit
        index < 15 ? 1 :   // Next 10 in middle
        2;                 // Rest in outer
      
      const orbit = orbits[orbitIndex];
      const angle = (index / 10) * Math.PI * 2;
      const radius = orbit.radius + (Math.random() - 0.5) * 30;
      
      stars.push({
        id: token.id,
        name: token.symbol,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        z: (Math.random() - 0.5) * 100,
        size: 1 + Math.log10(Number(token.totalValueCents || 1) / 100),
        color: token.constellation?.color || '#ffffff',
        brightness: 0.5 + (token.change24h || 0) / 100,
        twinkleRate: 0.5 + Math.random() * 2,
        orbitRadius: radius,
        orbitSpeed: orbit.rotationSpeed,
        type: 'token'
      });
    });
    
    // Add risk nebulae
    const nebulae: GalaxyNebula[] = [];
    
    if (risk.concentrationRisk === 'high') {
      nebulae.push({
        id: 'concentration-risk',
        type: 'risk',
        x: 0,
        y: 0,
        z: 0,
        radius: 150,
        color: '#ff0000',
        opacity: 0.2,
        particles: 100
      });
    }
    
    // Add connections between correlated assets
    const connections: GalaxyConnection[] = [];
    
    // Mock some connections
    if (stars.length > 2) {
      connections.push({
        from: stars[0].id,
        to: stars[1].id,
        strength: 0.8,
        color: '#44aaff',
        animated: true
      });
    }
    
    return {
      centerMass: {
        size: 20 + Math.log10(Number(allocation.byToken[0]?.valueCents || 1) / 100),
        color: risk.score > 70 ? '#ff4444' : risk.score > 40 ? '#ffaa44' : '#44ff44',
        luminosity: 0.9,
        rotationSpeed: 0.5
      },
      orbits,
      stars,
      nebulae,
      connections,
      viewAngle: { x: 0, y: 0, z: 0 }
    };
  }

  /**
   * Generate AI insights
   */
  private async generateInsights(portfolio: PortfolioData): Promise<PortfolioData['insights']> {
    // Mock AI insights - would integrate with actual AI service
    const suggestions: InsightSuggestion[] = [];
    const alerts: InsightAlert[] = [];
    const opportunities: Opportunity[] = [];
    
    // Generate suggestions based on portfolio state
    if (portfolio.risk.concentrationRisk === 'high') {
      suggestions.push({
        id: 'diversify-holdings',
        type: 'risk',
        title: 'High Concentration Risk Detected',
        description: 'Your portfolio is heavily concentrated in a single asset. Consider diversifying.',
        action: 'View diversification options',
        priority: 'high',
        potentialSavings: undefined
      });
    }
    
    if (portfolio.activity.gasSpentTodayCents > 10000n) { // > $100
      suggestions.push({
        id: 'optimize-gas',
        type: 'gas',
        title: 'High Gas Spending',
        description: 'You spent over $100 on gas today. Consider batching transactions.',
        action: 'View gas optimization tips',
        priority: 'medium',
        potentialSavings: portfolio.activity.gasSpentTodayCents / 3n
      });
    }
    
    // Generate alerts
    if (portfolio.performance.change24hPercent < -10) {
      alerts.push({
        id: 'sharp-decline',
        severity: 'warning',
        title: 'Sharp Portfolio Decline',
        message: `Your portfolio is down ${Math.abs(portfolio.performance.change24hPercent)}% in 24h`,
        timestamp: Date.now()
      });
    }
    
    // Generate opportunities (mock)
    opportunities.push({
      id: 'eth-staking',
      protocol: 'Ethereum',
      type: 'staking',
      apr: 4.5,
      risk: 'low',
      description: 'Stake ETH to earn rewards while securing the network',
      requiredAmount: BigInt(3200000) // 32 ETH in cents
    });
    
    return {
      suggestions,
      alerts,
      opportunities,
      lastUpdated: Date.now()
    };
  }

  /**
   * Get color for index
   */
  private getColorForIndex(index: number): string {
    const colors = [
      '#4444ff', '#44ff44', '#ff4444', '#ffaa44', '#ff44ff',
      '#44ffff', '#aaff44', '#ff44aa', '#44aaff', '#ffff44'
    ];
    return colors[index % colors.length];
  }

  /**
   * Update view angle for 3D visualization
   */
  async updateViewAngle(angle: { x?: number; y?: number; z?: number }): Promise<void> {
    const currentData = get(this.store);
    currentData.galaxy.viewAngle = {
      ...currentData.galaxy.viewAngle,
      ...angle
    };
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Update preferences
   */
  async updatePreferences(prefs: Partial<PortfolioData['preferences']>): Promise<void> {
    const currentData = get(this.store);
    currentData.preferences = {
      ...currentData.preferences,
      ...prefs
    };
    this.store.set(currentData);
    await this.saveToStorage();
  }

  /**
   * Add historical data point
   */
  async addHistoricalPoint(
    period: keyof PortfolioData['history'],
    point: HistoricalDataPoint
  ): Promise<void> {
    const currentData = get(this.store);
    
    currentData.history[period].push(point);
    
    // Keep only relevant data points
    const limits = {
      hourly: 24,
      daily: 30,
      weekly: 52,
      monthly: 12
    };
    
    if (currentData.history[period].length > limits[period]) {
      currentData.history[period] = currentData.history[period].slice(-limits[period]);
    }
    
    this.store.set(currentData);
    await this.saveToStorage();
  }

  // Implement abstract methods from BaseViewStore
  
  protected async hydrateData(data: any): Promise<PortfolioViewState> {
    // Convert string values back to BigInt
    if (data.totalValueCents) {
      data.totalValueCents = BigInt(data.totalValueCents);
    }
    
    if (data.performance) {
      ['change24h', 'change7d', 'change30d', 'allTimeHigh', 'allTimeLow'].forEach(key => {
        if (data.performance[key]) {
          data.performance[key] = BigInt(data.performance[key]);
        }
      });
    }
    
    if (data.allocation) {
      Object.values(data.allocation).forEach((items: any[]) => {
        items.forEach(item => {
          if (item.valueCents) item.valueCents = BigInt(item.valueCents);
        });
      });
    }
    
    if (data.defi) {
      ['totalStakedCents', 'totalLendingCents', 'totalBorrowingCents', 'totalLiquidityCents'].forEach(key => {
        if (data.defi[key]) {
          data.defi[key] = BigInt(data.defi[key]);
        }
      });
    }
    
    if (data.nfts?.totalValueCents) {
      data.nfts.totalValueCents = BigInt(data.nfts.totalValueCents);
    }
    
    if (data.activity) {
      ['gasSpentTodayCents', 'gasSpentThisWeekCents'].forEach(key => {
        if (data.activity[key]) {
          data.activity[key] = BigInt(data.activity[key]);
        }
      });
    }
    
    if (data.history) {
      Object.values(data.history).forEach((points: any[]) => {
        points.forEach(point => {
          if (point.valueCents) point.valueCents = BigInt(point.valueCents);
        });
      });
    }
    
    return data as PortfolioViewState;
  }
  
  protected async dehydrateData(data: PortfolioViewState): Promise<any> {
    // Convert BigInt to string for storage
    const dehydrated = JSON.parse(JSON.stringify(data, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    
    return dehydrated;
  }
  
  protected mergeData(current: PortfolioViewState, incoming: Partial<PortfolioViewState>): PortfolioViewState {
    return { ...current, ...incoming };
  }
  
  protected applyDelta(current: PortfolioViewState, delta: any): PortfolioViewState {
    // Apply incremental updates
    if (delta.totalValueCents !== undefined) {
      current.totalValueCents = delta.totalValueCents;
      current.totalValueFormatted = this.formatCurrency(delta.totalValueCents);
    }
    
    if (delta.performance) {
      current.performance = { ...current.performance, ...delta.performance };
    }
    
    if (delta.allocation) {
      current.allocation = { ...current.allocation, ...delta.allocation };
    }
    
    return current;
  }
  
  protected validateData(data: PortfolioViewState): boolean {
    return (
      data.totalValueCents !== undefined &&
      data.allocation !== undefined &&
      data.performance !== undefined
    );
  }
  
  protected getDelta(oldData: PortfolioViewState, newData: PortfolioViewState): any {
    const delta: any = {};
    
    if (oldData.totalValueCents !== newData.totalValueCents) {
      delta.totalValueCents = newData.totalValueCents;
    }
    
    if (JSON.stringify(oldData.performance) !== JSON.stringify(newData.performance)) {
      delta.performance = newData.performance;
    }
    
    return delta;
  }
  
  protected onDataUpdated(update: any): void {
    // Handle data update notifications
    log.debug('[PortfolioViewStore] Data updated', false, {
      type: update.type,
      hasData: !!update.data
    });
  }
  
  protected getEmptyData(): PortfolioViewState {
    return {
      totalValueCents: 0n,
      totalValueFormatted: '$0.00',
      totalAccounts: 0,
      totalChains: 0,
      totalTokens: 0,
      totalTransactions: 0,
      
      performance: {
        change24h: 0n,
        change24hPercent: 0,
        change7d: 0n,
        change7dPercent: 0,
        change30d: 0n,
        change30dPercent: 0,
        allTimeHigh: 0n,
        allTimeHighDate: 0,
        allTimeLow: 0n,
        allTimeLowDate: 0
      },
      
      allocation: {
        byChain: [],
        byToken: [],
        byCategory: [],
        byAccount: []
      },
      
      history: {
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      },
      
      risk: {
        score: 50,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        diversificationScore: 50,
        concentrationRisk: 'medium'
      },
      
      defi: {
        totalStakedCents: 0n,
        totalLendingCents: 0n,
        totalBorrowingCents: 0n,
        totalLiquidityCents: 0n,
        averageApr: 0,
        protocols: []
      },
      
      nfts: {
        totalCount: 0,
        totalValueCents: 0n,
        collections: 0,
        topCollection: null
      },
      
      activity: {
        lastTransaction: 0,
        transactionsToday: 0,
        transactionsThisWeek: 0,
        gasSpentTodayCents: 0n,
        gasSpentThisWeekCents: 0n,
        mostActiveChain: null,
        mostTradedToken: null
      },
      
      insights: {
        suggestions: [],
        alerts: [],
        opportunities: [],
        lastUpdated: 0
      },
      
      galaxy: {
        centerMass: {
          size: 50,
          color: '#4444ff',
          luminosity: 0.8,
          rotationSpeed: 0.5
        },
        orbits: [],
        stars: [],
        nebulae: [],
        connections: [],
        viewAngle: { x: 0, y: 0, z: 0 }
      },
      
      preferences: {
        displayCurrency: 'USD',
        hideSmallBalances: false,
        consolidateByToken: true,
        showTestnets: false
      },
      
      isLoading: false,
      lastSync: 0,
      syncError: null
    };
  }
}

// Create and export the singleton instance
export const portfolioViewStore = new PortfolioViewStore();

// Derived stores for specific data
export const portfolioTotal = derived(
  portfolioViewStore.data,
  $store => ({
    valueCents: $store.totalValueCents,
    formatted: $store.totalValueFormatted,
    change24h: $store.performance.change24hPercent
  })
);

export const portfolioAllocation = derived(
  portfolioViewStore.data,
  $store => $store.allocation
);

export const portfolioPerformance = derived(
  portfolioViewStore.data,
  $store => $store.performance
);

export const portfolioRisk = derived(
  portfolioViewStore.data,
  $store => $store.risk
);

export const portfolioInsights = derived(
  portfolioViewStore.data,
  $store => $store.insights
);

export const portfolioGalaxy = derived(
  portfolioViewStore.data,
  $store => $store.galaxy
);

export const portfolioHistory = derived(
  portfolioViewStore.data,
  $store => $store.history
);