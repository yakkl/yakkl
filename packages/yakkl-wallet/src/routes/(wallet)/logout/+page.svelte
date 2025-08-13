<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	
	// This page is only reached if direct navigation to /logout occurs
	// Normal logout flow is handled by performLogout in +layout.svelte
	
	let message = $state('Logging out...');
	
	onMount(() => {
		if (browser) {
			// If we somehow end up here, just show a message
			// The actual logout should have already been handled
			message = 'Wallet has been locked. You can close this window.';
			
			// Try to close the window after a brief delay
			setTimeout(() => {
				try {
					window.close();
				} catch (e) {
					// Window might not close if not opened by script
					console.log('Window close not allowed');
				}
			}, 1000);
		}
	});
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4">
	<div class="text-center max-w-md">
		<h1 class="text-2xl font-bold mb-4">Logout</h1>
		<p class="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
		<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				The wallet has been securely locked. You can safely close this window.
			</p>
		</div>
	</div>
</div>