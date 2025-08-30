/**
 * Account View Store - Account-centric data view
 * 
 * Provides flat, denormalized account data optimized for:
 * - Traditional account lists and tables
 * - Orbital portfolio visualization
 * - Quick account switching
 * - Multi-account aggregation
 */

import { BaseViewStore, type ViewUpdate, createDerivedView } from './base-view.store';
import { derived, get, type Readable } from 'svelte/store';
import type { YakklAccount } from '$lib/common/interfaces';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { log } from '$lib/common/logger-wrapper';

// Types
export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  chainId: number;
  balance: bigint;  // Raw token amount
  value: bigint;    // USD value in cents
  price: number;
  change24h: number;
  logoUri?: string;
}

export interface ChainSummary {
  chainId: number;
  name: string;
  tokenCount: number;
  totalValue: bigint;  // cents
  nativeBalance: bigint;
  lastActivity: number;
}

export interface Performance {
  day: number;      // Percentage change
  week: number;
  month: number;
  year: number;
  allTime: number;
}

export interface RiskMetrics {
  diversificationScore: number;  // 0-100
  volatilityScore: number;       // 0-100
  concentrationRisk: number;     // 0-100
  defiExposure: number;         // Percentage
}

export interface AccountData {
  // Core data
  address: string;
  label: string;
  ens?: string;
  avatar?: string;
  
  // Aggregated values
  totalValue: bigint;           // Total USD value in cents
  totalTokens: number;
  activeChains: number;
  
  // Detailed data
  chains: ChainSummary[];
  tokens: TokenBalance[];
  
  // Analytics
  performance: Performance;
  risk: RiskMetrics;
  lastActivity: number;
  transactionCount: number;
  
  // Visualization metadata
  color: string;               // Unique color for orbital view
  radius: number;              // Size in orbital view (based on value)
  angle: number;               // Position in constellation
  orbitSpeed: number;          // Animation speed
  glowIntensity: number;       // Based on recent activity
}

export interface AccountViewStore {
  accounts: Map<string, AccountData>;
  rankings: {
    byValue: string[];
    byActivity: string[];
    byPerformance: string[];
    byRisk: string[];
  };
  totals: {
    portfolioValue: bigint;
    accountCount: number;
    tokenCount: number;
    chainCount: number;
  };
  colors: string[];  // Color palette for accounts
}

// Color palette for orbital visualization
const ACCOUNT_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Account View Store Implementation
 */
class AccountViewStoreImpl extends BaseViewStore<AccountViewStore> {
  constructor() {
    super(
      {
        accounts: new Map(),
        rankings: {
          byValue: [],
          byActivity: [],
          byPerformance: [],
          byRisk: []
        },
        totals: {
          portfolioValue: 0n,
          accountCount: 0,
          tokenCount: 0,
          chainCount: 0
        },
        colors: ACCOUNT_COLORS
      },
      {
        storageKey: 'view_cache_account',
        syncInterval: 30000,      // 30 seconds
        maxCacheAge: 300000,      // 5 minutes
        enableAutoSync: true
      }
    );
  }

  /**
   * Add or update an account
   */
  public updateAccount(address: string, data: Partial<AccountData>): void {
    this.store.update(store => {
      const accounts = new Map(store.accounts);
      const existing = accounts.get(address) || this.createEmptyAccount(address);
      
      // Merge data
      const updated: AccountData = {
        ...existing,
        ...data,
        // Ensure visualization data
        color: data.color || existing.color || this.getAccountColor(address, store.colors),
        radius: data.radius || this.calculateRadius(data.totalValue || existing.totalValue),
        angle: data.angle || existing.angle || this.calculateAngle(accounts.size),
        orbitSpeed: data.orbitSpeed || this.calculateOrbitSpeed(data.performance || existing.performance),
        glowIntensity: data.glowIntensity || this.calculateGlowIntensity(data.lastActivity || existing.lastActivity)
      };
      
      accounts.set(address, updated);
      
      // Update rankings
      const rankings = this.updateRankings(accounts);
      
      // Update totals
      const totals = this.calculateTotals(accounts);
      
      return {
        ...store,
        accounts,
        rankings,
        totals
      };
    });
    
    // Save to storage
    this.saveToStorage();
  }

