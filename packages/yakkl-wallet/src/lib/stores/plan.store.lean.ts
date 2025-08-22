/**
 * Lean plan store for v2
 * Uses new constants and feature manager
 */

import { writable, derived } from 'svelte/store';
import { PlanType } from '$lib/common/types';
import { featureManager, canUseFeature as checkFeature } from '../utils/features';
import { getYakklSettings } from '$lib/common/stores';
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
    plan: { type: PlanType.EXPLORER_MEMBER },
    loading: false
  });

  return {
    subscribe,

    async loadPlan() {
      update(state => ({ ...state, loading: true }));

      try {
        // TODO: Update to Pro Plus if needed

        // TODO: ProfileData for real Plan Type

        const settings = await getYakklSettings();
        // Convert old plan types to new ones
        const planType = settings?.plan?.type;

        const trialEndDate = settings?.plan?.trialEndDate;

        // Check if user is on trial (Pro features during trial)
        const onTrial = trialEndDate && new Date(trialEndDate) > new Date();
        const effectivePlan = onTrial ? PlanType.YAKKL_PRO : planType; // TODO: Update to Pro Plus if needed

        // Update feature manager
        featureManager.setPlan(planType);

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
        featureManager.setPlan(PlanType.EXPLORER_MEMBER);
        set({
          plan: { type: PlanType.EXPLORER_MEMBER },
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
      featureManager.setPlan(PlanType.EXPLORER_MEMBER);
      set({
        plan: { type: PlanType.EXPLORER_MEMBER },
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
  $store => featureManager.hasAccess(PlanType.YAKKL_PRO) || featureManager.hasAccess(PlanType.YAKKL_PRO_PLUS) || featureManager.hasAccess(PlanType.FOUNDING_MEMBER) || featureManager.hasAccess(PlanType.EARLY_ADOPTER)
);

export const isOnTrial = derived(
  planStore,
  $store => {
    const trialEndDate = $store.plan.trialEndDate;
    return trialEndDate && new Date(trialEndDate) > new Date();
  }
);

// Export feature checking function
export const canUseFeature = (feature: string): boolean => {
  return checkFeature(feature);
};
