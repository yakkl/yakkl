<!-- ContactList.svelte -->
<script lang="ts">
	import type { YakklContact } from '$lib/common';
	import ContactForm from './ContactForm.svelte';
	import Confirmation from './Confirmation.svelte';
	import EthereumIcon from '$lib/components/icons/EthereumIcon.svelte';
	import BaseIcon from '$lib/components/icons/BaseIcon.svelte';
	import OptimismIcon from '$lib/components/icons/OptimismIcon.svelte';
	import BitcoinIcon from '$lib/components/icons/BitcoinIcon.svelte';
	import EditControls from './EditControls.svelte';

	interface Props {
		contacts?: YakklContact[];
		onContactSelect?: (contact: YakklContact) => void;
		onContactUpdate?: (contact: YakklContact) => void;
		onContactDelete?: (contact: YakklContact) => void;
	}

	let {
		contacts = [],
		onContactSelect = () => {},
		onContactUpdate = () => {},
		onContactDelete = () => {}
	}: Props = $props();

	let selectedContact: YakklContact | null = $state(null);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);

	function handleEdit(contact: YakklContact) {
		selectedContact = contact;
		showEditModal = true;
	}

	function handleDelete(contact: YakklContact) {
		selectedContact = contact;
		showDeleteModal = true;
	}

	function handleCopy(contact: YakklContact) {
		navigator.clipboard.writeText(contact.address);
	}

	function confirmDelete() {
		if (selectedContact) {
			onContactDelete(selectedContact);
			showDeleteModal = false;
			selectedContact = null;
		}
	}
</script>

<ul class="overflow-hidden">
	{#each contacts as contact}
		<li class="mb-3 relative overflow-hidden">
			<button
				class="w-full flex items-start rounded-lg p-3 transition-colors duration-200 overflow-hidden {contact.blockchain === 'Ethereum'
					? 'bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
					: contact.blockchain === 'Base'
						? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
						: contact.blockchain === 'Optimism'
							? 'bg-red-50 hover:bg-red-100 border border-red-200'
							: contact.blockchain === 'Bitcoin'
								? 'bg-orange-50 hover:bg-orange-100 border border-orange-200'
								: 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}"
				onclick={() => onContactSelect(contact)}
			>
				<div
					class="w-6 h-6 flex items-center justify-center rounded-full {contact.blockchain === 'Ethereum'
						? 'bg-indigo-500'
						: contact.blockchain === 'Base'
							? 'bg-blue-500'
							: contact.blockchain === 'Optimism'
								? 'bg-red-500'
								: contact.blockchain === 'Bitcoin'
									? 'bg-orange-500'
									: 'bg-gray-500'} text-white mr-3 shrink-0"
				>
					{#if contact.blockchain === 'Ethereum'}
						<EthereumIcon className="h-4 w-4" />
					{:else if contact.blockchain === 'Base'}
						<BaseIcon className="h-4 w-4" />
					{:else if contact.blockchain === 'Optimism'}
						<OptimismIcon className="h-4 w-4" />
					{:else if contact.blockchain === 'Bitcoin'}
						<BitcoinIcon className="h-4 w-4" />
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-3 h-3"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>
				<div class="flex-1 min-w-0 overflow-hidden">
					<div class="flex items-center justify-between mb-1">
						<div class="flex items-center space-x-2">
							<h3 class="text-sm font-semibold text-gray-800">
								{contact.blockchain?.toUpperCase() || 'CONTACT'}
							</h3>
							<span class="text-xs px-2 py-1 rounded-full {contact.blockchain === 'Ethereum'
								? 'bg-indigo-100 text-indigo-700'
								: contact.blockchain === 'Base'
									? 'bg-blue-100 text-blue-700'
									: contact.blockchain === 'Optimism'
										? 'bg-red-100 text-red-700'
										: contact.blockchain === 'Bitcoin'
											? 'bg-orange-100 text-orange-700'
											: 'bg-gray-100 text-gray-700'}">
								{contact.blockchain || 'Unknown'}
							</span>
						</div>
					</div>
					<p class="text-sm font-medium text-gray-700 truncate mb-1" title={contact.name}>
						{contact.name}
					</p>
					{#if contact.alias}
						<p class="text-xs text-gray-500 mb-1 truncate" title={contact.alias}>
							Alias: {contact.alias}
						</p>
					{/if}
					<p class="text-xs text-gray-500 font-mono truncate mb-2" title={contact.address}>
						{contact.address}
					</p>
					
					<!-- Contact info badges -->
					<div class="flex items-center space-x-2">
						{#if contact.email}
							<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center">
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
									<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
								</svg>
								Email
							</span>
						{/if}
						{#if contact.phone}
							<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center">
								<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
								</svg>
								Phone
							</span>
						{/if}
					</div>
				</div>
			</button>
			<EditControls
				onEdit={() => handleEdit(contact)}
				onDelete={() => handleDelete(contact)}
				onCopy={() => handleCopy(contact)}
				controls={['copy', 'edit', 'delete']}
			/>
		</li>
	{/each}
</ul>

<ContactForm bind:show={showEditModal} contact={selectedContact} onSubmit={onContactUpdate} />

<Confirmation
	bind:show={showDeleteModal}
	onConfirm={confirmDelete}
	title="Delete Contact"
	message="Are you sure you want to delete this contact? This action cannot be undone."
/>
