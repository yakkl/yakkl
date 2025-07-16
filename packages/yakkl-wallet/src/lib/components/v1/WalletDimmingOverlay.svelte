<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';

	// State
	let showOverlay = $state(false);
	let idleState = $state<'active' | 'idle' | 'locked'>('active');

	// Cleanup function
	let cleanup: (() => void) | undefined;

	onMount(() => {
		// Listen for idle state changes
		const handleIdleStateChange = (event: CustomEvent) => {
			const { state } = event.detail;
			idleState = state;
			showOverlay = state === 'idle' || state === 'locked';
		};

		// Listen for user activity detection
		const handleUserActivity = () => {
			showOverlay = false;
			idleState = 'active';
		};

		// Add event listeners
		window.addEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
		window.addEventListener('yakklUserActivityDetected', handleUserActivity as EventListener);

		// Cleanup function
		cleanup = () => {
			window.removeEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
			window.removeEventListener('yakklUserActivityDetected', handleUserActivity as EventListener);
		};
	});

	onDestroy(() => {
		cleanup?.();
	});
</script>

<!-- Dimming Overlay -->
{#if showOverlay}
	<div
		class="fixed inset-0 bg-black/30 backdrop-blur-[1px] pointer-events-none z-40"
		transition:fade={{ duration: 500 }}
		style="backdrop-filter: blur(1px) brightness(0.7);"
	>
		<!-- Optional: Add subtle pattern or texture -->
		<div class="absolute inset-0 bg-gradient-to-br from-red-900/10 to-orange-900/10"></div>
	</div>
{/if}

<style>
	/* Ensure the overlay doesn't interfere with interactions */
	.pointer-events-none {
		pointer-events: none;
	}
</style>
