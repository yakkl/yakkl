/**
 * CostTracker - Tracks RPC costs and calculates savings from caching
 * Monitors usage patterns and provides cost analytics
 */

export interface RPCMethod {
  name: string;
  computeUnits: number;
  dollarCost: number;
  category: 'read' | 'write' | 'compute' | 'storage';
}

export interface CostMetrics {
  method: string;
  calls: number;
  cachedCalls: number;
  totalCost: number;
  savedCost: number;
  avgResponseTime: number;
  cacheHitRate: number;
}

export class CostTracker {
  private methods: Map<string, RPCMethod> = new Map();
  private metrics: Map<string, CostMetrics> = new Map();
  private sessionStartTime: number = Date.now();
  private totalSavings: number = 0;
  private totalCost: number = 0;

  constructor() {
    this.initializeDefaultMethods();
  }

  /**
   * Initialize with common RPC methods and their costs
   */
  private initializeDefaultMethods(): void {
    // Ethereum RPC methods (based on Alchemy pricing)
    this.registerMethod({
      name: 'eth_blockNumber',
      computeUnits: 10,
      dollarCost: 0.000004,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getBalance',
      computeUnits: 26,
      dollarCost: 0.00001,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getTransactionCount',
      computeUnits: 26,
      dollarCost: 0.00001,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getBlockByNumber',
      computeUnits: 16,
      dollarCost: 0.000007,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getTransactionByHash',
      computeUnits: 15,
      dollarCost: 0.000006,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getTransactionReceipt',
      computeUnits: 15,
      dollarCost: 0.000006,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_call',
      computeUnits: 26,
      dollarCost: 0.00001,
      category: 'compute'
    });
    
    this.registerMethod({
      name: 'eth_estimateGas',
      computeUnits: 87,
      dollarCost: 0.000035,
      category: 'compute'
    });
    
    this.registerMethod({
      name: 'eth_gasPrice',
      computeUnits: 10,
      dollarCost: 0.000004,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getLogs',
      computeUnits: 75,
      dollarCost: 0.00003,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getCode',
      computeUnits: 26,
      dollarCost: 0.00001,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'eth_getStorageAt',
      computeUnits: 17,
      dollarCost: 0.000007,
      category: 'storage'
    });
    
    this.registerMethod({
      name: 'eth_sendRawTransaction',
      computeUnits: 250,
      dollarCost: 0.0001,
      category: 'write'
    });
    
    // Enhanced RPC methods
    this.registerMethod({
      name: 'alchemy_getTokenBalances',
      computeUnits: 100,
      dollarCost: 0.00004,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'alchemy_getAssetTransfers',
      computeUnits: 150,
      dollarCost: 0.00006,
      category: 'read'
    });
    
    this.registerMethod({
      name: 'getNFTs',
      computeUnits: 100,
      dollarCost: 0.00004,
      category: 'read'
    });
    
    // Web3 storage methods
    this.registerMethod({
      name: 'ipfs_pin',
      computeUnits: 500,
      dollarCost: 0.0002,
      category: 'storage'
    });
    
    this.registerMethod({
      name: 'ipfs_get',
      computeUnits: 50,
      dollarCost: 0.00002,
      category: 'storage'
    });
  }

  /**
   * Register a new RPC method with its cost
   */
  registerMethod(method: RPCMethod): void {
    this.methods.set(method.name, method);
  }

  /**
   * Track an RPC call
   */
  trackCall(
    method: string,
    wasCached: boolean,
    responseTime: number = 0
  ): void {
    const rpcMethod = this.methods.get(method);
    if (!rpcMethod) {
      console.warn(`Unknown RPC method: ${method}`);
      return;
    }
    
    let metric = this.metrics.get(method);
    if (!metric) {
      metric = {
        method,
        calls: 0,
        cachedCalls: 0,
        totalCost: 0,
        savedCost: 0,
        avgResponseTime: 0,
        cacheHitRate: 0
      };
      this.metrics.set(method, metric);
    }
    
    metric.calls++;
    
    if (wasCached) {
      metric.cachedCalls++;
      metric.savedCost += rpcMethod.dollarCost;
      this.totalSavings += rpcMethod.dollarCost;
    } else {
      metric.totalCost += rpcMethod.dollarCost;
      this.totalCost += rpcMethod.dollarCost;
    }
    
    // Update average response time
    if (responseTime > 0) {
      metric.avgResponseTime = 
        (metric.avgResponseTime * (metric.calls - 1) + responseTime) / metric.calls;
    }
    
    // Update cache hit rate
    metric.cacheHitRate = metric.cachedCalls / metric.calls;
  }

