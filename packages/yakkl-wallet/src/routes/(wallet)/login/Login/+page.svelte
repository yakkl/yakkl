<script lang="ts">
  import Login from '$lib/components/Login.svelte';
  import { setSettingsStorage, syncStorageToStore, yakklUserNameStore } from '$lib/common/stores';
  import { setIconUnlock } from '$lib/utilities/utilities';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';
  import { startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
	import type { Profile, Settings } from '$lib/common/interfaces';
	import { getNormalizedSettings, isProLevel, PATH_WELCOME, PlanType } from '$lib/common';
	import Welcome from '$lib/components/Welcome.svelte';
	import Copyright from '$lib/components/Copyright.svelte';
	import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
	import { onMount } from 'svelte';
	import { protectedContexts } from '$lib/common/globals';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let planType = $state(PlanType.MEMBER);
  let yakklSettings: Settings | null = $state(null);

  onMount(async () => {
    yakklSettings = await getNormalizedSettings();
    await setSettingsStorage(yakklSettings);
    planType = yakklSettings?.plan.type ?? PlanType.MEMBER;
  });

  // Handle successful login in the main wallet
  function onSuccess(profile: Profile, digest: string, isMinimal: boolean) {
    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.userName || '';

      // Full wallet initialization
      setIconUnlock();
      syncStorageToStore();

      // Only start activity tracking for protected contexts (wallet/dapp)
      const contextType = 'popup-wallet'; // This is explicitly the wallet context
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      } else {
        log.info(`Skipping activity tracking for non-protected context: ${contextType}`);
      }

      // Navigate to wallet dashboard
      safeNavigate(PATH_WELCOME, 0, {replaceState: true, invalidateAll: true});
    } catch(e: any) {
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

<ErrorNoAction bind:show={showError} title="ERROR!" value={errorValue} onClose={onClose} />

<!-- relative bg-gradient-to-b from-indigo-700 to-indigo-500/15 m-1 ml-2 mr-2 dark:bg-gray-900 rounded-t-xl overflow-hidden -->
<div class="relative h-[98vh] text-base-content">
  <main class="px-4 text-center">
    <Welcome />

    <div class="mt-5">
      <Login
        onSuccess={onSuccess}
        onError={onError}
        onCancel={onCancel}
        loginButtonText="Unlock"
        cancelButtonText="Exit/Logout"
      />
    </div>

    <div id="upgrade" class="w-full mt-14">
      <div class="card bg-base-100 shadow-xl image-full animate-pulse">
        <figure><img src="/images/logoBullFav128x128.png" alt="upgrade" /></figure>
        <div class="card-body">
          {#if planType.toLowerCase() === PlanType.YAKKL_PRO.toLowerCase()}
            <h2 class="card-title self-center">PRO!</h2>
            <p>Welcome to our Pro version. We have a lot of additional features waiting on you. We're also working hard on advanced features to make your digital asset experience a dream! We also need your suggestions! Enjoy!</p>
          {:else if planType.toLowerCase() === PlanType.FOUNDING_MEMBER.toLowerCase()}
            <h2 class="card-title self-center">FOUNDING MEMBER!</h2>
            <p>Welcome to our Founding Member version. We have a lot of additional features waiting on you. We're also working hard on advanced features to make your digital asset experience a dream! We also need your suggestions! Enjoy!</p>
          {:else if planType.toLowerCase() === PlanType.EARLY_ADOPTER.toLowerCase()}
            <h2 class="card-title self-center">EARLY ADOPTER!</h2>
            <p>Welcome to our Early Adopter version. We have a lot of additional features waiting on you. We're also working hard on advanced features to make your digital asset experience a dream! We also need your suggestions! Enjoy!</p>
          {:else}
            <h2 class="card-title self-center">STANDARD!</h2>
            <p>Welcome to our Standard version. The core wallet features are waiting on you. If you desire more, you can upgrade to Pro. We're also working hard on advanced features to make your digital asset experience a dream! We also need your suggestions! Enjoy!</p>
          {/if}
        </div>
      </div>
    </div>
    <Copyright planType={planType} />
  </main>
</div>
