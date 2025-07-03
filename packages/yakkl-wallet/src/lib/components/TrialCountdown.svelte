<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { planStore, isOnTrial } from '$lib/stores/plan.store';
	import { get } from 'svelte/store';
	import { openModal } from '$lib/common/stores/modal';
	import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
	import { CountdownTimer } from '$lib/managers/CountdownTimer';

	let remaining = $state('');
	let visible = $state(false);
	let pinned = $state(false);
	let countdownTimer: CountdownTimer | null = null;
	let hideTimeoutId = 'trial-hide-timeout';
	const timerManager = UnifiedTimerManager.getInstance();
	
	// Reactive trial status
	let onTrial = $derived($isOnTrial);
	let trialEndsAt = $derived($planStore.plan.trialEndsAt);

	onMount(async () => {
		// Ensure plan store is loaded
		await planStore.loadPlan();
		console.log('[TrialCountdown] Plan loaded:', {
			planType: get(planStore).plan.type,
			trialEndsAt: get(planStore).plan.trialEndsAt,
			isOnTrial: get(isOnTrial)
		});
	});

	$effect(() => {
		// Update visibility when trial status changes
		console.log('[TrialCountdown] Effect triggered:', {
			onTrial,
			trialEndsAt,
			visible
		});
		if (onTrial && trialEndsAt) {
			updateCountdown();
		} else {
			visible = false;
			if (countdownTimer) {
				countdownTimer.destroy();
				countdownTimer = null;
			}
		}
	});

	async function updateCountdown() {
		// Double-check trial status
		if (!onTrial || !trialEndsAt) {
			visible = false;
			return;
		}

		// Get pinned state from localStorage for now
		pinned = localStorage.getItem('yakkl:trial-countdown-pinned') === 'true';

		const end = new Date(trialEndsAt).getTime();
		const now = Date.now();
		const durationMs = end - now;

		if (durationMs <= 0) {
			visible = false;
			return;
		}

		// Set visible to true when we have a valid trial
		visible = true;

		// Create countdown timer
		countdownTimer = new CountdownTimer(
			'trial-countdown',
			durationMs,
			(remainingSeconds) => {
				const hours = Math.floor(remainingSeconds / 3600);
				const minutes = Math.floor((remainingSeconds % 3600) / 60);
				const seconds = remainingSeconds % 60;
				remaining = `${hours}h ${minutes}m ${seconds}s`;
			},
			() => {
				visible = false;
			}
		);

		countdownTimer.start();

		// Schedule auto-hide if not pinned
		if (!pinned) {
			timerManager.addTimeout(
				hideTimeoutId,
				() => {
					visible = false;
				},
				30000
			);
			timerManager.startTimeout(hideTimeoutId);
		}
	}

	function handleUpgrade() {
		openModal('upgrade');
	}

	async function togglePin() {
		pinned = !pinned;
		// Save pinned state to localStorage
		localStorage.setItem('yakkl:trial-countdown-pinned', pinned.toString());

		if (!pinned) {
			timerManager.addTimeout(
				hideTimeoutId,
				() => {
					visible = false;
				},
				30000
			);
			timerManager.startTimeout(hideTimeoutId);
		} else {
			visible = true;
			// Cancel the hide timeout if we're pinning
			timerManager.stopTimeout(hideTimeoutId);
			timerManager.removeTimeout(hideTimeoutId);
		}
	}

	onDestroy(() => {
		if (countdownTimer) {
			countdownTimer.destroy();
			countdownTimer = null;
		}
		timerManager.stopTimeout(hideTimeoutId);
		timerManager.removeTimeout(hideTimeoutId);
	});
</script>

{#if visible}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 bg-yellow-300 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-4 py-2 text-center text-sm font-medium flex items-center justify-between shadow-lg"
	>
		<div class="flex items-center space-x-2">
			<span class="font-bold">⏳ Trial ends in:</span>
			<span>{remaining}</span>
		</div>
		<div class="flex items-center space-x-3">
			<button
				onclick={handleUpgrade}
				class="text-xs font-semibold underline hover:text-yellow-700 dark:hover:text-yellow-300"
			>
				Upgrade
			</button>
			<button
				onclick={togglePin}
				title="Pin or unpin this banner"
				class="text-xs opacity-60 hover:opacity-100"
			>
				📌
			</button>
		</div>
	</div>
{/if}
