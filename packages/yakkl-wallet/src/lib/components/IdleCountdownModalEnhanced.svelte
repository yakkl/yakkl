<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { fade, scale } from 'svelte/transition';
	import { browser_ext } from '$lib/common/environment';
	
	// Props for full customization
	let {
		show = $bindable(false),
		title = 'Idle Timeout Warning',
		message = 'Your wallet will be locked due to inactivity',
		countdown = $state(30),
		theme = 'red', // red for idle (security), yellow for session
		onCancel = () => {},
		onStayActive = () => {},
		onLockdown = () => {}
	} = $props<{
		show?: boolean;
		title?: string;
		message?: string;
		countdown?: number;
		theme?: 'red' | 'yellow' | 'blue';
		onCancel?: () => void;
		onStayActive?: () => void;
		onLockdown?: () => void;
	}>();
	
	// Internal state
	let internalCountdown = $state(countdown);
	let isPaused = $state(false);
	let countdownInterval: ReturnType<typeof setInterval> | null = null;
	
	// Animation states
	let pulseAnimation = $state(true);
	let isUrgent = $derived(internalCountdown <= 10);
	
	// Theme configuration
	const themeConfig = $derived.by(() => {
		switch (theme) {
			case 'yellow':
				return {
					bgColor: 'bg-yellow-50',
					bgGradient: 'from-yellow-500 to-amber-600',
					textColor: 'text-yellow-900',
					buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
					urgentBg: 'bg-orange-600',
					iconColor: 'text-yellow-700',
					borderColor: 'border-yellow-400',
					glowColor: 'shadow-yellow-500/50',
					alertBg: 'bg-yellow-100',
					alertText: 'text-yellow-800',
					progressBg: 'bg-yellow-200',
					progressFill: 'bg-yellow-500'
				};
			case 'blue':
				return {
					bgColor: 'bg-blue-50',
					bgGradient: 'from-blue-500 to-blue-600',
					textColor: 'text-blue-900',
					buttonBg: 'bg-blue-600 hover:bg-blue-700',
					urgentBg: 'bg-blue-700',
					iconColor: 'text-blue-700',
					borderColor: 'border-blue-400',
					glowColor: 'shadow-blue-500/50',
					alertBg: 'bg-blue-100',
					alertText: 'text-blue-800',
					progressBg: 'bg-blue-200',
					progressFill: 'bg-blue-500'
				};
			case 'red':
			default:
				return {
					bgColor: 'bg-red-50',
					bgGradient: 'from-red-500 to-red-700',
					textColor: 'text-red-900',
					buttonBg: 'bg-red-600 hover:bg-red-700',
					urgentBg: 'bg-red-800',
					iconColor: 'text-red-700',
					borderColor: 'border-red-400',
					glowColor: 'shadow-red-500/50',
					alertBg: 'bg-red-100',
					alertText: 'text-red-800',
					progressBg: 'bg-red-200',
					progressFill: 'bg-red-600',
					dangerBg: 'bg-red-900'
				};
		}
	});
	
	// Handle messages from background
	function handleMessage(message: any) {
		if (message.type === 'SHOW_IDLE_COUNTDOWN') {
			show = true;
			internalCountdown = message.seconds || countdown;
			isPaused = false;
			pulseAnimation = true;
			startCountdown();
		} else if (message.type === 'UPDATE_IDLE_COUNTDOWN') {
			internalCountdown = message.seconds;
			// Add urgency at 10 seconds
			if (internalCountdown <= 10 && !isUrgent) {
				pulseAnimation = true;
			}
		} else if (message.type === 'DISMISS_IDLE_COUNTDOWN') {
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
				
				// Auto-lockdown when countdown reaches 0
				if (internalCountdown === 0) {
					handleLockdown();
				}
			}
		}, 1000);
	}
	
	// Cancel/Lock Now - immediate lockdown
	async function handleCancel() {
		isPaused = true;
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		// Send message to background to trigger lockdown
		if (browser_ext) {
			await browser_ext.runtime.sendMessage({
				type: 'CANCEL_IDLE_LOCKDOWN'
			});
		}
		
		onCancel();
	}
	
	// Stay Active - reset timer
	async function handleStayActive() {
		// Reset countdown
		internalCountdown = countdown;
		pulseAnimation = false;
		
		// Simulate activity to reset idle timer
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new MouseEvent('mousemove'));
		}
		
		// Send message to background
		if (browser_ext) {
			await browser_ext.runtime.sendMessage({
				type: 'RESET_IDLE_TIMER'
			});
		}
		
		// Dismiss modal
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		onStayActive();
	}
	
	// Handle automatic lockdown
	function handleLockdown() {
		show = false;
		
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
		
		onLockdown();
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
			internalCountdown = countdown; // Reset countdown when shown
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
		if (seconds <= 0) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	// Get dynamic styles based on urgency
	const dynamicStyles = $derived.by(() => {
		if (isUrgent) {
			return {
				iconClass: `${themeConfig.urgentBg} animate-bounce`,
				countdownClass: 'text-6xl animate-pulse text-red-600',
				ringColor: 'text-red-600'
			};
		} else if (internalCountdown <= 20) {
			return {
				iconClass: `${themeConfig.buttonBg}`,
				countdownClass: 'text-6xl text-orange-600',
				ringColor: 'text-orange-500'
			};
		} else {
			return {
				iconClass: `bg-gradient-to-br ${themeConfig.bgGradient}`,
				countdownClass: `text-6xl ${themeConfig.textColor}`,
				ringColor: themeConfig.progressFill
			};
		}
	});
</script>

<Modal bind:show className="idle-timeout-enhanced" closeOnEsc={false} closeOnOutsideClick={false}>
	<div class="relative overflow-hidden rounded-lg">
		<!-- Background with theme gradient -->
		<div class="absolute inset-0 bg-gradient-to-br {themeConfig.bgGradient} opacity-10"></div>
		
		<!-- Content -->
		<div class="relative z-10 p-8">
			<!-- Icon with animation -->
			<div class="text-center mb-6">
				<div class="inline-flex items-center justify-center w-20 h-20 rounded-full {dynamicStyles.iconClass} {themeConfig.glowColor} shadow-lg transition-all duration-300">
					{#if isUrgent}
						<Icon name="alert-triangle" className="w-10 h-10 text-white" />
					{:else}
						<Icon name="clock" className="w-10 h-10 text-white" />
					{/if}
				</div>
			</div>
			
			<!-- Title and Message -->
			<div class="text-center mb-6">
				<h2 class="text-2xl font-bold {themeConfig.textColor} mb-2">
					{title}
				</h2>
				<p class="{themeConfig.textColor} opacity-80">
					{message}
				</p>
			</div>
			
			<!-- Countdown Display -->
			<div class="text-center mb-6">
				<div class="{dynamicStyles.countdownClass} font-mono font-bold transition-all duration-300">
					{formatCountdown(internalCountdown)}
				</div>
				<p class="text-sm mt-2 {themeConfig.textColor} opacity-60">
					{isUrgent ? 'Time is running out!' : 'Time remaining'}
				</p>
			</div>
			
			<!-- Progress Ring -->
			<div class="flex justify-center mb-6">
				<svg class="w-32 h-32 transform -rotate-90">
					<circle
						cx="64"
						cy="64"
						r="56"
						stroke="currentColor"
						stroke-width="8"
						fill="none"
						class="{themeConfig.progressBg} opacity-30"
					/>
					<circle
						cx="64"
						cy="64"
						r="56"
						stroke="currentColor"
						stroke-width="8"
						fill="none"
						class={dynamicStyles.ringColor}
						stroke-dasharray={351.86}
						stroke-dashoffset={351.86 * (1 - internalCountdown / countdown)}
						stroke-linecap="round"
						style="transition: stroke-dashoffset 1s linear;"
					/>
				</svg>
			</div>
			
			<!-- Warning Alert for Urgent State -->
			{#if isUrgent}
				<div transition:scale={{ duration: 300 }} 
					class="mb-6 p-3 {themeConfig.alertBg} rounded-lg border {themeConfig.borderColor}">
					<p class="text-sm font-medium {themeConfig.alertText} flex items-center justify-center">
						<Icon name="alert-triangle" className="w-4 h-4 mr-2" />
						Lockdown imminent! Click "Stay Active" to continue.
					</p>
				</div>
			{/if}
			
			<!-- Action Buttons -->
			<div class="flex gap-3 justify-center">
				<Button
					onclick={handleStayActive}
					className="px-6 py-3 {themeConfig.buttonBg} text-white rounded-lg font-medium transition-all shadow-lg hover:scale-105"
				>
					<Icon name="shield-check" className="w-5 h-5 mr-2 inline" />
					Stay Active
				</Button>
				
				<Button
					onclick={handleCancel}
					className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
				>
					<Icon name="lock" className="w-5 h-5 mr-2 inline" />
					Lock Now
				</Button>
			</div>
			
			<!-- Info Text -->
			<div class="text-center mt-4 text-xs {themeConfig.textColor} opacity-50">
				Activity will automatically reset this timer
			</div>
		</div>
	</div>
</Modal>

<style>
	:global(.idle-timeout-enhanced) {
		z-index: 9999;
	}
	
	/* Custom pulse animation for critical state */
	@keyframes critical-pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}
	
	:global(.animate-critical) {
		animation: critical-pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>