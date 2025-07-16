/**
 * System Extension Registry
 * 
 * Manages loading and registration of system extensions
 */

// @ts-nocheck - Mock implementation for system extension registry
type Extension = any;

// Import system extensions
import NetworkManagerExtension from './network-manager/index';
import AccountManagerExtension from './account-manager/index';

export interface ExtensionRegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: string;
  loader: () => Promise<Extension>;
  enabled: boolean;
  systemExtension: boolean;
}

export class SystemExtensionRegistry {
  private static instance: SystemExtensionRegistry;
  private extensions = new Map<string, ExtensionRegistryEntry>();
  private loadedExtensions = new Map<string, Extension>();

  static getInstance(): SystemExtensionRegistry {
    if (!SystemExtensionRegistry.instance) {
      SystemExtensionRegistry.instance = new SystemExtensionRegistry();
    }
    return SystemExtensionRegistry.instance;
  }

  constructor() {
    this.registerSystemExtensions();
  }

  /**
   * Register all system extensions
   */
  private registerSystemExtensions(): void {
    // Register Network Manager Extension
    this.extensions.set('system-network-manager', {
      id: 'system-network-manager',
      name: 'Enhanced Network Manager',
      description: 'Advanced network switching and management with custom networks support',
      category: 'network',
      tier: 'community',
      loader: async () => new NetworkManagerExtension(),
      enabled: true,
      systemExtension: true
    });

    // Register Account Manager Extension
    this.extensions.set('system-account-manager', {
      id: 'system-account-manager',
      name: 'Enhanced Account Manager',
      description: 'Advanced account management with security features and multi-sig support',
      category: 'account',
      tier: 'community',
      loader: async () => new AccountManagerExtension(),
      enabled: true,
      systemExtension: true
    });

    console.log('📋 System extension registry initialized with', this.extensions.size, 'extensions');
  }

