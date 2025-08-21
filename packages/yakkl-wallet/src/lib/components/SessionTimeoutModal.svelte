<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { browser_ext } from '$lib/common/environment';
	
	// Props for customization
	let {
		show = $bindable(false),
		title = 'Session Timeout Warning',
		message = 'Your session will expire soon due to inactivity',
		countdown = $state(60),
		theme = 'yellow', // yellow for session, red for idle
		onCancel = () => {},
		onExtend = () => {},
		onExpire = () => {}
	} = $props<{
		show?: boolean;
		title?: string;
		message?: string;
		countdown?: number;
		theme?: 'yellow' | 'red' | 'blue';
		onCancel?: () => void;
		onExtend?: () => void;
		onExpire?: () => void;
	}>();
	
	// Internal state
	let isPaused = $state(false);
	let internalCountdown = $state(countdown);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	
	// Animation states
	let pulseAnimation = $state(true);
	let isUrgent = $derived(internalCountdown <= 10);
	
	// Theme colors based on theme prop
	const themeConfig = $derived.by(() => {
		switch (theme) {
			case 'red':
				return {
					bgGradient: 'from-red-500 to-red-600',
					textColor: 'text-red-100',
					buttonBg: 'bg-red-600 hover:bg-red-700',
					urgentBg: 'bg-red-700',
					iconColor: 'text-red-300',
					borderColor: 'border-red-400',
					glowColor: 'shadow-red-500/50'
				};
			case 'blue':
				return {
					bgGradient: 'from-blue-500 to-blue-600',
					textColor: 'text-blue-100',
					buttonBg: 'bg-blue-600 hover:bg-blue-700',
					urgentBg: 'bg-blue-700',
					iconColor: 'text-blue-300',
					borderColor: 'border-blue-400',
					glowColor: 'shadow-blue-500/50'
				};
			case 'yellow':
			default:
				return {
					bgGradient: 'from-yellow-500 to-amber-600',
					textColor: 'text-yellow-900',
					buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
					urgentBg: 'bg-orange-600',
					iconColor: 'text-yellow-700',
					borderColor: 'border-yellow-400',
					glowColor: 'shadow-yellow-500/50'
				};
		}
	});
	
	// Handle messages from background for external control
	function handleMessage(message: any) {
		if (message.type === 'SHOW_SESSION_TIMEOUT') {
			show = true;
			internalCountdown = message.seconds || countdown;
			isPaused = false;
			pulseAnimation = true;
			startCountdown();
		} else if (message.type === 'UPDATE_SESSION_COUNTDOWN') {
			internalCountdown = message.seconds;
			// Add urgency at 10 seconds
			if (internalCountdown <= 10 && !isUrgent) {
				pulseAnimation = true;
			}
		} else if (message.type === 'DISMISS_SESSION_TIMEOUT') {
			handleDismiss();
		}
	}
	
	// Start countdown timer
	function startCountdown() {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
		
		countdownInterval = setInterval(() => {
			if (!isPaused && internalCountdown > 0) {
				internalCountdown--;
				
				// Trigger urgency animations
				if (internalCountdown === 10) {
					pulseAnimation = true;
				}
				
				// Auto-expire when countdown reaches 0
				if (internalCountdown === 0) {
					handleExpire();
				}
			}
		}, 1000);
	}
	
	// Cancel the timeout
	async function handleCancel() {
		isPaused = true;
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		// Send message to background to cancel timeout
		if (browser_ext) {
			await browser_ext.runtime.sendMessage({
				type: 'CANCEL_SESSION_TIMEOUT'
			});
		}
		
		onCancel();
	}
	
	// Extend the session
	async function handleExtend() {
		// Reset countdown
		internalCountdown = countdown;
		pulseAnimation = false;
		
		// Send activity signal to reset session timer
		if (browser_ext) {
			await browser_ext.runtime.sendMessage({
				type: 'EXTEND_SESSION'
			});
		}
		
		// Dismiss modal
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		onExtend();
	}
	
	// Handle session expiration
	function handleExpire() {
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		onExpire();
	}
	
	// Dismiss the modal (activity detected)
	function handleDismiss() {
		show = false;
		internalCountdown = countdown;
		isPaused = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	}
	
	// Watch for show prop changes
	$effect(() => {
		if (show) {
			startCountdown();
		} else if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	});
	
	onMount(() => {
		// Listen for messages from background
		if (browser_ext) {
			browser_ext.runtime.onMessage.addListener(handleMessage);
		}
	});
	
	onDestroy(() => {
		// Clean up listener and interval
		if (browser_ext) {
			browser_ext.runtime.onMessage.removeListener(handleMessage);
		}
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	});
	
	// Format countdown display
	function formatCountdown(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<Modal bind:show={show} className="session-timeout-modal">
	<div class="relative overflow-hidden rounded-lg">
		<!-- Background gradient with theme color -->
		<div class="absolute inset-0 bg-gradient-to-br {themeConfig.bgGradient} opacity-95"></div>
		
		<!-- Animated background pattern -->
		<div class="absolute inset-0 opacity-10">
			<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-pulse"></div>
		
		<!-- Content -->
		<div class="relative z-10 p-8 text-center">
			<!-- Icon with animation -->
			<div class="mb-6 flex justify-center">
				<div class="{isUrgent ? 'animate-bounce' : pulseAnimation ? 'animate-pulse' : ''} 
					inline-flex items-center justify-center w-20 h-20 rounded-full {themeConfig.urgentBg} {themeConfig.glowColor} shadow-lg">
					<Icon name="clock" className="w-10 h-10 {themeConfig.iconColor}" />
				</div>
			</div>
			
			<!-- Title -->
			<h2 class="text-2xl font-bold mb-3 {themeConfig.textColor}">
				{title}
			</h2>
			
			<!-- Message -->
			<p class="mb-6 {themeConfig.textColor} opacity-90">
				{message}
			</p>
			
			<!-- Countdown display -->
			<div class="mb-8">
				<div class="text-5xl font-mono font-bold {themeConfig.textColor} 
					{isUrgent ? 'animate-pulse text-red-500' : ''}">
					{formatCountdown(internalCountdown)}
				</div>
				<p class="text-sm mt-2 {themeConfig.textColor} opacity-75">
					{isUrgent ? 'Time is running out!' : 'Time remaining'}
				</p>
			</div>
			
			<!-- Progress bar -->
			<div class="mb-6 h-2 bg-black bg-opacity-20 rounded-full overflow-hidden">
				<div 
					class="h-full {isUrgent ? 'bg-red-500' : themeConfig.buttonBg} transition-all duration-1000"
					style="width: {(internalCountdown / countdown) * 100}%"
				></div>
			</div>
			
			<!-- Action buttons -->
			<div class="flex gap-3 justify-center">
				<Button
					onclick={handleCancel}
					className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
				>
					<Icon name="x" className="w-5 h-5 mr-2 inline" />
					Cancel
				</Button>
				
				<Button
					onclick={handleExtend}
					className="px-6 py-3 {themeConfig.buttonBg} text-white rounded-lg font-medium transition-colors shadow-lg"
				>
					<Icon name="refresh" className="w-5 h-5 mr-2 inline" />
					Extend Session
				</Button>
			</div>
			
			<!-- Warning for urgent state -->
			{#if isUrgent}
				<div transition:fade={{ duration: 300 }} 
					class="mt-4 p-3 bg-red-900 bg-opacity-50 rounded-lg border {themeConfig.borderColor}">
					<p class="text-sm font-medium {themeConfig.textColor}">
						⚠️ Your session is about to expire! Click "Extend Session" to continue.
					</p>
				</div>
			{/if}
		</div>
	</div>
</Modal>

<style>
	:global(.session-timeout-modal) {
		z-index: 9999;
	}
	
	/* Add custom animations if needed */
	@keyframes glow {
		0%, 100% {
			box-shadow: 0 0 20px rgba(255, 193, 7, 0.5);
		}
		50% {
			box-shadow: 0 0 40px rgba(255, 193, 7, 0.8);
		}
	}
</style>