// $lib/common/initialization-manager.ts

import { log } from '$lib/common/logger-wrapper';

/**
 * Centralized initialization manager to prevent race conditions
 * and coordinate all initialization paths
 */
class InitializationManager {
  private static instance: InitializationManager;
  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private initStartTime: number | null = null;

  private constructor() {}

  static getInstance(): InitializationManager {
    if (!InitializationManager.instance) {
      InitializationManager.instance = new InitializationManager();
    }
    return InitializationManager.instance;
  }

  /**
   * Initialize the application
   * This ensures only one initialization happens regardless of how many times it's called
   */
  async initialize(initFunc: () => Promise<void>): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      console.debug('[InitializationManager] Already initialized, skipping');
      return;
    }

    // If initialization is in progress, return the existing promise
    if (this.initPromise) {
      console.debug('[InitializationManager] Initialization already in progress, waiting...');
      return this.initPromise;
    }

    // Start new initialization
    this.initStartTime = Date.now();
    console.info('[InitializationManager] Starting initialization');

    this.initPromise = this.performInitialization(initFunc);

    try {
      await this.initPromise;
      this.initialized = true;
      const duration = Date.now() - this.initStartTime;
      console.info(`[InitializationManager] Initialization completed in ${duration}ms`);
    } catch (error) {
      console.error('[InitializationManager] Initialization failed:', error);
      // Reset so it can be retried
      this.initPromise = null;
      this.initStartTime = null;
      throw error;
    }

    return this.initPromise;
  }

  private async performInitialization(initFunc: () => Promise<void>): Promise<void> {
    try {
      // Add timeout to prevent infinite hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout after 30 seconds')), 30000);
      });

      await Promise.race([
        initFunc(),
        timeoutPromise
      ]);

      console.log('[InitializationManager] performInitialization: Initialization completed');
    } catch (error) {
      console.error('[InitializationManager] Error during initialization:', error);
      throw error;
    }
  }

  /**
   * Check if initialization is complete
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Wait for initialization to complete
   * This is useful for components that need to ensure initialization is done
   */
  async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    // If not initialized and no promise, wait and check periodically
    const maxWait = 10000; // 10 seconds
    const checkInterval = 100;
    const startTime = Date.now();

    while (!this.initialized && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      // Check if initialization started while we were waiting
      if (this.initPromise) {
        await this.initPromise;
        return;
      }
    }

    if (!this.initialized) {
      throw new Error('Initialization did not complete within timeout');
    }
  }

  /**
   * Reset the initialization state (mainly for testing)
   */
  reset(): void {
    this.initialized = false;
    this.initPromise = null;
    this.initStartTime = null;
  }
}

export const initializationManager = InitializationManager.getInstance();
