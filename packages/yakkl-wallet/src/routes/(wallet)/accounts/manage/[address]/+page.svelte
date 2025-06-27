<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { accounts as accountsStore, accountStore } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { ChevronLeft, Edit2, Trash2, Download, Shield, Activity, Globe } from 'lucide-svelte';
  
  let address = $derived($page.params.address);
  let accountsList = $derived($accountsStore);
  let account = $derived(accountsList.find(acc => acc.address === address));
  let chain = $derived($currentChain);
  let editingName = $state(false);
  let newName = $state('');
  
  onMount(() => {
    if (account) {
      newName = account.name || '';
    }
  });
  
  function handleBack() {
    goto('/accounts');
  }
  
  async function updateAccountName() {
    if (newName && newName !== account?.name) {
      // TODO: Implement account name update
      console.log('Update account name:', newName);
    }
    editingName = false;
  }
  
  function handleExport() {
    sessionStorage.setItem('export-account', address);
    goto('/accounts/export');
  }
  
  async function handleDelete() {
    if (confirm('Are you sure you want to remove this account? This action cannot be undone.')) {
      // TODO: Implement account deletion
      console.log('Delete account:', address);
      goto('/accounts');
    }
  }
  
  function getAccountColor(account: any): string {
    if (account?.accountType === 'imported' || account?.tags?.includes('imported')) {
      return 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20';
    } else if (account?.accountType === 'primary' || account?.tags?.includes('primary') || account?.isPrimary) {
      return 'from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20';
    } else if (account?.accountType === 'sub' || account?.tags?.includes('sub')) {
      return 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20';
    }
    return 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700';
  }
</script>

<div class="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-2xl mx-auto">
    <button
      onclick={handleBack}
      class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
    >
      <ChevronLeft class="w-5 h-5" />
      Back to Accounts
    </button>
    
    {#if account}
      <div class="bg-gradient-to-br {getAccountColor(account)} rounded-lg shadow-lg p-6 mb-6">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            {#if editingName}
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  bind:value={newName}
                  class="text-2xl font-bold bg-white dark:bg-gray-800 rounded px-2 py-1 border border-gray-300 dark:border-gray-700"
                  onkeydown={(e) => e.key === 'Enter' && updateAccountName()}
                  onblur={updateAccountName}
                  autofocus
                />
              </div>
            {:else}
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {account.ens || account.name || 'Account'}
                </h1>
                <button
                  onclick={() => editingName = true}
                  class="p-1 hover:bg-white/20 dark:hover:bg-black/20 rounded transition-colors"
                >
                  <Edit2 class="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            {/if}
            <p class="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">{address}</p>
          </div>
          
          <div class="flex gap-2">
            <button
              onclick={handleExport}
              class="p-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-all"
              title="Export Private Key"
            >
              <Download class="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              onclick={handleDelete}
              class="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg shadow hover:shadow-md transition-all"
              title="Remove Account"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Account Type</div>
            <div class="font-semibold">
              {account.accountType === 'imported' ? 'Imported' : 
               account.accountType === 'primary' || account.isPrimary ? 'Primary' :
               account.accountType === 'sub' ? 'Sub-Account' : 'Account'}
            </div>
          </div>
          <div class="bg-white/50 dark:bg-black/20 rounded-lg p-3">
            <div class="text-xs text-gray-600 dark:text-gray-400">Current Network</div>
            <div class="font-semibold">{chain?.name || 'Unknown'}</div>
          </div>
        </div>
      </div>
      
      <!-- Account Security -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <Shield class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Security</h2>
        </div>
        
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">Private Key</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">Export your private key for backup</div>
            </div>
            <button
              onclick={handleExport}
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
            >
              Export
            </button>
          </div>
          
          {#if account.accountType === 'primary' || account.isPrimary}
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Recovery Phrase</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Export your seed phrase (Primary accounts only)</div>
              </div>
              <button
                class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm cursor-not-allowed"
                disabled
              >
                Coming Soon
              </button>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Recent Activity -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <Activity class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
        </div>
        
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <Activity class="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No recent transactions</p>
          <p class="text-sm mt-1">Transactions will appear here once you start using this account</p>
        </div>
      </div>
      
      <!-- Connected Sites -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="flex items-center gap-2 mb-4">
          <Globe class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Connected Sites</h2>
        </div>
        
        {#if account.connectedDomains && account.connectedDomains.length > 0}
          <div class="space-y-2">
            {#each account.connectedDomains as domain}
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span class="text-sm">{domain}</span>
                <button class="text-red-600 dark:text-red-400 text-sm hover:underline">
                  Disconnect
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <Globe class="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No connected sites</p>
            <p class="text-sm mt-1">Sites you connect to will appear here</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="text-center py-12">
        <p class="text-gray-500 dark:text-gray-400">Account not found</p>
        <button
          onclick={handleBack}
          class="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Back to Accounts
        </button>
      </div>
    {/if}
  </div>
</div>