/**
 * System Mod Registry
 * 
 * Manages loading and registration of system mods
 */

// @ts-nocheck - Mock implementation for system mod registry
type Mod = any;

// Import system mods
import NetworkManagerMod from './network-manager/index';
import AccountManagerMod from './account-manager/index';

export interface ModRegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  loader: () => Promise<Mod>;
  enabled: boolean;
  systemMod: boolean;
}

export class SystemModRegistry {
  private static instance: SystemModRegistry;
  private mods = new Map<string, ModRegistryEntry>();
  private loadedMods = new Map<string, Mod>();

  static getInstance(): SystemModRegistry {
    if (!SystemModRegistry.instance) {
      SystemModRegistry.instance = new SystemModRegistry();
    }
    return SystemModRegistry.instance;
  }

  constructor() {
    this.registerSystemMods();
  }

  /**
   * Register all system mods
   */
  private registerSystemMods(): void {
    // Register Network Manager Mod
    this.mods.set('system-network-manager', {
      id: 'system-network-manager',
      name: 'Enhanced Network Manager',
      description: 'Advanced network switching and management with custom networks support',
      category: 'network',
      tier: 'community',
      loader: async () => new NetworkManagerMod(),
      enabled: true,
      systemMod: true
    });

    // Register Account Manager Mod
    this.mods.set('system-account-manager', {
      id: 'system-account-manager',
      name: 'Enhanced Account Manager',
      description: 'Advanced account management with security features and multi-sig support',
      category: 'account',
      tier: 'community',
      loader: async () => new AccountManagerMod(),
      enabled: true,
      systemMod: true
    });

    console.log('📋 System mod registry initialized with', this.mods.size, 'mods');
  }

  /**
   * Get all registered mods
   */
  getAvailableMods(): ModRegistryEntry[] {
    return Array.from(this.mods.values());
  }

  /**
   * Get mods by category
   */
  getModsByCategory(category: string): ModRegistryEntry[] {
    return Array.from(this.mods.values()).filter(mod => mod.category === category);
  }

  /**
   * Get enabled mods
   */
  getEnabledMods(): ModRegistryEntry[] {
    return Array.from(this.mods.values()).filter(mod => mod.enabled);
  }

  /**
   * Get system mods
   */
  getSystemMods(): ModRegistryEntry[] {
    return Array.from(this.mods.values()).filter(mod => mod.systemMod);
  }

  /**
   * Load a mod by ID
   */
  async loadMod(modId: string): Promise<Mod | null> {
    const entry = this.mods.get(modId);
    if (!entry) {
      console.warn(`Mod ${modId} not found in registry`);
      return null;
    }

    if (!entry.enabled) {
      console.warn(`Mod ${modId} is disabled`);
      return null;
    }

    // Check if already loaded
    if (this.loadedMods.has(modId)) {
      return this.loadedMods.get(modId)!;
    }

    try {
      console.log(`📦 Loading mod: ${entry.name}`);
      const mod = await entry.loader();
      this.loadedMods.set(modId, mod);
      console.log(`✅ Loaded mod: ${entry.name}`);
      return mod;
    } catch (error) {
      console.error(`Failed to load mod ${modId}:`, error);
      return null;
    }
  }

