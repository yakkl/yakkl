import { writable, derived } from 'svelte/store';
import type { UserPlan } from '../types';
import { PlanType, hasFeature, getFeaturesForPlan, isTrialUser } from '../config/features';
import { getSettings } from '$lib/common/stores';

interface PlanState {
  plan: UserPlan;
  loading: boolean;
}

function createPlanStore() {
  const { subscribe, set, update } = writable<PlanState>({
    plan: {
      type: PlanType.BASIC,
      features: getFeaturesForPlan(PlanType.BASIC) as string[]
    },
    loading: false
  });

  return {
    subscribe,
    
    async loadPlan() {
      update(state => ({ ...state, loading: true }));
      
      try {
        // Get plan from settings
        const settings = await getSettings();
        const planType = settings?.plan?.type || PlanType.BASIC;
        const trialEndsAt = (settings as any)?.plan?.trialEndsAt;
        
        // Check if user is on trial
        const onTrial = isTrialUser(trialEndsAt);
        const effectivePlan = onTrial ? PlanType.PRO : planType;
        
        set({
          plan: {
            type: effectivePlan as PlanType,
            trialEndsAt: trialEndsAt,
            subscriptionId: (settings as any)?.plan?.subscriptionId,
            features: getFeaturesForPlan(effectivePlan as PlanType) as string[]
          },
          loading: false
        });
      } catch (error) {
        // Default to basic plan on error
        set({
          plan: {
            type: PlanType.BASIC,
            features: getFeaturesForPlan(PlanType.BASIC) as string[]
          },
          loading: false
        });
      }
    },

    canUseFeature(feature: string): boolean {
      let planState: PlanState = { 
        plan: { type: PlanType.BASIC, features: [] }, 
        loading: false 
      };
      
      subscribe(state => { planState = state; })();
      
      return hasFeature(planState.plan.type, feature);
    },

    async upgradePlan(newPlan: PlanType) {
      // This would typically make an API call to upgrade the plan
      update(state => ({
        ...state,
        plan: {
          ...state.plan,
          type: newPlan,
          features: getFeaturesForPlan(newPlan) as string[]
        }
      }));
    }
  };
}

export const planStore = createPlanStore();

// Derived stores for common checks
export const currentPlan = derived(
  planStore,
  $store => $store.plan.type
);

export const isProUser = derived(
  planStore,
  $store => $store.plan.type === PlanType.PRO || $store.plan.type === PlanType.ENTERPRISE
);

export const isOnTrial = derived(
  planStore,
  $store => isTrialUser($store.plan.trialEndsAt)
);

export const availableFeatures = derived(
  planStore,
  $store => $store.plan.features
);

// Helper to check features in components
export function canUseFeature(feature: string): boolean {
  return planStore.canUseFeature(feature);
}