  /**
   * Get all registered extensions
   */
  getAvailableExtensions(): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values());
  }

  /**
   * Get extensions by category
   */
  getExtensionsByCategory(category: string): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values()).filter(extension => extension.category === category);
  }

  /**
   * Get enabled extensions
   */
  getEnabledExtensions(): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values()).filter(extension => extension.enabled);
  }

  /**
   * Get system extensions
   */
  getSystemExtensions(): ExtensionRegistryEntry[] {
    return Array.from(this.extensions.values()).filter(extension => extension.systemExtension);
  }

  /**
   * Load an extension by ID
   */
  async loadExtension(extensionId: string): Promise<Extension | null> {
    const entry = this.extensions.get(extensionId);
    if (!entry) {
      console.warn(`Extension ${extensionId} not found in registry`);
      return null;
    }

    if (!entry.enabled) {
      console.warn(`Extension ${extensionId} is disabled`);
      return null;
    }

    // Check if already loaded
    if (this.loadedExtensions.has(extensionId)) {
      return this.loadedExtensions.get(extensionId)!;
    }

    try {
      console.log(`📦 Loading extension: ${entry.name}`);
      const extension = await entry.loader();
      this.loadedExtensions.set(extensionId, extension);
      console.log(`✅ Loaded extension: ${entry.name}`);
      return extension;
    } catch (error) {
      console.error(`Failed to load extension ${extensionId}:`, error);
      return null;
    }
  }

  /**
   * Load all enabled extensions
   */
  async loadAllEnabledExtensions(): Promise<Extension[]> {
    const enabledExtensions = this.getEnabledExtensions();
    const loadPromises = enabledExtensions.map(entry => this.loadExtension(entry.id));
    const results = await Promise.allSettled(loadPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Extension | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  /**
   * Load system extensions only
   */
  async loadSystemExtensions(): Promise<Extension[]> {
    const systemExtensions = this.getSystemExtensions();
    const loadPromises = systemExtensions.map(entry => this.loadExtension(entry.id));
    const results = await Promise.allSettled(loadPromises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<Extension | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);
  }

  /**
   * Enable or disable an extension
   */
  setExtensionEnabled(extensionId: string, enabled: boolean): boolean {
    const entry = this.extensions.get(extensionId);
    if (!entry) {
      return false;
    }

    entry.enabled = enabled;
    
    // If disabling, remove from loaded extensions
    if (!enabled && this.loadedExtensions.has(extensionId)) {
      const extension = this.loadedExtensions.get(extensionId);
      if (extension && extension.destroy) {
        extension.destroy().catch(err => console.warn(`Error destroying extension ${extensionId}:`, err));
      }
      this.loadedExtensions.delete(extensionId);
    }

    return true;
  }

  /**
   * Get a loaded extension
   */
  getLoadedExtension(extensionId: string): Extension | null {
    return this.loadedExtensions.get(extensionId) || null;
  }

  /**
   * Get all loaded extensions
   */
  getLoadedExtensions(): Extension[] {
    return Array.from(this.loadedExtensions.values());
  }

  /**
   * Check if an extension is loaded
   */
  isExtensionLoaded(extensionId: string): boolean {
    return this.loadedExtensions.has(extensionId);
  }

  /**
   * Unload an extension
   */
  async unloadExtension(extensionId: string): Promise<boolean> {
    const extension = this.loadedExtensions.get(extensionId);
    if (!extension) {
      return false;
    }

    try {
      if (extension.destroy) {
        await extension.destroy();
      }
      this.loadedExtensions.delete(extensionId);
      console.log(`🗑️ Unloaded extension: ${extensionId}`);
      return true;
    } catch (error) {
      console.error(`Failed to unload extension ${extensionId}:`, error);
      return false;
    }
  }

  /**
   * Unload all extensions
   */
  async unloadAllExtensions(): Promise<void> {
    const unloadPromises = Array.from(this.loadedExtensions.keys()).map(extensionId => 
      this.unloadExtension(extensionId)
    );
    
    await Promise.allSettled(unloadPromises);
    this.loadedExtensions.clear();
  }

  /**
   * Register a new extension (for third-party extensions)
   */
  registerExtension(entry: Omit<ExtensionRegistryEntry, 'systemExtension'>): boolean {
    if (this.extensions.has(entry.id)) {
      console.warn(`Extension ${entry.id} is already registered`);
      return false;
    }

    this.extensions.set(entry.id, {
      ...entry,
      systemExtension: false
    });

    console.log(`📝 Registered extension: ${entry.name}`);
    return true;
  }

  /**
   * Unregister an extension
   */
  async unregisterExtension(extensionId: string): Promise<boolean> {
    const entry = this.extensions.get(extensionId);
    if (!entry) {
      return false;
    }

    // Don't allow unregistering system extensions
    if (entry.systemExtension) {
      console.warn(`Cannot unregister system extension: ${extensionId}`);
      return false;
    }

    // Unload if loaded
    if (this.loadedExtensions.has(extensionId)) {
      await this.unloadExtension(extensionId);
    }

    this.extensions.delete(extensionId);
    console.log(`🗑️ Unregistered extension: ${entry.name}`);
    return true;
  }

  /**
   * Search extensions by name or description
   */
  searchExtensions(query: string): ExtensionRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.extensions.values()).filter(extension =>
      extension.name.toLowerCase().includes(lowerQuery) ||
      extension.description.toLowerCase().includes(lowerQuery) ||
      extension.category.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get extension statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    loaded: number;
    system: number;
    thirdParty: number;
    byCategory: Record<string, number>;
  } {
    const extensions = Array.from(this.extensions.values());
    const byCategory: Record<string, number> = {};
    
    for (const extension of extensions) {
      byCategory[extension.category] = (byCategory[extension.category] || 0) + 1;
    }

    return {
      total: extensions.length,
      enabled: extensions.filter(e => e.enabled).length,
      loaded: this.loadedExtensions.size,
      system: extensions.filter(e => e.systemExtension).length,
      thirdParty: extensions.filter(e => !e.systemExtension).length,
      byCategory
    };
  }
}

// Export singleton instance
export const systemExtensionRegistry = SystemExtensionRegistry.getInstance();

// Convenience functions
export const loadSystemExtensions = () => systemExtensionRegistry.loadSystemExtensions();
export const loadExtension = (extensionId: string) => systemExtensionRegistry.loadExtension(extensionId);
export const getAvailableExtensions = () => systemExtensionRegistry.getAvailableExtensions();
export const getLoadedExtensions = () => systemExtensionRegistry.getLoadedExtensions();
export const isExtensionLoaded = (extensionId: string) => systemExtensionRegistry.isExtensionLoaded(extensionId);

console.log('📋 System extension registry exported');