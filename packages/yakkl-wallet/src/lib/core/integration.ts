/**
 * Core Integration for V2
 * 
 * This bridges the existing v2 system with the new YAKKL Core
 * Maintains compatibility while adding extension capabilities
 */

// TODO: Enable when build issues are resolved
// import { WalletEngine, createWallet } from '@yakkl/core';
// import type { Extension, WalletConfig } from '@yakkl/core';

type WalletEngine = any;
type Extension = any;
type WalletConfig = any;

import { get, writable } from 'svelte/store';
import { systemExtensionRegistry } from '../extensions/registry';

class CoreIntegration {
  private engine: WalletEngine | null = null;
  private initialized = false;

  // Stores for extension system
  public extensions = writable<Extension[]>([]);
  public enhancements = writable<any[]>([]);
  public discoveredExtensions = writable<any[]>([]);

  static getInstance(): CoreIntegration {
    if (!(globalThis as any).coreIntegration) {
      (globalThis as any).coreIntegration = new CoreIntegration();
    }
    return (globalThis as any).coreIntegration;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // TODO: Enable YAKKL Core when build issues are resolved
      // const config: Partial<WalletConfig> = {
      //   name: 'YAKKL Wallet V2',
      //   version: '2.0.0',
      //   embedded: false,
      //   enableExtensions: true,
      //   enableDiscovery: true,
      //   storagePrefix: 'yakkl:v2',
      //   logLevel: 'info'
      // };
      // this.engine = await createWallet(config);
      // console.log('✅ YAKKL Core initialized successfully');

      // Using mock engine for now
      this.engine = this.createMockEngine();
      console.log('🔧 Using mock engine - YAKKL Core integration ready for future');

      this.setupEventListeners();
      
      // Load system extensions
      await this.loadSystemExtensions();
      
      this.updateStores();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize core integration:', error);
      // Fall back to mock for development if core fails
      this.engine = this.createMockEngine();
      this.initialized = true;
      console.warn('⚠️ Using mock engine - YAKKL Core initialization failed');
    }
  }

  private createMockEngine(): any {
    return {
      initialize(): Promise<void> { return Promise.resolve(); },
      async destroy(): Promise<void> {},
      on(event: string, handler: any): void {},
      emit(event: string, data: any): void {},
      off(event: string, handler: any): void {},
      async loadExtension(id: string): Promise<any> { 
        // Load from system registry
        return await systemExtensionRegistry.loadExtension(id);
      },
      async discoverExtensions(): Promise<any[]> { 
        return systemExtensionRegistry.getAvailableExtensions();
      },
      async getLoadedExtensions(): Promise<any[]> { 
        return systemExtensionRegistry.getLoadedExtensions();
      },
      accounts: {
        getAll: (): any[] => [],
        getCurrent: (): any => null,
        create: (name?: string): Promise<any> => Promise.resolve({ address: '0x...', name }),
        select: (address: string): Promise<void> => Promise.resolve()
      },
      networks: {
        getSupported: (): any[] => [],
        getCurrent: (): any => ({ chainId: 1, name: 'Ethereum' }),
        switch: (chainId: string): Promise<void> => Promise.resolve()
      },
      transactions: {
        getHistory: (): any[] => []
      }
    };
  }

  /**
   * Load system extensions
   */
  private async loadSystemExtensions(): Promise<void> {
    try {
      console.log('📦 Loading system extensions...');
      const systemExtensions = await systemExtensionRegistry.loadSystemExtensions();
      
      // Initialize each system extension with the engine
      for (const extension of systemExtensions) {
        try {
          if (this.engine && extension.initialize) {
            await extension.initialize(this.engine);
            console.log(`✅ Initialized system extension: ${extension.manifest?.name || 'Unknown'}`);
          }
        } catch (error) {
          console.error(`Failed to initialize system extension ${extension.manifest?.id}:`, error);
        }
      }
      
      console.log(`📦 Loaded ${systemExtensions.length} system extensions`);
    } catch (error) {
      console.error('Failed to load system extensions:', error);
    }
  }

  /**
   * Load an extension
   */
  async loadExtension(extensionId: string): Promise<Extension | null> {
    try {
      // Try to load from system registry first
      let extension = await systemExtensionRegistry.loadExtension(extensionId);
      
      if (extension && this.engine) {
        // Initialize the extension with the engine
        if (extension.initialize) {
          await extension.initialize(this.engine);
        }
        this.updateStores();
        return extension;
      }
      
      // Fall back to engine loading (for future real core integration)
      if (this.engine) {
        extension = await this.engine.loadExtension(extensionId);
        this.updateStores();
        return extension;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to load extension ${extensionId}:`, error);
      return null;
    }
  }

  /**
   * Discover available extensions
   */
  async discoverExtensions(): Promise<any[]> {
    try {
      // Get available extensions from system registry
      const systemExtensions = systemExtensionRegistry.getAvailableExtensions();
      
      // Get discovered extensions from engine (for future expansion)
      let engineExtensions: any[] = [];
      if (this.engine) {
        try {
          engineExtensions = await this.engine.discoverExtensions();
        } catch (error) {
          console.warn('Engine extension discovery failed:', error);
        }
      }
      
      // Combine system and engine extensions
      const allDiscovered = [...systemExtensions, ...engineExtensions];
      this.discoveredExtensions.set(allDiscovered);
      
      return allDiscovered;
    } catch (error) {
      console.error('Failed to discover extensions:', error);
      return [];
    }
  }

  /**
   * Get extensions by category
   */
  async getExtensionsByCategory(category: string): Promise<Extension[]> {
    if (!this.engine) return [];

    try {
      // Get loaded extensions and filter by category
      const loadedExtensions = await this.engine.getLoadedExtensions();
      return loadedExtensions.filter((extension: Extension) => 
        extension.manifest.category === category
      );
    } catch (error) {
      console.error('Failed to get extensions by category:', error);
      return [];
    }
  }

  /**
   * Check if an extension can enhance existing functionality
   */
  async checkEnhancements(feature: string): Promise<any[]> {
    if (!this.engine) return [];

    try {
      // Get loaded extensions and check for enhancements
      const loadedExtensions = await this.engine.getLoadedExtensions();
      const enhancements: any[] = [];
      
      for (const extension of loadedExtensions) {
        const extensionEnhancements = extension.getEnhancements();
        const relevantEnhancements = extensionEnhancements.filter((e: any) => 
          e.targetExtension.includes(feature) || 
          e.description.toLowerCase().includes(feature.toLowerCase())
        );
        enhancements.push(...relevantEnhancements);
      }
      
      return enhancements;
    } catch (error) {
      console.error('Failed to check enhancements:', error);
      return [];
    }
  }

  /**
   * Setup event listeners for engine events
   */
  private setupEventListeners(): void {
    if (!this.engine) return;

    this.engine.on('extension:loaded', () => {
      this.updateStores();
    });

    this.engine.on('extension:discovered', (extensions: any[]) => {
      this.discoveredExtensions.set(extensions);
    });
  }

  /**
   * Update reactive stores with current state
   */
  private async updateStores(): Promise<void> {
    try {
      // Get loaded extensions from system registry
      const systemExtensions = systemExtensionRegistry.getLoadedExtensions();
      
      // Get loaded extensions from engine (for future)
      let engineExtensions: any[] = [];
      if (this.engine) {
        try {
          engineExtensions = await this.engine.getLoadedExtensions();
        } catch (error) {
          console.warn('Engine extension loading failed:', error);
        }
      }
      
      // Combine all loaded extensions
      const allLoadedExtensions = [...systemExtensions, ...engineExtensions];
      this.extensions.set(allLoadedExtensions);

      // Collect all enhancements from loaded extensions
      const allEnhancements: any[] = [];
      for (const extension of allLoadedExtensions) {
        if (extension.getEnhancements) {
          try {
            allEnhancements.push(...extension.getEnhancements());
          } catch (error) {
            console.warn(`Failed to get enhancements from extension ${extension.manifest?.id}:`, error);
          }
        }
      }
      this.enhancements.set(allEnhancements);
      
      console.log(`📊 Updated stores: ${allLoadedExtensions.length} extensions, ${allEnhancements.length} enhancements`);
    } catch (error) {
      console.error('Failed to update stores:', error);
    }
  }

  /**
   * Check if core is available
   */
  isAvailable(): boolean {
    return this.initialized && this.engine !== null;
  }

  /**
   * Get the wallet engine
   */
  getEngine(): WalletEngine | null {
    return this.engine;
  }

  /**
   * Get account manager
   */
  getAccountManager() {
    return this.engine?.accounts || null;
  }

  /**
   * Get network manager
   */
  getNetworkManager() {
    return this.engine?.networks || null;
  }

  /**
   * Get transaction manager
   */
  getTransactionManager() {
    return this.engine?.transactions || null;
  }

  /**
   * Destroy the integration
   */
  async destroy(): Promise<void> {
    if (this.engine) {
      await this.engine.destroy();
      this.engine = null;
    }
    this.initialized = false;
  }
}

// Create singleton instance
const coreIntegration = CoreIntegration.getInstance();

// Auto-initialize when imported
let initPromise: Promise<void> | null = null;

export async function initializeCore(): Promise<void> {
  if (!initPromise) {
    initPromise = coreIntegration.initialize();
  }
  return initPromise;
}

// Export stores for use in components
export const { extensions, enhancements, discoveredExtensions } = coreIntegration;

// Utility functions for components
export function isCoreAvailable(): boolean {
  return coreIntegration.isAvailable();
}

export async function loadExtension(id: string) {
  return coreIntegration.loadExtension(id);
}

export async function discoverExtensions() {
  return coreIntegration.discoverExtensions();
}

export async function getExtensionsByCategory(category: string) {
  return coreIntegration.getExtensionsByCategory(category);
}

export async function checkEnhancements(feature: string) {
  return coreIntegration.checkEnhancements(feature);
}

export function getCoreEngine() {
  return coreIntegration.getEngine();
}

export function getAccountManager() {
  return coreIntegration.getAccountManager();
}

export function getNetworkManager() {
  return coreIntegration.getNetworkManager();
}

export function getTransactionManager() {
  return coreIntegration.getTransactionManager();
}