  /**
   * Remove an account
   */
  public removeAccount(address: string): void {
    this.store.update(store => {
      const accounts = new Map(store.accounts);
      accounts.delete(address);
      
      const rankings = this.updateRankings(accounts);
      const totals = this.calculateTotals(accounts);
      
      return {
        ...store,
        accounts,
        rankings,
        totals
      };
    });
    
    this.saveToStorage();
  }

  /**
   * Create empty account structure
   */
  private createEmptyAccount(address: string): AccountData {
    return {
      address,
      label: `Account ${address.slice(0, 6)}...${address.slice(-4)}`,
      totalValue: 0n,
      totalTokens: 0,
      activeChains: 0,
      chains: [],
      tokens: [],
      performance: {
        day: 0,
        week: 0,
        month: 0,
        year: 0,
        allTime: 0
      },
      risk: {
        diversificationScore: 0,
        volatilityScore: 0,
        concentrationRisk: 0,
        defiExposure: 0
      },
      lastActivity: Date.now(),
      transactionCount: 0,
      color: '',
      radius: 50,
      angle: 0,
      orbitSpeed: 1,
      glowIntensity: 0.5
    };
  }

  /**
   * Update rankings based on current accounts
   */
  private updateRankings(accounts: Map<string, AccountData>): AccountViewStore['rankings'] {
    const accountArray = Array.from(accounts.values());
    
    return {
      byValue: accountArray
        .sort((a, b) => BigNumberishUtils.compareSafe(b.totalValue, a.totalValue))
        .map(a => a.address),
      
      byActivity: accountArray
        .sort((a, b) => b.lastActivity - a.lastActivity)
        .map(a => a.address),
      
      byPerformance: accountArray
        .sort((a, b) => b.performance.day - a.performance.day)
        .map(a => a.address),
      
      byRisk: accountArray
        .sort((a, b) => a.risk.concentrationRisk - b.risk.concentrationRisk)
        .map(a => a.address)
    };
  }

  /**
   * Calculate totals from accounts
   */
  private calculateTotals(accounts: Map<string, AccountData>): AccountViewStore['totals'] {
    let portfolioValue = 0n;
    let tokenCount = 0;
    const chainSet = new Set<number>();
    
    for (const account of accounts.values()) {
      portfolioValue += account.totalValue;
      tokenCount += account.totalTokens;
      account.chains.forEach(c => chainSet.add(c.chainId));
    }
    
    return {
      portfolioValue,
      accountCount: accounts.size,
      tokenCount,
      chainCount: chainSet.size
    };
  }

  /**
   * Get color for account (for orbital view)
   */
  private getAccountColor(address: string, colors: string[]): string {
    // Use address hash to consistently assign color
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Calculate orbital radius based on value
   */
  private calculateRadius(value: bigint): number {
    // Logarithmic scale for better visualization
    const dollars = Number(value) / 100;
    if (dollars === 0) return 30;
    
    const logValue = Math.log10(dollars + 1);
    return Math.min(100, Math.max(30, 30 + logValue * 10));
  }

  /**
   * Calculate orbital angle
   */
  private calculateAngle(index: number): number {
    // Distribute evenly around circle
    return (index * 360 / 8) % 360;
  }

  /**
   * Calculate orbit speed based on performance
   */
  private calculateOrbitSpeed(performance: Performance): number {
    // Faster orbit for better performing accounts
    const avgPerformance = (performance.day + performance.week) / 2;
    return 1 + (avgPerformance / 100);
  }

  /**
   * Calculate glow intensity based on activity
   */
  private calculateGlowIntensity(lastActivity: number): number {
    const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60);
    if (hoursSinceActivity < 1) return 1;
    if (hoursSinceActivity < 24) return 0.8;
    if (hoursSinceActivity < 168) return 0.5;
    return 0.3;
  }

