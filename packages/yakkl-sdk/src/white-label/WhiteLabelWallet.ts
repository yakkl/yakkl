/**
 * WhiteLabelWallet - Customizable wallet solution for businesses
 */

import type { WalletEngine, WalletRestriction } from '@yakkl/core';
import { BrandingManager } from './BrandingManager';

export interface WhiteLabelConfig {
  apiKey: string;
  appName: string;
  appVersion: string;
  branding: {
    name: string;
    logo: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
    };
    fonts?: {
      primary: string;
      secondary: string;
    };
    theme?: 'light' | 'dark' | 'auto';
  };
  features?: {
    enableSwap?: boolean;
    enableBuy?: boolean;
    enableStaking?: boolean;
    enableNFTs?: boolean;
    enableDeFi?: boolean;
    customNetworks?: boolean;
  };
  restrictions?: {
    allowedNetworks?: string[];
    blockedTokens?: string[];
    maxTransactionAmount?: string;
    requireKYC?: boolean;
  };
  callbacks?: {
    onTransactionSigned?: (txHash: string) => void;
    onUserAction?: (action: string, data: any) => void;
    onError?: (error: Error) => void;
  };
}

export class WhiteLabelWallet {
  private engine: WalletEngine | null = null;
  private config: WhiteLabelConfig;
  private branding: BrandingManager;
  private initialized = false;

  constructor(config: WhiteLabelConfig) {
    this.config = config;
    this.branding = new BrandingManager(config.branding);
  }

  /**
   * Initialize the white label wallet
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create wallet engine with white label configuration
      const { createWallet } = await import('@yakkl/core');
      
      this.engine = await createWallet({
        name: this.config.appName,
        version: this.config.appVersion,
        embedded: true,
        restrictions: this.mapRestrictions(),
        enableMods: false, // Disable mods for white label
        enableDiscovery: false,
        storagePrefix: `whitelabel:${this.config.appName}`,
        logLevel: 'warn',
        branding: {
          name: this.config.branding.name,
          logo: this.config.branding.logo,
          theme: this.config.branding.colors,
          whiteLabel: true
        }
      });

      // Apply branding
      await this.branding.apply();

      // Setup callbacks
      this.setupCallbacks();

      this.initialized = true;
    } catch (error) {
      this.config.callbacks?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Get the wallet engine
   */
  getEngine(): WalletEngine {
    if (!this.engine) {
      throw new Error('White label wallet not initialized');
    }
    return this.engine;
  }

  /**
   * Get branding manager
   */
  getBrandingManager(): BrandingManager {
    return this.branding;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof WhiteLabelConfig['features']): boolean {
    return this.config.features?.[feature] ?? false;
  }

  /**
   * Get wallet configuration
   */
  getConfig(): WhiteLabelConfig {
    return { ...this.config };
  }

  /**
   * Update branding at runtime
   */
  async updateBranding(branding: Partial<WhiteLabelConfig['branding']>): Promise<void> {
    this.config.branding = { ...this.config.branding, ...branding };
    this.branding.updateConfig(this.config.branding);
    await this.branding.apply();
  }

  /**
   * Create embedded wallet UI
   */
  createEmbeddedUI(container: HTMLElement, options?: {
    width?: string;
    height?: string;
    mode?: 'popup' | 'inline' | 'modal';
  }): HTMLElement {
    const iframe = document.createElement('iframe');
    iframe.style.width = options?.width || '400px';
    iframe.style.height = options?.height || '600px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    iframe.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
    
    // Set up iframe source with white label configuration
    const params = new URLSearchParams({
      appName: this.config.appName,
      theme: JSON.stringify(this.config.branding.colors),
      mode: options?.mode || 'inline'
    });
    
    iframe.src = `/wallet-embed?${params.toString()}`;
    container.appendChild(iframe);
    
    return iframe;
  }

  /**
   * Destroy the white label wallet
   */
  async destroy(): Promise<void> {
    if (this.engine) {
      await this.engine.destroy();
      this.engine = null;
    }
    
    await this.branding.cleanup();
    this.initialized = false;
  }

  /**
   * Private methods
   */
  private mapRestrictions(): WalletRestriction[] {
    const restrictions: WalletRestriction[] = [];
    
    if (this.config.restrictions?.requireKYC) {
      restrictions.push('enterprise-only');
    }
    
    if (this.config.restrictions?.allowedNetworks?.length) {
      restrictions.push('no-external-connections');
    }
    
    return restrictions;
  }

  private setupCallbacks(): void {
    if (!this.engine) return;

    this.engine.on('transaction:signed', (signedTx) => {
      this.config.callbacks?.onTransactionSigned?.(signedTx.hash);
      this.config.callbacks?.onUserAction?.('transaction:signed', { hash: signedTx.hash });
    });

    this.engine.on('account:selected', (account) => {
      this.config.callbacks?.onUserAction?.('account:selected', { address: account.address });
    });

    this.engine.on('network:changed', (network) => {
      this.config.callbacks?.onUserAction?.('network:changed', { chainId: network.chainId });
    });
  }
}