<!-- Profile.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './Modal.svelte';
	import Avatar from './Avatar.svelte';
	import ErrorNoAction from './ErrorNoAction.svelte';
	import { getProfile, setProfileStorage, yakklMiscStore } from '$lib/common/stores';
	import { log } from '$lib/common/logger-wrapper';
	import type { Profile, ProfileData } from '$lib/common/interfaces';
	import { decryptData, encryptData } from '$lib/common/encryption';
	import { isEncryptedData } from '$lib/common/misc';
	import { identicon } from '$lib/utilities';

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

	let profile: Profile | null = $state(null);
	let profileData: ProfileData | null = $state(null);
	let isLoading = $state(false);
	let isSaving = $state(false);
	let error = $state('');
	let success = $state('');
	let previewAvatarUrl = $state('');
	let hasChanges = $state(false);
	let showError = $state(false);
	let errorValue = $state('');

	// Form validation schema
	const validationSchema = yup.object().shape({
		username: yup
			.string()
			.required('Username is required')
			.min(3, 'Username must be at least 3 characters')
			.max(30, 'Username must be less than 30 characters')
			.matches(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
		firstName: yup
			.string()
			.required('First name is required')
			.min(1, 'First name is required')
			.max(50, 'First name must be less than 50 characters'),
		lastName: yup
			.string()
			.required('Last name is required')
			.min(1, 'Last name is required')
			.max(50, 'Last name must be less than 50 characters'),
		email: yup
			.string()
			.email('Must be a valid email address')
			.required('Email address is required'),
		bio: yup
			.string()
			.max(500, 'Bio must be less than 500 characters')
			.optional(),
		website: yup
			.string()
			.url('Must be a valid URL')
			.optional()
			.nullable()
			.transform((value) => (value === '' ? null : value)),
		avatarUrl: yup
			.string()
			.url('Must be a valid URL')
			.optional()
			.nullable()
			.transform((value) => (value === '' ? null : value)),
		phone: yup
			.string()
			.matches(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
			.optional()
			.nullable()
			.transform((value) => (value === '' ? null : value)),
		twitter: yup
			.string()
			.matches(/^@?[a-zA-Z0-9_]+$/, 'Invalid Twitter handle')
			.optional()
			.nullable()
			.transform((value) => (value === '' ? null : value))
	});

	// Initialize form
	const { form, errors, isValid, touched, updateField } = createForm({
		initialValues: {
			username: '',
			firstName: '',
			lastName: '',
			email: '',
			bio: '',
			website: '',
			avatarUrl: '',
			phone: '',
			twitter: ''
		},
		validationSchema,
		onSubmit: async (values) => {
			await saveProfile(values);
		}
	});

	// Custom submit handler for Svelte 5
	async function handleFormSubmit(event: Event) {
		event.preventDefault();

		// Validate the form
		if (!$isValid) {
			return;
		}

		// Call saveProfile directly with form values
		await saveProfile($form);
	}

	// Load profile data on mount and when modal opens
	$effect(() => {
		if (show) {
			loadProfileData();
		}
	});

	// Track form changes
	$effect(() => {
		if (profile && profileData && !isLoading) {
			const currentValues = $form;
			// Only track changes if form has been properly initialized
			const originalValues = {
				username: profile.username || '',
				firstName: profileData.name?.first || '',
				lastName: profileData.name?.last || '',
				email: profileData.email || '',
				bio: profileData?.bio as string || '',
				website: profileData?.website as string || '',
				avatarUrl: profileData?.avatarUrl as string || ''
			};

			hasChanges =
				currentValues.username !== originalValues.username ||
				currentValues.firstName !== originalValues.firstName ||
				currentValues.lastName !== originalValues.lastName ||
				currentValues.email !== originalValues.email ||
				currentValues.bio !== originalValues.bio ||
				currentValues.website !== originalValues.website ||
				currentValues.avatarUrl !== originalValues.avatarUrl;

		} else {
			hasChanges = false;
		}
	});

	// Update preview avatar when URL changes
	$effect(() => {
		const avatarUrl = $form.avatarUrl;
		if (avatarUrl && avatarUrl.trim() !== '') {
			previewAvatarUrl = avatarUrl;
		} else {
			previewAvatarUrl = profileData?.avatarUrl as string || identicon(profile?.username || 'default');
		}
	});

	async function loadProfileData() {
		isLoading = true;
		error = '';

		try {
			profile = await getProfile();
			if (!profile) {
				error = 'Profile not found';
				return;
			}

			// Decrypt profile data if encrypted
			if (isEncryptedData(profile.data)) {
				const miscStore = $yakklMiscStore;
				if (!miscStore) {
					error = 'Unable to decrypt profile data';
					return;
				}
				profileData = await decryptData(profile.data, miscStore) as ProfileData;
			} else {
				profileData = profile.data as ProfileData;
			}

			// Update form with profile data
			updateField('username', profile.username || '');
			updateField('firstName', profileData.name?.first || '');
			updateField('lastName', profileData.name?.last || '');
			updateField('email', profileData.email || '');
			updateField('bio', profileData?.bio as string || '');
			updateField('website', profileData?.website as string || '');
			updateField('avatarUrl', profileData?.avatarUrl as string || '');

		} catch (e) {
			log.error('Error loading profile data:', false, e);
			error = 'Failed to load profile data';
		} finally {
			isLoading = false;
		}
	}

	async function saveProfile(values: any) {

		if (!profile || !profileData) {
			error = 'Profile data not loaded';
			return;
		}

		isSaving = true;
		error = '';
		success = '';

		try {
			log.info('[Profile] Starting save with values:', false, values);
			log.info('[Profile] Current state:', false, {
				profile: !!profile,
				profileData: !!profileData,
				miscStore: !!$yakklMiscStore
			});

			// Check if we can encrypt before proceeding
			const miscStore = $yakklMiscStore;
			if (!miscStore) {
				const errorMsg = 'Unable to encrypt profile data - missing encryption key';
				log.error('[Profile] ' + errorMsg, false);
				error = errorMsg;
				errorValue = errorMsg;
				showError = true;
				isSaving = false;
				return;
			}

			// Update profile data
			const updatedProfileData: ProfileData = {
				...profileData,
				name: {
					id: profile.id,
					persona: profile.persona,
					first: values.firstName || '',
					last: values.lastName || ''
				},
				email: values.email || '',
				bio: values.bio || '',
				website: values.website || '',
				avatarUrl: values.avatarUrl || ''
			};

			log.info('[Profile] Created updated profile data:', false, updatedProfileData);

			// Update profile
			const updatedProfile: Profile = {
				...profile,
				username: values.username,
				data: updatedProfileData,
				updateDate: new Date().toISOString()
			};

			log.info('[Profile] Created updated profile:', false, {
				username: updatedProfile.username,
				updateDate: updatedProfile.updateDate
			});

			// Encrypt the data
			log.info('[Profile] Starting encryption...');
			try {
				updatedProfile.data = await encryptData(updatedProfileData, miscStore);
				log.info('[Profile] Encryption successful');
			} catch (encryptError: any) {
				const errorMsg = 'Failed to encrypt profile data: ' + encryptError.message;
				log.error('[Profile] Encryption failed:', false, encryptError);
				error = errorMsg;
				errorValue = errorMsg;
				showError = true;
				isSaving = false;
				return;
			}

			// Save to storage
			log.info('[Profile] Starting storage save...');
			try {
				await setProfileStorage(updatedProfile);
				log.info('[Profile] Storage save successful');
			} catch (saveError: any) {
				const errorMsg = 'Failed to save profile to storage: ' + saveError.message;
				log.error('[Profile] Storage failed:', false, saveError);
				error = errorMsg;
				errorValue = errorMsg;
				showError = true;
				isSaving = false;
				return;
			}

			// Update the local profile and profileData references to reflect saved state
			// Keep profile.data unencrypted for local comparison purposes
			profile = {
				...updatedProfile,
				data: updatedProfileData
			};
			profileData = updatedProfileData;

			success = 'Profile updated successfully!';
			hasChanges = false;

			log.info('[Profile] Profile saved successfully, state updated:', false, {
				hasChanges,
				profile: profile.username,
				profileData: profileData.name
			});

			// Call completion callback
			onComplete();

			// Close modal with a small delay to ensure state updates complete
			log.info('[Profile] Preparing to close modal after successful save');

			// Use setTimeout to ensure state updates are complete
			setTimeout(() => {
				show = false;
				isSaving = false;
			}, 100);

		} catch (e: any) {
			const errorMsg = 'Failed to save profile changes: ' + e.message;
			log.error('[Profile] Unexpected error saving profile:', false, e);
			error = errorMsg;
			errorValue = errorMsg;
			showError = true;
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
		if (profile && profileData) {
			updateField('username', profile.username || '');
			updateField('firstName', profileData.name?.first || '');
			updateField('lastName', profileData.name?.last || '');
			updateField('email', profileData.email || '');
			updateField('bio', profileData?.bio as string || '');
			updateField('website', profileData?.website as string || '');
			updateField('avatarUrl', profileData?.avatarUrl as string || '');
		}
	}

	function handleErrorClose() {
		showError = false;
		error = '';
		errorValue = '';
	}
</script>

<Modal bind:show title="Profile" onClose={handleClose} className="max-w-2xl">
	<div class="space-y-6 p-6">
		{#if isLoading}
			<div class="flex items-center justify-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
				<span class="ml-2 text-gray-600">Loading profile...</span>
			</div>
		{:else}
			<form onsubmit={handleFormSubmit} class="space-y-6">
				<!-- Avatar Section -->
				<div class="flex flex-col items-center space-y-4">
					<div class="text-center">
						<Avatar
							url={previewAvatarUrl}
							userName={$form.firstName || $form.username}
							className="w-24 h-24 rounded-full ring-4 ring-offset-2 ring-indigo-500"
							ariaLabel="Profile Avatar"
						/>
					</div>

					<div class="w-full">
						<label for="avatarUrl" class="block text-sm font-medium text-gray-700 mb-1">
							Avatar URL (optional)
						</label>
						<input
							id="avatarUrl"
							type="url"
							bind:value={$form.avatarUrl}
							placeholder="https://example.com/your-avatar.jpg"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							class:border-red-500={$errors.avatarUrl && $touched.avatarUrl}
						/>
						{#if $errors.avatarUrl && $touched.avatarUrl}
							<p class="mt-1 text-sm text-red-600">{$errors.avatarUrl}</p>
						{/if}
					</div>
				</div>

				<!-- Basic Information -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
							Username <span class="text-red-500">*</span>
						</label>
						<input
							id="username"
							type="text"
							bind:value={$form.username}
							placeholder="your_username"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							class:border-red-500={$errors.username && $touched.username}
						/>
						{#if $errors.username && $touched.username}
							<p class="mt-1 text-sm text-red-600">{$errors.username}</p>
						{/if}
					</div>

					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
							Email <span class="text-red-500">*</span>
						</label>
						<input
							id="email"
							type="email"
							bind:value={$form.email}
							placeholder="your@email.com"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							class:border-red-500={$errors.email && $touched.email}
						/>
						{#if $errors.email && $touched.email}
							<p class="mt-1 text-sm text-red-600">{$errors.email}</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label for="firstName" class="block text-sm font-medium text-gray-700 mb-1">
							First Name <span class="text-red-500">*</span>
						</label>
						<input
							id="firstName"
							type="text"
							bind:value={$form.firstName}
							placeholder="John"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							class:border-red-500={$errors.firstName && $touched.firstName}
						/>
						{#if $errors.firstName && $touched.firstName}
							<p class="mt-1 text-sm text-red-600">{$errors.firstName}</p>
						{/if}
					</div>

					<div>
						<label for="lastName" class="block text-sm font-medium text-gray-700 mb-1">
							Last Name <span class="text-red-500">*</span>
						</label>
						<input
							id="lastName"
							type="text"
							bind:value={$form.lastName}
							placeholder="Doe"
							class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
							class:border-red-500={$errors.lastName && $touched.lastName}
						/>
						{#if $errors.lastName && $touched.lastName}
							<p class="mt-1 text-sm text-red-600">{$errors.lastName}</p>
						{/if}
					</div>
				</div>

				<!-- Optional Fields -->
				<div>
					<label for="website" class="block text-sm font-medium text-gray-700 mb-1">
						Website (optional)
					</label>
					<input
						id="website"
						type="url"
						bind:value={$form.website}
						placeholder="https://your-website.com"
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						class:border-red-500={$errors.website && $touched.website}
					/>
					{#if $errors.website && $touched.website}
						<p class="mt-1 text-sm text-red-600">{$errors.website}</p>
					{/if}
				</div>

				<div>
					<label for="bio" class="block text-sm font-medium text-gray-700 mb-1">
						Bio (optional)
					</label>
					<textarea
						id="bio"
						bind:value={$form.bio}
						rows="3"
						placeholder="Tell us about yourself..."
						class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
						class:border-red-500={$errors.bio && $touched.bio}
					></textarea>
					{#if $errors.bio && $touched.bio}
						<p class="mt-1 text-sm text-red-600">{$errors.bio}</p>
					{/if}
					<p class="mt-1 text-sm text-gray-500">{($form.bio || '').length}/500 characters</p>
				</div>

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
				{#if profile?.updateDate}
					<div class="text-xs text-gray-500 text-center pt-2 border-t">
						Last updated: {new Date(profile.updateDate).toLocaleString()}
					</div>
				{/if}
			</form>
		{/if}
	</div>
</Modal>

<ErrorNoAction
	bind:show={showError}
	value={errorValue}
	title="Profile Save Error"
	onClose={handleErrorClose}
/>
