/**
 * ModLoader - Dynamically loads and instantiates mods
 */
import type { Mod, ModManifest } from './types';
export interface ModSource {
    type: 'local' | 'npm' | 'url' | 'system';
    location: string;
    verified: boolean;
}
export declare class ModLoader {
    private logger;
    private loadedModules;
    private systemMods;
    constructor();
    /**
     * Load a mod by ID
     */
    load(modId: string): Promise<Mod>;
    /**
     * Get list of user-installed mods
     */
    getUserMods(): Promise<string[]>;
    /**
     * Install a mod
     */
    install(modId: string, source: ModSource): Promise<void>;
    /**
     * Uninstall a mod
     */
    uninstall(modId: string): Promise<void>;
    /**
     * Check if a mod is available
     */
    isAvailable(modId: string): Promise<boolean>;
    /**
     * Get mod manifest without loading the mod
     */
    getManifest(modId: string): Promise<ModManifest | null>;
    /**
     * Private methods
     */
    private registerSystemMods;
    private resolveModSources;
    private loadFromSource;
    private loadSystemMod;
    private loadLocalMod;
    private loadNpmMod;
    private loadUrlMod;
    private loadManifestFromSource;
    private instantiateMod;
    private validateMod;
    private cleanupModStorage;
}
//# sourceMappingURL=ModLoader.d.ts.map