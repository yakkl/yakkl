import browser from 'webextension-polyfill';
import { log } from '$lib/common/logger-wrapper';

/**
 * Send a refresh request to the background service
 * @param refreshType - Type of refresh: 'transactions', 'prices', or 'all'
 * @returns Promise that resolves when refresh is complete
 */
export async function triggerManualRefresh(refreshType: 'transactions' | 'prices' | 'all' = 'all'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Connect to background script
      const port = browser.runtime.connect({ name: 'refresh-port' });
      
      // Set up response listener
      const handleMessage = (message: any) => {
        if (message.type === 'YAKKL_REFRESH_RESPONSE') {
          port.onMessage.removeListener(handleMessage);
          port.disconnect();
          
          if (message.success) {
            log.info('[Refresh] Manual refresh completed:', false, refreshType);
            resolve();
          } else {
            log.error('[Refresh] Manual refresh failed:', false, message.error);
            reject(new Error(message.error || 'Refresh failed'));
          }
        }
      };
      
      port.onMessage.addListener(handleMessage);
      
      // Send refresh request
      port.postMessage({
        type: 'YAKKL_REFRESH_REQUEST',
        refreshType
      });
      
      // Set a timeout in case response never comes
      // Increased timeout for slower networks
      setTimeout(() => {
        port.onMessage.removeListener(handleMessage);
        port.disconnect();
        reject(new Error(`Refresh request timed out after 60 seconds for ${refreshType}`));
      }, 60000); // 60 second timeout for slower connections
      
    } catch (error) {
      log.error('[Refresh] Failed to send refresh request:', false, error);
      reject(error);
    }
  });
}

/**
 * Refresh all data (transactions, prices, portfolio)
 */
export async function refreshAll(): Promise<void> {
  return triggerManualRefresh('all');
}

/**
 * Refresh only transaction data
 */
export async function refreshTransactions(): Promise<void> {
  return triggerManualRefresh('transactions');
}

/**
 * Refresh only price data
 */
export async function refreshPrices(): Promise<void> {
  return triggerManualRefresh('prices');
}