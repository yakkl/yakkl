/**
 * Feature access control for v2
 * Clean, efficient implementation with minimal dependencies
 */

import { PlanType } from '../common';
import { PLAN_FEATURES, type FeatureKey } from '../config/features';
import { log } from './logger';

class FeatureManager {
  private currentPlan: PlanType = PlanType.EXPLORER_MEMBER;
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
      [PlanType.EXPLORER_MEMBER]: 0,
      [PlanType.YAKKL_PRO]: 2,
      [PlanType.EARLY_ADOPTER]: 2.5, // Higher than Pro, lower than Founding
      [PlanType.FOUNDING_MEMBER]: 3, // Highest prestige Pro-level
      [PlanType.ENTERPRISE]: 4
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
      case PlanType.EXPLORER_MEMBER:
        return PLAN_FEATURES.BASIC;
      case PlanType.FOUNDING_MEMBER:
      case PlanType.EARLY_ADOPTER:
      case PlanType.YAKKL_PRO:
        return PLAN_FEATURES.PRO;
      case PlanType.ENTERPRISE:
        return PLAN_FEATURES.ENTERPRISE;
      default:
        log.warn(`Unknown plan type: ${plan}, defaulting to Explorer`);
        return PLAN_FEATURES.BASIC;
    }
  }
}

// Export singleton instance
export const featureManager = new FeatureManager();

// Export convenience functions  
export const canUseFeature = (feature: string): boolean => {
  // Initialize subscription if needed
  initializeSubscription();
  return featureManager.canUse(feature);
};

export const hasAccessToPlan = (plan: PlanType): boolean =>
  featureManager.hasAccess(plan);

export const setUserPlan = (plan: PlanType): void =>
  featureManager.setPlan(plan);

export const getCurrentPlan = (): PlanType => {
  // Initialize subscription if needed
  initializeSubscription();
  return featureManager.getCurrentPlan();
};

// Plan display helpers
export const getPlanBadgeText = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  console.log('currentPlan 2', currentPlan);
  switch (currentPlan) {
    case PlanType.FOUNDING_MEMBER:
      return 'FOUNDING / PRO';
    case PlanType.EARLY_ADOPTER:
      return 'EARLY / PRO';
    case PlanType.YAKKL_PRO:
      return 'PRO';
    case PlanType.ENTERPRISE:
      return 'ENTERPRISE';
    case PlanType.EXPLORER_MEMBER:
    default:
      return 'EXPLORER';
  }
};

export const getPlanBadgeColor = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  console.log('currentPlan', currentPlan);
  switch (currentPlan) {
    case PlanType.FOUNDING_MEMBER:
      return 'oklch(71.97% 0.149 81.37 / 1)'; // Gold/yellow as specified
    case PlanType.EARLY_ADOPTER:
      return 'oklch(71.97% 0.149 142.5 / 1)'; // Green with similar characteristics
    case PlanType.YAKKL_PRO:
      return 'oklch(71.97% 0.149 192.5 / 1)'; // Teal with similar characteristics
    case PlanType.ENTERPRISE:
      return 'oklch(71.97% 0.149 266.5 / 1)'; // Purple with similar characteristics
    case PlanType.EXPLORER_MEMBER:
    default:
      return 'oklch(71.97% 0.149 27.5 / 1)'; // Brown with similar characteristics
  }
};

export const getPlanGradientClass = (plan?: PlanType): string => {
  const currentPlan = plan || featureManager.getCurrentPlan();
  switch (currentPlan) {
    case PlanType.FOUNDING_MEMBER:
      return 'from-yellow-500 to-amber-600';
    case PlanType.EARLY_ADOPTER:
      return 'from-green-500 to-emerald-600';
    case PlanType.YAKKL_PRO:
      return 'from-teal-500 to-cyan-600';
    case PlanType.ENTERPRISE:
      return 'from-purple-500 to-indigo-600';
    case PlanType.EXPLORER_MEMBER:
    default:
      return 'from-stone-500 to-amber-700';
  }
};

// Lazy initialization to avoid circular dependency
let subscriptionInitialized = false;
function initializeSubscription() {
  if (!subscriptionInitialized && typeof window !== 'undefined') {
    subscriptionInitialized = true;
    // Lazy import to avoid circular dependency
    import('../stores/plan.store').then(({ planStore }) => {
      planStore.subscribe((plan) => {
        if (plan?.plan?.type) {
          featureManager.setPlan(plan.plan.type);
        }
      });
    });
  }
}

// Initialize on first use
if (typeof window !== 'undefined') {
  // Delay initialization to next tick to avoid circular dependency
  setTimeout(() => initializeSubscription(), 0);
}

// Export class for testing
export { FeatureManager };
