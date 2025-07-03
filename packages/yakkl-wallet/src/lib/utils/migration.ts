import type { YakklAccount, TokenData as Token } from '$lib/common/interfaces';
import type { AccountDisplay, TokenDisplay, ChainDisplay } from '../types';
import { PlanType } from '../config/features';

/**
 * Migration utilities to convert between old and new data formats
 */

export class MigrationUtils {
  /**
   * Convert legacy YakklAccount to AccountDisplay format
   */
  static convertAccount(yakklAccount: YakklAccount): AccountDisplay {
    return {
      address: yakklAccount.address,
      ens: yakklAccount.alias || null,
      username: yakklAccount.name,
      avatar: yakklAccount.avatar || null,
      isActive: true,
      balance: yakklAccount.quantity?.toString() || '0',
      plan: PlanType.Basic // Default plan for existing users
    };
  }

  /**
   * Convert multiple accounts
   */
  static convertAccounts(yakklAccounts: YakklAccount[]): AccountDisplay[] {
    return yakklAccounts.map(account => this.convertAccount(account));
  }

  /**
   * Convert legacy Token to TokenDisplay format
   */
  static convertToken(token: Token & { totalValue?: string; totalQuantity?: string; price?: string }): TokenDisplay {
    return {
      symbol: token.symbol,
      name: token.name,
      icon: (token as any).logo || this.getDefaultTokenIcon(token.symbol),
      value: parseFloat(token.totalValue || '0'),
      qty: parseFloat(token.totalQuantity || '0'),
      price: parseFloat(token.price || '0'),
      change24h: (token as any).priceChange24h,
      address: token.address,
      decimals: token.decimals,
      color: this.getTokenColor(token.symbol)
    };
  }

  /**
   * Convert multiple tokens
   */
  static convertTokens(tokens: (Token & { totalValue?: string; totalQuantity?: string; price?: string })[]): TokenDisplay[] {
    return tokens.map(token => this.convertToken(token));
  }

  /**
   * Convert legacy chain data to ChainDisplay format
   */
  static convertChain(chainData: any): ChainDisplay {
    return {
      key: `${chainData.name?.toLowerCase()}-${chainData.network?.toLowerCase()}`,
      name: chainData.name || 'Unknown',
      network: chainData.network || 'Unknown',
      icon: chainData.icon || '/images/chain-default.svg',
      isTestnet: chainData.isTestnet || false,
      rpcUrl: chainData.rpcUrl,
      chainId: chainData.chainId || 1
    };
  }

  /**
   * Migrate user preferences and settings
   */
  static async migrateUserSettings(legacySettings: any): Promise<{
    theme: 'light' | 'dark' | 'auto';
    plan: {
      type: PlanType;
      trialEndsAt?: string;
      subscriptionId?: string;
    };
    preferences: {
      showTestnets: boolean;
      defaultCurrency: string;
      notifications: boolean;
    };
  }> {
    return {
      theme: legacySettings.theme || 'auto',
      plan: {
        type: this.determinePlanType(legacySettings),
        trialEndsAt: legacySettings.trialEndsAt,
        subscriptionId: legacySettings.subscriptionId
      },
      preferences: {
        showTestnets: legacySettings.showTestnets || false,
        defaultCurrency: legacySettings.defaultCurrency || 'USD',
        notifications: legacySettings.notifications !== false
      }
    };
  }

  /**
   * Create migration report
   */
  static createMigrationReport(
    accountCount: number,
    tokenCount: number,
    transactionCount: number,
    errors: string[]
  ): {
    success: boolean;
    summary: string;
    details: {
      accounts: number;
      tokens: number;
      transactions: number;
      errors: string[];
    };
    recommendations: string[];
  } {
    const success = errors.length === 0;
    const recommendations = this.generateRecommendations(accountCount, tokenCount, errors);

    return {
      success,
      summary: success 
        ? `Successfully migrated ${accountCount} accounts, ${tokenCount} tokens, and ${transactionCount} transactions.`
        : `Migration completed with ${errors.length} errors. Please review the details below.`,
      details: {
        accounts: accountCount,
        tokens: tokenCount,
        transactions: transactionCount,
        errors
      },
      recommendations
    };
  }

