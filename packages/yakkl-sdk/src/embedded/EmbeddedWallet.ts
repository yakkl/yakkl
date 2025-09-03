/**
 * EmbeddedWallet - For integrating YAKKL into other applications
 * 
 * This allows companies to embed a full YAKKL wallet into their apps
 * with complete control over branding, features, and restrictions
 */

import { WalletEngine } from '@yakkl/core';
import type { 
  WalletConfig, 
  Account, 
  Transaction,
  WalletRestriction,
  BrandingConfig as CoreBrandingConfig
} from '@yakkl/core';
import { EventEmitter } from 'eventemitter3';
import type { EmbeddedWalletConfig } from '../types';

export interface EmbeddedWalletEvents {
  'wallet:ready': () => void;
  'wallet:error': (error: Error) => void;
  'account:created': (account: Account) => void;
  'account:selected': (account: Account) => void;
  'transaction:signed': (tx: Transaction) => void;
  'transaction:sent': (hash: string) => void;
}

export class EmbeddedWallet extends EventEmitter<EmbeddedWalletEvents> {
  private engine: WalletEngine;
  private config: EmbeddedWalletConfig;
  private container: HTMLElement | null = null;
  private initialized = false;

  constructor(config: EmbeddedWalletConfig) {
    super();
    this.config = config;
    
    // Convert SDK restrictions to core WalletRestriction type
    const restrictions = (config.restrictions || [])
      .filter(r => ['no-external-connections', 'no-mod-discovery', 'enterprise-only', 'read-only', 'mainnet-only'].includes(r)) as WalletRestriction[];
    
    // Convert SDK branding to core BrandingConfig if provided
    let coreBranding: CoreBrandingConfig | undefined;
    if (config.branding) {
      const theme: any = {};
      if (config.branding.theme?.colors) {
        Object.assign(theme, config.branding.theme.colors);
      }
      coreBranding = {
        name: config.branding.name || 'YAKKL',
        logo: config.branding.logo || '',
        theme,
        whiteLabel: false
      };
    }
    
    // Create wallet engine with embedded configuration
    const engineConfig: Partial<WalletConfig> = {
      name: config.branding?.name || 'Embedded YAKKL',
      version: '1.0.0',
      embedded: true,
      restrictions,
      modDiscovery: config.enableMods !== false,
      branding: coreBranding
    };

    this.engine = new WalletEngine(engineConfig);
    this.setupEventListeners();
  }

  /**
   * Mount the embedded wallet to a DOM element
   */
  async mount(container: string | HTMLElement): Promise<void> {
    if (typeof container === 'string') {
      this.container = document.querySelector(container);
    } else {
      this.container = container;
    }

    if (!this.container) {
      throw new Error('Container element not found');
    }

    try {
      // Initialize the wallet engine
      await this.engine.initialize();
      
      // Render the wallet UI
      await this.renderUI();
      
      this.initialized = true;
      this.emit('wallet:ready');
    } catch (error) {
      this.emit('wallet:error', error as Error);
      throw error;
    }
  }

  /**
   * Unmount the embedded wallet
   */
  async unmount(): Promise<void> {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }

