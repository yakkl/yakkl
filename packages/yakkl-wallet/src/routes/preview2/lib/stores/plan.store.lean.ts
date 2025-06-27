/**
 * Lean plan store for preview2
 * Uses new constants and feature manager
 */

import { writable, derived } from 'svelte/store';
import { PlanType } from '../types';
import { featureManager, canUseFeature as checkFeature } from '../utils/features';
import { getSettings } from '$lib/common/stores';
import { log } from '../utils/logger';

interface UserPlan {
  type: PlanType;
  trialEndDate?: string;
}

interface PlanState {
  plan: UserPlan;
  loading: boolean;
}

function createPlanStore() {
  const { subscribe, set, update } = writable<PlanState>({
    plan: { type: PlanType.Basic },
    loading: false
  });

  return {
    subscribe,
    
    async loadPlan() {
      update(state => ({ ...state, loading: true }));
      
      try {
        const settings = await getSettings();
        // Convert old plan types to new ones
        const oldPlanType = settings?.plan?.type;
        let planType: PlanType;
        
        // Map old plan types to new ones
        if (oldPlanType === 'yakkl_pro' || oldPlanType === 'founding_member' || oldPlanType === 'early_adopter') {
          planType = PlanType.Pro;
        } else if (oldPlanType === 'enterprise' || oldPlanType === 'institution' || oldPlanType === 'business') {
          planType = PlanType.Enterprise;
        } else {
          planType = PlanType.Basic;
        }
        
        const trialEndDate = settings?.plan?.trialEndDate;
        
        // Check if user is on trial (Pro features during trial)
        const onTrial = trialEndDate && new Date(trialEndDate) > new Date();
        const effectivePlan = onTrial ? PlanType.Pro : planType;
        
        // Update feature manager
        featureManager.setPlan(effectivePlan);
        
        set({
          plan: {
            type: effectivePlan,
            trialEndDate
          },
          loading: false
        });
        
        log.debug(`Plan loaded: ${effectivePlan}`, { onTrial, trialEndDate });
      } catch (error) {
        log.error('Failed to load plan:', error);
        
        // Default to basic plan
        featureManager.setPlan(PlanType.Basic);
        set({
          plan: { type: PlanType.Basic },
          loading: false
        });
      }
    },

    async upgradePlan(newPlan: PlanType) {
      log.info(`Upgrading plan to: ${newPlan}`);
      
      // Update feature manager
      featureManager.setPlan(newPlan);
      
      update(state => ({
        ...state,
        plan: { ...state.plan, type: newPlan }
      }));
    },

    reset() {
      featureManager.setPlan(PlanType.Basic);
      set({
        plan: { type: PlanType.Basic },
        loading: false
      });
    }
  };
}

export const planStore = createPlanStore();

// Derived stores
export const currentPlan = derived(
  planStore,
  $store => $store.plan.type
);

export const isProUser = derived(
  planStore,
  $store => featureManager.hasAccess(PlanType.Pro)
);

export const isOnTrial = derived(
  planStore,
  $store => {
    const { trialEndDate } = $store.plan;
    return trialEndDate && new Date(trialEndDate) > new Date();
  }
);

// Export feature checking function
export const canUseFeature = (feature: string): boolean => {
  return checkFeature(feature);
};