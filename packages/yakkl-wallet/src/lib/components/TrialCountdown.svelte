<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getSettings, setSettings } from '$lib/common/stores';
	import { AccessSourceType } from '$lib/common/types';
	import { openModal } from '$lib/common/stores/modal';
	import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
	import { CountdownTimer } from '$lib/managers/CountdownTimer';

	let remaining = '';
	let visible = true;
	let pinned = false;
	let countdownTimer: CountdownTimer | null = null;
	let hideTimeoutId = 'trial-hide-timeout';
	const timerManager = UnifiedTimerManager.getInstance();

	async function updateCountdown() {
		const settings = await getSettings();
		if (
			!settings ||
			settings.plan.source !== AccessSourceType.TRIAL ||
			!settings.plan.trialEndDate
		) {
			visible = false;
			return;
		}

		pinned = settings.trialCountdownPinned ?? false;

		const end = new Date(settings.plan.trialEndDate).getTime();
		const now = Date.now();
		const durationMs = end - now;

		if (durationMs <= 0) {
			visible = false;
			return;
		}

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
		const store = await getSettings();
		const updated = { ...store, trialCountdownPinned: pinned };
		// Persist back
		setSettings(updated);

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

	onMount(async () => {
		await updateCountdown();
	});

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
				on:click={handleUpgrade}
				class="text-xs font-semibold underline hover:text-yellow-700 dark:hover:text-yellow-300"
			>
				Upgrade
			</button>
			<button
				on:click={togglePin}
				title="Pin or unpin this banner"
				class="text-xs opacity-60 hover:opacity-100"
			>
				📌
			</button>
		</div>
	</div>
{/if}
