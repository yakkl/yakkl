/**
 * WhiteLabelWallet - Customizable wallet solution for businesses
 */
import type { WalletEngine } from '@yakkl/core';
import { BrandingManager } from './BrandingManager';
export interface WhiteLabelConfig {
    apiKey: string;
    appName: string;
    appVersion: string;
    branding: {
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
    };
    features?: {
        enableSwap?: boolean;
        enableBuy?: boolean;
        enableStaking?: boolean;
        enableNFTs?: boolean;
        enableDeFi?: boolean;
        customNetworks?: boolean;
    };
    restrictions?: {
        allowedNetworks?: string[];
        blockedTokens?: string[];
        maxTransactionAmount?: string;
        requireKYC?: boolean;
    };
    callbacks?: {
        onTransactionSigned?: (txHash: string) => void;
        onUserAction?: (action: string, data: any) => void;
        onError?: (error: Error) => void;
    };
}
export declare class WhiteLabelWallet {
    private engine;
    private config;
    private branding;
    private initialized;
    constructor(config: WhiteLabelConfig);
    /**
     * Initialize the white label wallet
     */
    initialize(): Promise<void>;
    /**
     * Get the wallet engine
     */
    getEngine(): WalletEngine;
    /**
     * Get branding manager
     */
    getBrandingManager(): BrandingManager;
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature: keyof WhiteLabelConfig['features']): boolean;
    /**
     * Get wallet configuration
     */
    getConfig(): WhiteLabelConfig;
    /**
     * Update branding at runtime
     */
    updateBranding(branding: Partial<WhiteLabelConfig['branding']>): Promise<void>;
    /**
     * Create embedded wallet UI
     */
    createEmbeddedUI(container: HTMLElement, options?: {
        width?: string;
        height?: string;
        mode?: 'popup' | 'inline' | 'modal';
    }): HTMLElement;
    /**
     * Destroy the white label wallet
     */
    destroy(): Promise<void>;
    /**
     * Private methods
     */
    private mapRestrictions;
    private setupCallbacks;
}
