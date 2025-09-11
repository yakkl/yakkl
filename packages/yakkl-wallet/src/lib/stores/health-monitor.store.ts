/**
 * Health Monitor Store
 * Tracks provider health metrics and system status
 */

import { writable, derived, get } from 'svelte/store';
import { providerRoutingManager } from '$lib/managers/ProviderRoutingManager';
import type { ProviderStats } from '$lib/managers/ProviderRoutingManager';
import { audioAlertService } from '$lib/services/audio-alert.service';

export interface HealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'failed' | 'disabled';
  responseTime: number;
  successRate: number;
  lastUsed?: Date;
  lastError?: string;
  failureCount: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  providers: HealthStatus[];
  activeProvider?: string;
  lastUpdate: Date;
  totalRequests: number;
  avgResponseTime: number;
}

// Update interval (30 seconds)
const UPDATE_INTERVAL = 30000;

// Store for health data
const healthData = writable<SystemHealth>({
  overall: 'healthy',
  providers: [],
  lastUpdate: new Date(),
  totalRequests: 0,
  avgResponseTime: 0
});

// Derived store for overall status color
export const healthColor = derived(healthData, ($health) => {
  switch ($health.overall) {
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
});

// Derived store for status icon
export const healthIcon = derived(healthData, ($health) => {
  switch ($health.overall) {
    case 'healthy':
      return '🩺'; // Stethoscope with green indicator
    case 'degraded':
      return '🩺'; // Stethoscope with yellow indicator
    case 'critical':
      return '🩺'; // Stethoscope with red indicator
    default:
      return '🩺';
  }
});

class HealthMonitorService {
  private updateTimer: NodeJS.Timeout | null = null;
  private previousOverallHealth: 'healthy' | 'degraded' | 'critical' | null = null;
  private previousActiveProvider: string | null = null;
  
  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    // Initial update
    this.updateHealthStatus();
    
    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.updateHealthStatus();
    }, UPDATE_INTERVAL);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Update health status from provider manager
   */
  updateHealthStatus(): void {
    const stats = providerRoutingManager.getAllProviderStats();
    const currentProvider = providerRoutingManager.getCurrentProvider();
    
    // Map provider stats to health status
    const providers: HealthStatus[] = stats.map(stat => ({
      provider: stat.name,
      status: this.determineProviderStatus(stat),
      responseTime: stat.avgResponseTime,
      successRate: stat.successRate,
      lastUsed: stat.lastUsed,
      failureCount: stat.failureCount
    }));

    // Calculate overall health
    const overall = this.calculateOverallHealth(providers);
    
    // Calculate totals
    const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
    const avgResponseTime = stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / stats.length 
      : 0;

    // Check for status changes and play alerts
    this.checkForAlerts(overall, currentProvider);
    
    // Update store
    healthData.set({
      overall,
      providers,
      activeProvider: currentProvider || undefined,
      lastUpdate: new Date(),
      totalRequests,
      avgResponseTime
    });
    
    // Update previous states
    this.previousOverallHealth = overall;
    this.previousActiveProvider = currentProvider;
  }
  
  /**
   * Check for status changes and trigger audio alerts
   */
  private async checkForAlerts(
    currentHealth: 'healthy' | 'degraded' | 'critical',
    currentProvider: string | null
  ): Promise<void> {
    // Check overall health changes
    if (this.previousOverallHealth && this.previousOverallHealth !== currentHealth) {
      if (currentHealth === 'critical') {
        await audioAlertService.playAlert('critical');
      } else if (currentHealth === 'degraded' && this.previousOverallHealth === 'healthy') {
        await audioAlertService.playAlert('degraded');
      } else if (currentHealth === 'healthy' && this.previousOverallHealth !== 'healthy') {
        await audioAlertService.playAlert('networkRestored');
      }
    }
    
    // Check provider changes
    if (this.previousActiveProvider && 
        currentProvider && 
        this.previousActiveProvider !== currentProvider) {
      await audioAlertService.playAlert('providerSwitch');
    }
    
    // Check for network down (all providers failed)
    if (!this.previousOverallHealth && currentHealth === 'critical') {
      await audioAlertService.playAlert('networkDown');
    }
  }

  /**
   * Determine individual provider status
   */
  private determineProviderStatus(stats: ProviderStats): 'healthy' | 'degraded' | 'failed' | 'disabled' {
    if (!stats.enabled) return 'disabled';
    if (stats.suspended) return 'failed';
    if (stats.successRate < 50) return 'failed';
    if (stats.successRate < 90 || stats.failureCount > 1) return 'degraded';
    return 'healthy';
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(providers: HealthStatus[]): 'healthy' | 'degraded' | 'critical' {
    const activeProviders = providers.filter(p => p.status !== 'disabled');
    
    if (activeProviders.length === 0) {
      return 'critical'; // No providers available
    }

    const healthyCount = activeProviders.filter(p => p.status === 'healthy').length;
    const failedCount = activeProviders.filter(p => p.status === 'failed').length;
    
    if (failedCount === activeProviders.length) {
      return 'critical'; // All providers failed
    }
    
    if (healthyCount === activeProviders.length) {
      return 'healthy'; // All providers healthy
    }
    
    return 'degraded'; // Some issues but still operational
  }

  /**
   * Force immediate health check
   */
  forceUpdate(): void {
    this.updateHealthStatus();
  }

  /**
   * Get current health snapshot
   */
  getHealth(): SystemHealth {
    return get(healthData);
  }
}

// Create singleton service
export const healthMonitor = new HealthMonitorService();

// Export store
export const healthStore = {
  subscribe: healthData.subscribe,
  forceUpdate: () => healthMonitor.forceUpdate()
};