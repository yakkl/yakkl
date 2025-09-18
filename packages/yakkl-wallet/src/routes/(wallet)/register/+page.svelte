<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { log } from '$lib/common/logger-wrapper';
  import { getYakklSettings } from '$lib/common/stores';
  import { getProfile } from '$lib/common/profile';
  import { OnboardingFlow } from '@yakkl/security-ui';

  let loading = $state(true);
  let alreadyRegistered = $state(false);

  onMount(async () => {
    // Check if wallet is already registered
    try {
      const settings = await getYakklSettings();
      const profile = await getProfile();

      if (settings?.init && profile) {
        // Wallet is already registered - prevent re-registration
        alreadyRegistered = true;
        log.warn('Wallet already registered, redirecting to login');
        setTimeout(() => goto('/login'), 2000);
      }
    } catch (error) {
      log.error('Error checking registration status:', false, error);
    }
    loading = false;
  });

  // Handle different registration paths
  function handleCreatePassword() {
    if (alreadyRegistered) return;
    log.info('Creating new account with password');
    goto('/register/create');
  }

  function handleSocialAuth(provider: 'google' | 'x') {
    if (alreadyRegistered) return;
    log.info(`Creating new account with ${provider}`);
    goto(`/register/social?provider=${provider}`);
  }

  function handleImportSeed() {
    if (alreadyRegistered) return;
    log.info('Importing seed phrase');
    goto('/register/import');
  }

  function handleImportEmergency() {
    if (alreadyRegistered) return;
    log.info('Restoring from emergency kit');
    goto('/register/restore');
  }

  function handleImportAccount() {
    if (alreadyRegistered) return;
    log.info('Importing account');
    goto('/register/import-account');
  }
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    {#if loading}
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Checking registration status...</p>
      </div>
    {:else if alreadyRegistered}
      <div class="yakkl-card p-8 text-center">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">Wallet Already Registered</h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-4">
          This wallet has already been set up. For security reasons, you cannot re-register an existing wallet.
        </p>
        <p class="text-sm text-zinc-500 dark:text-zinc-500">
          Redirecting to login...
        </p>
      </div>
    {:else}
      <!-- Use the new OnboardingFlow component for progressive registration -->
      <OnboardingFlow
        onCreatePassword={handleCreatePassword}
        onSocialAuth={handleSocialAuth}
        onImportSeed={handleImportSeed}
        onImportEmergency={handleImportEmergency}
        onImportAccount={handleImportAccount}
      />
    {/if}
  </div>
</div>
