/**
 * Plan Level Service
 * Manages authentication tier restrictions and feature gating
 */

import { getYakklSettings } from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';

export enum PlanLevel {
  EXPLORER_MEMBER = 'explorer_member',
  YAKKL_PRO = 'yakkl_pro',
  EARLY_ADOPTER = 'early_adopter',
  FOUNDING_MEMBER = 'founding_member',
  ENTERPRISE = 'enterprise'
}

export enum AuthMethod {
  PASSWORD = 'password',
  GOOGLE = 'google',
  X = 'x',
  META = 'meta',
  GITHUB = 'github',
  DISCORD = 'discord',
  LINKEDIN = 'linkedin',
  PASSKEY = 'passkey',
  BIOMETRIC = 'biometric',
  YUBIKEY = 'yubikey',
  MFA = 'mfa'
}

interface PlanFeatures {
  authMethods: AuthMethod[];
  maxAccounts: number;
  maxPasskeys: number;
  hardwareWallet: boolean;
  advancedMFA: boolean;
  prioritySupport: boolean;
  multiDevice: boolean;
}

export class PlanLevelService {
  private static instance: PlanLevelService;

  // Define features for each plan level
  private readonly planFeatures: Record<PlanLevel, PlanFeatures> = {
    [PlanLevel.EXPLORER_MEMBER]: {
      authMethods: [
        AuthMethod.PASSWORD,
        AuthMethod.GOOGLE,
        AuthMethod.X
      ],
      maxAccounts: 5,
      maxPasskeys: 0,
      hardwareWallet: false,
      advancedMFA: false,
      prioritySupport: false,
      multiDevice: false
    },
    [PlanLevel.YAKKL_PRO]: {
      authMethods: [
        AuthMethod.PASSWORD,
        AuthMethod.GOOGLE,
        AuthMethod.X,
        AuthMethod.META,
        AuthMethod.GITHUB,
        AuthMethod.DISCORD,
        AuthMethod.LINKEDIN,
        AuthMethod.PASSKEY,
        AuthMethod.BIOMETRIC,
        AuthMethod.YUBIKEY,
        AuthMethod.MFA
      ],
      maxAccounts: 20,
      maxPasskeys: 5,
      hardwareWallet: true,
      advancedMFA: true,
      prioritySupport: true,
      multiDevice: true
    },
    [PlanLevel.EARLY_ADOPTER]: {
      // Same as Pro with additional perks
      authMethods: [
        AuthMethod.PASSWORD,
        AuthMethod.GOOGLE,
        AuthMethod.X,
        AuthMethod.META,
        AuthMethod.GITHUB,
        AuthMethod.DISCORD,
        AuthMethod.LINKEDIN,
        AuthMethod.PASSKEY,
        AuthMethod.BIOMETRIC,
        AuthMethod.YUBIKEY,
        AuthMethod.MFA
      ],
      maxAccounts: 25,
      maxPasskeys: 10,
      hardwareWallet: true,
      advancedMFA: true,
      prioritySupport: true,
      multiDevice: true
    },
    [PlanLevel.FOUNDING_MEMBER]: {
      // Same as Pro with additional perks
      authMethods: [
        AuthMethod.PASSWORD,
        AuthMethod.GOOGLE,
        AuthMethod.X,
        AuthMethod.META,
        AuthMethod.GITHUB,
        AuthMethod.DISCORD,
        AuthMethod.LINKEDIN,
        AuthMethod.PASSKEY,
        AuthMethod.BIOMETRIC,
        AuthMethod.YUBIKEY,
        AuthMethod.MFA
      ],
      maxAccounts: 30,
      maxPasskeys: 15,
      hardwareWallet: true,
      advancedMFA: true,
      prioritySupport: true,
      multiDevice: true
    },
    [PlanLevel.ENTERPRISE]: {
      // Everything unlimited
      authMethods: [
        AuthMethod.PASSWORD,
        AuthMethod.GOOGLE,
        AuthMethod.X,
        AuthMethod.META,
        AuthMethod.GITHUB,
        AuthMethod.DISCORD,
        AuthMethod.LINKEDIN,
        AuthMethod.PASSKEY,
        AuthMethod.BIOMETRIC,
        AuthMethod.YUBIKEY,
        AuthMethod.MFA
      ],
      maxAccounts: 100,
      maxPasskeys: 50,
      hardwareWallet: true,
      advancedMFA: true,
      prioritySupport: true,
      multiDevice: true
    }
  };

  private constructor() {}

  static getInstance(): PlanLevelService {
    if (!PlanLevelService.instance) {
      PlanLevelService.instance = new PlanLevelService();
    }
    return PlanLevelService.instance;
  }

