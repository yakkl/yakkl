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
	import { goto } from '$app/navigation';

	// Initialize error handler
	if (browserSvelte) {
		ErrorHandler.getInstance();
	}

	// Reactive State
	let yakklCurrentlySelected: YakklCurrentlySelected | null = $state(null);
	let yakklSettings: Settings | null = $state(null);

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

		try {
			// Use centralized lockWallet function which saves cache and clears state
			await lockWallet('user-logout');
		} catch (error) {
			log.error('Logout failed:', false, error);
			alert(
				'Logout encountered an error. Please try again or refresh the extension via browser extension manager.'
			);
		} finally {
			isUpdating = false;
			// Safely close the window, handling both extension and web contexts
			try {
        window.close();
			} catch (closeError) {
				log.error('Could not close window:', false, closeError);
				await goto('/login'); // Redirect to login page only if window.close fails
			}
		}
	}

	if (browserSvelte) {
		update();
	}
</script>

<div>
  <h1>Logging out...</h1>
  <p>Please wait while we log you out.</p>
  <p>If you are not redirected, please click <a href="/login">here</a>.</p>
</div>
