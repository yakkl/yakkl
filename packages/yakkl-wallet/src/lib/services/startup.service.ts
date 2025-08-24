/**
 * Startup Service - Initialize critical services and configurations
 * 
 * This service handles initialization of provider configurations,
 * type harmonization setup, and other startup requirements.
 */

import { RPCBase } from '$managers/RPCBase';
import { log } from '$lib/common/logger-wrapper';

export class StartupService {
  private static instance: StartupService;
  private initialized = false;

  static getInstance(): StartupService {
    if (!StartupService.instance) {
      StartupService.instance = new StartupService();
    }
    return StartupService.instance;
  }

  /**
   * Initialize all startup services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    log.info('[StartupService] Initializing application services...');

    try {
      // Initialize provider configurations
      await this.initializeProviderConfigs();
      
      // Add other initialization tasks here
      
      this.initialized = true;
      log.info('[StartupService] Application services initialized successfully');
    } catch (error) {
      log.error('[StartupService] Failed to initialize application services:', false, error);
      throw error;
    }
  }

  /**
   * Initialize provider configurations for common chains
   */
  private async initializeProviderConfigs(): Promise<void> {
    log.info('[StartupService] Initializing provider configurations...');
    
    try {
      await RPCBase.initializeConfigs();
      log.info('[StartupService] Provider configurations initialized');
    } catch (error) {
      log.warn('[StartupService] Some provider configurations failed to initialize:', error);
      // Don't throw - the app can still work with fallbacks
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset initialization status (for testing)
   */
  reset(): void {
    this.initialized = false;
  }
}

// Export singleton instance
export const startupService = StartupService.getInstance();