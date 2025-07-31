<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import { setSettingsStorage, syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { setIconUnlock } from '$lib/utilities/utilities';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, Settings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PlanType } from '$lib/common';
  import { setLocks } from '$lib/common/locks';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { protectedContexts } from '$lib/common/globals';
  // Added: Import navigation debug helper to diagnose home page navigation issue
	import { get } from 'svelte/store';
	import { sessionToken, sessionExpiresAt } from '$lib/common/auth/session';
	import { browserAPI } from '$lib/services/browser-api.service';
	import { goto } from '$app/navigation';

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
    await setSettingsStorage(yakklSettings);
    planType = yakklSettings?.plan.type ?? PlanType.EXPLORER_MEMBER;

    // Load cache managers early to ensure cached data is available
    // try {
    //   BalanceCacheManager.getInstance();
    //   AccountTokenCacheManager.getInstance();
    // } catch (error) {
    //   log.warn('Failed to load cache managers in login:', false, error);
    // }
  });

  /**
   * Pre-load token cache during login as requested by user
   * This implements the user's specific request to have cache updated with current info
   * before getting to the home page, so home page doesn't need complex logic
   */
  // async function preloadTokenCache() {
  //   try {
  //     log.info('[Login] Starting token cache preload...', false);

  //     // Get currently selected account data as user requested
  //     const currentlySelected = await getYakklCurrentlySelected();
  //     if (currentlySelected?.shortcuts) {
  //       const currentAddress = currentlySelected.shortcuts.address;
  //       const currentChainId = currentlySelected.shortcuts.chainId;

  //       if (currentAddress) {
  //         log.info('[Login] Preloading tokens for address:', false, { address: currentAddress, chainId: currentChainId });

  //         // Get the address token holdings for the current address
  //         const addressTokenHoldings = await getYakklAddressTokenHoldings();

  //         // Verify if tokens and address are in the yakklWalletCache
  //         const cacheState = get(walletCacheStore);
  //         const accountCache = cacheState.chainAccountCache[currentChainId]?.[currentAddress.toLowerCase()];

  //         if (!accountCache || accountCache.tokens.length === 0) {
  //           log.info('[Login] No cache found for address, loading default tokens...', false);

  //           // Get combined tokens (default + custom)
  //           const combinedTokens = await getYakklCombinedTokens();

  //           // Filter tokens for current chain
  //           const chainTokens = combinedTokens.filter(token =>
  //             token.chainId === currentChainId || (!token.chainId && currentChainId === 1)
  //           );

  //           // Update wallet cache with token data
  //           const tokenCacheData = chainTokens.map(token => ({
  //             address: token.address,
  //             symbol: token.symbol,
  //             name: token.name,
  //             decimals: token.decimals || 18,
  //             balance: token.balance?.toString() || '0',
  //             balanceLastUpdated: new Date(),
  //             price: parseFloat(token.price?.toString() || '0'),
  //             priceLastUpdated: new Date(),
  //             value: parseFloat(token.balance?.toString() || '0') * parseFloat(token.price?.toString() || '0'),
  //             icon: token.logoURI || token.icon || undefined,
  //             isNative: token.isNative || false,
  //             chainId: currentChainId
  //           }));

  //           walletCacheStore.updateTokens(currentChainId, currentAddress, tokenCacheData);

  //           log.info('[Login] Added tokens to cache:', false, chainTokens.length);
  //         } else {
  //           log.info('[Login] Existing cache found, refreshing prices only...', false);
  //         }

  //         // Get prices for each token, including native token (ETH)
  //         // This should include zero_address with isNative = true as user mentioned
  //         try {
  //           await updateTokenPrices();
  //           log.info('[Login] Token prices updated during cache preload', false);
  //         } catch (error) {
  //           log.warn('Failed to update token prices during preload:', false, error);
  //         }

  //         log.info('[Login] Token cache preload completed successfully', false);
  //       } else {
  //         log.warn('[Login] No current address found for token cache preload', false);
  //       }
  //     } else {
  //       log.warn('[Login] No currently selected shortcuts found for token cache preload', false);
  //     }
  //   } catch (error) {
  //     log.error('Error during token cache preload:', false, error);
  //     // Don't fail login if cache preload fails
  //   }
  // }

  // Handle successful login

  async function onSuccess(profile: Profile, digest: string, isMinimal: boolean) {
    console.log('[LOGIN onSuccess] Called with:', {
      profile,
      hasDigest: !!digest,
      digestLength: digest?.length,
      isMinimal
    });

    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.username || '';

      // Full wallet initialization
      setIconUnlock();

      // KEY: Sync all storage to stores - this loads all persistent data
      await syncStorageToStore();

      // Only clear cache for first-time users, not on every login
      // try {
      //   await extensionTokenCacheStore.clearForFirstTimeSetup();
      //   log.info('[Login] Checked and cleared cache if first-time user');
      // } catch (error) {
      //   log.warn('Failed to check first-time user cache:', false, error);
      // }

      // Ensure cache managers are loaded after login
      // try {
        // BalanceCacheManager.getInstance();
        // const accountTokenCache = AccountTokenCacheManager.getInstance();

        // Clear any stale portfolio value cache to force fresh calculation
        // Get the current account from the stores after sync
        // const account = get(currentAccount);

        // No need to clear account cache on every login - cache persists between sessions
        log.info('[Login] Account token cache persists between sessions');
      // } catch (error) {
      //   log.warn('Failed to load cache managers after login:', false, error);
      // }

      // Unlock the wallet using setLocks function - this updates both storage and stores
      await setLocks(false, yakklSettings?.plan.type || PlanType.EXPLORER_MEMBER);

      // Start activity tracking
      const contextType = 'popup-wallet';
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      }

      // NEW: Pre-load token cache during login as user requested
      // This ensures the cache is populated before reaching the home page
      // await preloadTokenCache();

      // Small delay to ensure all stores are synchronized before redirect
      // await new Promise(resolve => setTimeout(resolve, 200));

      // Mark session as authenticated
      sessionStorage.setItem('wallet-authenticated', 'true');

      try {
        await goto('/home', { replaceState: true });
      } catch (error) {
        log.error('[LOGIN] Navigation failed:', false, error);
        // Fallback to login page on navigation error
        errorValue = 'Failed to navigate to home page';
        showError = true;
      }

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
