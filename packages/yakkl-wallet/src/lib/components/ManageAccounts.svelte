<script lang="ts">
  import { accounts, currentAccount, accountStore } from '$lib/stores/account.store';
  import { uiStore } from '$lib/stores/ui.store';
  
  let { onClose } = $props();
  
  let allAccounts = $derived($accounts);
  let current = $derived($currentAccount);
  let editingAccount = $state(null);
  let showOptions = $state({});
  
  async function selectAccount(account: any) {
    if (account.address === current?.address) return;
    
    try {
      await accountStore.selectAccount(account.address);
      uiStore.showSuccess('Account Switched', `Now using ${account.name || account.username || 'account'}`);
      onClose();
    } catch (error) {
      console.error('Failed to switch account:', error);
      uiStore.showError('Switch Failed', 'Unable to switch accounts');
    }
  }
  
  function toggleOptions(address: string) {
    showOptions[address] = !showOptions[address];
  }
  
  async function editAccount(account: any) {
    editingAccount = account;
  }
  
  async function deleteAccount(account: any) {
    if (allAccounts.length <= 1) {
      uiStore.showError('Cannot Delete', 'You must have at least one account');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${account.name || account.username || 'this account'}?`)) {
      try {
        await accountStore.deleteAccount(account.address);
        uiStore.showSuccess('Account Deleted', 'Account removed successfully');
      } catch (error) {
        console.error('Failed to delete account:', error);
        uiStore.showError('Delete Failed', 'Unable to delete account');
      }
    }
  }
  
  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      uiStore.showSuccess('Copied', 'Address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
  
  function shortAddr(addr: string) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div class="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
    <!-- Header -->
    <div class="p-6 border-b border-zinc-200 dark:border-zinc-700">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-zinc-900 dark:text-white">Manage Accounts</h2>
        <button
          onclick={onClose}
          class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Account List -->
    <div class="p-6 space-y-3">
      {#if allAccounts.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No accounts found</p>
        </div>
      {:else}
        {#each allAccounts as account}
          {@const isActive = account.address === current?.address}
          <div class="relative">
            <!-- Account Item -->
            <div
              class="w-full flex items-center gap-3 p-4 rounded-lg transition-colors {isActive 
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500' 
                : 'bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}"
            >
              <!-- Clickable area for account selection -->
              <button
                onclick={() => !isActive && selectAccount(account)}
                class="flex-1 flex items-center gap-3 text-left"
                disabled={isActive}
              >
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold">
                  {account.name?.[0]?.toUpperCase() || account.username?.[0]?.toUpperCase() || '?'}
                </div>
                
                <!-- Account Info -->
                <div class="flex-1">
                  <div class="font-medium text-zinc-900 dark:text-white">
                    {account.name || account.username || 'Account'}
                    {#if isActive}
                      <span class="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(Active)</span>
                    {/if}
                  </div>
                  <div class="text-sm text-zinc-500 dark:text-zinc-400">{shortAddr(account.address)}</div>
                </div>
              </button>
              
              <!-- Options Button -->
              <button
                onclick={(e) => {
                  e.stopPropagation();
                  toggleOptions(account.address);
                }}
                class="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
            
            <!-- Options Dropdown -->
            {#if showOptions[account.address]}
              <div class="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10 min-w-[160px]">
                <button
                  onclick={() => {
                    editAccount(account);
                    showOptions[account.address] = false;
                  }}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Name
                </button>
                
                <button
                  onclick={() => {
                    copyAddress(account.address);
                    showOptions[account.address] = false;
                  }}
                  class="w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </button>
                
                <div class="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
                
                <button
                  onclick={() => {
                    deleteAccount(account);
                    showOptions[account.address] = false;
                  }}
                  class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  disabled={allAccounts.length <= 1}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Account
                </button>
              </div>
            {/if}
          </div>
        {/each}
      {/if}
      
      <!-- Add Account Button -->
      <a
        href="/accounts/import"
        class="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
      >
        <svg class="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="text-zinc-600 dark:text-zinc-400">Add New Account</span>
      </a>
    </div>
  </div>
</div>

<!-- Edit Account Modal -->
{#if editingAccount}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
    <div class="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-sm w-full">
      <h3 class="text-lg font-bold text-zinc-900 dark:text-white mb-4">Edit Account Name</h3>
      
      <input
        type="text"
        value={editingAccount.name || editingAccount.username || ''}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            // Save name
            editingAccount = null;
          }
        }}
        class="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter account name"
      />
      
      <div class="flex gap-3 mt-4">
        <button
          onclick={() => editingAccount = null}
          class="flex-1 yakkl-btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          onclick={() => {
            // Save the new name
            editingAccount = null;
          }}
          class="flex-1 yakkl-btn-primary text-sm"
        >
          Save
        </button>
      </div>
    </div>
  </div>
{/if}