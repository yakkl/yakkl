<!-- ImportPrivateKey.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from '@yakkl/ui/src/components/Modal.svelte';
	import { accountStore } from '$lib/stores/account.store';
	import { yakklCurrentlySelectedStore } from '$lib/common/stores';
	import type { YakklAccount } from '$lib/common/interfaces';
	import { AccountTypeCategory } from '$lib/common/types';
	import { notificationService } from '$lib/services/notification.service';
	import { sendToBackground } from '$lib/services/message.service';
	import { get } from 'svelte/store';

	interface Props {
		show?: boolean;
		className?: string;
		onComplete?: (account: YakklAccount) => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		className = '',
		onComplete = () => {
			show = false;
		},
		onCancel = () => {
			show = false;
		}
	}: Props = $props();

	let error = $state('');
	let isImporting = $state(false);

	const { form, errors, handleChange, handleSubmit, updateInitialValues } = createForm({
		initialValues: {
			accountName: '',
			alias: '',
			privateKey: ''
		},
		validationSchema: yup.object().shape({
			accountName: yup.string().required('Please enter an account name'),
			alias: yup.string(),
			privateKey: yup
				.string()
				.required('Please enter your private key')
				.matches(/^(0x)?[0-9a-fA-F]{64}$/, 'Invalid private key format')
		}),
		onSubmit: async (data) => {
			error = '';
			isImporting = true;
			try {
				await handleImport(data.accountName, data.alias, data.privateKey);
			} catch (e) {
				error = e instanceof Error ? e.message : 'An error occurred during import';
			} finally {
				isImporting = false;
			}
		}
	});

	async function handleImport(accountName: string, alias: string, privateKey: string) {
		// Use background handler for secure import
		const response = await sendToBackground({
			type: 'yakkl_importPrivateKey',
			payload: {
				accountName,
				alias,
				privateKey
			}
		});

		if (!response.success) {
			const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to import private key';
			throw new Error(errorMessage);
		}

		// Update currently selected
		const currentlySelected = get(yakklCurrentlySelectedStore);
		const updatedCurrentlySelected = {
			...currentlySelected,
			shortcuts: {
				...currentlySelected.shortcuts,
				address: response.data.address,
				accountName: response.data.name,
				alias: alias,
				accountType: 'imported' as AccountTypeCategory,
				quantity: '0'
			}
		};
		yakklCurrentlySelectedStore.set(updatedCurrentlySelected);

		// Reload accounts in the account store
		await accountStore.loadAccounts();

		// Show success notification
		await notificationService.show({ message: 'Account imported successfully', type: 'success' });

		// Call onComplete callback
		onComplete(response.data.account as YakklAccount);

		// Reset form
		resetForm();
	}

	function resetForm() {
		updateInitialValues({
			accountName: '',
			alias: '',
			privateKey: ''
		});
		error = '';
	}

	function handleClose() {
		resetForm();
		onCancel();
	}
</script>

<Modal bind:show title="Import Private Key" onClose={handleClose} {className}>
	{#snippet children()}
		<div class="space-y-4">
			<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
				<p class="text-sm text-red-700 dark:text-red-300">
					<strong>Security Warning:</strong> Never share your private key with anyone.
					A bad actor could steal all your funds if they have access to your private key.
				</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="accountName" class="block text-sm font-medium mb-1">
						Account Name <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						id="accountName"
						class="w-full px-3 py-2 border border-neutral-light dark:border-neutral-dark rounded-lg
						       bg-surface-light dark:bg-surface-dark focus:ring-2 focus:ring-accent-primary
						       text-primary-light dark:text-primary-dark"
						bind:value={$form.accountName}
						onchange={handleChange}
						disabled={isImporting}
					/>
					{#if $errors.accountName}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.accountName}</p>
					{/if}
				</div>

				<div>
					<label for="alias" class="block text-sm font-medium mb-1">
						Alias (Optional)
					</label>
					<input
						type="text"
						id="alias"
						class="w-full px-3 py-2 border border-neutral-light dark:border-neutral-dark rounded-lg
						       bg-surface-light dark:bg-surface-dark focus:ring-2 focus:ring-accent-primary
						       text-primary-light dark:text-primary-dark"
						bind:value={$form.alias}
						onchange={handleChange}
						disabled={isImporting}
					/>
				</div>

				<div>
					<label for="privateKey" class="block text-sm font-medium mb-1">
						Private Key <span class="text-red-500">*</span>
					</label>
					<textarea
						id="privateKey"
						rows="3"
						class="w-full px-3 py-2 border border-neutral-light dark:border-neutral-dark rounded-lg
						       bg-surface-light dark:bg-surface-dark focus:ring-2 focus:ring-accent-primary
						       text-primary-light dark:text-primary-dark font-mono text-xs"
						placeholder="Enter your private key (with or without 0x prefix)"
						bind:value={$form.privateKey}
						onchange={handleChange}
						disabled={isImporting}
					></textarea>
					{#if $errors.privateKey}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.privateKey}</p>
					{/if}
				</div>

				{#if error}
					<div class="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
						<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
					</div>
				{/if}
			</form>
		</div>
	{/snippet}

	{#snippet footer()}
		<div class="flex justify-end gap-3">
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium border border-neutral-light dark:border-neutral-dark
				       rounded-lg hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark
				       text-primary-light dark:text-primary-dark transition-colors"
				onclick={handleClose}
				disabled={isImporting}
			>
				Cancel
			</button>
			<button
				type="button"
				class="px-4 py-2 text-sm font-medium border border-neutral-light dark:border-neutral-dark
				       rounded-lg hover:bg-surface-hover-light dark:hover:bg-surface-hover-dark
				       text-primary-light dark:text-primary-dark transition-colors"
				onclick={resetForm}
				disabled={isImporting}
			>
				Reset
			</button>
			<button
				type="submit"
				class="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg
				       hover:bg-accent-hover focus:ring-2 focus:ring-accent-primary
				       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				onclick={(e) => handleSubmit(e)}
				disabled={isImporting}
			>
				{isImporting ? 'Importing...' : 'Import'}
			</button>
		</div>
	{/snippet}
</Modal>