  /**
   * Track a batch of calls
   */
  trackBatch(
    method: string,
    count: number,
    cachedCount: number,
    avgResponseTime: number = 0
  ): void {
    for (let i = 0; i < count; i++) {
      this.trackCall(method, i < cachedCount, avgResponseTime);
    }
  }

  /**
   * Get metrics for a specific method
   */
  getMethodMetrics(method: string): CostMetrics | undefined {
    return this.metrics.get(method);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): CostMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    sessionDuration: number;
    totalCalls: number;
    cachedCalls: number;
    cacheHitRate: number;
    totalCost: number;
    totalSavings: number;
    savingsPercentage: number;
    topMethods: Array<{ method: string; calls: number; cost: number }>;
    costByCategory: Record<string, number>;
    projectedMonthlySavings: number;
  } {
    const sessionDuration = Date.now() - this.sessionStartTime;
    let totalCalls = 0;
    let cachedCalls = 0;
    const costByCategory: Record<string, number> = {};
    
    for (const metric of this.metrics.values()) {
      totalCalls += metric.calls;
      cachedCalls += metric.cachedCalls;
      
      const method = this.methods.get(metric.method);
      if (method) {
        const category = method.category;
        costByCategory[category] = (costByCategory[category] || 0) + metric.totalCost;
      }
    }
    
    const cacheHitRate = totalCalls > 0 ? cachedCalls / totalCalls : 0;
    const totalSpent = this.totalCost + this.totalSavings;
    const savingsPercentage = totalSpent > 0 ? (this.totalSavings / totalSpent) * 100 : 0;
    
    // Top methods by cost
    const topMethods = Array.from(this.metrics.values())
      .sort((a, b) => (b.totalCost + b.savedCost) - (a.totalCost + a.savedCost))
      .slice(0, 5)
      .map(m => ({
        method: m.method,
        calls: m.calls,
        cost: m.totalCost + m.savedCost
      }));
    
    // Project monthly savings based on current rate
    const hoursElapsed = sessionDuration / (1000 * 60 * 60);
    const savingsPerHour = hoursElapsed > 0 ? this.totalSavings / hoursElapsed : 0;
    const projectedMonthlySavings = savingsPerHour * 24 * 30;
    
    return {
      sessionDuration,
      totalCalls,
      cachedCalls,
      cacheHitRate,
      totalCost: this.totalCost,
      totalSavings: this.totalSavings,
      savingsPercentage,
      topMethods,
      costByCategory,
      projectedMonthlySavings
    };
  }

  /**
   * Get cost breakdown by time period
   */
  getCostByPeriod(periodMs: number = 3600000): Array<{
    period: number;
    cost: number;
    savings: number;
    calls: number;
  }> {
    // This would require tracking timestamps for each call
    // Simplified implementation returns current totals
    return [{
      period: 0,
      cost: this.totalCost,
      savings: this.totalSavings,
      calls: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.calls, 0)
    }];
  }

  /**
   * Export metrics as CSV
   */
  exportCSV(): string {
    const headers = [
      'Method',
      'Total Calls',
      'Cached Calls',
      'Cache Hit Rate',
      'Total Cost ($)',
      'Saved Cost ($)',
      'Avg Response Time (ms)'
    ].join(',');
    
    const rows = Array.from(this.metrics.values()).map(m => [
      m.method,
      m.calls,
      m.cachedCalls,
      (m.cacheHitRate * 100).toFixed(2) + '%',
      m.totalCost.toFixed(6),
      m.savedCost.toFixed(6),
      m.avgResponseTime.toFixed(2)
    ].join(','));
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.totalSavings = 0;
    this.totalCost = 0;
    this.sessionStartTime = Date.now();
  }

  /**
   * Calculate ROI for caching implementation
   */
  calculateROI(implementationCost: number): {
    breakEvenDays: number;
    monthlyROI: number;
    yearlyROI: number;
  } {
    const summary = this.getSummary();
    const dailySavings = summary.projectedMonthlySavings / 30;
    
    return {
      breakEvenDays: dailySavings > 0 ? implementationCost / dailySavings : Infinity,
      monthlyROI: summary.projectedMonthlySavings - (implementationCost / 12),
      yearlyROI: (summary.projectedMonthlySavings * 12) - implementationCost
    };
  }
}