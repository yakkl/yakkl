<!-- ImportPhrase.svelte -->
<script lang="ts">
	import { createForm } from 'svelte-forms-lib';
	import * as yup from 'yup';
	import Modal from './Modal.svelte';
	import PincodeVerify from './PincodeVerify.svelte';
	import { accountStore } from '$lib/stores/account.store';
	import { yakklCurrentlySelectedStore } from '$lib/common/stores';
	import { get } from 'svelte/store';
	import { NotificationService } from '$lib/common/notifications';
	import { sendToBackground } from '$lib/services/message.service';
	import { AccountTypeCategory } from '$lib/common/types';
	import { getVaultService } from '$lib/services/vault-bridge.service';
	import type { ImportOptions } from '$lib/interfaces/vault.interface';

	interface Props {
		show?: boolean;
		className?: string;
		onComplete?: () => void;
		onCancel?: () => void;
	}

	let {
		show = $bindable(false),
		className = '',
		onComplete = () => {
			showPincodeModal = false;
			show = false;
		},
		onCancel = () => {
			showPincodeModal = false;
			show = false;
		}
	}: Props = $props();

	let error = $state('');
	let isImporting = $state(false);
	let showPincodeModal = $state(false);
	let phraseLength = $state('24');
	let importSubAccounts = $state(true);
	let secretPhrase = '';

	const { form, errors, handleChange, handleSubmit, updateInitialValues } = createForm({
		initialValues: {
			secretPhrase: '',
			accountName: 'Portfolio'
		},
		validationSchema: yup.object().shape({
			secretPhrase: yup
				.string()
				.required('Please enter your secret recovery phrase')
				.test('word-count', 'Invalid phrase length', (value) => {
					const words = value?.trim().split(/\s+/) || [];
					return words.length === parseInt(phraseLength);
				})
				.test('valid-mnemonic', 'Invalid recovery phrase', async (value) => {
					if (!value) return false;
					const response = await sendToBackground({
						type: 'yakkl_validateMnemonic',
						payload: { mnemonic: value }
					});
					return response.success && response.data;
				}),
			accountName: yup.string().required('Please enter an account name')
		}),
		onSubmit: async (data) => {
			secretPhrase = data.secretPhrase;
			showPincodeModal = true;
		}
	});

	async function handlePincodeVerified() {
		showPincodeModal = false;
		error = '';
		isImporting = true;

		try {
			await processSecretPhraseRecovery(secretPhrase, $form.accountName);
			onComplete();
			resetForm();
		} catch (e) {
			error = e instanceof Error ? e.message : 'An error occurred during import';
			showPincodeModal = false;
		} finally {
			isImporting = false;
		}
	}

	async function processSecretPhraseRecovery(phrase: string, accountName: string) {
		// Normalize phrase
		const normalizedPhrase = phrase.trim().split(/\s+/).join(' ');

		// Step 1: Import seed phrase to vault (secure storage)
		const vaultService = getVaultService();
		await vaultService.initialize();
		
		const importOptions: ImportOptions = {
			type: 'seed',
			data: normalizedPhrase,
			label: accountName || 'Imported Wallet'
		};
		
		const vaultId = await vaultService.importToVault(importOptions);
		
		// Step 2: Derive the first account from the vault
		const derivedAccount = await vaultService.deriveAccount(vaultId, {
			startIndex: 0,
			label: accountName
		});

		// Step 3: Register the account with the existing system for backward compatibility
		const response = await sendToBackground({
			type: 'yakkl_deriveAccountFromPhrase',
			payload: {
				accountName,
				alias: '',
				mnemonic: normalizedPhrase,
				accountIndex: 0
			}
		});

		if (!response.success) {
			const errorMessage = typeof response.error === 'object' && response.error?.message
				? response.error.message
				: 'Failed to import recovery phrase';
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
				accountType: AccountTypeCategory.PRIMARY,
				quantity: '0'
			}
		};
		yakklCurrentlySelectedStore.set(updatedCurrentlySelected);


		// Reload accounts in the account store
		await accountStore.loadAccounts();

		// Show success notification
		const notificationModule = await import('$lib/services/notification.service');
		notificationModule.notificationService.show({
			title: 'Success',
			message: 'Recovery phrase imported successfully',
			type: 'success'
		});
	}

	function resetForm() {
		updateInitialValues({
			secretPhrase: '',
			accountName: 'Portfolio'
		});
		error = '';
		secretPhrase = '';
	}

	function handleClose() {
		resetForm();
		showPincodeModal = false;
		onCancel();
	}
</script>

{#if showPincodeModal}
	<PincodeVerify
		bind:show={showPincodeModal}
		onVerified={handlePincodeVerified}
		onRejected={() => {
			showPincodeModal = false;
			error = 'PIN verification cancelled';
		}}
	/>
{/if}

<Modal bind:show title="Import Recovery Phrase" onClose={handleClose} {className}>
	{#snippet children()}
		<div class="space-y-4">
			<div class="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
				<p class="text-sm text-amber-700 dark:text-amber-300">
					<strong>Security Notice:</strong> Your secret recovery phrase gives full access to your wallet.
					Never share it with anyone and ensure you're on the official YAKKL wallet.
				</p>
			</div>

			<form onsubmit={handleSubmit} class="space-y-4">
				<fieldset>
					<legend class="block text-sm font-medium mb-2">
						Phrase Length
					</legend>
					<div class="flex gap-4">
						<label class="flex items-center">
							<input
								type="radio"
								bind:group={phraseLength}
								value="12"
								class="mr-2"
							/>
							12 words
						</label>
						<label class="flex items-center">
							<input
								type="radio"
								bind:group={phraseLength}
								value="24"
								class="mr-2"
							/>
							24 words
						</label>
					</div>
				</fieldset>

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
					<label for="secretPhrase" class="block text-sm font-medium mb-1">
						Secret Recovery Phrase <span class="text-red-500">*</span>
					</label>
					<textarea
						id="secretPhrase"
						rows="4"
						class="w-full px-3 py-2 border border-neutral-light dark:border-neutral-dark rounded-lg
						       bg-surface-light dark:bg-surface-dark focus:ring-2 focus:ring-accent-primary
						       text-primary-light dark:text-primary-dark font-mono text-sm"
						placeholder={`Enter your ${phraseLength}-word recovery phrase`}
						bind:value={$form.secretPhrase}
						onchange={handleChange}
						disabled={isImporting}
					></textarea>
					{#if $errors.secretPhrase}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.secretPhrase}</p>
					{/if}
				</div>

				<div>
					<label class="flex items-center">
						<input
							type="checkbox"
							bind:checked={importSubAccounts}
							class="mr-2"
							disabled={isImporting}
						/>
						<span class="text-sm">Import sub-accounts with balance</span>
					</label>
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
				onclick={handleSubmit}
				disabled={isImporting}
			>
				{isImporting ? 'Importing...' : 'Next'}
			</button>
		</div>
	{/snippet}
</Modal>
