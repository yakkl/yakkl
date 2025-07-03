<!-- EditWatchAccount.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './Modal.svelte';
	import ErrorNoAction from './ErrorNoAction.svelte';
	import {
		setProfileStorage,
		getYakklWatchList,
		setYakklWatchListStorage,
		setYakklCurrentlySelectedStorage,
		getYakklCurrentlySelected,
		getMiscStore,
		getSettings
	} from '$lib/common/stores';
	import { encryptData, decryptData } from '$lib/common/encryption';
	import { deepCopy } from '$lib/utilities/utilities';
	import {
		isEncryptedData,
		type CurrentlySelectedData,
		type Profile,
		type ProfileData,
		type Settings,
		type YakklCurrentlySelected,
		type YakklWatch
	} from '$lib/common';
	import { log } from '$lib/common/logger-wrapper';

	interface Props {
		show?: boolean;
		watchAccount?: YakklWatch | null;
		className?: string;
		onCancel?: () => void;
		onComplete?: (watch: YakklWatch) => void;
	}

	let {
		show = $bindable(false),
		watchAccount = null,
		className = 'z-[999]',
		onCancel = () => {},
		onComplete = () => {}
	}: Props = $props();

	let currentlySelected: YakklCurrentlySelected;
	let yakklMiscStore: string;
	let yakklWatchListStore: YakklWatch[];
	let yakklSettingsStore: Settings | null;
	let error = $state('');
	let isSaving = $state(false);
	let showError = $state(false);
	let errorValue = $state('');

	onMount(async () => {
		currentlySelected = await getYakklCurrentlySelected();
		yakklMiscStore = getMiscStore();
		yakklWatchListStore = await getYakklWatchList();
		yakklSettingsStore = await getSettings();
	});

	const validationSchema = yup.object().shape({
		blockchain: yup.string().required('Please enter the crypto account network (watch-only)'),
		address: yup.string().required('Please enter the crypto account (watch-only)'),
		addressName: yup.string().required('Please enter the account name (e.g., address alias)'),
		includeInPortfolio: yup
			.boolean()
			.required('Please select if you want to include this account in your portfolio totals'),
		addressAlias: yup.string().optional(),
		url: yup.string().optional()
	});

	const { form, errors, isValid, touched, updateField } = createForm({
		initialValues: {
			blockchain: 'Ethereum',
			address: '',
			addressName: '',
			includeInPortfolio: false,
			addressAlias: '',
			url: ''
		},
		validationSchema,
		onSubmit: async (data) => {
			await handleUpdateWatch(data);
		}
	});

	// Custom submit handler for Svelte 5
	async function handleFormSubmit(event: Event) {
		event.preventDefault();
		
		// Validate the form
		if (!$isValid) {
			return;
		}
		
		// Call handleUpdateWatch directly with form values
		await handleUpdateWatch($form);
	}

	// Load watch account data when modal opens
	$effect(() => {
		if (show && watchAccount) {
			loadWatchAccountData();
		}
	});

	function loadWatchAccountData() {
		if (!watchAccount) return;

		// Update form with watch account data
		updateField('blockchain', watchAccount.blockchain || 'Ethereum');
		updateField('address', watchAccount.address || '');
		updateField('addressName', watchAccount.name || '');
		updateField('includeInPortfolio', watchAccount.includeInPortfolio || false);
		updateField('addressAlias', watchAccount.addressAlias || '');
		updateField('url', watchAccount.explorer || '');
	}

	async function handleUpdateWatch(data: any) {
		if (!watchAccount) {
			error = 'No watch account selected for editing';
			return;
		}

		isSaving = true;
		error = '';

		try {
			let watchList: YakklWatch[] = [];

			if (isEncryptedData(currentlySelected.data)) {
				await decryptData(currentlySelected.data, yakklMiscStore).then((result) => {
					currentlySelected.data = result as CurrentlySelectedData;
				});
			}

			let profile: Profile = deepCopy((currentlySelected.data as CurrentlySelectedData).profile);
			if (isEncryptedData(profile.data)) {
				await decryptData(profile.data, yakklMiscStore).then((result) => {
					profile.data = result as ProfileData;
				});
			}

			// Update the watch account in profile data
			const profileWatchList = (profile.data as ProfileData).watchList || [];
			const watchIndex = profileWatchList.findIndex(
				(watch: YakklWatch) => 
					watch.address === watchAccount!.address && 
					watch.blockchain === watchAccount!.blockchain
			);

			if (watchIndex !== -1) {
				// Update existing watch account
				const updatedWatch: YakklWatch = {
					...profileWatchList[watchIndex],
					name: data.addressName,
					blockchain: data.blockchain,
					address: data.address,
					includeInPortfolio: data.includeInPortfolio,
					addressAlias: data.addressAlias,
					explorer: data.url,
					updateDate: new Date().toISOString()
				};

				profileWatchList[watchIndex] = updatedWatch;
			}

			// Encrypt and save profile
			await encryptData(profile.data, yakklMiscStore).then(async (result) => {
				profile.data = result;
				await setProfileStorage(profile);
			});

			(currentlySelected.data as CurrentlySelectedData).profile = deepCopy(profile);
			await setYakklCurrentlySelectedStorage(currentlySelected);

			// Update watch list storage
			watchList = await getYakklWatchList();
			if (watchList?.length > 0) {
				const storageWatchIndex = watchList.findIndex(
					(account) => 
						account.address === watchAccount!.address && 
						account.blockchain === watchAccount!.blockchain
				);

				if (storageWatchIndex !== -1) {
					watchList[storageWatchIndex] = {
						...watchList[storageWatchIndex],
						name: data.addressName,
						blockchain: data.blockchain,
						address: data.address,
						includeInPortfolio: data.includeInPortfolio,
						addressAlias: data.addressAlias,
						explorer: data.url,
						updateDate: new Date().toISOString()
					};

					await setYakklWatchListStorage(watchList);
				}
			}

			// Call completion callback
			onComplete(watchAccount);

			// Close modal with a small delay to ensure state updates complete
			setTimeout(() => {
				show = false;
				isSaving = false;
			}, 100);

		} catch (e: any) {
			const errorMsg = 'Error updating watch account: ' + e.message;
			log.error('Error updating watch account:', false, e);
			error = errorMsg;
			errorValue = errorMsg;
			showError = true;
			isSaving = false;
		}
	}

	function closeModal() {
		onCancel();
		resetForm();
		show = false;
	}

	function resetForm() {
		if (watchAccount) {
			loadWatchAccountData();
		}
	}

	function handleErrorClose() {
		showError = false;
		error = '';
		errorValue = '';
	}
