<!-- Contacts.svelte -->
<script lang="ts">
	import { setYakklContactsStorage, yakklContactsStore } from '$lib/common/stores';
	import { type YakklContact } from '$lib/common';
	import Modal from './Modal.svelte';
	import ContactList from './ContactList.svelte';
	import ContactForm from './ContactForm.svelte';

	interface Props {
		show?: boolean;
		onContactSelect?: ((contact: YakklContact) => void) | null;
		className?: string;
	}

	let { show = $bindable(false), onContactSelect = null, className = 'z-[899]' }: Props = $props();

	let showAddModal = $state(false);
	let contacts: YakklContact[] = $state([]);

	$effect(() => {
		contacts = $yakklContactsStore;
	});

	function handleContactSelect(selectedContact: YakklContact) {
		if (onContactSelect !== null) {
			onContactSelect(selectedContact);
		}
		show = false;
	}

	function handleContactAdd(contact: YakklContact) {
		yakklContactsStore.update((contacts) => [...contacts, contact]);
		setYakklContactsStorage($yakklContactsStore); // Save to local storage - make sure contact is saved. If not then it will be lost.
		showAddModal = false;
	}

	function handleContactDelete(deletedContact: YakklContact) {
		yakklContactsStore.update((contacts) => {
			const updatedContacts = contacts.filter((c) => c.address !== deletedContact.address);
			setYakklContactsStorage(updatedContacts);
			return updatedContacts;
		});
	}

	function handleContactUpdate(updatedContact: YakklContact) {
		yakklContactsStore.update((contacts) => {
			const updatedContacts = contacts.map((c) =>
				c.address === updatedContact.address ? updatedContact : c
			);
			setYakklContactsStorage(updatedContacts);
			return updatedContacts;
		});
	}

	function closeModal() {
		show = false;
	}
</script>

<!-- <div class="relative {className}"> -->
<Modal
	bind:show
	title="Contact List"
	description="Select the contact you wish to send/transfer to"
	onClose={closeModal}
	{className}
>
	<div class="p-4">
		{#if $yakklContactsStore.length > 0}
			<!-- Contact list with AccountListing-style cards -->
			<div class="space-y-3 mb-4">
				<ContactList
					{contacts}
					onContactSelect={handleContactSelect}
					onContactUpdate={handleContactUpdate}
					onContactDelete={handleContactDelete}
				/>
			</div>
		{:else}
			<!-- Empty state with modern styling -->
			<div class="text-center py-12">
				<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
					<svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-700 mb-2">No Contacts Yet</h3>
				<p class="text-gray-500 mb-6">Add your first contact to make sending payments easier</p>
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="border-t border-gray-200 pt-4">
			<button
				onclick={() => (showAddModal = true)}
				class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
				</svg>
				<span>Add New Contact</span>
			</button>
			
			<div class="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
				<div class="flex items-center">
					<div class="flex-shrink-0">
						<svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="ml-2">
						<p class="text-xs text-blue-800">
							Selected contacts will be used for sending and transferring funds
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</Modal>
<!-- </div> -->

<ContactForm bind:show={showAddModal} onSubmit={handleContactAdd} />
