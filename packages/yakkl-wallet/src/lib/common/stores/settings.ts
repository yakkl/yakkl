import { derived } from 'svelte/store';
import { yakklSettingsStore as settingsStore, getSettings, setSettings } from '$lib/common/stores';
import { AccessSourceType, PlanType } from '$lib/common/types';
import { safeLogout } from '$lib/common/safeNavigate';

// Derived store to check trial status
export const isTrialing = derived(settingsStore, ($s) =>
  $s?.plan.source === AccessSourceType.TRIAL && !!$s.plan.trialEndDate
);

// Derived store for remaining trial time string
export const trialCountdown = derived(settingsStore, ($s) => {
  if (!$s?.plan.trialEndDate || $s.plan.source !== AccessSourceType.TRIAL) return '';
  const now = Date.now();
  const end = new Date($s.plan.trialEndDate).getTime();
  const diff = end - now;

  if (diff <= 0) return '';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return days > 0
    ? `${days} day${days !== 1 ? 's' : ''} left`
    : `${hours}h ${minutes}m remaining`;
});

// Function to check if trial expired and downgrade
export async function checkTrialExpiration(): Promise<void> {
  const s = await getSettings();
  if (
    s?.plan.source === AccessSourceType.TRIAL &&
    s.plan.trialEndDate &&
    new Date(s.plan.trialEndDate).getTime() <= Date.now()
  ) {
    s.plan.type = PlanType.BASIC_MEMBER;
    s.plan.source = AccessSourceType.STANDARD;
    await setSettings(s);
    await safeLogout();
  }
}
