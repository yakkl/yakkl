<script lang="ts">
  import { onMount } from 'svelte';
  import { getSettings, setSettings } from '$lib/common/stores';
  import { AccessSourceType } from '$lib/common/types';
  import { openModal } from '$lib/common/stores/modal';

  let remaining = '';
  let visible = true;
  let pinned = false;

  async function updateCountdown() {
    const settings = await getSettings();
    if (!settings || settings.plan.source !== AccessSourceType.TRIAL || !settings.plan.trialEndDate) {
      visible = false;
      return;
    }

    pinned = settings.trialCountdownPinned ?? false;

    const end = new Date(settings.plan.trialEndDate).getTime();

    const update = () => {
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        visible = false;
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      remaining = `${hours}h ${minutes}m ${seconds}s`;

      if (!pinned) {
        setTimeout(() => (visible = false), 30000);
      }
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }

  function handleUpgrade() {
    openModal('upgrade');
  }

  async function togglePin() {
    pinned = !pinned;
    const store = await getSettings();
    const updated = { ...store, trialCountdownPinned: pinned };
    // Persist back
    setSettings(updated);

    if (!pinned) {
      setTimeout(() => (visible = false), 30000);
    } else {
      visible = true;
    }
  }

  onMount(async () => {
    await updateCountdown();
  });
</script>

{#if visible}
  <div class="fixed bottom-0 left-0 right-0 z-50 bg-yellow-300 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-4 py-2 text-center text-sm font-medium flex items-center justify-between shadow-lg">
    <div class="flex items-center space-x-2">
      <span class="font-bold">⏳ Trial ends in:</span>
      <span>{remaining}</span>
    </div>
    <div class="flex items-center space-x-3">
      <button on:click={handleUpgrade} class="text-xs font-semibold underline hover:text-yellow-700 dark:hover:text-yellow-300">
        Upgrade
      </button>
      <button on:click={togglePin} title="Pin or unpin this banner" class="text-xs opacity-60 hover:opacity-100">
        📌
      </button>
    </div>
  </div>
{/if}
