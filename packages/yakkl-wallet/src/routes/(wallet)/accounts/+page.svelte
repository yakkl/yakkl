<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { accounts as accountsStore, currentAccount, accountStore } from '$lib/stores/account.store';
  import { Copy, Plus, Download, Upload, MoreVertical, Check } from 'lucide-svelte';
  import { get } from 'svelte/store';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  let accountsList = $derived($accountsStore);
  let selectedAccount = $derived($currentAccount);
  let showMenu = $state<string | null>(null);
  let copiedAddress = $state<string | null>(null);

  onMount(() => {
    // Load accounts on mount
    accountStore.loadAccounts();

    // Click outside handler to close menu
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        showMenu = null;
      }
    }

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  async function switchAccount(account: any) {
    await accountStore.switchAccount(account.address);
  }

  function shortAddr(addr: string) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    copiedAddress = address;
    setTimeout(() => {
      copiedAddress = null;
    }, 2000);
  }

  function toggleMenu(address: string) {
    showMenu = showMenu === address ? null : address;
  }

  function handleExport(account: any) {
    showMenu = null;
    // Store the account to export in a temporary location
    sessionStorage.setItem('export-account', account.address);
    goto('/accounts/export');
  }

  function getAccountColor(account: any): string {
    // Ensure tags is an array before using includes
    const tags = Array.isArray(account.tags) ? account.tags : [];

    // Color coding based on account type
    if (account.accountType === 'imported' || tags.includes('imported')) {
      return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
    } else if (account.accountType === 'primary' || tags.includes('primary') || account.isPrimary) {
      return 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800';
    } else if (account.accountType === 'sub' || tags.includes('sub')) {
      return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
    }
    // Default color
    return 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-700';
  }

  function getAccountTypeLabel(account: any): string {
    // Ensure tags is an array before using includes
    const tags = Array.isArray(account.tags) ? account.tags : [];

    if (account.accountType === 'imported' || tags.includes('imported')) {
      return 'Imported';
    } else if (account.accountType === 'primary' || tags.includes('primary') || account.isPrimary) {
      return 'Primary';
    } else if (account.accountType === 'sub' || tags.includes('sub')) {
      return 'Sub-Account';
    }
    return 'Account';
  }

  function getAccountIcon(account: any): string {
    // Ensure tags is an array before using includes
    const tags = Array.isArray(account.tags) ? account.tags : [];

    if (account.accountType === 'imported' || tags.includes('imported')) {
      return '📥';
    } else if (account.accountType === 'primary' || tags.includes('primary') || account.isPrimary) {
      return '👑';
    } else if (account.accountType === 'sub' || tags.includes('sub')) {
      return '🔗';
    }
    return '👤';
  }

  async function handleAccountClick(account: any) {
    // If clicking the currently selected account, navigate to manage page
    if (account.address === selectedAccount?.address) {
      goto(`/accounts/manage/${account.address}`);
    } else {
      // Otherwise, switch to this account
      await switchAccount(account);
    }
  }

  async function handleRemove(account: any) {
    showMenu = null;

    // Don't allow removing the current account
    if (account.address === selectedAccount?.address) {
      alert('Cannot remove the current account. Please switch to another account first.');
      return;
    }

    // Don't allow removing the last account
    if (accountsList.length <= 1) {
      alert('Cannot remove the last account.');
      return;
    }

    if (confirm(`Are you sure you want to remove "${account.ens || account.username || 'this account'}"? This action cannot be undone.`)) {
      const success = await accountStore.removeAccount(account.address);
      if (!success) {
        const state = get(accountStore);
        alert(state.error?.message || 'Failed to remove account');
      }
    }
  }
</script>

<div class="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-md mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
      <div class="flex gap-2">
        <button
          onclick={() => goto('/accounts/import')}
          class="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-all"
          title="Import Account"
        >
          <Upload class="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          onclick={() => goto('/accounts/create-new')}
          class="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow hover:shadow-lg transition-all"
          title="Create Account"
        >
          <Plus class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div class="space-y-3">
      {#if accountsList.length === 0}
        <div class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 mb-4">No accounts found</p>
          <button
            onclick={() => goto('/accounts/create-new')}
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Your First Account
          </button>
        </div>
      {:else}
        {#each accountsList as account, index}
          <div class="group relative">
            <!-- Main Account Card -->
            <div class="bg-gradient-to-br {getAccountColor(account)} border rounded-lg shadow hover:shadow-xl transition-all duration-300 p-4 relative hover:scale-[1.02]">
              <div class="flex items-center justify-between">
                <button
                  onclick={() => handleAccountClick(account)}
                  class="flex-1 text-left"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div class="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center text-2xl shadow-md">
                        {getAccountIcon(account)}
                      </div>
                      <div class="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium shadow">
                        {index + 1}
                      </div>
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="font-semibold text-gray-900 dark:text-gray-100">
                          {account.ens || account.username || 'Account'}
                        </div>
                        <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-white/50 dark:bg-black/20">
                          {getAccountTypeLabel(account)}
                        </span>
                      </div>
                      <div class="text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {shortAddr(account.address)}
                      </div>
                      {#if account.balance || account.value}
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Balance: ${account.value ? BigNumberishUtils.toNumber(account.value).toFixed(2) : '0.00'}
                        </div>
                      {/if}
                    </div>
                  </div>
                </button>

              <div class="flex items-center gap-2">
                {#if account.address === selectedAccount?.address}
                  <span class="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full font-medium">
                    Active
                  </span>
                {/if}

                <button
                  onclick={() => copyAddress(account.address)}
                  class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                  title={copiedAddress === account.address ? "Copied!" : "Copy Address"}
                >
                  {#if copiedAddress === account.address}
                    <Check class="w-4 h-4 text-green-500 animate-scale-in" />
                  {:else}
                    <Copy class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  {/if}
                </button>

                <div class="relative">
                  <button
                    onclick={() => toggleMenu(account.address)}
                    class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <MoreVertical class="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>

                  {#if showMenu === account.address}
                    <div class="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <button
                        onclick={() => handleExport(account)}
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                      >
                        <div class="flex items-center gap-2">
                          <Download class="w-4 h-4" />
                          Export Private Key
                        </div>
                      </button>
                      <button
                        onclick={() => handleRemove(account)}
                        class="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-b-lg"
                      >
                        Remove Account
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            </div>

            <!-- Hover Tooltip with Details -->
            <div class="absolute left-0 right-0 top-full mt-2 z-20 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
                <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">Account Details</h4>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Type:</span>
                    <span class="font-medium">{getAccountTypeLabel(account)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600 dark:text-gray-400">Address:</span>
                    <span class="font-mono text-xs">{account.address}</span>
                  </div>
                  {#if account.createdAt || account.createDate}
                    <div class="flex justify-between">
                      <span class="text-gray-600 dark:text-gray-400">Created:</span>
                      <span>{new Date(account.createdAt || account.createDate).toLocaleDateString()}</span>
                    </div>
                  {/if}
                  {#if account.chainIds}
                    <div class="flex justify-between">
                      <span class="text-gray-600 dark:text-gray-400">Chains:</span>
                      <span>{account.chainIds.length} supported</span>
                    </div>
                  {/if}
                  <div class="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onclick={() => handleAccountClick(account)}
                      class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 text-xs"
                    >
                      {account.address === selectedAccount?.address ? 'Click to manage account →' : 'Click to switch to this account →'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  @keyframes scale-in {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  :global(.animate-scale-in) {
    animation: scale-in 0.3s ease-out;
  }
</style>
