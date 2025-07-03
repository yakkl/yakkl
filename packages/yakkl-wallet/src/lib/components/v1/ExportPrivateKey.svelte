<!-- ExportPrivateKey.svelte -->
<script lang="ts">
	import { browserSvelte } from '$lib/utilities/browserSvelte';
	import { getYakklCurrentlySelected, yakklMiscStore } from '$lib/common/stores';
	import { onMount } from 'svelte';
	import { decryptData } from '$lib/common/encryption';
	import {
		isEncryptedData,
		type AccountData,
		type CurrentlySelectedData,
		type EncryptedData,
		type YakklCurrentlySelected
	} from '$lib/common';
	import PincodeVerify from './PincodeVerify.svelte';
	import Modal from './Modal.svelte';
	import { log } from '$lib/managers/Logger';
	import Copy from './Copy.svelte';

	interface Props {
		show?: boolean;
		className?: string;
		onVerify?: () => void;
	}

	let { show = $bindable(false), className = 'z-[999]', onVerify = () => {} }: Props = $props();

	let privateKey = $state('');
	let address: string = $state();
	let showPincodeModal = $state(false);
	let showPrivateKeyModal = $state(false);
	let currentlySelected: YakklCurrentlySelected;

	onMount(async () => {
		if (browserSvelte) {
			currentlySelected = await getYakklCurrentlySelected();
			address = currentlySelected.shortcuts.address;
		}
	});

	async function verifyPincode(pincode: string) {
		try {
			let account;

			if (isEncryptedData(currentlySelected.data)) {
				await decryptData(currentlySelected.data, $yakklMiscStore).then((result) => {
					currentlySelected.data = result as CurrentlySelectedData;
				});
			}
			account = (currentlySelected.data as CurrentlySelectedData).account;

			if (isEncryptedData(account && account.data)) {
				await decryptData(account!.data as EncryptedData, $yakklMiscStore).then((result) => {
					account!.data = result as AccountData;
				});
			}

			privateKey = (account!.data as AccountData).privateKey;
			showPincodeModal = false;
			showPrivateKeyModal = true;
			show = false;

			onVerify(); // Call the onVerify callback - currently does not do anything except set the modal to false
		} catch (e) {
			log.error('Error verifying pincode:', e);
		}
	}

	function closeModal() {
		show = false;
	}
</script>

<div class="relative {className}">
	<PincodeVerify bind:show={showPincodeModal} onVerified={verifyPincode} />

	<Modal
		bind:show={showPrivateKeyModal}
		title="Private Key Export"
		onClose={() => (showPrivateKeyModal = false)}
	>
		<div class="p-6">
			<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
				<p class="text-sm text-red-800 dark:text-red-200">
					<strong>⚠️ Security Warning:</strong> Your PRIVATE KEY should remain PRIVATE. Anyone with access to this key can steal all your funds. Only export if absolutely necessary and store it securely offline.
				</p>
			</div>
			
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Address</label>
					<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300">
						{address}
					</div>
				</div>
				
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Private Key</label>
					<div class="relative">
						<input
							type="password"
							class="w-full p-3 pr-12 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg font-mono text-sm text-gray-700 dark:text-gray-300"
							value={privateKey}
							readonly
						/>
						<Copy
							className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
							target={{
								value: privateKey,
								timeout: 10000,
								redactText: 'Private key copied!'
							}}
						/>
					</div>
					<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
						Click the copy button to copy your private key. It will be cleared from clipboard after 10 seconds for security.
					</p>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
					onclick={() => {
						showPrivateKeyModal = false;
						privateKey = ''; // Clear from memory
					}}>
					Done
				</button>
			</div>
		</div>
	</Modal>

	<Modal bind:show title="Export Private Key" onClose={closeModal}>
		<div class="p-6">
			<div class="mb-6 flex justify-center">
				<div class="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-full">
					<svg class="w-12 h-12 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
				</div>
			</div>
			
			<div class="text-center mb-6">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
					Verification Required
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					To export your private key, please verify your identity with your PIN code.
				</p>
			</div>
			
			<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
				<p class="text-sm text-amber-800 dark:text-amber-200">
					<strong>Note:</strong> Your private key provides full access to your account. Only export it if you need to import this account into another wallet.
				</p>
			</div>
			
			<div class="flex justify-end gap-3">
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
					onclick={closeModal}>
					Cancel
				</button>
				<button
					type="button"
					class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
					onclick={() => {
						show = false;
						showPincodeModal = true;
					}}>
					Continue
				</button>
			</div>
		</div>
	</Modal>
</div>
