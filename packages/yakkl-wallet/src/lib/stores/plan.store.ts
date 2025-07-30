import { writable, derived } from 'svelte/store';
import type { UserPlan } from '../types';
import { PlanType } from '../common';
import { hasFeature, getFeaturesForPlan, isTrialUser } from '../config/features';
import { getMiscStore, getProfile, getSettings, setProfileStorage, setSettingsStorage } from '$lib/common/stores';
import { setUserPlan } from '../utils/features';
import { decryptData, encryptData, isEncryptedData, type ProfileData } from '$lib/common';
import { log } from '$lib/common/logger-wrapper';

interface PlanState {
  plan: UserPlan;
  loading: boolean;
}

function createPlanStore() {
  const { subscribe, set, update } = writable<PlanState>({
    plan: {
      type: PlanType.EXPLORER_MEMBER,
      features: getFeaturesForPlan(PlanType.EXPLORER_MEMBER) as string[]
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
        const planType = settings?.plan?.type || PlanType.EXPLORER_MEMBER;
        const trialEndsAt = (settings as any)?.plan?.trialEndsAt as string | undefined;

        // Check if user is on trial
        const onTrial = isTrialUser(trialEndsAt);
        const effectivePlan = onTrial ? PlanType.YAKKL_PRO : planType;

        // Update the feature manager with the current plan
        setUserPlan(effectivePlan as PlanType);

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
            type: PlanType.EXPLORER_MEMBER,
            features: getFeaturesForPlan(PlanType.EXPLORER_MEMBER) as string[]
          },
          loading: false
        });
      }
    },

    canUseFeature(feature: string): boolean {
      let planState: PlanState = {
        plan: { type: PlanType.EXPLORER_MEMBER, features: [] },
        loading: false
      };

      subscribe(state => { planState = state; })();

      return hasFeature(planState.plan.type, feature);
    },

    async upgradeTo(newPlan: PlanType) {
      try {
        if (!newPlan) throw new Error('No plan type provided');

	  		update((state) => ({ ...state, loading: true }));




        // In production, this would make an API call to process the upgrade
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call



        const profile = await getProfile();
        if (profile) {
          let profileData: ProfileData;
          if (isEncryptedData(profile.data)) {
            const miscStore = getMiscStore();
            profileData = await decryptData(profile.data, miscStore) as ProfileData;
            if (profileData) {
              profileData.planType = newPlan as PlanType;

              const encryptedProfileData = await encryptData(profileData, miscStore);
              if (encryptedProfileData) {
                profile.data = encryptedProfileData;
                await setProfileStorage(profile);
              } else {
                throw new Error('Failed to encrypt profile data');
              }
            } else {
              throw new Error('Profile data is not valid');
            }
          } else {
            throw new Error('Profile data is not encrypted');
          }
        }

        // Update local storage for persistence
        const settings = await getSettings();
        if (settings) {
          settings.plan.type = newPlan as PlanType;
          settings.plan.trialEndDate = null as string | null; // Clear trial when upgrading
          settings.plan.upgradeDate = new Date().toISOString();
          await setSettingsStorage(settings);
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

        log.info(`✅ Successfully upgraded to ${newPlan}`);

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
            type: PlanType.YAKKL_PRO, // Trial gives Pro features
            features: getFeaturesForPlan(PlanType.YAKKL_PRO) as string[],
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
      const plans = [PlanType.EXPLORER_MEMBER, PlanType.YAKKL_PRO, PlanType.ENTERPRISE];
      const currentIndex = plans.indexOf(currentPlan);
      return plans.slice(currentIndex + 1);
    },

    getPlanStatus() {
      let planState: PlanState = {
        plan: { type: PlanType.EXPLORER_MEMBER, features: [] },
        loading: false
      };

      subscribe(state => { planState = state; })();

      const trialActive = isTrialUser(planState.plan.trialEndsAt);
      const hasSubscription = !!planState.plan.subscriptionId;

      return {
        current: planState.plan.type,
        onTrial: trialActive,
        hasSubscription,
        canUpgrade: planState.plan.type !== PlanType.ENTERPRISE,
        trialEndsAt: planState.plan.trialEndsAt
      };
    },

    reset() {
      // Reset to default state
      set({
        plan: {
            type: PlanType.EXPLORER_MEMBER,
          features: getFeaturesForPlan(PlanType.EXPLORER_MEMBER) as string[]
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
  $store => $store.plan.type === PlanType.YAKKL_PRO || $store.plan.type === PlanType.ENTERPRISE
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
