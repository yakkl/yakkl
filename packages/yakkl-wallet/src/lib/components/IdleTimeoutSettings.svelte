<script lang="ts">
	import { getYakklSettings, setYakklSettingsStorage } from '$lib/common/stores';
	import type { YakklSettings } from '$lib/common/interfaces';
	import { log } from '$lib/managers/Logger';
	import Icon from './Icon.svelte';
	import Button from '@yakkl/ui/src/components/Button.svelte';

	let settings: YakklSettings | null = $state(null);
	let isSaving = $state(false);
	let showAdvanced = $state(false);

	// Form fields with defaults
	let enabled = $state(true);
	let detectionMinutes = $state(2);
	let graceMinutes = $state(1);
	let countdownSeconds = $state(30);
	let showNotifications = $state(true);
	let showCountdownModal = $state(true);
	let autoDismissOnActivity = $state(true);
	let warningVolume = $state(0.7);
	let soundPoints = $state([30, 10, 5]);

	// Sound point inputs for UI
	let soundPoint1 = $state(30);
	let soundPoint2 = $state(10);
	let soundPoint3 = $state(5);

	// Preset configurations
	const presets = [
		{
			name: 'Quick Lock',
			description: 'Locks quickly for high security',
			config: {
				detectionMinutes: 2,
				graceMinutes: 1,
				countdownSeconds: 15
			}
		},
		{
			name: 'Balanced',
			description: 'Default balanced settings',
			config: {
				detectionMinutes: 2,
				graceMinutes: 1,
				countdownSeconds: 30
			}
		},
		{
			name: 'Relaxed',
			description: 'More time before locking',
			config: {
				detectionMinutes: 10,
				graceMinutes: 5,
				countdownSeconds: 60
			}
		}
	];

	async function loadSettings() {
		try {
			settings = await getYakklSettings();
			if (settings?.idleSettings) {
				enabled = settings.idleSettings.enabled ?? true;
				detectionMinutes = settings.idleSettings.detectionMinutes ?? 2;
				graceMinutes = settings.idleSettings.graceMinutes ?? 1;
				countdownSeconds = settings.idleSettings.countdownSeconds ?? 30;
				showNotifications = settings.idleSettings.showNotifications ?? true;
				showCountdownModal = settings.idleSettings.showCountdownModal ?? true;
				autoDismissOnActivity = settings.idleSettings.autoDismissOnActivity ?? true;
				warningVolume = settings.idleSettings.warningVolume ?? 0.7;
				soundPoints = settings.idleSettings.soundPoints ?? [30, 10, 5];

				// Update sound point inputs
				soundPoint1 = soundPoints[0] ?? 30;
				soundPoint2 = soundPoints[1] ?? 10;
				soundPoint3 = soundPoints[2] ?? 5;
			}
		} catch (error) {
			log.error('Failed to load idle settings:', false, error);
		}
	}

	async function saveSettings() {
		if (!settings) return;

		isSaving = true;
		try {
			// Update sound points array from inputs
			soundPoints = [soundPoint1, soundPoint2, soundPoint3].filter(p => p > 0).sort((a, b) => b - a);

			settings.idleSettings = {
				enabled,
				detectionMinutes,
				graceMinutes,
				countdownSeconds,
				showNotifications,
				showCountdownModal,
				autoDismissOnActivity,
				warningVolume,
				soundPoints,
				warningSound: settings.idleSettings?.warningSound
			};

			await setYakklSettingsStorage(settings);
			log.info('Idle settings saved successfully');

			// Reload idle manager with new settings
			const browser = await import('webextension-polyfill');
			await browser.default.runtime.sendMessage({
				type: 'RELOAD_IDLE_SETTINGS'
			});
		} catch (error) {
			log.error('Failed to save idle settings:', false, error);
		} finally {
			isSaving = false;
		}
	}

	function applyPreset(preset: typeof presets[0]) {
		detectionMinutes = preset.config.detectionMinutes;
		graceMinutes = preset.config.graceMinutes;
		countdownSeconds = preset.config.countdownSeconds;
	}

	// Calculate total time until lock
	let totalMinutes = $derived(enabled ? detectionMinutes + graceMinutes + (countdownSeconds / 60) : 0);
	let totalTimeDisplay = $derived(
		totalMinutes > 0
			? `${Math.floor(totalMinutes)} min ${Math.round((totalMinutes % 1) * 60)} sec`
			: 'Disabled'
	);

	// Load settings on mount
	$effect(() => {
		loadSettings();
	});
</script>

