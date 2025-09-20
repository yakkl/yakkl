<script lang="ts">
  import { goto } from '$app/navigation';
  import { PATH_ACCOUNTS_CREATE } from '$lib/common/constants';
  import { log } from '$lib/common/logger-wrapper';
  import Register from '$lib/components/Register.svelte';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import type { Profile } from '$lib/common/interfaces';

  // State
  let showError = $state(false);
  let errorValue = $state('');

  // Handle successful registration
  async function handleSuccess(profile: Profile, digest: string, accountName: string, jwtToken?: string) {
    try {
      // Store temporary data for account creation
      sessionStorage.setItem('registration', JSON.stringify({
        username: profile.username,
        accountName,
        digest,
        jwtToken // Include JWT token in session
      }));

      // Navigate to account creation
      await goto(PATH_ACCOUNTS_CREATE);
    } catch (error) {
      log.error('[Register Page] Error during navigation:', false, error);
      errorValue = 'Failed to proceed with account creation. Please try again.';
      showError = true;
    }
  }

  // Handle registration errors
  function handleError(error: any) {
    log.error('[Register Page] Registration error:', false, error);
    errorValue = typeof error === 'string' ? error : 'Registration failed. Please try again.';
    showError = true;
  }

  // Handle cancel/back
  function handleCancel() {
    history.back();
  }

  // Handle error dialog close
  function onClose() {
    showError = false;
    errorValue = '';
  }
</script>

<ErrorNoAction bind:show={showError} title="Registration Error" value={errorValue} {onClose} />

<div class="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="yakkl-card backdrop-blur-sm bg-white/90 dark:bg-zinc-800/90 p-8">
      <!-- Header -->
      <div class="text-center mb-6">
        <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-16 h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          Create Your Wallet
        </h1>
        <p class="text-zinc-600 dark:text-zinc-400">
          Set up your secure YAKKL wallet account
        </p>
      </div>

      <!-- Registration Form Component -->
      <Register
        onSuccess={handleSuccess}
        onError={handleError}
        onCancel={handleCancel}
        submitButtonText="Create Wallet"
        cancelButtonText="Back"
        showAccountName={true}
        generateJWT={true}
      />
    </div>
  </div>
</div>