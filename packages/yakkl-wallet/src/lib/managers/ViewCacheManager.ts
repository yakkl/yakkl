/**
 * Stub implementation of ViewCacheManager
 * This is a temporary placeholder while migrating to the new view-based cache architecture
 * TODO: Remove once all references are updated to use view stores
 */

import { log } from '$lib/common/logger-wrapper';

export interface ViewCache {
  currentView: string;
  data: any;
}

export interface ViewUpdateNotification {
  type: string;
  data: any;
  viewType?: string;
  event?: string;
}

export class ViewCacheManager {
  private static instance: ViewCacheManager;
  private viewCache: ViewCache = {
    currentView: 'dashboard',
    data: {}
  };

  private constructor() {
    log.debug('ViewCacheManager stub initialized');
  }

  public static getInstance(): ViewCacheManager {
    if (!ViewCacheManager.instance) {
      ViewCacheManager.instance = new ViewCacheManager();
    }
    return ViewCacheManager.instance;
  }

  // Stub methods to prevent runtime errors
  public async initialize(): Promise<void> {
    log.debug('ViewCacheManager stub initialize');
  }

  public getViewCache(): ViewCache {
    return this.viewCache;
  }

  public async updateView(view: string, data: any): Promise<void> {
    log.debug('ViewCacheManager stub updateView', { view, data });
    this.viewCache = { currentView: view, data };
  }

  public registerUpdateListener(listener: (notification: ViewUpdateNotification) => void, context?: string): void {
    log.debug('ViewCacheManager stub registerUpdateListener', { context });
  }

  public unregisterUpdateListener(listener: (notification: ViewUpdateNotification) => void): void {
    log.debug('ViewCacheManager stub unregisterUpdateListener');
  }

  public getAccountsView(filter?: any): any {
    log.debug('ViewCacheManager stub getAccountsView', { filter });
    return { accounts: [] };
  }

  public getTokensView(filter?: any): any {
    log.debug('ViewCacheManager stub getTokensView', { filter });
    return { tokens: [] };
  }

  public getTransactionsView(filter?: any): any {
    log.debug('ViewCacheManager stub getTransactionsView', { filter });
    return { transactions: [] };
  }

  public async clear(): Promise<void> {
    log.debug('ViewCacheManager stub clear');
    this.viewCache = { currentView: 'dashboard', data: {} };
  }
}

// Export a default instance for backward compatibility
export const viewCacheManager = ViewCacheManager.getInstance();