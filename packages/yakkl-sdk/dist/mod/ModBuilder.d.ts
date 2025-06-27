/**
 * ModBuilder - Helper class for building YAKKL mods
 */
import type { ModManifest, ModComponent } from '@yakkl/core';
export interface ModBuilderConfig {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license?: string;
    tier?: 'community' | 'verified' | 'pro' | 'private' | 'enterprise';
    category?: string;
    tags?: string[];
}
export declare class ModBuilder {
    private manifest;
    private components;
    private capabilities;
    constructor(config: ModBuilderConfig);
    /**
     * Add UI capabilities to the mod
     */
    withUI(components: ModComponent[]): ModBuilder;
    /**
     * Add background processing capabilities
     */
    withBackground(scripts: string[]): ModBuilder;
    /**
     * Add API capabilities
     */
    withAPI(endpoints: string[]): ModBuilder;
    /**
     * Add storage capabilities
     */
    withStorage(maxSize?: number): ModBuilder;
    /**
     * Add network access capabilities
     */
    withNetwork(allowedHosts: string[]): ModBuilder;
    /**
     * Add permissions required by the mod
     */
    withPermissions(permissions: string[]): ModBuilder;
    /**
     * Set mods that this mod enhances
     */
    enhances(modIds: string[]): ModBuilder;
    /**
     * Set mods that conflict with this mod
     */
    conflicts(modIds: string[]): ModBuilder;
    /**
     * Set mod metadata
     */
    withMetadata(metadata: {
        iconUrl?: string;
        screenshotUrls?: string[];
        website?: string;
        repository?: string;
        documentation?: string;
    }): ModBuilder;
    /**
     * Build the mod manifest
     */
    buildManifest(): ModManifest;
    /**
     * Generate mod template code
     */
    generateTemplate(): string;
    /**
     * Convert string to PascalCase
     */
    private toPascalCase;
}
