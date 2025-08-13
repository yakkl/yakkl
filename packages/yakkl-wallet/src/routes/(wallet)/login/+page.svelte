<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import { syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { safeLogout } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, YakklSettings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PlanType } from '$lib/common';
  import { setLocks } from '$lib/common/locks';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { protectedContexts } from '$lib/common/globals';
  import { goto } from '$app/navigation';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let planType = $state(PlanType.EXPLORER_MEMBER);
  let yakklSettings: YakklSettings | null = $state(null);
  let isInitializing = $state(false);
  let initError = $state<string | null>(null);

  // Format plan type for display
  function formatPlanType(plan: string): string {
    if (!plan) return '';
    return plan
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  onMount(async () => {
    console.log('[Login] Starting login page initialization...');

    // Show login form IMMEDIATELY - no spinner, no delay
    isInitializing = false;
    planType = PlanType.EXPLORER_MEMBER;

    // Load settings in background (non-blocking)
    getNormalizedSettings().then(settings => {
      if (settings) {
        yakklSettings = settings;
        planType = settings?.plan?.type ?? PlanType.EXPLORER_MEMBER;

        // Check legal agreement (but don't block login form)
        if (!settings.init || !settings.legal?.termsAgreed) {
          console.log('[Login] User needs to complete legal agreement');
        }
      }
    }).catch(error => {
      console.log('[Login] Settings load failed (non-critical):', error);
    });
  });

  // Handle successful login - FAST PATH
  async function onSuccess(profile: Profile, digest: string, isMinimal: boolean, jwtToken?: string) {
    log.debug('[LOGIN onSuccess] FAST PATH:', false, {
      profile: profile.username,
      hasDigest: !!digest
    });

    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.username || '';

      // Mark as authenticated for instant navigation
      sessionStorage.setItem('wallet-authenticated', 'true');
      sessionStorage.setItem('wallet-username', profile.username || '');
      sessionStorage.setItem('wallet-digest', digest); // Store digest for home page

      // Navigate IMMEDIATELY - no waiting
      await goto('/home');

      // Minimal background work only
      setTimeout(async () => {
        try {
          // Just unlock - skip heavy operations
          await setLocks(false, PlanType.EXPLORER_MEMBER);
        } catch (e) {
          console.log('Background unlock error:', e);
        }
      }, 10);

      log.info('[LOGIN onSuccess] User logged in successfully');
    } catch (error) {
      log.error('[LOGIN onSuccess] Error during login:', false, error);
      showError = true;
      errorValue = error instanceof Error ? error.message : 'Login failed';
    }
  }

  // Handle login errors
  function onError(error: any) {
    log.error('[LOGIN onError] Login error:', false, error);
    showError = true;
    errorValue = error instanceof Error ? error.message : String(error);
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

        <!-- Login form - shown immediately -->
        <Login
          {onSuccess}
          {onError}
          {onCancel}
          loginButtonText="Unlock"
          cancelButtonText="Exit/Logout"
          minimumAuth={false}
          useAuthStore={false}
          generateJWT={false}
          inputTextClass="text-zinc-900 dark:text-white"
          inputBgClass="bg-white dark:bg-zinc-800"
        />

      <!-- Plan type display -->
      {#if planType && !isInitializing}
        <div class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <p class="text-xs text-zinc-500 dark:text-zinc-400">
            Plan: {formatPlanType(planType)}
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* .yakkl-card {
    @apply bg-white dark:bg-zinc-800 rounded-lg shadow-lg;
  } */
</style>
