<script lang="ts">
  import { derived, type Readable } from 'svelte/store';
  import { AccessSourceType, PlanType } from '$lib/common/types';
  import { openModal } from '$lib/common/stores/modal';
  import { yakklSettingsStore as settingsStore, setSettingsStorage } from '$lib/common/stores';
  import { normalizeUserPlan } from '$lib/common/utils';
  import SimpleTooltip from './SimpleTooltip.svelte';

  interface Badge {
    label: string;
    color: string;
    tooltip: string;
    upgradeable: boolean;
  }

  const settings = settingsStore;

  const badge: Readable<Badge | null> = derived(settings, ($s, set) => {
    if (!$s) return set(null);

    const trialEndUTC = $s.plan.trialEndDate ? new Date($s.plan.trialEndDate).getTime() : null;
    const nowUTC = Date.now();

    if ($s.plan.source === AccessSourceType.TRIAL && trialEndUTC) {
      const daysLeft = Math.floor((trialEndUTC - nowUTC) / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        return set({
          label: `⏳ YAKKL Pro Level Trial: ${daysLeft} day${daysLeft > 1 ? 's' : ''} left`,
          color: 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100',
          tooltip: 'On the path to greatness!',
          upgradeable: true
        });
      }

      // Trial expired — normalize and update settings
      const normalized = normalizeUserPlan($s);
      void setSettingsStorage(normalized);
      return set(null);
    }

    if ($s.plan.type === PlanType.BASIC_MEMBER) {
      return set({
        label: '⬆️ Basic Member Plan (upgrade)',
        color: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
        tooltip: 'Upgrade to PRO to unlock it all!',
        upgradeable: true
      });
    }

    if ($s.plan.type === PlanType.YAKKL_PRO) {
      return set({
        label: '🪙 YAKKL PRO',
        color: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
        tooltip: 'You are already on your way to the moon with the YAKKL PRO plan!',
        upgradeable: false
      });
    }

    if ($s.plan.type === PlanType.FOUNDING_MEMBER) {
      return set({
        label: '🔑 FOUNDING MEMBER',
        color: 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100',
        tooltip: 'Founding Member - You hold the keys to YAKKL\'s origins and perks.',
        upgradeable: false
      });
    }

    if ($s.plan.type === PlanType.EARLY_ADOPTER) {
      return set({
        label: '🚀 EARLY ADOPTER',
        color: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
        tooltip: 'Early Adopter - You saw the vision early and joined the movement!',
        upgradeable: false
      });
    }

    return set(null);
  });

  function handleClick() {
    const badgeVal = $badge;
    if (badgeVal && badgeVal.upgradeable) {
      openModal('upgrade');
    }
  }
</script>

{#if $badge}
<SimpleTooltip content={$badge.tooltip} position="bottom">
  <button
    class={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold transition hover:opacity-90 ${$badge.color}`}
    on:click={handleClick}
  >
    {$badge.label}
  </button>
</SimpleTooltip>
{/if}
