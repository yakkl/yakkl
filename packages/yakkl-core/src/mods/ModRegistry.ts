/**
 * Mod Registry - Manages loading, lifecycle, and discovery of mods
 */

import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '../engine/WalletEngine';
import type { 
  Mod, 
  ModManifest, 
  ModPermission,
  Enhancement 
} from './types';
import { ModLoader } from './ModLoader';
import { Logger } from '../utils/Logger';

export interface ModRegistryEvents {
  'mod:loaded': (mod: Mod) => void;
  'mod:unloaded': (modId: string) => void;
  'mod:error': (modId: string, error: Error) => void;
  'enhancement:added': (enhancement: Enhancement) => void;
  'enhancement:removed': (enhancement: Enhancement) => void;
}

export class ModRegistry extends EventEmitter<ModRegistryEvents> {
  private engine: WalletEngine;
  private loader: ModLoader;
  private logger: Logger;
  
  private loadedMods = new Map<string, Mod>();
  private manifests = new Map<string, ModManifest>();
  private enhancements = new Map<string, Enhancement[]>();
  private permissions = new Map<string, ModPermission[]>();

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
    this.loader = new ModLoader();
    this.logger = new Logger('ModRegistry');
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing mod registry');
    
    try {
      // Load system mods
      await this.loadSystemMods();
      
      // Load user-installed mods
      await this.loadUserMods();
      
      // Setup enhancement detection
      await this.detectEnhancements();
      
      this.logger.info(`Registry initialized with ${this.loadedMods.size} mods`);
    } catch (error) {
      this.logger.error('Failed to initialize registry', error as Error);
      throw error;
    }
  }

  /**
   * Load a mod by ID
   */
  async load(modId: string): Promise<Mod> {
    // Check if already loaded
    const existing = this.loadedMods.get(modId);
    if (existing) {
      return existing;
    }

    this.logger.info(`Loading mod: ${modId}`);

    try {
      // Load the mod
      const mod = await this.loader.load(modId);
      
      // Validate permissions
      await this.validatePermissions(mod);
      
      // Initialize the mod
      await mod.initialize(this.engine);
      
      // Register the mod
      this.loadedMods.set(modId, mod);
      this.manifests.set(modId, mod.manifest);
      this.permissions.set(modId, mod.manifest.permissions);
      
      // Check for enhancements
      await this.checkEnhancements(mod);
      
      this.emit('mod:loaded', mod);
      this.logger.info(`Mod loaded successfully: ${modId}`);
      
      return mod;
    } catch (error) {
      this.logger.error(`Failed to load mod: ${modId}`, error as Error);
      this.emit('mod:error', modId, error as Error);
      throw error;
    }
  }

  /**
   * Unload a mod
   */
  async unload(modId: string): Promise<void> {
    const mod = this.loadedMods.get(modId);
    if (!mod) {
      return;
    }

    this.logger.info(`Unloading mod: ${modId}`);

    try {
      // Remove enhancements
      this.removeEnhancements(modId);
      
      // Destroy the mod
      await mod.destroy();
      
      // Remove from registry
      this.loadedMods.delete(modId);
      this.manifests.delete(modId);
      this.permissions.delete(modId);
      
      this.emit('mod:unloaded', modId);
      this.logger.info(`Mod unloaded: ${modId}`);
    } catch (error) {
      this.logger.error(`Failed to unload mod: ${modId}`, error as Error);
      throw error;
    }
  }

  /**
   * Get all loaded mods
   */
  getLoaded(): Mod[] {
    return Array.from(this.loadedMods.values());
  }

  /**
   * Get mod by ID
   */
  get(modId: string): Mod | null {
    return this.loadedMods.get(modId) || null;
  }

  /**
   * Check if mod is loaded
   */
  isLoaded(modId: string): boolean {
    return this.loadedMods.has(modId);
  }

  /**
   * Get mod manifest
   */
  getManifest(modId: string): ModManifest | null {
    return this.manifests.get(modId) || null;
  }

  /**
   * Get all manifests
   */
  getAllManifests(): ModManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Get mods by category
   */
  getByCategory(category: string): Mod[] {
    return Array.from(this.loadedMods.values())
      .filter(v => v.manifest.category === category);
  }

  /**
   * Get mods by tier
   */
  getByTier(tier: string): Mod[] {
    return Array.from(this.loadedMods.values())
      .filter(v => v.manifest.tier === tier);
  }

  /**
   * Get enhancements for a mod
   */
  getEnhancements(modId: string): Enhancement[] {
    return this.enhancements.get(modId) || [];
  }

  /**
   * Get all enhancements
   */
  getAllEnhancements(): Enhancement[] {
    const all: Enhancement[] = [];
    for (const enhancements of this.enhancements.values()) {
      all.push(...enhancements);
    }
    return all;
  }

  /**
   * Destroy the registry
   */
  async destroy(): Promise<void> {
    this.logger.info('Destroying mod registry');
    
    // Unload all mods
    const modIds = Array.from(this.loadedMods.keys());
    await Promise.all(modIds.map(id => this.unload(id)));
    
    // Clear all data
    this.loadedMods.clear();
    this.manifests.clear();
    this.enhancements.clear();
    this.permissions.clear();
    
    this.removeAllListeners();
  }

  /**
   * Load system mods (built-in)
   */
  private async loadSystemMods(): Promise<void> {
    const systemMods = [
      'basic-portfolio',
      'send-receive', 
      'network-manager',
      'account-manager'
    ];

    for (const modId of systemMods) {
      try {
        await this.load(modId);
      } catch (error) {
        this.logger.warn(`Failed to load system mod: ${modId}`, error as Error);
      }
    }
  }

  /**
   * Load user-installed mods
   */
  private async loadUserMods(): Promise<void> {
    try {
      const userMods = await this.loader.getUserMods();
      
      for (const modId of userMods) {
        try {
          await this.load(modId);
        } catch (error) {
          this.logger.warn(`Failed to load user mod: ${modId}`, error as Error);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load user mods', error as Error);
    }
  }

  /**
   * Validate mod permissions
   */
  private async validatePermissions(mod: Mod): Promise<void> {
    const manifest = mod.manifest;
    const config = this.engine.getConfig();
    
    // Check if mod is allowed based on wallet restrictions
    if (config.restrictions.includes('enterprise-only') && 
        manifest.tier !== 'enterprise') {
      throw new Error(`Mod ${manifest.id} not allowed in enterprise-only mode`);
    }
    
    // Validate individual permissions
    for (const permission of manifest.permissions) {
      if (!this.isPermissionGranted(permission, config)) {
        throw new Error(`Permission ${permission} not granted for mod ${manifest.id}`);
      }
    }
  }

  /**
   * Check if permission is granted
   */
  private isPermissionGranted(permission: ModPermission, config: any): boolean {
    // For now, allow all permissions
    // In production, this would check user permissions and wallet restrictions
    return true;
  }

  /**
   * Detect potential enhancements between mods
   */
  private async detectEnhancements(): Promise<void> {
    const mods = Array.from(this.loadedMods.values());
    
    for (const mod of mods) {
      await this.checkEnhancements(mod);
    }
  }

  /**
   * Check enhancements for a specific mod
   */
  private async checkEnhancements(mod: Mod): Promise<void> {
    const manifest = mod.manifest;
    
    // Check if this mod enhances others
    for (const targetId of manifest.enhances) {
      const targetMod = this.loadedMods.get(targetId);
      if (targetMod) {
        const canEnhance = await mod.enhance(targetMod);
        
        if (canEnhance) {
          const enhancement: Enhancement = {
            sourceMod: manifest.id,
            targetMod: targetId,
            type: 'feature',
            description: `${manifest.name} enhances ${targetMod.manifest.name}`,
            active: true
          };
          
          this.addEnhancement(enhancement);
        }
      }
    }
  }

  /**
   * Add an enhancement
   */
  private addEnhancement(enhancement: Enhancement): void {
    const existing = this.enhancements.get(enhancement.targetMod) || [];
    existing.push(enhancement);
    this.enhancements.set(enhancement.targetMod, existing);
    
    this.emit('enhancement:added', enhancement);
    this.logger.info(`Enhancement added: ${enhancement.sourceMod} → ${enhancement.targetMod}`);
  }

  /**
   * Remove enhancements for a mod
   */
  private removeEnhancements(modId: string): void {
    // Remove enhancements where this mod is the source
    for (const [targetId, enhancements] of this.enhancements.entries()) {
      const filtered = enhancements.filter(e => e.sourceMod !== modId);
      
      if (filtered.length !== enhancements.length) {
        this.enhancements.set(targetId, filtered);
        
        // Emit removal events
        const removed = enhancements.filter(e => e.sourceMod === modId);
        removed.forEach(e => this.emit('enhancement:removed', e));
      }
    }
    
    // Remove enhancements where this mod is the target
    this.enhancements.delete(modId);
  }
}