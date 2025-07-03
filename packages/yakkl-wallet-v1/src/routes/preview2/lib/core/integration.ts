/**
 * Core Integration for Preview 2.0
 * 
 * This bridges the existing preview2 system with the new YAKKL Core
 * Maintains compatibility while adding mod capabilities
 */

// TODO: Enable when build issues are resolved
// import { WalletEngine, createWallet } from '@yakkl/core';
// import type { Mod, WalletConfig } from '@yakkl/core';

type WalletEngine = any;
type Mod = any;
type WalletConfig = any;

import { get, writable } from 'svelte/store';
import { systemModRegistry } from '../mods/registry';

class CoreIntegration {
  private engine: WalletEngine | null = null;
  private initialized = false;

  // Stores for mod system
  public mods = writable<Mod[]>([]);
  public enhancements = writable<any[]>([]);
  public discoveredMods = writable<any[]>([]);

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
      //   name: 'YAKKL Wallet Preview 2.0',
      //   version: '2.0.0-preview',
      //   embedded: false,
      //   enableMods: true,
      //   enableDiscovery: true,
      //   storagePrefix: 'yakkl:preview2',
      //   logLevel: 'info'
      // };
      // this.engine = await createWallet(config);
      // console.log('✅ YAKKL Core initialized successfully');

      // Using mock engine for now
      this.engine = this.createMockEngine();
      console.log('🔧 Using mock engine - YAKKL Core integration ready for future');

      this.setupEventListeners();
      
      // Load system mods
      await this.loadSystemMods();
      
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
      async loadMod(id: string): Promise<any> { 
        // Load from system registry
        return await systemModRegistry.loadMod(id);
      },
      async discoverMods(): Promise<any[]> { 
        return systemModRegistry.getAvailableMods();
      },
      async getLoadedMods(): Promise<any[]> { 
        return systemModRegistry.getLoadedMods();
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
   * Load system mods
   */
  private async loadSystemMods(): Promise<void> {
    try {
      console.log('📦 Loading system mods...');
      const systemMods = await systemModRegistry.loadSystemMods();
      
      // Initialize each system mod with the engine
      for (const mod of systemMods) {
        try {
          if (this.engine && mod.initialize) {
            await mod.initialize(this.engine);
            console.log(`✅ Initialized system mod: ${mod.manifest?.name || 'Unknown'}`);
          }
        } catch (error) {
          console.error(`Failed to initialize system mod ${mod.manifest?.id}:`, error);
        }
      }
      
      console.log(`📦 Loaded ${systemMods.length} system mods`);
    } catch (error) {
      console.error('Failed to load system mods:', error);
    }
  }

  /**
   * Load a mod
   */
  async loadMod(modId: string): Promise<Mod | null> {
    try {
      // Try to load from system registry first
      let mod = await systemModRegistry.loadMod(modId);
      
      if (mod && this.engine) {
        // Initialize the mod with the engine
        if (mod.initialize) {
          await mod.initialize(this.engine);
        }
        this.updateStores();
        return mod;
      }
      
      // Fall back to engine loading (for future real core integration)
      if (this.engine) {
        mod = await this.engine.loadMod(modId);
        this.updateStores();
        return mod;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to load mod ${modId}:`, error);
      return null;
    }
  }

  /**
   * Discover available mods
   */
  async discoverMods(): Promise<any[]> {
    try {
      // Get available mods from system registry
      const systemMods = systemModRegistry.getAvailableMods();
      
      // Get discovered mods from engine (for future expansion)
      let engineMods: any[] = [];
      if (this.engine) {
        try {
          engineMods = await this.engine.discoverMods();
        } catch (error) {
          console.warn('Engine mod discovery failed:', error);
        }
      }
      
      // Combine system and engine mods
      const allDiscovered = [...systemMods, ...engineMods];
      this.discoveredMods.set(allDiscovered);
      
      return allDiscovered;
    } catch (error) {
      console.error('Failed to discover mods:', error);
      return [];
    }
  }

  /**
   * Get mods by category
   */
  async getModsByCategory(category: string): Promise<Mod[]> {
    if (!this.engine) return [];

    try {
      // Get loaded mods and filter by category
      const loadedMods = await this.engine.getLoadedMods();
      return loadedMods.filter((mod: Mod) => 
        mod.manifest.category === category
      );
    } catch (error) {
      console.error('Failed to get mods by category:', error);
      return [];
    }
  }

  /**
   * Check if a mod can enhance existing functionality
   */
  async checkEnhancements(feature: string): Promise<any[]> {
    if (!this.engine) return [];

    try {
      // Get loaded mods and check for enhancements
      const loadedMods = await this.engine.getLoadedMods();
      const enhancements: any[] = [];
      
      for (const mod of loadedMods) {
        const modEnhancements = mod.getEnhancements();
        const relevantEnhancements = modEnhancements.filter((e: any) => 
          e.targetMod.includes(feature) || 
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

    this.engine.on('mod:loaded', () => {
      this.updateStores();
    });

    this.engine.on('mod:discovered', (mods: any[]) => {
      this.discoveredMods.set(mods);
    });
  }

  /**
   * Update reactive stores with current state
   */
  private async updateStores(): Promise<void> {
    try {
      // Get loaded mods from system registry
      const systemMods = systemModRegistry.getLoadedMods();
      
      // Get loaded mods from engine (for future)
      let engineMods: any[] = [];
      if (this.engine) {
        try {
          engineMods = await this.engine.getLoadedMods();
        } catch (error) {
          console.warn('Engine mod loading failed:', error);
        }
      }
      
      // Combine all loaded mods
      const allLoadedMods = [...systemMods, ...engineMods];
      this.mods.set(allLoadedMods);

      // Collect all enhancements from loaded mods
      const allEnhancements: any[] = [];
      for (const mod of allLoadedMods) {
        if (mod.getEnhancements) {
          try {
            allEnhancements.push(...mod.getEnhancements());
          } catch (error) {
            console.warn(`Failed to get enhancements from mod ${mod.manifest?.id}:`, error);
          }
        }
      }
      this.enhancements.set(allEnhancements);
      
      console.log(`📊 Updated stores: ${allLoadedMods.length} mods, ${allEnhancements.length} enhancements`);
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
export const { mods, enhancements, discoveredMods } = coreIntegration;

// Utility functions for components
export function isCoreAvailable(): boolean {
  return coreIntegration.isAvailable();
}

export async function loadMod(id: string) {
  return coreIntegration.loadMod(id);
}

export async function discoverMods() {
  return coreIntegration.discoverMods();
}

export async function getModsByCategory(category: string) {
  return coreIntegration.getModsByCategory(category);
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