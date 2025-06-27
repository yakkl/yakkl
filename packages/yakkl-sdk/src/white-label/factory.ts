/**
 * Factory functions for white label wallet creation
 */

import { WhiteLabelWallet, type WhiteLabelConfig } from './WhiteLabelWallet';
import { BrandingManager, type BrandingConfig } from './BrandingManager';

/**
 * Create a new white label wallet instance
 */
export function createWhiteLabelWallet(config: WhiteLabelConfig): WhiteLabelWallet {
  return new WhiteLabelWallet(config);
}

/**
 * Create a branding manager instance
 */
export function createBrandingManager(config: BrandingConfig): BrandingManager {
  return new BrandingManager(config);
}

/**
 * Quick setup function for common white label configurations
 */
export function createQuickWhiteLabelWallet(options: {
  apiKey: string;
  appName: string;
  primaryColor: string;
  logo?: string;
  features?: string[];
}): WhiteLabelWallet {
  const config: WhiteLabelConfig = {
    apiKey: options.apiKey,
    appName: options.appName,
    appVersion: '1.0.0',
    branding: {
      name: options.appName,
      logo: options.logo || '',
      colors: {
        primary: options.primaryColor,
        secondary: adjustColor(options.primaryColor, -20),
        accent: adjustColor(options.primaryColor, 20),
        background: '#ffffff',
        surface: '#f8f9fa',
        text: '#212529'
      },
      theme: 'auto'
    },
    features: {
      enableSwap: options.features?.includes('swap') ?? true,
      enableBuy: options.features?.includes('buy') ?? true,
      enableStaking: options.features?.includes('staking') ?? false,
      enableNFTs: options.features?.includes('nfts') ?? true,
      enableDeFi: options.features?.includes('defi') ?? false,
      customNetworks: options.features?.includes('custom-networks') ?? false
    }
  };

  return new WhiteLabelWallet(config);
}

/**
 * Create a white label wallet with enterprise features
 */
export function createEnterpriseWhiteLabelWallet(options: {
  apiKey: string;
  appName: string;
  branding: BrandingConfig;
  allowedNetworks?: string[];
  maxTransactionAmount?: string;
  requireKYC?: boolean;
}): WhiteLabelWallet {
  const config: WhiteLabelConfig = {
    apiKey: options.apiKey,
    appName: options.appName,
    appVersion: '1.0.0',
    branding: options.branding,
    features: {
      enableSwap: true,
      enableBuy: true,
      enableStaking: true,
      enableNFTs: true,
      enableDeFi: true,
      customNetworks: true
    },
    restrictions: {
      allowedNetworks: options.allowedNetworks,
      maxTransactionAmount: options.maxTransactionAmount,
      requireKYC: options.requireKYC ?? false
    }
  };

  return new WhiteLabelWallet(config);
}

/**
 * Pre-configured white label wallet templates
 */
export const whitelabelTemplates = {
  /**
   * Simple trading wallet
   */
  trading: (apiKey: string, appName: string, primaryColor: string) => 
    createQuickWhiteLabelWallet({
      apiKey,
      appName,
      primaryColor,
      features: ['swap', 'buy']
    }),

  /**
   * Full-featured DeFi wallet
   */
  defi: (apiKey: string, appName: string, primaryColor: string) =>
    createQuickWhiteLabelWallet({
      apiKey,
      appName,
      primaryColor,
      features: ['swap', 'buy', 'staking', 'defi', 'custom-networks']
    }),

  /**
   * NFT-focused wallet
   */
  nft: (apiKey: string, appName: string, primaryColor: string) =>
    createQuickWhiteLabelWallet({
      apiKey,
      appName,
      primaryColor,
      features: ['nfts', 'buy']
    }),

  /**
   * Enterprise custody wallet
   */
  custody: (apiKey: string, appName: string, branding: BrandingConfig) =>
    createEnterpriseWhiteLabelWallet({
      apiKey,
      appName,
      branding,
      requireKYC: true,
      allowedNetworks: ['ethereum', 'polygon']
    })
};

/**
 * Utility function to adjust color brightness
 */
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16)
    .slice(1);
}