<div class="idle-timeout-settings">
	<div class="header mb-4">
		<h3 class="text-lg font-semibold flex items-center gap-2">
			<Icon name="clock" class="w-5 h-5" />
			Idle Timeout Settings
		</h3>
		<p class="text-sm text-base-content/70 mt-1">
			Configure automatic wallet locking when idle
		</p>
	</div>

	<!-- Enable/Disable Toggle -->
	<div class="form-control mb-4">
		<label class="label cursor-pointer">
			<span class="label-text">Enable Idle Timeout</span>
			<input
				type="checkbox"
				bind:checked={enabled}
				class="toggle toggle-primary"
			/>
		</label>
	</div>

	{#if enabled}
		<!-- Presets -->
		<div class="presets mb-6">
			<div class="label">
				<span class="label-text text-sm">Quick Presets</span>
			</div>
			<div class="grid grid-cols-3 gap-2">
				{#each presets as preset}
					<button
						type="button"
						onclick={() => applyPreset(preset)}
						class="btn btn-sm btn-outline"
					>
						<div class="text-left">
							<div class="font-medium">{preset.name}</div>
							<div class="text-xs opacity-70">{preset.description}</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Main Settings -->
		<div class="space-y-4">
			<!-- Detection Time -->
			<div class="form-control">
				<label for="detection-slider" class="label">
					<span class="label-text">Idle Detection Time</span>
					<span class="label-text-alt">{detectionMinutes} minutes</span>
				</label>
				<input
					id="detection-slider"
					type="range"
					min="1"
					max="30"
					bind:value={detectionMinutes}
					class="range range-primary"
				/>
				<div class="text-xs text-base-content/60 mt-1">
					Time before detecting idle state
				</div>
			</div>

			<!-- Grace Period -->
			<div class="form-control">
				<label for="grace-slider" class="label">
					<span class="label-text">Grace Period</span>
					<span class="label-text-alt">{graceMinutes} minutes</span>
				</label>
				<input
					id="grace-slider"
					type="range"
					min="0"
					max="10"
					bind:value={graceMinutes}
					class="range range-warning"
				/>
				<div class="text-xs text-base-content/60 mt-1">
					Additional time after idle detection before countdown
				</div>
			</div>

			<!-- Countdown Duration -->
			<div class="form-control">
				<label for="countdown-slider" class="label">
					<span class="label-text">Final Countdown</span>
					<span class="label-text-alt">{countdownSeconds} seconds</span>
				</label>
				<input
					id="countdown-slider"
					type="range"
					min="10"
					max="60"
					step="5"
					bind:value={countdownSeconds}
					class="range range-error"
				/>
				<div class="text-xs text-base-content/60 mt-1">
					Final countdown before locking
				</div>
			</div>

			<!-- Total Time Display -->
			<div class="alert alert-info">
				<Icon name="info" class="w-4 h-4" />
				<span>Total time until lock: <strong>{totalTimeDisplay}</strong></span>
			</div>

			<!-- Notification Settings -->
			<div class="divider">Notifications</div>

			<div class="space-y-2">
				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text">Show Browser Notifications</span>
						<input
							type="checkbox"
							bind:checked={showNotifications}
							class="checkbox checkbox-primary"
						/>
					</label>
				</div>

				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text">Show Countdown Modal</span>
						<input
							type="checkbox"
							bind:checked={showCountdownModal}
							class="checkbox checkbox-primary"
						/>
					</label>
				</div>

				<div class="form-control">
					<label class="label cursor-pointer">
						<span class="label-text">Auto-dismiss on Activity</span>
						<input
							type="checkbox"
							bind:checked={autoDismissOnActivity}
							class="checkbox checkbox-primary"
						/>
					</label>
				</div>
			</div>

			<!-- Advanced Settings -->
			<div class="divider">
				<button
					type="button"
					onclick={() => showAdvanced = !showAdvanced}
					class="btn btn-xs btn-ghost gap-1"
				>
					Advanced
					<Icon name={showAdvanced ? 'chevron-up' : 'chevron-down'} class="w-3 h-3" />
				</button>
			</div>

			{#if showAdvanced}
				<div class="space-y-4 p-4 bg-base-200 rounded-lg">
					<!-- Warning Volume -->
					<div class="form-control">
						<label for="volume-slider" class="label">
							<span class="label-text">Warning Volume</span>
							<span class="label-text-alt">{Math.round(warningVolume * 100)}%</span>
						</label>
						<input
							id="volume-slider"
							type="range"
							min="0"
							max="1"
							step="0.1"
							bind:value={warningVolume}
							class="range range-sm"
						/>
					</div>

					<!-- Sound Alert Points -->
					<div class="form-control">
						<div class="label">
							<span class="label-text">Sound Alert Points (seconds)</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<input
								type="number"
								min="1"
								max={countdownSeconds}
								bind:value={soundPoint1}
								class="input input-sm input-bordered"
								placeholder="30"
							/>
							<input
								type="number"
								min="1"
								max={countdownSeconds}
								bind:value={soundPoint2}
								class="input input-sm input-bordered"
								placeholder="10"
							/>
							<input
								type="number"
								min="1"
								max={countdownSeconds}
								bind:value={soundPoint3}
								class="input input-sm input-bordered"
								placeholder="5"
							/>
						</div>
						<div class="text-xs text-base-content/60 mt-1">
							Seconds remaining when sound alerts play
						</div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Save Button -->
	<div class="mt-6">
		<Button
			onclick={saveSettings}
			variant="primary"
			disabled={isSaving}
			class="w-full"
		>
			{#if isSaving}
				<span class="loading loading-spinner loading-sm"></span>
				Saving...
			{:else}
				<Icon name="save" class="w-4 h-4 mr-2" />
				Save Idle Settings
			{/if}
		</Button>
	</div>
</div>

<style>
	.idle-timeout-settings {
		@apply space-y-2;
	}

	.presets button {
		@apply transition-all duration-200;
	}

	.presets button:hover {
		@apply scale-105;
	}
</style>
