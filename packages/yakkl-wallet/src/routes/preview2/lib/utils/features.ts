/**
 * Feature access control for preview2
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
      [PlanType.Pro]: 1,
      [PlanType.Enterprise]: 2,
      [PlanType.Private]: 3
    };

    const currentLevel = planHierarchy[this.currentPlan];
    const requiredLevel = planHierarchy[requiredPlan];
    
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
      case PlanType.Pro:
        return PLAN_FEATURES.PRO;
      case PlanType.Enterprise:
        return PLAN_FEATURES.ENTERPRISE;
      case PlanType.Private:
        return PLAN_FEATURES.PRIVATE;
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

// Export class for testing
export { FeatureManager };