  /**
   * Load all enabled mods
   */
  async loadAllEnabledMods(): Promise<Mod[]> {
    const enabledMods = this.getEnabledMods();
    const loadPromises = enabledMods.map(entry => this.loadMod(entry.id));
    const results = await Promise.allSettled(loadPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Mod | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  /**
   * Load system mods only
   */
  async loadSystemMods(): Promise<Mod[]> {
    const systemMods = this.getSystemMods();
    const loadPromises = systemMods.map(entry => this.loadMod(entry.id));
    const results = await Promise.allSettled(loadPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Mod | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  /**
   * Enable or disable a mod
   */
  setModEnabled(modId: string, enabled: boolean): boolean {
    const entry = this.mods.get(modId);
    if (!entry) {
      return false;
    }

    entry.enabled = enabled;
    
    // If disabling, remove from loaded mods
    if (!enabled && this.loadedMods.has(modId)) {
      const mod = this.loadedMods.get(modId);
      if (mod && mod.destroy) {
        mod.destroy().catch(err => console.warn(`Error destroying mod ${modId}:`, err));
      }
      this.loadedMods.delete(modId);
    }

    return true;
  }

  /**
   * Get a loaded mod
   */
  getLoadedMod(modId: string): Mod | null {
    return this.loadedMods.get(modId) || null;
  }

  /**
   * Get all loaded mods
   */
  getLoadedMods(): Mod[] {
    return Array.from(this.loadedMods.values());
  }

  /**
   * Check if a mod is loaded
   */
  isModLoaded(modId: string): boolean {
    return this.loadedMods.has(modId);
  }

  /**
   * Unload a mod
   */
  async unloadMod(modId: string): Promise<boolean> {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      return false;
    }

    try {
      if (mod.destroy) {
        await mod.destroy();
      }
      this.loadedMods.delete(modId);
      console.log(`🗑️ Unloaded mod: ${modId}`);
      return true;
    } catch (error) {
      console.error(`Failed to unload mod ${modId}:`, error);
      return false;
    }
  }

  /**
   * Unload all mods
   */
  async unloadAllMods(): Promise<void> {
    const unloadPromises = Array.from(this.loadedMods.keys()).map(modId => 
      this.unloadMod(modId)
    );
    
    await Promise.allSettled(unloadPromises);
    this.loadedMods.clear();
  }

  /**
   * Register a new mod (for third-party mods)
   */
  registerMod(entry: Omit<ModRegistryEntry, 'systemMod'>): boolean {
    if (this.mods.has(entry.id)) {
      console.warn(`Mod ${entry.id} is already registered`);
      return false;
    }

    this.mods.set(entry.id, {
      ...entry,
      systemMod: false
    });

    console.log(`📝 Registered mod: ${entry.name}`);
    return true;
  }

  /**
   * Unregister a mod
   */
  async unregisterMod(modId: string): Promise<boolean> {
    const entry = this.mods.get(modId);
    if (!entry) {
      return false;
    }

    // Don't allow unregistering system mods
    if (entry.systemMod) {
      console.warn(`Cannot unregister system mod: ${modId}`);
      return false;
    }

    // Unload if loaded
    if (this.loadedMods.has(modId)) {
      await this.unloadMod(modId);
    }

    this.mods.delete(modId);
    console.log(`🗑️ Unregistered mod: ${entry.name}`);
    return true;
  }

  /**
   * Search mods by name or description
   */
  searchMods(query: string): ModRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.mods.values()).filter(mod =>
      mod.name.toLowerCase().includes(lowerQuery) ||
      mod.description.toLowerCase().includes(lowerQuery) ||
      mod.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get mod statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    loaded: number;
    system: number;
    thirdParty: number;
    byCategory: Record<string, number>;
  } {
    const mods = Array.from(this.mods.values());
    const byCategory: Record<string, number> = {};
    
    for (const mod of mods) {
      byCategory[mod.category] = (byCategory[mod.category] || 0) + 1;
    }

    return {
      total: mods.length,
      enabled: mods.filter(m => m.enabled).length,
      loaded: this.loadedMods.size,
      system: mods.filter(m => m.systemMod).length,
      thirdParty: mods.filter(m => !m.systemMod).length,
      byCategory
    };
  }
}

// Export singleton instance
export const systemModRegistry = SystemModRegistry.getInstance();

// Convenience functions
export const loadSystemMods = () => systemModRegistry.loadSystemMods();
export const loadMod = (modId: string) => systemModRegistry.loadMod(modId);
export const getAvailableMods = () => systemModRegistry.getAvailableMods();
export const getLoadedMods = () => systemModRegistry.getLoadedMods();
export const isModLoaded = (modId: string) => systemModRegistry.isModLoaded(modId);

console.log('📋 System mod registry exported');