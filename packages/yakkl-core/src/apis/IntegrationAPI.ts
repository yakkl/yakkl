/**
 * IntegrationAPI - API for third-party integrations
 */

import { WalletEngine } from '../engine/WalletEngine';
import type { WalletConfig } from '../engine/types';

export interface IntegrationConfig {
  apiKey?: string;
  appName: string;
  appVersion: string;
  permissions: string[];
}

export class IntegrationAPI {
  private engine: WalletEngine | null = null;
  private config: IntegrationConfig;

  constructor(config: IntegrationConfig) {
    this.config = config;
  }

  /**
   * Initialize the integration
   */
  async initialize(walletConfig?: Partial<WalletConfig>): Promise<void> {
    const config: WalletConfig = {
      name: 'YAKKL Integration',
      version: '1.0.0',
      embedded: true,
      restrictions: [],
      modDiscovery: false,
      enableMods: true,
      enableDiscovery: false, // Disable discovery for integrations
      storagePrefix: `integration:${this.config.appName}`,
      logLevel: 'warn',
      ...walletConfig
    };

    this.engine = new WalletEngine(config);
    await this.engine.initialize();
  }

  /**
   * Get the wallet engine
   */
  getEngine(): WalletEngine {
    if (!this.engine) {
      throw new Error('Integration not initialized');
    }
    return this.engine;
  }

  /**
   * Check if a permission is granted
   */
  hasPermission(permission: string): boolean {
    return this.config.permissions.includes(permission);
  }

  /**
   * Request additional permissions
   */
  async requestPermissions(permissions: string[]): Promise<boolean> {
    // In a real implementation, this would show a permission dialog
    // For now, just add to the config
    for (const permission of permissions) {
      if (!this.config.permissions.includes(permission)) {
        this.config.permissions.push(permission);
      }
    }
    return true;
  }

  /**
   * Get integration info
   */
  getInfo() {
    return {
      appName: this.config.appName,
      appVersion: this.config.appVersion,
      permissions: this.config.permissions,
      isInitialized: this.engine !== null
    };
  }

  /**
   * Destroy the integration
   */
  async destroy(): Promise<void> {
    if (this.engine) {
      await this.engine.destroy();
      this.engine = null;
    }
  }
}