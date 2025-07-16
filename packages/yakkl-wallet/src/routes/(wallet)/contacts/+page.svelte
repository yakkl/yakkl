<script lang="ts">
  import { onMount } from 'svelte';
  import { yakklContactsStore, setYakklContactsStorage } from '$lib/common/stores';
  import { notificationService } from '$lib/services/notification.service';
  import { currentChain } from '$lib/stores/chain.store';
  import { Plus, Search, Trash2, Copy, ExternalLink, User, Pencil } from 'lucide-svelte';
  import type { YakklContact, YakklCurrentlySelected } from '$lib/common/interfaces';
  import { getYakklCurrentlySelected } from '$lib/common/stores';

  // State
  let contacts = $state<YakklContact[]>([]);
  let showAddModal = $state(false);
  let showEditModal = $state(false);
  let editingContact = $state<YakklContact | null>(null);
  let searchQuery = $state('');
  let loading = $state(false);
  let currentlySelected: YakklCurrentlySelected = undefined;

  // Form state
  let formData = $state({
    name: '',
    address: '',
    alias: '',
    chainId: 1,
    note: '',
    blockchain: 'Ethereum',
    addressType: 'EOA'
  });

  // Derived values
  let chain = $derived($currentChain);
  let filteredContacts = $derived(
    contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.alias && contact.alias.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // Watch for store changes
  $effect(() => {
    contacts = $yakklContactsStore || [];
  });

  onMount(async () => {
    // Set default chainId
    if (chain) {
      formData.chainId = chain.chainId;
      currentlySelected = await getYakklCurrentlySelected();
    }
  });

  function resetForm() {
    formData = {
      name: '',
      address: '',
      alias: '',
      chainId: 1,
      note: '',
      blockchain: 'Ethereum',
      addressType: 'EOA'
    };
  }

  function openAddModal() {
    resetForm();
    showAddModal = true;
  }

  function openEditModal(contact: YakklContact) {
    editingContact = contact;
    formData = {
      name: contact.name,
      address: contact.address,
      alias: contact.alias || '',
      chainId: contact.chainId || 1,
      note: contact.note || '',
      blockchain: contact.blockchain || 'Ethereum',
      addressType: contact.addressType || 'EOA'
    };
    showEditModal = true;
  }

  async function handleAdd() {
    if (!formData.name || !formData.address) {
      await notificationService.show({
        message: 'Name and address are required',
        type: 'error'
      });
      return;
    }

    // Validate address format
    if (!formData.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      await notificationService.show({
        message: 'Invalid Ethereum address format',
        type: 'error'
      });
      return;
    }

    // Check if contact already exists
    if (contacts.some(c => c.address.toLowerCase() === formData.address.toLowerCase())) {
      await notificationService.show({
        message: 'Contact with this address already exists',
        type: 'error'
      });
      return;
    }

    loading = true;
    try {
      const newContact: YakklContact = {
        ...formData,
        id: currentlySelected?.id || '',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        version: '1.0.0'
      };

      yakklContactsStore.update(contacts => [...contacts, newContact]);
      await setYakklContactsStorage($yakklContactsStore);

      await notificationService.show({
        message: 'Contact added successfully',
        type: 'success'
      });

      showAddModal = false;
      resetForm();
    } catch (error) {
      await notificationService.show({
        message: 'Failed to add contact',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  async function handleUpdate() {
    if (!formData.name || !formData.address || !editingContact) {
      return;
    }

    loading = true;
    try {
      yakklContactsStore.update(contacts =>
        contacts.map(c =>
          c.id === editingContact.id
            ? { ...c, ...formData, updatedAt: new Date().toISOString() }
            : c
        )
      );
      await setYakklContactsStorage($yakklContactsStore);

      await notificationService.show({
        message: 'Contact updated successfully',
        type: 'success'
      });

      showEditModal = false;
      editingContact = null;
      resetForm();
    } catch (error) {
      await notificationService.show({
        message: 'Failed to update contact',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  async function handleDelete(contact: YakklContact) {
    if (!confirm(`Delete contact "${contact.name}"?`)) {
      return;
    }

    loading = true;
    try {
      yakklContactsStore.update(contacts =>
        contacts.filter(c => c.id !== contact.id)
      );
      await setYakklContactsStorage($yakklContactsStore);

      await notificationService.show({
        message: 'Contact deleted successfully',
        type: 'success'
      });
    } catch (error) {
      await notificationService.show({
        message: 'Failed to delete contact',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      await notificationService.show({
        message: 'Address copied to clipboard',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  function viewOnExplorer(address: string) {
    const explorerUrl = chain?.explorerUrl || 'https://etherscan.io';
    window.open(`${explorerUrl}/address/${address}`, '_blank');
  }

  function shortAddr(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<div class="max-w-[800px] mx-auto p-5 space-y-5">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Contacts</h1>
      <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Save and manage known wallet addresses</p>
    </div>
    <button
      onclick={openAddModal}
      class="yakkl-btn-primary flex items-center gap-2"
    >
      <Plus class="w-4 h-4" />
      Add Contact
    </button>
  </div>

  <!-- Search Bar -->
  <div class="relative">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search by name, address, or ENS..."
      class="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  </div>

  <!-- Contacts List -->
  {#if filteredContacts.length > 0}
    <div class="grid gap-4">
      {#each filteredContacts as contact}
        <div class="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div class="space-y-1">
                <h3 class="font-semibold text-zinc-900 dark:text-white">{contact.name}</h3>
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-mono text-zinc-600 dark:text-zinc-400">{shortAddr(contact.address)}</span>
                  <button
                    onclick={() => copyAddress(contact.address)}
                    class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    title="Copy address"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                  <button
                    onclick={() => viewOnExplorer(contact.address)}
                    class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    title="View on explorer"
                  >
                    <ExternalLink class="w-3 h-3" />
                  </button>
                </div>
                {#if contact.alias}
                  <p class="text-sm text-indigo-600 dark:text-indigo-400">{contact.alias}</p>
                {/if}
                {#if contact.note}
                  <p class="text-sm text-zinc-600 dark:text-zinc-400">{contact.note}</p>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                onclick={() => openEditModal(contact)}
                class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                title="Edit contact"
              >
                <Pencil class="w-4 h-4" />
              </button>
              <button
                onclick={() => handleDelete(contact)}
                class="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                title="Delete contact"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else if searchQuery}
    <div class="text-center py-12">
      <p class="text-zinc-600 dark:text-zinc-400">No contacts found matching "{searchQuery}"</p>
    </div>
  {:else}
    <div class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
        <User class="w-8 h-8 text-zinc-400" />
      </div>
      <h3 class="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">No Contacts Yet</h3>
      <p class="text-zinc-600 dark:text-zinc-400 mb-6">Add your first contact to make sending easier</p>
      <button
        onclick={openAddModal}
        class="yakkl-btn-primary inline-flex items-center gap-2"
      >
        <Plus class="w-4 h-4" />
        Add Your First Contact
      </button>
    </div>
  {/if}

  <!-- Add Contact Modal -->
  {#if showAddModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div class="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">Add Contact</h2>
        <div class="space-y-4">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name *</label>
            <input
              type="text"
              bind:value={formData.name}
              placeholder="John Doe"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Address *</label>
            <input
              type="text"
              bind:value={formData.address}
              placeholder="0x..."
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Alias</label>
            <input
              type="text"
              bind:value={formData.alias}
              placeholder="Optional alias"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
            <textarea
              bind:value={formData.note}
              placeholder="Optional notes..."
              rows="3"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            onclick={() => showAddModal = false}
            class="flex-1 yakkl-btn-secondary"
          >
            Cancel
          </button>
          <button
            onclick={handleAdd}
            disabled={loading || !formData.name || !formData.address}
            class="flex-1 yakkl-btn-primary disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Contact'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Edit Contact Modal -->
  {#if showEditModal}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div class="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-md">
        <h2 class="text-xl font-semibold mb-4">Edit Contact</h2>
        <div class="space-y-4">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name *</label>
            <input
              type="text"
              bind:value={formData.name}
              placeholder="John Doe"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Address *</label>
            <input
              type="text"
              bind:value={formData.address}
              placeholder="0x..."
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              disabled
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Alias</label>
            <input
              type="text"
              bind:value={formData.alias}
              placeholder="Optional alias"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Notes</label>
            <textarea
              bind:value={formData.note}
              placeholder="Optional notes..."
              rows="3"
              class="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button
            onclick={() => {showEditModal = false; editingContact = null;}}
            class="flex-1 yakkl-btn-secondary"
          >
            Cancel
          </button>
          <button
            onclick={handleUpdate}
            disabled={loading || !formData.name || !formData.address}
            class="flex-1 yakkl-btn-primary disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Contact'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
