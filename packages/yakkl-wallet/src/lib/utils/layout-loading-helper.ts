/**
 * Helper to manage layout loading with timeout
 * Prevents infinite loading states
 */

import { log } from '$lib/common/logger-wrapper';

const LOADING_TIMEOUT = 5000; // 5 seconds max

/**
 * Initialize layout with timeout protection
 * @param initFn The initialization function to run
 * @returns Promise that resolves when init completes or times out
 */
export async function initializeWithTimeout(
  initFn: () => Promise<void>
): Promise<{ success: boolean; error?: Error }> {
  try {
    // Race between initialization and timeout
    await Promise.race([
      initFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Layout initialization timeout')), LOADING_TIMEOUT)
      )
    ]);
    
    return { success: true };
  } catch (error) {
    log.error('Layout initialization failed or timed out', false, error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}

/**
 * Create a loading state manager with automatic timeout
 */
export function createLoadingManager() {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return {
    /**
     * Start loading with automatic timeout
     * @param setLoading Function to set loading state
     * @param timeout Timeout in milliseconds (default: 5000)
     */
    startLoading(setLoading: (value: boolean) => void, timeout = LOADING_TIMEOUT) {
      setLoading(true);
      
      // Set timeout to force loading to false
      timeoutId = setTimeout(() => {
        log.warn('Loading timeout reached, forcing loading state to false');
        setLoading(false);
      }, timeout);
    },
    
    /**
     * Stop loading and clear timeout
     * @param setLoading Function to set loading state
     */
    stopLoading(setLoading: (value: boolean) => void) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      setLoading(false);
    }
  };
}