</script>

<div class="relative {className}">
	<Modal bind:show title="Edit Watch Account" onClose={closeModal}>
		<div class="p-6">
			<p class="text-sm text-blue-500 mb-4">
				Edit your <strong>WATCH-ONLY address</strong> details. This address allows you to monitor
				balances and transactions without the ability to spend funds.
			</p>
			<form onsubmit={handleFormSubmit} class="space-y-4">
				<div>
					<label for="blockchain" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Blockchain
					</label>
					<select
						id="blockchain"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						bind:value={$form.blockchain}
					>
						<option value="Ethereum">Ethereum</option>
						<option value="Polygon">Polygon</option>
						<option value="Solana">Solana</option>
						<option value="Bitcoin">Bitcoin</option>
					</select>
				</div>
				<div>
					<label for="address" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Address
					</label>
					<input
						type="text"
						id="address"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						bind:value={$form.address}
					/>
					{#if $errors.address}
						<p class="mt-2 text-sm text-red-600">{$errors.address}</p>
					{/if}
				</div>
				<div>
					<label for="addressName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Address Name
					</label>
					<input
						type="text"
						id="addressName"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						bind:value={$form.addressName}
					/>
					{#if $errors.addressName}
						<p class="mt-2 text-sm text-red-600">{$errors.addressName}</p>
					{/if}
				</div>
				<div class="flex items-center">
					<input
						type="checkbox"
						id="includeInPortfolio"
						class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
						bind:checked={$form.includeInPortfolio}
					/>
					<label for="includeInPortfolio" class="ml-2 block text-sm text-gray-700 dark:text-gray-200">
						Include this account in your portfolio totals?
					</label>
				</div>
				<div>
					<label for="addressAlias" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Address Alias (optional)
					</label>
					<input
						type="text"
						id="addressAlias"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						bind:value={$form.addressAlias}
					/>
				</div>
				<div>
					<label for="url" class="block text-sm font-medium text-gray-700 dark:text-gray-200">
						Explorer URL - checking address data (optional)
					</label>
					<input
						type="text"
						id="url"
						class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						bind:value={$form.url}
					/>
				</div>
				<div class="pt-5">
					<div class="flex justify-end space-x-4">
						<button
							type="button"
							class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							onclick={closeModal}
							disabled={isSaving}
						>
							Cancel
						</button>
						<button
							type="button"
							class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
							onclick={resetForm}
							disabled={isSaving}
						>
							Reset
						</button>
						<button
							type="submit"
							class="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={!$isValid || isSaving}
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
			</form>
			{#if error}
				<p class="mt-4 text-sm text-red-600">{error}</p>
			{/if}
		</div>
	</Modal>
</div>

<ErrorNoAction
	bind:show={showError}
	value={errorValue}
	title="Edit Watch Account Error"
	onClose={handleErrorClose}
/>