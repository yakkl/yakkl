<script lang="ts">
	import { browserSvelte } from '$lib/common/environment';
	import {
		yakklCurrentlySelectedStore,
		yakklSettingsStore
	} from '$lib/common/stores';
	import { type Settings, type YakklCurrentlySelected } from '$lib/common';
	import { log } from '$lib/common/logger-wrapper';
	import { lockWallet } from '$lib/common/lockWallet';
	import { ErrorHandler } from '$lib/managers/ErrorHandler';
	import { browser as browserExt } from '$app/environment';

	// Initialize error handler
	if (browserSvelte) {
		ErrorHandler.getInstance();
	}

	// Reactive State
	let yakklCurrentlySelected: YakklCurrentlySelected | null = $state(null);
	let yakklSettings: Settings | null = $state(null);
	let isLoggingOut = $state(false);
	let logoutError = $state<string | null>(null);

	$effect(() => {
		yakklCurrentlySelected = $yakklCurrentlySelectedStore;
	});

	$effect(() => {
		yakklSettings = $yakklSettingsStore;
	});

	let isUpdating = false; // Prevent concurrent executions

	async function update() {
		if (!browserSvelte) return;

		if (isUpdating) return; // Prevent multiple updates
		isUpdating = true;
		isLoggingOut = true;

		try {
			log.info('Logout page: Starting logout process');

			// Use centralized lockWallet function which saves cache and clears state
			await lockWallet('user-logout');

			log.info('Logout page: LockWallet completed successfully');

			// For browser extension context, try to close the window
      try {
        // Small delay to ensure all cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Try to close the window
        window.close();

        // If window.close() didn't work (it returns immediately),
        // wait a bit and check if we're still here
        await new Promise(resolve => setTimeout(resolve, 500));

        // If we're still here, the window didn't close
        // Don't navigate - just show a message
        logoutError = 'Please close this window manually or use the browser extension manager.';
      } catch (closeError) {
        log.warn('Could not close window:', false, closeError);
        logoutError = 'Logout complete. Please close this window manually.';
      }
		} catch (error) {
			log.error('Logout failed:', false, error);
			logoutError = 'Logout encountered an error. Please try again or refresh the extension via browser extension manager.';
		} finally {
			isUpdating = false;
			// Don't set isLoggingOut to false - keep the logout UI visible
		}
	}

	if (browserSvelte) {
		update();
	}
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4">
  {#if isLoggingOut && !logoutError}
    <div class="text-center">
      <h1 class="text-2xl font-bold mb-4">Logging out...</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Please wait while we secure your wallet.</p>
      <div class="flex justify-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    </div>
  {:else if logoutError}
    <div class="text-center max-w-md">
      <h1 class="text-2xl font-bold mb-4">Logout Complete</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-6">{logoutError}</p>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
          The wallet has been securely locked. You can safely close this window.
        </p>
      </div>
    </div>
  {/if}
</div>
