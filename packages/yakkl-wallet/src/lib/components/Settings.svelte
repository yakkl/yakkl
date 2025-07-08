<!-- Settings.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './v1/Modal.svelte';
	import { getSettings, setSettings, getProfile, setProfileStorage } from '$lib/common/stores';
	import { log } from '$lib/managers/Logger';
	import type { Settings, Profile } from '$lib/common/interfaces';
	import { SystemTheme, PlanType } from '$lib/common/types';
	import SoundSettings from './SoundSettings.svelte';
	import { chainStore } from '$lib/stores/chain.store';

	interface Props {
		show?: boolean;
		onClose?: () => void;
		onComplete?: () => void;
	}

	let {
		show = $bindable(false),
		onClose = () => (show = false),
		onComplete = () => {}
	}: Props = $props();

	let settings: Settings | null = $state(null);
	let profile: Profile | null = $state(null);
	let isLoading = $state(false);
	let isSaving = $state(false);
	let error = $state('');
	let success = $state('');
	let hasChanges = $state(false);

	// Available options
	const themeOptions = [
		{ value: SystemTheme.SYSTEM, label: 'System' },
		{ value: SystemTheme.LIGHT, label: 'Light' },
		{ value: SystemTheme.DARK, label: 'Dark' }
	];

	const currencyOptions = [
		{ value: 'USD', label: 'US Dollar (USD)' },
		{ value: 'EUR', label: 'Euro (EUR)' },
		{ value: 'GBP', label: 'British Pound (GBP)' },
		{ value: 'JPY', label: 'Japanese Yen (JPY)' },
		{ value: 'CAD', label: 'Canadian Dollar (CAD)' },
		{ value: 'AUD', label: 'Australian Dollar (AUD)' },
		{ value: 'CHF', label: 'Swiss Franc (CHF)' },
		{ value: 'CNY', label: 'Chinese Yuan (CNY)' }
	];

	const localeOptions = [
		{ value: 'en-US', label: 'English (US)' },
		{ value: 'en-GB', label: 'English (UK)' },
		{ value: 'es-ES', label: 'Spanish' },
		{ value: 'fr-FR', label: 'French' },
		{ value: 'de-DE', label: 'German' },
		{ value: 'it-IT', label: 'Italian' },
		{ value: 'pt-PT', label: 'Portuguese' },
		{ value: 'ja-JP', label: 'Japanese' },
		{ value: 'ko-KR', label: 'Korean' },
		{ value: 'zh-CN', label: 'Chinese (Simplified)' },
		{ value: 'zh-TW', label: 'Chinese (Traditional)' }
	];

	const idleDelayOptions = [
		{ value: 60, label: '1 minute' },
		{ value: 300, label: '5 minutes' },
		{ value: 600, label: '10 minutes' },
		{ value: 900, label: '15 minutes' },
		{ value: 1800, label: '30 minutes' },
		{ value: 3600, label: '1 hour' },
		{ value: 0, label: 'Never' }
	];

	// Form validation schema
	const validationSchema = yup.object().shape({
		showTestNetworks: yup.boolean(),
		theme: yup.string().oneOf(Object.values(SystemTheme)),
		locale: yup.string().required('Locale is required'),
		currency: yup.string().required('Currency is required'),
		idleDelayInterval: yup.number().min(0, 'Idle delay must be 0 or positive'),
		idleAutoLock: yup.boolean(),
		idleAutoLockCycle: yup.number().min(60, 'Auto-lock cycle must be at least 1 minute'),
		showHints: yup.boolean(),
		trialCountdownPinned: yup.boolean()
	});

	// Initialize form
	const { form, errors, isValid, touched, updateField } = createForm({
		initialValues: {
			showTestNetworks: false,
			theme: SystemTheme.SYSTEM,
			locale: 'en-US',
			currency: 'USD',
			idleDelayInterval: 300,
			idleAutoLock: true,
			idleAutoLockCycle: 180,
			showHints: true,
			trialCountdownPinned: false
		},
		validationSchema,
		onSubmit: async (values) => {
			await saveSettings(values);
		}
	});

	// Custom submit handler for Svelte 5
	async function handleFormSubmit(event: Event) {
		event.preventDefault();

		// Validate the form
		if (!$isValid) {
			return;
		}

		// Call saveSettings directly with form values
		await saveSettings($form);
	}

	// Load settings data on mount and when modal opens
	$effect(() => {
		if (show) {
			loadSettingsData();
		}
	});

	// Track form changes
	$effect(() => {
		if (settings && profile && !isLoading) {
			const currentValues = $form;
			// Only track changes if form has been properly initialized
			const originalValues = {
				showTestNetworks: profile.preferences?.showTestNetworks ?? false,
				theme: profile.preferences?.dark ?? SystemTheme.SYSTEM,
				locale: profile.preferences?.locale ?? 'en-US',
				currency: profile.preferences?.currency?.code ?? 'USD',
				idleDelayInterval: profile.preferences?.idleDelayInterval ?? 300,
				idleAutoLock: profile.preferences?.idleAutoLock ?? true,
				idleAutoLockCycle: profile.preferences?.idleAutoLockCycle ?? 180,
				showHints: settings.showHints ?? true,
				trialCountdownPinned: settings.trialCountdownPinned ?? false
			};

			hasChanges =
				currentValues.showTestNetworks !== originalValues.showTestNetworks ||
				currentValues.theme !== originalValues.theme ||
				currentValues.locale !== originalValues.locale ||
				currentValues.currency !== originalValues.currency ||
				currentValues.idleDelayInterval !== originalValues.idleDelayInterval ||
				currentValues.idleAutoLock !== originalValues.idleAutoLock ||
				currentValues.idleAutoLockCycle !== originalValues.idleAutoLockCycle ||
				currentValues.showHints !== originalValues.showHints ||
				currentValues.trialCountdownPinned !== originalValues.trialCountdownPinned;
		} else {
			hasChanges = false;
		}
	});

	async function loadSettingsData() {
		isLoading = true;
		error = '';

		try {
			// Load both settings and profile (for preferences)
			[settings, profile] = await Promise.all([
				getSettings(),
				getProfile()
			]);

			if (!settings) {
				error = 'Settings not found';
				return;
			}

			if (!profile) {
				error = 'Profile not found';
				return;
			}

			// Update form with current settings and preferences
			updateField('showTestNetworks', profile.preferences?.showTestNetworks ?? false);
			updateField('theme', profile.preferences?.dark ?? SystemTheme.SYSTEM);
			updateField('locale', profile.preferences?.locale ?? 'en-US');
			updateField('currency', profile.preferences?.currency?.code ?? 'USD');
			updateField('idleDelayInterval', profile.preferences?.idleDelayInterval ?? 300);
			updateField('idleAutoLock', profile.preferences?.idleAutoLock ?? true);
			updateField('idleAutoLockCycle', profile.preferences?.idleAutoLockCycle ?? 180);
			updateField('showHints', settings.showHints ?? true);
			updateField('trialCountdownPinned', settings.trialCountdownPinned ?? false);

		} catch (e) {
			log.error('Error loading settings data:', false, e);
			error = 'Failed to load settings data';
		} finally {
			isLoading = false;
		}
	}

	async function saveSettings(values: any) {
		if (!settings || !profile) {
			error = 'Settings data not loaded';
			return;
		}

		isSaving = true;
		error = '';
		success = '';

		try {
			// Update settings
			const updatedSettings: Settings = {
				...settings,
				showHints: values.showHints,
				trialCountdownPinned: values.trialCountdownPinned,
				updateDate: new Date().toISOString()
			};

			// Update preferences in profile
			const updatedProfile: Profile = {
				...profile,
				preferences: {
					...profile.preferences,
					showTestNetworks: values.showTestNetworks,
					dark: values.theme,
					locale: values.locale,
					currency: {
						...profile.preferences.currency,
						code: values.currency
					},
					idleDelayInterval: values.idleDelayInterval,
					idleAutoLock: values.idleAutoLock,
					idleAutoLockCycle: values.idleAutoLockCycle,
					updateDate: new Date().toISOString()
				},
				updateDate: new Date().toISOString()
			};

			// Save both settings and profile
			await Promise.all([
				setSettings(updatedSettings),
				setProfileStorage(updatedProfile)
			]);

			// Update local references to reflect saved state
			settings = updatedSettings;
			profile = updatedProfile;

			// Update chain store to reflect test network preference
			chainStore.setShowTestnets(values.showTestNetworks);

			success = 'Settings updated successfully!';
			hasChanges = false;

			// Call completion callback
			onComplete();

			// Call completion callback
			onComplete();

			// Close modal with a small delay to ensure state updates complete
			setTimeout(() => {
				show = false;
				isSaving = false;
			}, 100);

		} catch (e: any) {
			const errorMsg = 'Failed to save settings changes: ' + e.message;
			log.error('Error saving settings:', false, e);
			error = errorMsg;
			isSaving = false;
		}
	}

	function handleClose() {
		if (hasChanges) {
			if (confirm('You have unsaved changes. Are you sure you want to close?')) {
				show = false;
				onClose();
			}
		} else {
			show = false;
			onClose();
		}
	}

	function resetForm() {
		if (settings && profile) {
			updateField('showTestNetworks', profile.preferences?.showTestNetworks ?? false);
			updateField('theme', profile.preferences?.dark ?? SystemTheme.SYSTEM);
			updateField('locale', profile.preferences?.locale ?? 'en-US');
			updateField('currency', profile.preferences?.currency?.code ?? 'USD');
			updateField('idleDelayInterval', profile.preferences?.idleDelayInterval ?? 300);
			updateField('idleAutoLock', profile.preferences?.idleAutoLock ?? true);
			updateField('idleAutoLockCycle', profile.preferences?.idleAutoLockCycle ?? 180);
			updateField('showHints', settings.showHints ?? true);
			updateField('trialCountdownPinned', settings.trialCountdownPinned ?? false);
		}
	}

	function getPlanLabel(planType: PlanType): string {
		switch (planType) {
			case PlanType.BASIC_MEMBER:
				return 'Basic Member';
			case PlanType.FOUNDING_MEMBER:
				return 'Founding Member';
			case PlanType.EARLY_ADOPTER:
				return 'Early Adopter';
			case PlanType.YAKKL_PRO:
				return 'YAKKL Pro';
			case PlanType.ENTERPRISE:
				return 'Enterprise';
			default:
				return 'Unknown';
		}
	}
