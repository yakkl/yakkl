<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import { syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { safeLogout } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, Settings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PlanType } from '$lib/common';
  import { setLocks } from '$lib/common/locks';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { protectedContexts } from '$lib/common/globals';
	import { goto } from '$app/navigation';
	import { initNetworkSpeedMonitoring } from '$lib/common/networkSpeed';
	import { loadCacheManagers } from '$lib/common/cacheManagers';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let planType = $state(PlanType.EXPLORER_MEMBER);
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
    // Handle null settings - user might be on first launch
    if (!yakklSettings || !yakklSettings.init || !yakklSettings.legal?.termsAgreed) {
      console.warn('[Login] No settings found, redirecting to legal page for initial setup');
      // Redirect to legal page which starts the registration flow
      await goto('/legal');
      return;
    }

    planType = yakklSettings?.plan?.type ?? PlanType.EXPLORER_MEMBER;
  });

  // Handle successful login
  async function onSuccess(profile: Profile, digest: string, isMinimal: boolean) {
    log.debug('[LOGIN onSuccess] Called with:', false, {
      profile,
      hasDigest: !!digest,
      digestLength: digest?.length,
      isMinimal
    });

    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.username || '';

      // KEY: Sync all storage to stores - this loads all persistent data
      await syncStorageToStore();
		  // Load cache managers very early to ensure cached data is available
		  await loadCacheManagers();

      // Unlock the wallet using setLocks function - this updates both storage and stores
      await setLocks(false, yakklSettings?.plan?.type || PlanType.EXPLORER_MEMBER);

      // Start activity tracking
      const contextType = 'popup-wallet';
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      }

      // Initialize network speed monitoring for dynamic timeouts
      try {
        initNetworkSpeedMonitoring();
      } catch (error) {
        console.log('Network speed monitoring initialization failed', error);
      }

      // Mark session as authenticated - only for session tracking but not used for real authentication
      sessionStorage.setItem('wallet-authenticated', 'true');
      // Small delay to ensure all async operations complete
      await new Promise(resolve => setTimeout(resolve, 300));

      try {
        console.log('[LOGIN] Navigating to home page...');
        await goto('/home', { replaceState: true });
        console.log('[LOGIN] Navigation successful');
      } catch (error) {
        console.error('[LOGIN] Navigation failed:', error);
        // Fallback to login page on navigation error
        errorValue = 'Failed to navigate to home page';
        showError = true;
      }

    } catch (e: any) {
      console.error('Error during post-login initialization', e);
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
    // In extension popup context, close the window instead of navigating
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    } else {
      // Fallback to logout for other contexts
      safeLogout();
    }
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
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mt-4">YAKKL Smart Wallet</h1>
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
