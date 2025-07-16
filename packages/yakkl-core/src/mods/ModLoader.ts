/**
 * ModLoader - Dynamically loads and instantiates mods
 */

import type { Mod, ModManifest } from './types';
import { Logger } from '../utils/Logger';

export interface ModSource {
  type: 'local' | 'npm' | 'url' | 'system';
  location: string;
  verified: boolean;
}

export class ModLoader {
  private logger: Logger;
  private loadedModules = new Map<string, any>();
  private systemMods = new Map<string, () => Promise<any>>();

  constructor() {
    this.logger = new Logger('ModLoader');
    this.registerSystemMods();
  }

  /**
   * Load a mod by ID
   */
  async load(modId: string): Promise<Mod> {
    this.logger.info(`Loading mod: ${modId}`);

    try {
      // Check if already loaded
      if (this.loadedModules.has(modId)) {
        const module = this.loadedModules.get(modId);
        return this.instantiateMod(module);
      }

      // Try to load from different sources
      const sources = await this.resolveModSources(modId);
      
      for (const source of sources) {
        try {
          const module = await this.loadFromSource(modId, source);
          if (module) {
            this.loadedModules.set(modId, module);
            return this.instantiateMod(module);
          }
        } catch (error) {
          this.logger.warn(`Failed to load from ${source.type}: ${source.location}`, error as Error);
          continue;
        }
      }

      throw new Error(`Mod ${modId} not found in any source`);
    } catch (error) {
      this.logger.error(`Failed to load mod ${modId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get list of user-installed mods
   */
  async getUserMods(): Promise<string[]> {
    try {
      // Get from local storage or user directory
      const stored = localStorage.getItem('yakkl:userMods');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      this.logger.warn('Failed to get user mods', error as Error);
      return [];
    }
  }

  /**
   * Install a mod
   */
  async install(modId: string, source: ModSource): Promise<void> {
    this.logger.info(`Installing mod: ${modId} from ${source.type}`);

    try {
      // Load and validate the mod
      const module = await this.loadFromSource(modId, source);
      if (!module) {
        throw new Error('Failed to load mod module');
      }

      // Validate manifest
      await this.validateMod(module);

      // Add to user mods list
      const userMods = await this.getUserMods();
      if (!userMods.includes(modId)) {
        userMods.push(modId);
        localStorage.setItem('yakkl:userMods', JSON.stringify(userMods));
      }

      // Cache the module
      this.loadedModules.set(modId, module);

      this.logger.info(`Mod ${modId} installed successfully`);
    } catch (error) {
      this.logger.error(`Failed to install mod ${modId}`, error as Error);
      throw error;
    }
  }

  /**
   * Uninstall a mod
   */
  async uninstall(modId: string): Promise<void> {
    this.logger.info(`Uninstalling mod: ${modId}`);

    try {
      // Remove from user mods list
      const userMods = await this.getUserMods();
      const updated = userMods.filter(id => id !== modId);
      localStorage.setItem('yakkl:userMods', JSON.stringify(updated));

      // Remove from cache
      this.loadedModules.delete(modId);

      // Remove mod-specific storage
      await this.cleanupModStorage(modId);

      this.logger.info(`Mod ${modId} uninstalled successfully`);
    } catch (error) {
      this.logger.error(`Failed to uninstall mod ${modId}`, error as Error);
      throw error;
    }
  }

  /**
   * Check if a mod is available
   */
  async isAvailable(modId: string): Promise<boolean> {
    try {
      const sources = await this.resolveModSources(modId);
      return sources.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get mod manifest without loading the mod
   */
  async getManifest(modId: string): Promise<ModManifest | null> {
    try {
      const sources = await this.resolveModSources(modId);
      
      for (const source of sources) {
        try {
          const manifest = await this.loadManifestFromSource(modId, source);
          if (manifest) {
            return manifest;
          }
        } catch {
          continue;
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Private methods
   */
  private registerSystemMods(): void {
    // Register built-in system mods
    this.systemMods.set('basic-portfolio', async () => {
      // System mod would be dynamically loaded or imported
      // For now, return a mock implementation
      throw new Error('System mod basic-portfolio not implemented');
    });

    // Add more system mods as they're created
    this.systemMods.set('account-manager', async () => {
      // Would import AccountManagerMod when created
      throw new Error('System mod account-manager not implemented');
    });

    this.systemMods.set('network-manager', async () => {
      // Would import NetworkManagerMod when created
      throw new Error('System mod network-manager not implemented');
    });
  }

  private async resolveModSources(modId: string): Promise<ModSource[]> {
    const sources: ModSource[] = [];

    // System mods (highest priority)
    if (this.systemMods.has(modId)) {
      sources.push({
        type: 'system',
        location: modId,
        verified: true
      });
    }

    // Local development mods
    sources.push({
      type: 'local',
      location: `/src/routes/preview2/lib/mods/${modId}/index.ts`,
      verified: true
    });

    // User-installed NPM mods
    sources.push({
      type: 'npm',
      location: `@yakkl/mod-${modId}`,
      verified: false
    });

    // Official YAKKL mods registry
    sources.push({
      type: 'url',
      location: `https://registry.yakkl.com/mods/${modId}/latest.js`,
      verified: true
    });

    return sources;
  }

