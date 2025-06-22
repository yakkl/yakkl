<!-- Accounts2.svelte -->
<script lang="ts">
	import {
		yakklAccountsStore,
		yakklCurrentlySelectedStore,
		setYakklCurrentlySelectedStorage
	} from '$lib/common/stores';
	import { YAKKL_ZERO_ADDRESS } from '$lib/common/constants';
	import type { YakklAccount } from '$lib/common';
	import Modal from './Modal.svelte';
	import AccountListing from './AccountListing.svelte';
	import { openModal } from '$lib/common/stores/modal';
	import { log } from '$lib/managers/Logger';
	import { dateString } from '$lib/common/datetime';

	interface Props {
		account?: YakklAccount | null;
		show?: boolean;
		onAccountSelect?: ((account: YakklAccount) => void) | null;
		onClose?: (() => void) | null;
		className?: string;
	}

	let {
		account = $bindable(null),
		show = $bindable(false),
		onAccountSelect = null,
		onClose = null,
		className = 'z-[999]'
	}: Props = $props();

	// Not using onCancel here but letting it fall through to the Modal component since we don't need to do anything special
	// export let onCancel: () => void = () => {show = false};

	async function handleAccountSelect(selectedAccount: YakklAccount) {
		try {
			log.info('[Accounts] Account selected:', false, {
				name: selectedAccount.name,
				address: selectedAccount.address,
				type: selectedAccount.accountType,
				currentShowState: show
			});

			// Update local binding if provided
			if (account !== null) {
				account = selectedAccount;
			}

			// Call parent callback if provided
			if (onAccountSelect !== null) {
				onAccountSelect(selectedAccount);
			}

			// Most importantly: update the global currently selected store
			const currentlySelected = $yakklCurrentlySelectedStore;
			if (currentlySelected) {
				// Update the shortcuts with the new account information
				const updatedCurrentlySelected = {
					...currentlySelected,
					shortcuts: {
						...currentlySelected.shortcuts,
						address: selectedAccount.address,
						accountName: selectedAccount.name,
						accountType: selectedAccount.accountType,
						alias: selectedAccount.alias,
						// Reset quantity to trigger balance refresh
						quantity: 0n,
						// Update primary account reference if it's a sub-account
						primary: selectedAccount.accountType === 'sub' ? selectedAccount.primaryAccount : null
					},
					updateDate: dateString()
				};

				// Save to storage and update store
				await setYakklCurrentlySelectedStorage(updatedCurrentlySelected);

				log.info('[Accounts] Successfully updated currently selected account, closing modal');
			} else {
				log.warn('[Accounts] No currently selected store found, cannot update account');
			}

			// Force close the modal using both methods
			show = false;
			if (onClose) {
				onClose();
			}
			log.info('[Accounts] Modal show state set to false:', false, { show });
		} catch (error) {
			log.error('[Accounts] Failed to update selected account:', false, error);
			show = false;
			if (onClose) {
				onClose();
			}
		}
	}

	// Handle upgrade flow
	function handleUpgrade() {
		// Close this modal and trigger upgrade flow
		show = false;
		// Open the upgrade modal using the same system as PlanBadge
		openModal('upgrade');
	}

	// Close the modal without calling onCancel
	function closeModal() {
		show = false;
		if (onClose) {
			onClose();
		}
	}
</script>

<div class="relative {className}">
	<Modal
		bind:show
		title="Account List"
		description="Select the account you wish to make current"
		onClose={closeModal}
		onCancel={closeModal}
	>
		<div class="border-t border-b border-gray-500 py-4">
			<AccountListing
				accounts={$yakklAccountsStore}
				onAccountSelect={handleAccountSelect}
				onUpgrade={handleUpgrade}
			/>

			{#if $yakklCurrentlySelectedStore && $yakklCurrentlySelectedStore.shortcuts.address === YAKKL_ZERO_ADDRESS}
				<p class="text-lg font-bold text-red-500">
					There are no Portfolio Accounts to display! Create at least one Portfolio account!
				</p>
			{/if}
		</div>

		{#snippet footer()}
			<p class="text-sm text-gray-500">
				Whatever account you select will become your <span class="font-bold underline">active</span>
				account!
			</p>
		{/snippet}
	</Modal>
</div>