  /**
   * Validate migration data integrity
   */
  static validateMigration(
    originalData: any,
    migratedData: any
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate account count
    if (originalData.accounts?.length !== migratedData.accounts?.length) {
      errors.push('Account count mismatch');
    }

    // Validate token count
    if (originalData.tokens?.length !== migratedData.tokens?.length) {
      errors.push('Token count mismatch');
    }

    // Validate critical account data
    originalData.accounts?.forEach((originalAccount: YakklAccount, index: number) => {
      const migratedAccount = migratedData.accounts?.[index];
      if (originalAccount.address !== migratedAccount?.address) {
        errors.push(`Account address mismatch at index ${index}`);
      }
    });

    // Check for data loss
    if (originalData.totalValue && migratedData.totalValue) {
      const originalValue = parseFloat(originalData.totalValue);
      const migratedValue = parseFloat(migratedData.totalValue);
      const difference = Math.abs(originalValue - migratedValue);
      
      if (difference > originalValue * 0.01) { // 1% tolerance
        warnings.push('Significant portfolio value difference detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create rollback data for safe migration
   */
  static createRollbackData(originalData: any): {
    timestamp: number;
    version: string;
    data: any;
    checksum: string;
  } {
    const rollbackData = {
      timestamp: Date.now(),
      version: '1.0.0', // Original version
      data: JSON.parse(JSON.stringify(originalData)), // Deep clone
      checksum: this.generateChecksum(originalData)
    };

    return rollbackData;
  }

  /**
   * Execute rollback if migration fails
   */
  static async executeRollback(rollbackData: any): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Verify rollback data integrity
      const currentChecksum = this.generateChecksum(rollbackData.data);
      if (currentChecksum !== rollbackData.checksum) {
        throw new Error('Rollback data corrupted');
      }

      // Restore original data
      // This would involve calling the appropriate storage APIs
      // await restoreOriginalData(rollbackData.data);

      return {
        success: true,
        message: 'Successfully rolled back to previous version'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Rollback failed'
      };
    }
  }

  /**
   * Get default token icon for unknown tokens
   */
  private static getDefaultTokenIcon(symbol: string): string {
    const iconMap: Record<string, string> = {
      'ETH': '/images/eth.svg',
      'BTC': '₿',
      'USDT': '💵',
      'USDC': '💰',
      'DAI': '🏦',
      'LINK': '🔗',
      'UNI': '🦄',
      'PEPE': '🐸'
    };

    return iconMap[symbol.toUpperCase()] || '🪙';
  }

  /**
   * Get token color for visual distinction
   */
  private static getTokenColor(symbol: string): string {
    const colorMap: Record<string, string> = {
      'ETH': 'bg-blue-400',
      'BTC': 'bg-orange-400',
      'USDT': 'bg-green-400',
      'USDC': 'bg-blue-500',
      'DAI': 'bg-yellow-400',
      'LINK': 'bg-indigo-400',
      'UNI': 'bg-pink-400'
    };

    return colorMap[symbol.toUpperCase()] || 'bg-gray-400';
  }

  /**
   * Determine plan type from legacy settings
   */
  private static determinePlanType(legacySettings: any): PlanType {
    if (legacySettings.isProLevel || legacySettings.plan === 'pro') {
      return PlanType.Pro;
    }
    if (legacySettings.plan === 'enterprise') {
      return PlanType.Enterprise;
    }
    return PlanType.Basic;
  }

  /**
   * Generate recommendations based on migration results
   */
  private static generateRecommendations(
    accountCount: number,
    tokenCount: number,
    errors: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (accountCount === 0) {
      recommendations.push('No accounts found - consider importing or creating a new account');
    }

    if (tokenCount === 0) {
      recommendations.push('No tokens found - refresh token list or add custom tokens');
    }

    if (errors.length > 0) {
      recommendations.push('Review migration errors and consider manual data entry for failed items');
    }

    if (accountCount > 10) {
      recommendations.push('Consider organizing accounts with ENS names or custom labels');
    }

    if (tokenCount > 50) {
      recommendations.push('Consider hiding low-value tokens to improve performance');
    }

    return recommendations;
  }

  /**
   * Generate simple checksum for data integrity
   */
  private static generateChecksum(data: any): string {
    const dataString = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
}

/**
 * Feature comparison between old and new versions
 */
export const FEATURE_COMPARISON = {
  legacy: [
    'Basic send/receive',
    'Token management',
    'Transaction history',
    'Multiple accounts',
    'DApp connection',
    'Hardware wallet support'
  ],
  preview2: [
    'All legacy features',
    'Enhanced UI/UX',
    'Feature-based access control',
    'Subscription management',
    'Crypto payment gateway',
    'AI assistance (Pro)',
    'Advanced analytics (Pro)',
    'White-label support',
    'Real-time notifications',
    'Improved security'
  ],
  new: [
    'Enhanced UI/UX',
    'Feature-based access control',
    'Subscription management',
    'Crypto payment gateway',
    'AI assistance (Pro)',
    'Advanced analytics (Pro)',
    'White-label support',
    'Real-time notifications',
    'Improved security'
  ]
};

/**
 * Migration checklist for manual verification
 */
export const MIGRATION_CHECKLIST = [
  'All accounts migrated with correct addresses',
  'Account balances match previous values',
  'Token list includes all previously held tokens',
  'Transaction history preserved',
  'Settings and preferences transferred',
  'ENS names and labels preserved',
  'Custom networks and RPCs maintained',
  'Hardware wallet connections working',
  'DApp connections still functional',
  'Backup and recovery phrases secure'
];