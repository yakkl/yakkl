/**
 * Mod Registry - Manages loading, lifecycle, and discovery of mods
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '../engine/WalletEngine';
import type { Mod, ModManifest, Enhancement } from './types';
export interface ModRegistryEvents {
    'mod:loaded': (mod: Mod) => void;
    'mod:unloaded': (modId: string) => void;
    'mod:error': (modId: string, error: Error) => void;
    'enhancement:added': (enhancement: Enhancement) => void;
    'enhancement:removed': (enhancement: Enhancement) => void;
}
export declare class ModRegistry extends EventEmitter<ModRegistryEvents> {
    private engine;
    private loader;
    private logger;
    private loadedMods;
    private manifests;
    private enhancements;
    private permissions;
    constructor(engine: WalletEngine);
    /**
     * Initialize the registry
     */
    initialize(): Promise<void>;
    /**
     * Load a mod by ID
     */
    load(modId: string): Promise<Mod>;
    /**
     * Unload a mod
     */
    unload(modId: string): Promise<void>;
    /**
     * Get all loaded mods
     */
    getLoaded(): Mod[];
    /**
     * Get mod by ID
     */
    get(modId: string): Mod | null;
    /**
     * Check if mod is loaded
     */
    isLoaded(modId: string): boolean;
    /**
     * Get mod manifest
     */
    getManifest(modId: string): ModManifest | null;
    /**
     * Get all manifests
     */
    getAllManifests(): ModManifest[];
    /**
     * Get mods by category
     */
    getByCategory(category: string): Mod[];
    /**
     * Get mods by tier
     */
    getByTier(tier: string): Mod[];
    /**
     * Get enhancements for a mod
     */
    getEnhancements(modId: string): Enhancement[];
    /**
     * Get all enhancements
     */
    getAllEnhancements(): Enhancement[];
    /**
     * Destroy the registry
     */
    destroy(): Promise<void>;
    /**
     * Load system mods (built-in)
     */
    private loadSystemMods;
    /**
     * Load user-installed mods
     */
    private loadUserMods;
    /**
     * Validate mod permissions
     */
    private validatePermissions;
    /**
     * Check if permission is granted
     */
    private isPermissionGranted;
    /**
     * Detect potential enhancements between mods
     */
    private detectEnhancements;
    /**
     * Check enhancements for a specific mod
     */
    private checkEnhancements;
    /**
     * Add an enhancement
     */
    private addEnhancement;
    /**
     * Remove enhancements for a mod
     */
    private removeEnhancements;
}
//# sourceMappingURL=ModRegistry.d.ts.map