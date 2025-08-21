/**
 * Network View Store - Network-centric data view
 * 
 * Provides flat, denormalized network data optimized for:
 * - Traditional network selectors and lists
 * - Network mesh visualization
 * - Cross-chain bridge routing
 * - Network health monitoring
 */

import { BaseViewStore, type ViewUpdate, createDerivedView } from './base-view.store';
import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
import { log } from '$lib/common/logger-wrapper';

// Types
export interface AccountSummary {
  address: string;
  label: string;
  balance: bigint;  // Total value on this network
  tokenCount: number;
  lastActivity: number;
}

export interface TokenSummary {
  symbol: string;
  address: string;
  totalBalance: bigint;
  totalValue: bigint;
  holders: number;  // Number of accounts holding this token
}

export interface NetworkActivity {
  timestamp: number;
  type: 'send' | 'receive' | 'swap' | 'bridge' | 'contract';
  value: bigint;
  gasUsed: bigint;
}

export interface BridgeRoute {
  fromChainId: number;
  toChainId: number;
  protocol: string;  // e.g., "Hop", "Stargate", "Across"
  supported: boolean;
  estimatedTime: number;  // minutes
  estimatedFee: bigint;
}

export interface NetworkData {
  // Core data
  chainId: number;
  name: string;
  displayName: string;
  icon: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    symbol: string;
    decimals: number;
  };
  
  // Status
  isActive: boolean;
  isTestnet: boolean;
  isConnected: boolean;
  lastSync: number;
  
  // Aggregated values
  totalValue: bigint;        // Total USD value on this network
  accountCount: number;
  tokenCount: number;
  transactionCount: number;
  
  // Network metrics
  gasPrice: bigint;
  baseFee?: bigint;
  priorityFee?: bigint;
  congestion: 'low' | 'medium' | 'high';
  health: number;            // 0-100 health score
  latency: number;           // RPC latency in ms
  
  // Detailed data
  accounts: AccountSummary[];
  topTokens: TokenSummary[];  // Top 10 by value
  recentActivity: NetworkActivity[];
  
  // Visualization metadata for NetworkMesh
  coordinates: { x: number; y: number };  // Position in mesh
  connections: number[];                  // Connected chain IDs (bridges)
  pulseRate: number;                     // Animation speed based on activity
  nodeSize: number;                      // Based on total value
  nodeColor: string;                     // Based on health/congestion
}

export interface NetworkViewStore {
  networks: Map<number, NetworkData>;
  bridges: BridgeRoute[];
  activity: {
    last24h: NetworkActivity[];
    volumeByNetwork: Map<number, bigint>;
    gasSpentByNetwork: Map<number, bigint>;
  };
  rankings: {
    byValue: number[];
    byActivity: number[];
    byGasPrice: number[];
  };
  totals: {
    networkCount: number;
    activeNetworks: number;
    totalValue: bigint;
    totalGasSpent24h: bigint;
  };
}

// Network positioning for mesh visualization
const NETWORK_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 200, y: 200 },      // Ethereum Mainnet (center)
  10: { x: 300, y: 150 },     // Optimism
  137: { x: 300, y: 250 },    // Polygon
  42161: { x: 150, y: 150 },  // Arbitrum
  8453: { x: 150, y: 250 },   // Base
  56: { x: 100, y: 200 },     // BSC
  43114: { x: 250, y: 100 },  // Avalanche
  250: { x: 250, y: 300 },    // Fantom
};

/**
 * Network View Store Implementation
 */
class NetworkViewStoreImpl extends BaseViewStore<NetworkViewStore> {
  constructor() {
    super(
      {
        networks: new Map(),
        bridges: [],
        activity: {
          last24h: [],
          volumeByNetwork: new Map(),
          gasSpentByNetwork: new Map()
        },
        rankings: {
          byValue: [],
          byActivity: [],
          byGasPrice: []
        },
        totals: {
          networkCount: 0,
          activeNetworks: 0,
          totalValue: 0n,
          totalGasSpent24h: 0n
        }
      },
      {
        storageKey: 'view_cache_network',
        syncInterval: 15000,      // 15 seconds (faster for gas prices)
        maxCacheAge: 60000,       // 1 minute
        enableAutoSync: true
      }
    );
  }

