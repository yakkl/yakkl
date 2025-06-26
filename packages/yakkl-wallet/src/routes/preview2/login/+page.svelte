<script lang="ts">
  import Login from '../lib/components/Login.svelte';
  import { setSettingsStorage, syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { setIconUnlock } from '$lib/utilities/utilities';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, Settings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PATH_WELCOME, PlanType } from '$lib/common';
  import Welcome from '$lib/components/Welcome.svelte';
  import Copyright from '../lib/components/Copyright.svelte';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { protectedContexts } from '$lib/common/globals';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let planType = $state(PlanType.BASIC_MEMBER);
  let yakklSettings: Settings | null = $state(null);

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
      syncStorageToStore();

      // Explicitly unlock the wallet in settings
      if (yakklSettings) {
        yakklSettings.isLocked = false;
        await setSettingsStorage(yakklSettings);
      }

      // Start activity tracking
      const contextType = 'popup-wallet';
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      }

      // Small delay to ensure settings are saved before redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to preview2 dashboard
      safeNavigate('/preview2', 0, { replaceState: true, invalidateAll: true });
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

<div class="max-w-md w-full mx-4">
    <div class="yakkl-card text-center p-8">
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
          <h3 class="font-semibold text-indigo-900 dark:text-indigo-100">PRO Member</h3>
          <p class="text-sm text-indigo-700 dark:text-indigo-200 mt-1">
            Access to all premium features and advanced tools
          </p>
        {:else if planType.toLowerCase() === PlanType.FOUNDING_MEMBER.toLowerCase()}
          <h3 class="font-semibold text-purple-900 dark:text-purple-100">Founding Member</h3>
          <p class="text-sm text-purple-700 dark:text-purple-200 mt-1">
            Exclusive access to all features and early releases
          </p>
        {:else if planType.toLowerCase() === PlanType.EARLY_ADOPTER.toLowerCase()}
          <h3 class="font-semibold text-blue-900 dark:text-blue-100">Early Adopter</h3>
          <p class="text-sm text-blue-700 dark:text-blue-200 mt-1">
            Enhanced features and priority support
          </p>
        {:else}
          <h3 class="font-semibold text-zinc-900 dark:text-zinc-100">Basic Member</h3>
          <p class="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
            Core wallet features with option to upgrade
          </p>
        {/if}
      </div>

      <!-- Footer -->
      <div class="mt-6">
        <Copyright {planType} />
      </div>
    </div>
</div>
