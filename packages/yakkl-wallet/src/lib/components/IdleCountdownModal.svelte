<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { browser_ext } from '$lib/common/environment';
	
	let show = $state(false);
	let countdown = $state(30);
	let isPaused = $state(false);
	
	// Animation states
	let pulseAnimation = $state(true);
	let isUrgent = $derived(countdown <= 10);
	
	// Handle messages from background
	function handleMessage(message: any) {
		if (message.type === 'SHOW_IDLE_COUNTDOWN') {
			show = true;
			countdown = message.seconds || 30;
			isPaused = false;
			pulseAnimation = true;
		} else if (message.type === 'UPDATE_IDLE_COUNTDOWN') {
			countdown = message.seconds;
			// Add urgency at 10 seconds
			if (countdown <= 10 && !isUrgent) {
				pulseAnimation = true;
			}
		} else if (message.type === 'DISMISS_IDLE_COUNTDOWN') {
			handleDismiss();
		}
	}
	
	// Cancel the lockdown
	async function handleCancel() {
		isPaused = true;
		show = false;
		
		// Send message to background to cancel lockdown
		if (browser_ext) {
			await browser_ext.runtime.sendMessage({
				type: 'CANCEL_IDLE_LOCKDOWN'
			});
		}
	}
	
	// Dismiss the modal (activity detected)
	function handleDismiss() {
		show = false;
		countdown = 30;
		isPaused = false;
	}
	
	// Stay active button - resets idle timer
	async function handleStayActive() {
		// Simulate activity to reset idle timer
		if (typeof window !== 'undefined') {
			// Dispatch mouse move event to trigger activity
			window.dispatchEvent(new MouseEvent('mousemove'));
		}
		
		handleDismiss();
	}
	
	onMount(() => {
		// Listen for messages from background
		if (browser_ext) {
			browser_ext.runtime.onMessage.addListener(handleMessage);
		}
	});
	
	onDestroy(() => {
		// Clean up listener
		if (browser_ext) {
			browser_ext.runtime.onMessage.removeListener(handleMessage);
		}
	});
	
	// Format countdown display
	let displayMinutes = $derived(Math.floor(countdown / 60));
	let displaySeconds = $derived(countdown % 60);
	let displayTime = $derived(
		displayMinutes > 0 
			? `${displayMinutes}:${displaySeconds.toString().padStart(2, '0')}`
			: `${displaySeconds}`
	);
	
	// Color based on urgency
	let countdownColor = $derived(
		isUrgent ? 'text-red-500' : countdown <= 20 ? 'text-orange-500' : 'text-yellow-500'
	);
	let bgGradient = $derived(
		isUrgent 
			? 'from-red-500/20 to-red-600/20' 
			: countdown <= 20 
				? 'from-orange-500/20 to-orange-600/20'
				: 'from-yellow-500/20 to-yellow-600/20'
	);
</script>

{#if show}
	<Modal bind:show size="md" closeOnEsc={false} closeOnOutsideClick={false}>
		<div class="idle-countdown-modal p-6">
			<!-- Header -->
			<div class="text-center mb-6">
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br {bgGradient} mb-4">
					<Icon name="clock" class="w-8 h-8 {countdownColor}" />
				</div>
				<h2 class="text-2xl font-bold text-base-content">
					Idle Timeout Warning
				</h2>
				<p class="text-base-content/70 mt-2">
					Your wallet will be locked due to inactivity
				</p>
			</div>
			
			<!-- Countdown Display -->
			<div class="countdown-display text-center py-8">
				<div 
					class="countdown-number text-6xl font-bold {countdownColor} transition-all duration-300"
					class:animate-pulse={pulseAnimation && isUrgent}
				>
					{displayTime}
				</div>
				<div class="text-sm text-base-content/60 mt-2">
					{countdown === 1 ? 'second' : 'seconds'} remaining
				</div>
			</div>
			
			<!-- Progress Ring -->
			<div class="progress-ring flex justify-center mb-6">
				<svg class="w-32 h-32 transform -rotate-90">
					<circle
						cx="64"
						cy="64"
						r="56"
						stroke="currentColor"
						stroke-width="8"
						fill="none"
						class="text-base-300"
					/>
					<circle
						cx="64"
						cy="64"
						r="56"
						stroke="currentColor"
						stroke-width="8"
						fill="none"
						class={countdownColor}
						stroke-dasharray={351.86}
						stroke-dashoffset={351.86 * (1 - countdown / 30)}
						style="transition: stroke-dashoffset 1s linear;"
					/>
				</svg>
			</div>
			
			<!-- Warning Message -->
			{#if isUrgent}
				<div 
					class="alert alert-error mb-4"
					in:scale={{ duration: 300 }}
				>
					<Icon name="alert-triangle" class="w-5 h-5" />
					<span class="text-sm">
						Lockdown imminent! Click "Stay Active" to prevent locking.
					</span>
				</div>
			{/if}
			
			<!-- Action Buttons -->
			<div class="flex gap-3 justify-center">
				<Button
					on:click={handleStayActive}
					variant="primary"
					size="lg"
					class="flex-1"
				>
					<Icon name="shield-check" class="w-5 h-5 mr-2" />
					Stay Active
				</Button>
				
				<Button
					on:click={handleCancel}
					variant="ghost"
					size="lg"
					class="flex-1"
				>
					<Icon name="lock" class="w-5 h-5 mr-2" />
					Lock Now
				</Button>
			</div>
			
			<!-- Info Text -->
			<div class="text-center mt-4 text-xs text-base-content/60">
				Move your mouse or press any key to reset the timer
			</div>
		</div>
	</Modal>
{/if}

<style>
	.idle-countdown-modal {
		animation: slideIn 0.3s ease-out;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.countdown-number {
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
	}
	
	:global(.animate-pulse) {
		animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
	
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
</style>