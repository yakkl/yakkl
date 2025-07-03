<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import { setSettingsStorage, syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { setIconUnlock } from '$lib/utilities/utilities';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, Settings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PATH_WELCOME, PlanType } from '$lib/common';
  import { setLocks } from '$lib/common/locks';
  import Welcome from '$lib/components/Welcome.svelte';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { protectedContexts } from '$lib/common/globals';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let planType = $state(PlanType.BASIC_MEMBER);
  let yakklSettings: Settings | null = $state(null);

  // Format plan type for display (remove underscores and capitalize)
  function formatPlanType(plan: string): string {
    if (!plan) return '';
    return plan
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  onMount(async () => {
    yakklSettings = await getNormalizedSettings();
    await setSettingsStorage(yakklSettings);
    planType = yakklSettings?.plan.type ?? PlanType.BASIC_MEMBER;
  });

  // Handle successful login
  async function onSuccess(profile: Profile, digest: string, isMinimal: boolean) {
    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.userName || '';

      // Full wallet initialization
      setIconUnlock();

      // KEY: Sync all storage to stores - this loads all persistent data
      await syncStorageToStore();

      // Unlock the wallet using setLocks function - this updates both storage and stores
      await setLocks(false, yakklSettings?.plan.type || PlanType.BASIC_MEMBER);

      // Start activity tracking
      const contextType = 'popup-wallet';
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      }

      // Small delay to ensure all stores are synchronized before redirect
      await new Promise(resolve => setTimeout(resolve, 200));

      log.info('V2: All stores synchronized after login');

      // Mark session as authenticated
      sessionStorage.setItem('wallet-authenticated', 'true');

      // Navigate to dashboard
      safeNavigate('/', 0, { replaceState: true, invalidateAll: true });
    } catch (e: any) {
      log.error('Error during post-login initialization', false, e);
      errorValue = e;
      showError = true;
    }
  }

  // Handle login errors
  function onError(value: string) {
    errorValue = value;
    showError = true;
  }

  // Handle login cancel
  function onCancel() {
    safeLogout();
  }

  // Handle close
  function onClose() {
    showError = false;
    errorValue = '';
  }
</script>

<ErrorNoAction bind:show={showError} title="ERROR!" value={errorValue} {onClose} />

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="max-w-sm w-full">
    <div class="yakkl-card text-center p-6">
      <!-- Logo -->
      <div class="mb-6">
        <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-20 h-20 mx-auto" />
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mt-4">YAKKL Wallet</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Preview 2.0</p>
      </div>

      <!-- Login Form -->
      <Login
        {onSuccess}
        {onError}
        {onCancel}
        loginButtonText="Unlock Wallet"
        cancelButtonText="Exit"
        inputTextClass="text-zinc-900 dark:text-white"
        inputBgClass="bg-white dark:bg-zinc-800"
      />

      <!-- Plan Info -->
      <div class="mt-8 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900 dark:to-purple-900 rounded-xl">
        {#if planType.toLowerCase() === PlanType.YAKKL_PRO.toLowerCase()}
          <h3 class="font-semibold text-indigo-900 dark:text-indigo-100">{formatPlanType(PlanType.YAKKL_PRO)}</h3>
          <p class="text-sm text-indigo-700 dark:text-indigo-200 mt-1">
            Access to all premium features and advanced tools
          </p>
        {:else if planType.toLowerCase() === PlanType.FOUNDING_MEMBER.toLowerCase()}
          <h3 class="font-semibold text-purple-900 dark:text-purple-100">{formatPlanType(PlanType.FOUNDING_MEMBER)}</h3>
          <p class="text-sm text-purple-700 dark:text-purple-200 mt-1">
            Exclusive access to all features and early releases
          </p>
        {:else if planType.toLowerCase() === PlanType.EARLY_ADOPTER.toLowerCase()}
          <h3 class="font-semibold text-blue-900 dark:text-blue-100">{formatPlanType(PlanType.EARLY_ADOPTER)}</h3>
          <p class="text-sm text-blue-700 dark:text-blue-200 mt-1">
            Enhanced features and priority support
          </p>
        {:else}
          <h3 class="font-semibold text-zinc-900 dark:text-zinc-100">{formatPlanType(planType)}</h3>
          <p class="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
            Core wallet features with option to upgrade
          </p>
        {/if}
      </div>

    </div>
  </div>
</div>
