/**
 * ModTemplate - Pre-built mod templates for common use cases
 */

import { ModBuilder } from './ModBuilder';
import type { ModManifest } from '@yakkl/core';

export type TemplateType = 
  | 'portfolio-tracker'
  | 'trading-bot'
  | 'defi-dashboard'
  | 'nft-gallery'
  | 'price-alerts'
  | 'transaction-analyzer'
  | 'security-scanner'
  | 'backup-manager';

export interface TemplateConfig {
  id: string;
  name: string;
  author: string;
  description?: string;
}

export class ModTemplate {
  static portfolioTracker(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Track and analyze your crypto portfolio',
      category: 'finance',
      tags: ['portfolio', 'tracking', 'analytics'],
      tier: 'community',
      version: '2.0.2'
    })
    .withUI([
      {
        id: 'portfolio-widget',
        name: 'Portfolio Widget',
        type: 'widget',
        mountPoint: 'dashboard',
        props: {}
      }
    ])
    .withStorage(5 * 1024 * 1024) // 5MB
    .withPermissions(['storage', 'network'])
    .withNetwork(['api.coingecko.com', 'api.coinmarketcap.com']);
  }

  static tradingBot(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Automated trading strategies',
      category: 'trading',
      tags: ['trading', 'automation', 'bot'],
      tier: 'pro',
      version: '2.0.2'
    })
    .withBackground(['trading-engine.js'])
    .withAPI(['execute-trade', 'get-strategies'])
    .withStorage(10 * 1024 * 1024) // 10MB
    .withPermissions(['storage', 'network', 'transactions'])
    .withNetwork(['api.binance.com', 'api.coinbase.com']);
  }

  static defiDashboard(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Monitor DeFi positions and yields',
      category: 'defi',
      tags: ['defi', 'yield', 'dashboard'],
      tier: 'community',
      version: '2.0.2'
    })
    .withUI([
      {
        id: 'defi-dashboard',
        name: 'DeFi Dashboard',
        type: 'page',
        mountPoint: 'dashboard',
        props: {}
      }
    ])
    .withNetwork(['api.defipulse.com', 'api.yearn.finance'])
    .withPermissions(['storage', 'network']);
  }

  static nftGallery(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Display and manage NFT collections',
      category: 'nft',
      tags: ['nft', 'gallery', 'collectibles'],
      tier: 'community',
      version: '2.0.2'
    })
    .withUI([
      {
        id: 'nft-gallery',
        name: 'NFT Gallery',
        type: 'page',
        mountPoint: 'portfolio',
        props: {}
      }
    ])
    .withStorage(50 * 1024 * 1024) // 50MB for images
    .withNetwork(['api.opensea.io', 'api.rarible.org'])
    .withPermissions(['storage', 'network']);
  }

  static priceAlerts(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Set price alerts for cryptocurrencies',
      category: 'alerts',
      tags: ['alerts', 'notifications', 'price'],
      tier: 'community',
      version: '2.0.2'
    })
    .withBackground(['price-monitor.js'])
    .withUI([
      {
        id: 'alert-settings',
        name: 'Alert Settings',
        type: 'modal',
        mountPoint: 'settings',
        props: {}
      }
    ])
    .withStorage(1 * 1024 * 1024) // 1MB
    .withNetwork(['api.coingecko.com'])
    .withPermissions(['storage', 'network', 'notifications']);
  }

  static transactionAnalyzer(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Analyze transaction patterns and costs',
      category: 'analytics',
      tags: ['analytics', 'transactions', 'gas'],
      tier: 'pro',
      version: '2.0.2'
    })
    .withUI([
      {
        id: 'tx-analyzer',
        name: 'Transaction Analyzer',
        type: 'page',
        mountPoint: 'transaction',
        props: {}
      }
    ])
    .withStorage(20 * 1024 * 1024) // 20MB
    .withNetwork(['api.etherscan.io', 'api.polygonscan.com'])
    .withPermissions(['storage', 'network', 'transactions']);
  }

  static securityScanner(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Scan transactions and contracts for security issues',
      category: 'security',
      tags: ['security', 'scanner', 'audit'],
      tier: 'private',
      version: '2.0.2'
    })
    .withBackground(['security-scanner.js'])
    .withAPI(['scan-transaction', 'scan-contract'])
    .withStorage(5 * 1024 * 1024) // 5MB
    .withNetwork(['api.slither.io', 'api.mythx.io'])
    .withPermissions(['storage', 'network', 'transactions']);
  }

  static backupManager(config: TemplateConfig): ModBuilder {
    return new ModBuilder({
      ...config,
      description: config.description || 'Secure backup and recovery management',
      category: 'security',
      tags: ['backup', 'recovery', 'security'],
      tier: 'enterprise',
      version: '2.0.2'
    })
    .withUI([
      {
        id: 'backup-settings',
        name: 'Backup Settings',
        type: 'page',
        mountPoint: 'settings',
        props: {}
      }
    ])
    .withBackground(['backup-scheduler.js'])
    .withStorage(100 * 1024 * 1024) // 100MB
    .withPermissions(['storage', 'network', 'accounts']);
  }

  /**
   * Create a mod from a template
   */
  static create(type: TemplateType, config: TemplateConfig): ModBuilder {
    switch (type) {
      case 'portfolio-tracker':
        return this.portfolioTracker(config);
      case 'trading-bot':
        return this.tradingBot(config);
      case 'defi-dashboard':
        return this.defiDashboard(config);
      case 'nft-gallery':
        return this.nftGallery(config);
      case 'price-alerts':
        return this.priceAlerts(config);
      case 'transaction-analyzer':
        return this.transactionAnalyzer(config);
      case 'security-scanner':
        return this.securityScanner(config);
      case 'backup-manager':
        return this.backupManager(config);
      default:
        throw new Error(`Unknown template type: ${type}`);
    }
  }

  /**
   * Get available template types
   */
  static getAvailableTemplates(): TemplateType[] {
    return [
      'portfolio-tracker',
      'trading-bot',
      'defi-dashboard',
      'nft-gallery',
      'price-alerts',
      'transaction-analyzer',
      'security-scanner',
      'backup-manager'
    ];
  }

  /**
   * Get template description
   */
  static getTemplateDescription(type: TemplateType): string {
    const descriptions: Record<TemplateType, string> = {
      'portfolio-tracker': 'Track and analyze your crypto portfolio with real-time data',
      'trading-bot': 'Automated trading strategies with risk management',
      'defi-dashboard': 'Monitor DeFi positions, yields, and opportunities',
      'nft-gallery': 'Display and manage NFT collections with metadata',
      'price-alerts': 'Set customizable price alerts with notifications',
      'transaction-analyzer': 'Analyze transaction patterns, costs, and optimization',
      'security-scanner': 'Scan transactions and contracts for security vulnerabilities',
      'backup-manager': 'Secure backup and recovery management system'
    };

    return descriptions[type];
  }
}
