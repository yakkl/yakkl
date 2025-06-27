/**
 * BrandingManager - Manages white label branding and theming
 */
export interface BrandingConfig {
    name: string;
    logo: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
    };
    fonts?: {
        primary: string;
        secondary: string;
    };
    theme?: 'light' | 'dark' | 'auto';
}
export declare class BrandingManager {
    private config;
    private styleElement;
    private applied;
    constructor(config: BrandingConfig);
    /**
     * Apply branding to the current page
     */
    apply(): Promise<void>;
    /**
     * Update branding configuration
     */
    updateConfig(config: Partial<BrandingConfig>): void;
    /**
     * Get current branding configuration
     */
    getConfig(): BrandingConfig;
    /**
     * Generate CSS for the branding
     */
    generateCSS(): string;
    /**
     * Create branded component wrapper
     */
    createBrandedWrapper(element: HTMLElement): HTMLElement;
    /**
     * Get logo URL
     */
    getLogoUrl(): string;
    /**
     * Get brand name
     */
    getBrandName(): string;
    /**
     * Check if dark theme should be used
     */
    isDarkTheme(): boolean;
    /**
     * Cleanup applied branding
     */
    cleanup(): Promise<void>;
    /**
     * Private methods
     */
    private applyCSSVariables;
    private loadFonts;
    private loadFont;
    private updatePageMetadata;
}