</script>

<Modal bind:show title="Account Settings" onClose={handleClose} className="max-w-2xl">
	<div class="space-y-6 p-6">
		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				<span class="ml-2 text-gray-600">Loading settings...</span>
			</div>
		{:else}
			<form onsubmit={handleFormSubmit} class="space-y-6">
				<!-- Account Information (Read-only) -->
				{#if settings && profile}
					<div class="bg-gray-50 p-4 rounded-lg">
						<h3 class="text-lg font-medium text-gray-900 mb-3">Account Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-700">Plan:</span>
								<span class="ml-2 text-gray-600">{getPlanLabel(settings.plan.type)}</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Member since:</span>
								<span class="ml-2 text-gray-600">{new Date(settings.createDate).toLocaleDateString()}</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Profile ID:</span>
								<span class="ml-2 text-gray-600 font-mono text-xs">{settings.id.substring(0, 8)}...</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Version:</span>
								<span class="ml-2 text-gray-600">{settings.version}</span>
							</div>
						</div>
					</div>
				{/if}

				<!-- Display & Theme Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Display & Theme</h3>
					<div class="space-y-4">
						<div>
							<label for="theme" class="block text-sm font-medium text-gray-700 mb-1">
								Theme
							</label>
							<select
								id="theme"
								bind:value={$form.theme}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							>
								{#each themeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="flex items-center">
							<input
								id="showTestNetworks"
								type="checkbox"
								bind:checked={$form.showTestNetworks}
								class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
							/>
							<label for="showTestNetworks" class="ml-2 block text-sm text-gray-900">
								Show test networks
							</label>
						</div>

						<div class="flex items-center">
							<input
								id="showHints"
								type="checkbox"
								bind:checked={$form.showHints}
								class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
							/>
							<label for="showHints" class="ml-2 block text-sm text-gray-900">
								Show helpful hints and tips
							</label>
						</div>
					</div>
				</div>

				<!-- Localization Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Localization</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label for="locale" class="block text-sm font-medium text-gray-700 mb-1">
								Language <span class="text-red-500">*</span>
							</label>
							<select
								id="locale"
								bind:value={$form.locale}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								class:border-red-500={$errors.locale && $touched.locale}
							>
								{#each localeOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{#if $errors.locale && $touched.locale}
								<p class="mt-1 text-sm text-red-600">{$errors.locale}</p>
							{/if}
						</div>

						<div>
							<label for="currency" class="block text-sm font-medium text-gray-700 mb-1">
								Currency <span class="text-red-500">*</span>
							</label>
							<select
								id="currency"
								bind:value={$form.currency}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
								class:border-red-500={$errors.currency && $touched.currency}
							>
								{#each currencyOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{#if $errors.currency && $touched.currency}
								<p class="mt-1 text-sm text-red-600">{$errors.currency}</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Security Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Security & Privacy</h3>
					<div class="space-y-4">
						<div>
							<label for="idleDelayInterval" class="block text-sm font-medium text-gray-700 mb-1">
								Auto-lock after idle time
							</label>
							<select
								id="idleDelayInterval"
								bind:value={$form.idleDelayInterval}
								class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							>
								{#each idleDelayOptions as option}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							<p class="mt-1 text-sm text-gray-500">
								Automatically lock the wallet after the specified time of inactivity
							</p>
						</div>

						<div class="flex items-center">
							<input
								id="idleAutoLock"
								type="checkbox"
								bind:checked={$form.idleAutoLock}
								class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
							/>
							<label for="idleAutoLock" class="ml-2 block text-sm text-gray-900">
								Enable automatic idle lock
							</label>
						</div>

						{#if $form.idleAutoLock}
							<div>
								<label for="idleAutoLockCycle" class="block text-sm font-medium text-gray-700 mb-1">
									Auto-lock cycle (seconds)
								</label>
								<input
									id="idleAutoLockCycle"
									type="number"
									bind:value={$form.idleAutoLockCycle}
									min="60"
									max="3600"
									step="60"
									class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
									class:border-red-500={$errors.idleAutoLockCycle && $touched.idleAutoLockCycle}
								/>
								{#if $errors.idleAutoLockCycle && $touched.idleAutoLockCycle}
									<p class="mt-1 text-sm text-red-600">{$errors.idleAutoLockCycle}</p>
								{/if}
								<p class="mt-1 text-sm text-gray-500">
									How often to check for idle activity (minimum 60 seconds)
								</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Notification Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
					<SoundSettings className="mt-4" />
				</div>

				<!-- Trial Settings (if applicable) -->
				{#if settings?.plan?.trialEndDate}
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">Trial Settings</h3>
						<div class="flex items-center">
							<input
								id="trialCountdownPinned"
								type="checkbox"
								bind:checked={$form.trialCountdownPinned}
								class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
							/>
							<label for="trialCountdownPinned" class="ml-2 block text-sm text-gray-900">
								Pin trial countdown to top of interface
							</label>
						</div>
					</div>
				{/if}

				<!-- Status Messages -->
				{#if error}
					<div class="rounded-md bg-red-50 p-4">
						<p class="text-sm font-medium text-red-800">{error}</p>
					</div>
				{/if}

				{#if success}
					<div class="rounded-md bg-green-50 p-4">
						<p class="text-sm font-medium text-green-800">{success}</p>
					</div>
				{/if}

				<!-- Form Actions -->
				<div class="flex justify-between pt-5">
					<button
						type="button"
						onclick={resetForm}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
						disabled={!hasChanges || isSaving}
					>
						Reset
					</button>

					<div class="flex space-x-3">
						<button
							type="button"
							onclick={handleClose}
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
							disabled={isSaving}
						>
							Cancel
						</button>

						<button
							type="submit"
							class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={!$isValid || !hasChanges || isSaving}
						>
							{#if isSaving}
								<span class="flex items-center">
									<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									Saving...
								</span>
							{:else}
								Save Changes
							{/if}
						</button>
					</div>
				</div>

				<!-- Last Updated Info -->
				{#if settings?.updateDate}
					<div class="text-xs text-gray-500 text-center pt-2 border-t">
						Last updated: {new Date(settings.updateDate).toLocaleString()}
					</div>
				{/if}
			</form>
		{/if}
	</div>
</Modal>