  /**
   * Get current user's plan level
   */
  async getCurrentPlanLevel(): Promise<PlanLevel> {
    try {
      const settings = await getYakklSettings();
      const planType = settings?.plan?.type || PlanLevel.EXPLORER_MEMBER;

      // Validate plan type
      if (!Object.values(PlanLevel).includes(planType as PlanLevel)) {
        log.warn(`Invalid plan type: ${planType}, defaulting to EXPLORER_MEMBER`);
        return PlanLevel.EXPLORER_MEMBER;
      }

      return planType as PlanLevel;
    } catch (error) {
      log.error('Failed to get plan level:', false, error);
      return PlanLevel.EXPLORER_MEMBER;
    }
  }

  /**
   * Check if a specific auth method is available for the current plan
   */
  async isAuthMethodAvailable(method: AuthMethod): Promise<boolean> {
    const planLevel = await this.getCurrentPlanLevel();
    const features = this.planFeatures[planLevel];
    return features.authMethods.includes(method);
  }

  /**
   * Get all available auth methods for the current plan
   */
  async getAvailableAuthMethods(): Promise<AuthMethod[]> {
    const planLevel = await this.getCurrentPlanLevel();
    return this.planFeatures[planLevel].authMethods;
  }

  /**
   * Check if current plan is Pro or higher
   */
  async isProOrHigher(): Promise<boolean> {
    const planLevel = await this.getCurrentPlanLevel();
    return planLevel !== PlanLevel.EXPLORER_MEMBER;
  }

  /**
   * Get feature availability
   */
  async getFeatures(): Promise<PlanFeatures> {
    const planLevel = await this.getCurrentPlanLevel();
    return this.planFeatures[planLevel];
  }

  /**
   * Check if a specific feature is available
   */
  async isFeatureAvailable(feature: keyof PlanFeatures): Promise<boolean> {
    const features = await this.getFeatures();
    const value = features[feature];

    // For boolean features
    if (typeof value === 'boolean') {
      return value;
    }

    // For numeric features (check if > 0)
    if (typeof value === 'number') {
      return value > 0;
    }

    // For array features (check if not empty)
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return false;
  }

  /**
   * Get upgrade message for a locked feature
   */
  getUpgradeMessage(method: AuthMethod): string {
    const messages: Record<AuthMethod, string> = {
      [AuthMethod.PASSWORD]: 'Password authentication is available for all users',
      [AuthMethod.GOOGLE]: 'Google login is available for all users',
      [AuthMethod.X]: 'X (Twitter) login is available for all users',
      [AuthMethod.META]: 'Facebook/Instagram login requires YAKKL Pro',
      [AuthMethod.GITHUB]: 'GitHub login requires YAKKL Pro',
      [AuthMethod.DISCORD]: 'Discord login requires YAKKL Pro',
      [AuthMethod.LINKEDIN]: 'LinkedIn login requires YAKKL Pro',
      [AuthMethod.PASSKEY]: 'Passwordless authentication with Passkeys requires YAKKL Pro',
      [AuthMethod.BIOMETRIC]: 'Biometric authentication requires YAKKL Pro',
      [AuthMethod.YUBIKEY]: 'YubiKey hardware security requires YAKKL Pro',
      [AuthMethod.MFA]: 'Advanced Multi-Factor Authentication requires YAKKL Pro'
    };

    return messages[method] || 'This feature requires YAKKL Pro';
  }

  /**
   * Get plan comparison data for upgrade modal
   */
  getPlanComparison() {
    return {
      explorer: {
        name: 'Explorer',
        price: 'Free',
        features: [
          'Up to 5 accounts',
          'Password authentication',
          'Google & X social login',
          'Basic 2FA',
          'Emergency kit backup'
        ]
      },
      pro: {
        name: 'YAKKL Pro',
        price: '$9.99/month',
        features: [
          'Up to 20 accounts',
          'All social logins',
          'Passkey authentication',
          'Biometric unlock',
          'YubiKey support',
          'Hardware wallet integration',
          'Advanced MFA',
          'Priority support',
          'Multi-device sync'
        ]
      },
      enterprise: {
        name: 'Enterprise',
        price: 'Contact us',
        features: [
          'Unlimited accounts',
          'All Pro features',
          'Custom integrations',
          'SLA guarantee',
          'Dedicated support',
          'Team management',
          'Audit logs',
          'Compliance reports'
        ]
      }
    };
  }
}

// Export singleton instance
export const planLevelService = PlanLevelService.getInstance();