  /**
   * Add or update a network
   */
  public updateNetwork(chainId: number, data: Partial<NetworkData>): void {
    this.store.update(store => {
      const networks = new Map(store.networks);
      const existing = networks.get(chainId) || this.createEmptyNetwork(chainId);
      
      // Merge data
      const updated: NetworkData = {
        ...existing,
        ...data,
        // Ensure visualization data
        coordinates: data.coordinates || existing.coordinates || this.getNetworkPosition(chainId),
        connections: data.connections || existing.connections || this.getNetworkConnections(chainId),
        pulseRate: data.pulseRate || this.calculatePulseRate(data.transactionCount || existing.transactionCount),
        nodeSize: data.nodeSize || this.calculateNodeSize(data.totalValue || existing.totalValue),
        nodeColor: data.nodeColor || this.getNodeColor(data.congestion || existing.congestion, data.health || existing.health)
      };
      
      networks.set(chainId, updated);
      
      // Update rankings
      const rankings = this.updateRankings(networks);
      
      // Update totals
      const totals = this.calculateTotals(networks);
      
      return {
        ...store,
        networks,
        rankings,
        totals
      };
    });
    
    // Save to storage
    this.saveToStorage();
  }

  /**
   * Update gas price for a network
   */
  public updateGasPrice(chainId: number, gasPrice: bigint, baseFee?: bigint, priorityFee?: bigint): void {
    this.store.update(store => {
      const networks = new Map(store.networks);
      const network = networks.get(chainId);
      
      if (network) {
        network.gasPrice = gasPrice;
        network.baseFee = baseFee;
        network.priorityFee = priorityFee;
        network.congestion = this.calculateCongestion(gasPrice);
        networks.set(chainId, network);
      }
      
      return { ...store, networks };
    });
  }

