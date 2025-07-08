/**
 * Feature access control for v2
 * Clean, efficient implementation with minimal dependencies
 */

import { PlanType } from '../types';
import { PLAN_FEATURES, type FeatureKey } from '../config/features';
import { log } from './logger';

class FeatureManager {
  private currentPlan: PlanType = PlanType.Basic;
  private enabledFeatures: Set<string> = new Set();

  constructor() {
    this.updateFeatures();
  }

  /**
   * Set the current user's plan
   */
  setPlan(plan: PlanType) {
    if (this.currentPlan !== plan) {
      this.currentPlan = plan;
      this.updateFeatures();
      log.debug(`Plan updated to: ${plan}`);
    }
  }

  /**
   * Check if a feature is available for current plan
   */
  canUse(feature: string): boolean {
    return this.enabledFeatures.has(feature);
  }

  /**
   * Get all enabled features for current plan
   */
  getEnabledFeatures(): string[] {
    return Array.from(this.enabledFeatures);
  }

  /**
   * Get current plan
   */
  getCurrentPlan(): PlanType {
    return this.currentPlan;
  }

  /**
   * Check if user has access to a specific plan level
   */
  hasAccess(requiredPlan: PlanType): boolean {
    const planHierarchy = {
      [PlanType.Basic]: 0,
      [PlanType.Pro]: 2,
      [PlanType.EarlyAdopter]: 2.5, // Higher than Pro, lower than Founding
      [PlanType.FoundingMember]: 3, // Highest prestige Pro-level
      [PlanType.Enterprise]: 4
    };

    const currentLevel = planHierarchy[this.currentPlan] ?? 0;
    const requiredLevel = planHierarchy[requiredPlan] ?? 0;
    
    return currentLevel >= requiredLevel;
  }

  private updateFeatures() {
    this.enabledFeatures.clear();
    
    // Get features for current plan
    const planFeatures = this.getPlanFeatures(this.currentPlan);
    planFeatures.forEach(feature => this.enabledFeatures.add(feature));
  }

  private getPlanFeatures(plan: PlanType): readonly string[] {
    switch (plan) {
      case PlanType.Basic:
        return PLAN_FEATURES.BASIC;
      case PlanType.FoundingMember:
        return PLAN_FEATURES.PRO; // Founding members get Pro features
      case PlanType.EarlyAdopter:
        return PLAN_FEATURES.PRO; // Early adopters get Pro features
      case PlanType.Pro:
        return PLAN_FEATURES.PRO;
      case PlanType.Enterprise:
        return PLAN_FEATURES.ENTERPRISE;
      default:
        log.warn(`Unknown plan type: ${plan}, defaulting to Basic`);
        return PLAN_FEATURES.BASIC;
    }
  }
}

// Export singleton instance
export const featureManager = new FeatureManager();

// Export convenience functions
export const canUseFeature = (feature: string): boolean => 
  featureManager.canUse(feature);

export const hasAccessToPlan = (plan: PlanType): boolean => 
  featureManager.hasAccess(plan);

export const setUserPlan = (plan: PlanType): void => 
  featureManager.setPlan(plan);

export const getCurrentPlan = (): PlanType => 
  featureManager.getCurrentPlan();

// Plan display helpers
export const getPlanBadgeText = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  switch (currentPlan) {
    case PlanType.FoundingMember:
      return 'FOUNDING / PRO';
    case PlanType.EarlyAdopter:
      return 'EARLY / PRO';
    case PlanType.Pro:
      return 'PRO';
    case PlanType.Enterprise:
      return 'ENTERPRISE';
    case PlanType.Basic:
    default:
      return 'BASIC';
  }
};

export const getPlanBadgeColor = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  switch (currentPlan) {
    case PlanType.FoundingMember:
      return 'oklch(71.97% 0.149 81.37 / 1)'; // Gold/yellow as specified
    case PlanType.EarlyAdopter:
      return 'oklch(71.97% 0.149 142.5 / 1)'; // Green with similar characteristics
    case PlanType.Pro:
      return 'oklch(71.97% 0.149 192.5 / 1)'; // Teal with similar characteristics
    case PlanType.Enterprise:
      return 'oklch(71.97% 0.149 266.5 / 1)'; // Purple with similar characteristics
    case PlanType.Basic:
    default:
      return 'oklch(71.97% 0.149 27.5 / 1)'; // Brown with similar characteristics
  }
};

export const getPlanGradientClass = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  switch (currentPlan) {
    case PlanType.FoundingMember:
      return 'from-yellow-500 to-amber-600';
    case PlanType.EarlyAdopter:
      return 'from-green-500 to-emerald-600';
    case PlanType.Pro:
      return 'from-teal-500 to-cyan-600';
    case PlanType.Enterprise:
      return 'from-purple-500 to-indigo-600';
    case PlanType.Basic:
    default:
      return 'from-stone-500 to-amber-700';
  }
};

// Export class for testing
export { FeatureManager };