  // Implement abstract methods
  protected async hydrateData(data: any): Promise<AccountViewStore> {
    // Convert stored data back to proper types
    const accounts = new Map();
    
    if (data.accounts) {
      for (const [address, accountData] of Object.entries(data.accounts)) {
        accounts.set(address, {
          ...accountData as any,
          totalValue: BigNumberishUtils.toBigInt((accountData as any).totalValue),
          tokens: ((accountData as any).tokens || []).map((t: any) => ({
            ...t,
            balance: BigNumberishUtils.toBigInt(t.balance),
            value: BigNumberishUtils.toBigInt(t.value)
          })),
          chains: ((accountData as any).chains || []).map((c: any) => ({
            ...c,
            totalValue: BigNumberishUtils.toBigInt(c.totalValue),
            nativeBalance: BigNumberishUtils.toBigInt(c.nativeBalance)
          }))
        });
      }
    }
    
    return {
      accounts,
      rankings: data.rankings || this.getEmptyData().rankings,
      totals: {
        portfolioValue: BigNumberishUtils.toBigInt(data.totals?.portfolioValue || 0),
        accountCount: data.totals?.accountCount || 0,
        tokenCount: data.totals?.tokenCount || 0,
        chainCount: data.totals?.chainCount || 0
      },
      colors: data.colors || ACCOUNT_COLORS
    };
  }

  protected async dehydrateData(data: any): Promise<any> {
    // Convert BigInt to string for storage
    const accounts: Record<string, any> = {};
    
    for (const [address, accountData] of data.accounts.entries()) {
      accounts[address] = {
        ...accountData,
        totalValue: accountData.totalValue.toString(),
        tokens: accountData.tokens.map((t: TokenBalance) => ({
          ...t,
          balance: t.balance.toString(),
          value: t.value.toString()
        })),
        chains: accountData.chains.map((c: ChainSummary) => ({
          ...c,
          totalValue: c.totalValue.toString(),
          nativeBalance: c.nativeBalance.toString()
        }))
      };
    }
    
    return {
      ...data,
      accounts,
      totals: {
        ...data.totals,
        portfolioValue: data.totals.portfolioValue.toString()
      }
    };
  }

  protected mergeData(current: AccountViewStore, update: AccountViewStore): AccountViewStore {
    // Merge accounts
    const merged = new Map(current.accounts);
    
    for (const [address, accountData] of update.accounts.entries()) {
      merged.set(address, accountData);
    }
    
    return {
      accounts: merged,
      rankings: this.updateRankings(merged),
      totals: this.calculateTotals(merged),
      colors: update.colors || current.colors
    };
  }

  protected applyDelta(current: AccountViewStore, delta: any): AccountViewStore {
    // Apply incremental updates
    const updated = { ...current };
    
    if (delta.accountUpdates) {
      for (const update of delta.accountUpdates) {
        const account = updated.accounts.get(update.address);
        if (account) {
          updated.accounts.set(update.address, {
            ...account,
            ...update.changes
          });
        }
      }
    }
    
    return {
      ...updated,
      rankings: this.updateRankings(updated.accounts),
      totals: this.calculateTotals(updated.accounts)
    };
  }

  protected onDataUpdated(update: ViewUpdate<AccountViewStore>): void {
    log.debug('Account view updated', {
      type: update.type,
      accountCount: update.data.accounts.size,
      totalValue: update.data.totals.portfolioValue.toString()
    });
  }

  protected getEmptyData(): AccountViewStore {
    return {
      accounts: new Map(),
      rankings: {
        byValue: [],
        byActivity: [],
        byPerformance: [],
        byRisk: []
      },
      totals: {
        portfolioValue: 0n,
        accountCount: 0,
        tokenCount: 0,
        chainCount: 0
      },
      colors: ACCOUNT_COLORS
    };
  }
}

// Create singleton instance
export const accountViewStore = new AccountViewStoreImpl();

// Derived stores for specific views
export const topAccounts = createDerivedView(
  accountViewStore,
  (data) => {
    const top5 = data.rankings.byValue.slice(0, 5);
    return top5.map(address => data.accounts.get(address)).filter(Boolean);
  }
);

export const activeAccounts = createDerivedView(
  accountViewStore,
  (data) => {
    const oneHourAgo = Date.now() - 3600000;
    return Array.from(data.accounts.values())
      .filter(account => account.lastActivity > oneHourAgo);
  }
);

export const portfolioTotal = createDerivedView(
  accountViewStore,
  (data) => data.totals.portfolioValue
);

export const accountCount = createDerivedView(
  accountViewStore,
  (data) => data.totals.accountCount
);