  /**
   * Add network activity
   */
  public addActivity(activity: NetworkActivity): void {
    this.store.update(store => {
      const last24h = [...store.activity.last24h, activity]
        .filter(a => a.timestamp > Date.now() - 86400000)  // Keep only last 24h
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 1000);  // Keep max 1000 activities
      
      return {
        ...store,
        activity: {
          ...store.activity,
          last24h
        }
      };
    });
  }

  /**
   * Create empty network structure
   */
  private createEmptyNetwork(chainId: number): NetworkData {
    const networkInfo = this.getNetworkInfo(chainId);
    
    return {
      chainId,
      name: networkInfo.name,
      displayName: networkInfo.displayName,
      icon: networkInfo.icon,
      rpcUrl: networkInfo.rpcUrl,
      explorerUrl: networkInfo.explorerUrl,
      nativeCurrency: networkInfo.nativeCurrency,
      isActive: false,
      isTestnet: networkInfo.isTestnet,
      isConnected: false,
      lastSync: 0,
      totalValue: 0n,
      accountCount: 0,
      tokenCount: 0,
      transactionCount: 0,
      gasPrice: 0n,
      congestion: 'low',
      health: 100,
      latency: 0,
      accounts: [],
      topTokens: [],
      recentActivity: [],
      coordinates: { x: 200, y: 200 },
      connections: [],
      pulseRate: 1,
      nodeSize: 30,
      nodeColor: '#10B981'
    };
  }

  /**
   * Get network info
   */
  private getNetworkInfo(chainId: number): any {
    // This would normally come from a network config
    const networks: Record<number, any> = {
      1: {
        name: 'ethereum',
        displayName: 'Ethereum',
        icon: '🔷',
        rpcUrl: 'https://eth.llamarpc.com',
        explorerUrl: 'https://etherscan.io',
        nativeCurrency: { symbol: 'ETH', decimals: 18 },
        isTestnet: false
      },
      137: {
        name: 'polygon',
        displayName: 'Polygon',
        icon: '🟣',
        rpcUrl: 'https://polygon-rpc.com',
        explorerUrl: 'https://polygonscan.com',
        nativeCurrency: { symbol: 'MATIC', decimals: 18 },
        isTestnet: false
      },
      // Add more networks as needed
    };
    
    return networks[chainId] || {
      name: `chain-${chainId}`,
      displayName: `Chain ${chainId}`,
      icon: '🔗',
      rpcUrl: '',
      explorerUrl: '',
      nativeCurrency: { symbol: 'ETH', decimals: 18 },
      isTestnet: false
    };
  }

  /**
   * Get network position for mesh visualization
   */
  private getNetworkPosition(chainId: number): { x: number; y: number } {
    return NETWORK_POSITIONS[chainId] || {
      x: 200 + Math.random() * 200 - 100,
      y: 200 + Math.random() * 200 - 100
    };
  }

  /**
   * Get network connections (bridges)
   */
  private getNetworkConnections(chainId: number): number[] {
    // Define which networks can bridge to each other
    const connections: Record<number, number[]> = {
      1: [10, 137, 42161, 8453, 56, 43114],     // Ethereum connects to most
      10: [1, 137, 42161, 8453],                // Optimism
      137: [1, 10, 42161, 8453, 56],            // Polygon
      42161: [1, 10, 137, 8453],                // Arbitrum
      8453: [1, 10, 137, 42161],                // Base
      56: [1, 137, 43114],                      // BSC
      43114: [1, 56],                           // Avalanche
    };
    
    return connections[chainId] || [];
  }

  /**
   * Calculate pulse rate based on activity
   */
  private calculatePulseRate(transactionCount: number): number {
    // More transactions = faster pulse
    if (transactionCount > 1000) return 3;
    if (transactionCount > 100) return 2;
    if (transactionCount > 10) return 1.5;
    return 1;
  }

  /**
   * Calculate node size based on value
   */
  private calculateNodeSize(value: bigint): number {
    const dollars = Number(value) / 100;
    if (dollars === 0) return 20;
    
    const logValue = Math.log10(dollars + 1);
    return Math.min(80, Math.max(20, 20 + logValue * 8));
  }

  /**
   * Get node color based on congestion and health
   */
  private getNodeColor(congestion: string, health: number): string {
    if (health < 50) return '#EF4444';       // Red - unhealthy
    if (congestion === 'high') return '#F59E0B';  // Yellow - congested
    if (congestion === 'medium') return '#3B82F6'; // Blue - moderate
    return '#10B981';  // Green - healthy
  }

  /**
   * Calculate congestion based on gas price
   */
  private calculateCongestion(gasPrice: bigint): 'low' | 'medium' | 'high' {
    const gwei = Number(gasPrice) / 1e9;
    if (gwei > 100) return 'high';
    if (gwei > 30) return 'medium';
    return 'low';
  }

  /**
   * Update rankings
   */
  private updateRankings(networks: Map<number, NetworkData>): NetworkViewStore['rankings'] {
    const networkArray = Array.from(networks.values());
    
    return {
      byValue: networkArray
        .sort((a, b) => Number(b.totalValue - a.totalValue))
        .map(n => n.chainId),
      
      byActivity: networkArray
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .map(n => n.chainId),
      
      byGasPrice: networkArray
        .sort((a, b) => Number(a.gasPrice - b.gasPrice))
        .map(n => n.chainId)
    };
  }

  /**
   * Calculate totals
   */
  private calculateTotals(networks: Map<number, NetworkData>): NetworkViewStore['totals'] {
    let totalValue = 0n;
    let activeNetworks = 0;
    
    for (const network of networks.values()) {
      totalValue += network.totalValue;
      if (network.isActive) activeNetworks++;
    }
    
    return {
      networkCount: networks.size,
      activeNetworks,
      totalValue,
      totalGasSpent24h: 0n  // Calculate from activity
    };
  }

  // Implement abstract methods
  protected async hydrateData(data: any): Promise<NetworkViewStore> {
    const networks = new Map();
    
    if (data.networks) {
      for (const [chainId, networkData] of Object.entries(data.networks)) {
        networks.set(Number(chainId), {
          ...networkData as any,
          chainId: Number(chainId),
          totalValue: BigNumberishUtils.toBigInt((networkData as any).totalValue),
          gasPrice: BigNumberishUtils.toBigInt((networkData as any).gasPrice),
          baseFee: (networkData as any).baseFee ? BigNumberishUtils.toBigInt((networkData as any).baseFee) : undefined,
          priorityFee: (networkData as any).priorityFee ? BigNumberishUtils.toBigInt((networkData as any).priorityFee) : undefined,
          accounts: ((networkData as any).accounts || []).map((a: any) => ({
            ...a,
            balance: BigNumberishUtils.toBigInt(a.balance)
          })),
          topTokens: ((networkData as any).topTokens || []).map((t: any) => ({
            ...t,
            totalBalance: BigNumberishUtils.toBigInt(t.totalBalance),
            totalValue: BigNumberishUtils.toBigInt(t.totalValue)
          }))
        });
      }
    }
    
    return {
      networks,
      bridges: data.bridges || [],
      activity: {
        last24h: data.activity?.last24h || [],
        volumeByNetwork: new Map(),
        gasSpentByNetwork: new Map()
      },
      rankings: data.rankings || this.getEmptyData().rankings,
      totals: {
        networkCount: data.totals?.networkCount || 0,
        activeNetworks: data.totals?.activeNetworks || 0,
        totalValue: BigNumberishUtils.toBigInt(data.totals?.totalValue || 0),
        totalGasSpent24h: BigNumberishUtils.toBigInt(data.totals?.totalGasSpent24h || 0)
      }
    };
  }

  protected async dehydrateData(data: any): Promise<any> {
    const networks: Record<string, any> = {};
    
    for (const [chainId, networkData] of data.networks.entries()) {
      networks[chainId.toString()] = {
        ...networkData,
        totalValue: networkData.totalValue.toString(),
        gasPrice: networkData.gasPrice.toString(),
        baseFee: networkData.baseFee?.toString(),
        priorityFee: networkData.priorityFee?.toString(),
        accounts: networkData.accounts.map((a: AccountSummary) => ({
          ...a,
          balance: a.balance.toString()
        })),
        topTokens: networkData.topTokens.map((t: TokenSummary) => ({
          ...t,
          totalBalance: t.totalBalance.toString(),
          totalValue: t.totalValue.toString()
        }))
      };
    }
    
    return {
      ...data,
      networks,
      totals: {
        ...data.totals,
        totalValue: data.totals.totalValue.toString(),
        totalGasSpent24h: data.totals.totalGasSpent24h.toString()
      }
    };
  }

  protected mergeData(current: NetworkViewStore, update: NetworkViewStore): NetworkViewStore {
    const merged = new Map(current.networks);
    
    for (const [chainId, networkData] of update.networks.entries()) {
      merged.set(chainId, networkData);
    }
    
    return {
      ...current,
      networks: merged,
      bridges: update.bridges || current.bridges,
      rankings: this.updateRankings(merged),
      totals: this.calculateTotals(merged)
    };
  }

  protected applyDelta(current: NetworkViewStore, delta: any): NetworkViewStore {
    const updated = { ...current };
    
    if (delta.networkUpdates) {
      for (const update of delta.networkUpdates) {
        const network = updated.networks.get(update.chainId);
        if (network) {
          updated.networks.set(update.chainId, {
            ...network,
            ...update.changes
          });
        }
      }
    }
    
    return updated;
  }

  protected onDataUpdated(update: ViewUpdate<NetworkViewStore>): void {
    log.debug('Network view updated', {
      type: update.type,
      networkCount: update.data.networks.size,
      activeNetworks: update.data.totals.activeNetworks
    });
  }

  protected getEmptyData(): NetworkViewStore {
    return {
      networks: new Map(),
      bridges: [],
      activity: {
        last24h: [],
        volumeByNetwork: new Map(),
        gasSpentByNetwork: new Map()
      },
      rankings: {
        byValue: [],
        byActivity: [],
        byGasPrice: []
      },
      totals: {
        networkCount: 0,
        activeNetworks: 0,
        totalValue: 0n,
        totalGasSpent24h: 0n
      }
    };
  }
}

// Create singleton instance
export const networkViewStore = new NetworkViewStoreImpl();

// Derived stores
export const activeNetworks = createDerivedView(
  networkViewStore,
  (data) => Array.from(data.networks.values()).filter(n => n.isActive)
);

export const mainnetNetworks = createDerivedView(
  networkViewStore,
  (data) => Array.from(data.networks.values()).filter(n => !n.isTestnet)
);

export const gasPrices = createDerivedView(
  networkViewStore,
  (data) => {
    const prices: Record<number, bigint> = {};
    for (const [chainId, network] of data.networks.entries()) {
      prices[chainId] = network.gasPrice;
    }
    return prices;
  }
);