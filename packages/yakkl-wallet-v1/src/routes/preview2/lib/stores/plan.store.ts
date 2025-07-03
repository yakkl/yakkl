import { writable, derived } from 'svelte/store';
import type { UserPlan } from '../types';
import { PlanType } from '../types';
import { hasFeature, getFeaturesForPlan, isTrialUser } from '../config/features';
import { getSettings } from '$lib/common/stores';

interface PlanState {
  plan: UserPlan;
  loading: boolean;
}

function createPlanStore() {
  const { subscribe, set, update } = writable<PlanState>({
    plan: {
      type: PlanType.Basic,
      features: getFeaturesForPlan(PlanType.Basic) as string[]
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
        const planType = settings?.plan?.type || PlanType.Basic;
        const trialEndsAt = (settings as any)?.plan?.trialEndsAt as string | undefined;
        
        // Check if user is on trial
        const onTrial = isTrialUser(trialEndsAt);
        const effectivePlan = onTrial ? PlanType.Pro : planType;
        
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
            type: PlanType.Basic,
            features: getFeaturesForPlan(PlanType.Basic) as string[]
          },
          loading: false
        });
      }
    },

    canUseFeature(feature: string): boolean {
      let planState: PlanState = { 
        plan: { type: PlanType.Basic, features: [] }, 
        loading: false 
      };
      
      subscribe(state => { planState = state; })();
      
      return hasFeature(planState.plan.type, feature);
    },

    async upgradeTo(newPlan: PlanType) {
      update(state => ({ ...state, loading: true }));
      
      try {
        // In production, this would make an API call to process the upgrade
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        
        // Update local storage for persistence
        const settings = await getSettings();
        if (settings) {
          const updatedSettings = {
            ...settings,
            plan: {
              ...settings.plan,
              type: newPlan,
              trialEndsAt: null as string | null, // Clear trial when upgrading
              subscriptionId: `sub_${Date.now()}`, // Mock subscription ID
              updatedAt: new Date().toISOString()
            }
          };
          
          // In a real app, you'd save this to secure storage
          localStorage.setItem('yakkl:plan', JSON.stringify({
            type: newPlan,
            subscriptionId: updatedSettings.plan.subscriptionId,
            upgradedAt: updatedSettings.plan.updatedAt
          }));
        }
        
        // Update the store
        update(state => ({
          ...state,
          plan: {
            type: newPlan,
            features: getFeaturesForPlan(newPlan) as string[],
            subscriptionId: `sub_${Date.now()}`,
            trialEndsAt: null
          },
          loading: false
        }));
        
        console.log(`✅ Successfully upgraded to ${newPlan}`);
        
      } catch (error) {
        console.error('Upgrade failed:', error);
        update(state => ({ ...state, loading: false }));
        throw error;
      }
    },

    async downgradeTo(newPlan: PlanType) {
      // Similar to upgrade but for downgrades
      update(state => ({ ...state, loading: true }));
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        update(state => ({
          ...state,
          plan: {
            type: newPlan,
            features: getFeaturesForPlan(newPlan) as string[],
            subscriptionId: null, // Clear subscription for basic plan
            trialEndsAt: null
          },
          loading: false
        }));
        
      } catch (error) {
        console.error('Downgrade failed:', error);
        update(state => ({ ...state, loading: false }));
        throw error;
      }
    },

    async startTrial(trialDays = 14) {
      update(state => ({ ...state, loading: true }));
      
      try {
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
        
        update(state => ({
          ...state,
          plan: {
            type: PlanType.Pro, // Trial gives Pro features
            features: getFeaturesForPlan(PlanType.Pro) as string[],
            trialEndsAt: trialEndsAt.toISOString(),
            subscriptionId: null
          },
          loading: false
        }));
        
        console.log(`✅ Started ${trialDays}-day trial`);
        
      } catch (error) {
        console.error('Failed to start trial:', error);
        update(state => ({ ...state, loading: false }));
        throw error;
      }
    },

    getUpgradeOptions(currentPlan: PlanType) {
      const plans = [PlanType.Basic, PlanType.Pro, PlanType.Enterprise, PlanType.Private];
      const currentIndex = plans.indexOf(currentPlan);
      return plans.slice(currentIndex + 1);
    },

    getPlanStatus() {
      let planState: PlanState = { 
        plan: { type: PlanType.Basic, features: [] }, 
        loading: false 
      };
      
      subscribe(state => { planState = state; })();
      
      const trialActive = isTrialUser(planState.plan.trialEndsAt);
      const hasSubscription = !!planState.plan.subscriptionId;
      
      return {
        current: planState.plan.type,
        onTrial: trialActive,
        hasSubscription,
        canUpgrade: planState.plan.type !== PlanType.Private,
        trialEndsAt: planState.plan.trialEndsAt
      };
    },

    reset() {
      // Reset to default state
      set({
        plan: {
          type: PlanType.Basic,
          features: getFeaturesForPlan(PlanType.Basic) as string[]
        },
        loading: false
      });
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
  $store => $store.plan.type === PlanType.Pro || $store.plan.type === PlanType.Enterprise
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