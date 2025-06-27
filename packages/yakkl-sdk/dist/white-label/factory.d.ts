/**
 * Factory functions for white label wallet creation
 */
import { WhiteLabelWallet, type WhiteLabelConfig } from './WhiteLabelWallet';
import { BrandingManager, type BrandingConfig } from './BrandingManager';
/**
 * Create a new white label wallet instance
 */
export declare function createWhiteLabelWallet(config: WhiteLabelConfig): WhiteLabelWallet;
/**
 * Create a branding manager instance
 */
export declare function createBrandingManager(config: BrandingConfig): BrandingManager;
/**
 * Quick setup function for common white label configurations
 */
export declare function createQuickWhiteLabelWallet(options: {
    apiKey: string;
    appName: string;
    primaryColor: string;
    logo?: string;
    features?: string[];
}): WhiteLabelWallet;
/**
 * Create a white label wallet with enterprise features
 */
export declare function createEnterpriseWhiteLabelWallet(options: {
    apiKey: string;
    appName: string;
    branding: BrandingConfig;
    allowedNetworks?: string[];
    maxTransactionAmount?: string;
    requireKYC?: boolean;
}): WhiteLabelWallet;
/**
 * Pre-configured white label wallet templates
 */
export declare const whitelabelTemplates: {
    /**
     * Simple trading wallet
     */
    trading: (apiKey: string, appName: string, primaryColor: string) => WhiteLabelWallet;
    /**
     * Full-featured DeFi wallet
     */
    defi: (apiKey: string, appName: string, primaryColor: string) => WhiteLabelWallet;
    /**
     * NFT-focused wallet
     */
    nft: (apiKey: string, appName: string, primaryColor: string) => WhiteLabelWallet;
    /**
     * Enterprise custody wallet
     */
    custody: (apiKey: string, appName: string, branding: BrandingConfig) => WhiteLabelWallet;
};