  private async loadFromSource(modId: string, source: ModSource): Promise<any> {
    switch (source.type) {
      case 'system':
        return this.loadSystemMod(modId);
      
      case 'local':
        return this.loadLocalMod(source.location);
      
      case 'npm':
        return this.loadNpmMod(source.location);
      
      case 'url':
        return this.loadUrlMod(source.location);
      
      default:
        throw new Error(`Unknown source type: ${source.type}`);
    }
  }

  private async loadSystemMod(modId: string): Promise<any> {
    const loader = this.systemMods.get(modId);
    if (!loader) {
      throw new Error(`System mod ${modId} not found`);
    }

    try {
      return await loader();
    } catch (error) {
      // System mod might not be implemented yet
      this.logger.warn(`System mod ${modId} not implemented`, error as Error);
      return null;
    }
  }

  private async loadLocalMod(location: string): Promise<any> {
    try {
      // Dynamic import for local development
      return await import(/* @vite-ignore */ location);
    } catch (error) {
      throw new Error(`Failed to load local mod: ${error}`);
    }
  }

  private async loadNpmMod(packageName: string): Promise<any> {
    try {
      // Dynamic import for NPM packages
      return await import(/* @vite-ignore */ packageName);
    } catch (error) {
      throw new Error(`Failed to load NPM mod: ${error}`);
    }
  }

  private async loadUrlMod(url: string): Promise<any> {
    try {
      // Fetch and evaluate remote mod (DANGEROUS - needs sandboxing)
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const code = await response.text();
      
      // Basic validation
      if (!code.includes('export')) {
        throw new Error('Invalid mod format - no exports found');
      }

      // Create a blob URL for the module
      const blob = new Blob([code], { type: 'application/javascript' });
      const moduleUrl = URL.createObjectURL(blob);

      try {
        const module = await import(/* @vite-ignore */ moduleUrl);
        return module;
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    } catch (error) {
      throw new Error(`Failed to load remote mod: ${error}`);
    }
  }

  private async loadManifestFromSource(modId: string, source: ModSource): Promise<ModManifest | null> {
    try {
      switch (source.type) {
        case 'system':
        case 'local':
          // Load manifest.json from same directory
          const manifestUrl = source.location.replace('/index.ts', '/manifest.json');
          const response = await fetch(manifestUrl);
          if (response.ok) {
            return await response.json();
          }
          return null;

        case 'npm':
          // Load from NPM package
          const module = await this.loadNpmMod(source.location);
          return module?.manifest || null;

        case 'url':
          // Load manifest from registry
          const registryUrl = source.location.replace('/latest.js', '/manifest.json');
          const manifestResponse = await fetch(registryUrl);
          if (manifestResponse.ok) {
            return await manifestResponse.json();
          }
          return null;

        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private instantiateMod(module: any): Mod {
    // Get the mod class (could be default export or named export)
    const ModClass = module.default || module.Mod || Object.values(module)[0];
    
    if (!ModClass || typeof ModClass !== 'function') {
      throw new Error('Invalid mod format - no mod class found');
    }

    // Instantiate the mod
    return new ModClass();
  }

  private async validateMod(module: any): Promise<void> {
    const mod = this.instantiateMod(module);

    // Check required properties
    if (!mod.manifest) {
      throw new Error('Mod missing manifest');
    }

    if (!mod.manifest.id || !mod.manifest.name || !mod.manifest.version) {
      throw new Error('Mod manifest missing required fields');
    }

    // Check required methods
    const requiredMethods = ['initialize', 'destroy', 'isLoaded', 'isActive'];
    for (const method of requiredMethods) {
      if (typeof mod[method] !== 'function') {
        throw new Error(`Mod missing required method: ${method}`);
      }
    }

    this.logger.debug(`Mod ${mod.manifest.id} validation passed`);
  }

  private async cleanupModStorage(modId: string): Promise<void> {
    try {
      // Remove mod-specific localStorage entries
      const prefix = `mod:${modId}:`;
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      keys.forEach(k => localStorage.removeItem(k));

      this.logger.debug(`Cleaned up storage for mod ${modId}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup storage for mod ${modId}`, error as Error);
    }
  }
}