    if (this.initialized) {
      await this.engine.destroy();
      this.initialized = false;
    }
  }

  /**
   * Get the wallet engine for advanced operations
   */
  getEngine(): WalletEngine {
    return this.engine;
  }

  /**
   * Create a new account
   */
  async createAccount(name?: string): Promise<Account> {
    this.ensureInitialized();
    return this.engine.createAccount(name);
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<Account[]> {
    this.ensureInitialized();
    return this.engine.getAccounts();
  }

  /**
   * Select an account
   */
  async selectAccount(accountId: string): Promise<void> {
    this.ensureInitialized();
    await this.engine.selectAccount(accountId);
  }

  /**
   * Sign a transaction
   */
  async signTransaction(transaction: Transaction): Promise<string> {
    this.ensureInitialized();
    
    // Check restrictions
    if (this.config.restrictions?.includes('read-only')) {
      throw new Error('Wallet is in read-only mode');
    }

    const signedTx = await this.engine.signTransaction(transaction);
    return signedTx.hash;
  }

  /**
   * Send a transaction
   */
  async sendTransaction(transaction: Transaction): Promise<string> {
    this.ensureInitialized();
    
    // Check restrictions
    if (this.config.restrictions?.includes('no-external-connections')) {
      throw new Error('External connections are disabled');
    }

    return this.engine.sendTransaction(transaction);
  }

  /**
   * Get current balance
   */
  async getBalance(address?: string): Promise<any> {
    this.ensureInitialized();
    return this.engine.getBalance(address);
  }

  /**
   * Load a mod
   */
  async loadMod(modId: string): Promise<any> {
    this.ensureInitialized();
    
    if (!this.config.enableMods) {
      throw new Error('Mods are disabled');
    }

    return this.engine.loadMod(modId);
  }

  /**
   * Get configuration
   */
  getConfig(): EmbeddedWalletConfig {
    return { ...this.config };
  }

  /**
   * Update branding
   */
  updateBranding(branding: Partial<typeof this.config.branding>): void {
    this.config.branding = { ...this.config.branding, ...branding };
    
    if (this.initialized) {
      this.renderUI(); // Re-render with new branding
    }
  }

  /**
   * Check if wallet is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Setup event listeners for the wallet engine
   */
  private setupEventListeners(): void {
    this.engine.on('account:created', (account) => {
      this.emit('account:created', account);
    });

    this.engine.on('account:selected', (account) => {
      this.emit('account:selected', account);
    });

    this.engine.on('transaction:signed', (tx) => {
      this.emit('transaction:signed', tx.transaction);
    });
  }

  /**
   * Render the wallet UI
   */
  private async renderUI(): Promise<void> {
    if (!this.container) return;

    // Create a simple embedded wallet UI
    const walletHTML = `
      <div class="yakkl-embedded-wallet" style="
        font-family: ${this.config.branding?.theme?.fonts?.body || 'system-ui, sans-serif'};
        background: ${this.config.branding?.theme?.colors?.background || '#ffffff'};
        border: 1px solid ${this.config.branding?.theme?.colors?.border || '#e5e7eb'};
        border-radius: 12px;
        padding: 20px;
        max-width: 400px;
        margin: 0 auto;
      ">
        <div class="wallet-header" style="
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          border-bottom: 1px solid ${this.config.branding?.theme?.colors?.border || '#e5e7eb'};
          padding-bottom: 16px;
        ">
          ${this.config.branding?.logo ? 
            `<img src="${this.config.branding.logo}" alt="Logo" style="width: 32px; height: 32px;">` : 
            '<div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 8px;"></div>'
          }
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: ${this.config.branding?.theme?.colors?.text || '#1f2937'};">
              ${this.config.branding?.name || 'YAKKL Wallet'}
            </h2>
            <p style="margin: 0; font-size: 14px; color: ${this.config.branding?.theme?.colors?.textSecondary || '#6b7280'};">
              Embedded Wallet
            </p>
          </div>
        </div>
        
        <div class="wallet-content">
          <div class="account-section" style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: ${this.config.branding?.theme?.colors?.textSecondary || '#6b7280'}; margin-bottom: 8px;">
              Account
            </div>
            <div style="
              background: ${this.config.branding?.theme?.colors?.surface || '#f9fafb'};
              padding: 12px;
              border-radius: 8px;
              font-family: monospace;
              font-size: 14px;
              color: ${this.config.branding?.theme?.colors?.text || '#1f2937'};
            ">
              No account selected
            </div>
          </div>
          
          <div class="actions" style="display: flex; gap: 8px;">
            <button class="create-account-btn" style="
              flex: 1;
              padding: 10px 16px;
              background: ${this.config.branding?.theme?.colors?.primary || '#6366f1'};
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: opacity 0.2s;
            " onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
              Create Account
            </button>
            
            ${this.config.enableMods !== false ? `
              <button class="mods-btn" style="
                padding: 10px 16px;
                background: transparent;
                color: ${this.config.branding?.theme?.colors?.primary || '#6366f1'};
                border: 1px solid ${this.config.branding?.theme?.colors?.primary || '#6366f1'};
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
              ">
                Mods
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = walletHTML;

    // Add event listeners
    const createBtn = this.container.querySelector('.create-account-btn');
    createBtn?.addEventListener('click', () => {
      this.createAccount('Embedded Account');
    });

    const modsBtn = this.container.querySelector('.mods-btn');
    modsBtn?.addEventListener('click', () => {
      // Open mods dashboard
      console.log('Opening mods dashboard...');
    });
  }

  /**
   * Ensure wallet is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Embedded wallet not initialized. Call mount() first.');
    }
  }
}