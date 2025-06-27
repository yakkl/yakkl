<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { ChevronLeft, Plus, AlertTriangle } from 'lucide-svelte';
  import { accountStore } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { 
    getProfile,
    getYakklAccounts,
    setYakklAccountsStorage,
    getYakklPrimaryAccounts,
    yakklMiscStore
  } from '$lib/common/stores';
  import { createPortfolioAccount } from '$lib/managers/networks/ethereum/createPortfolioAccount';
  import { log } from '$lib/common/logger-wrapper';
  
  let isCreating = $state(false);
  let error = $state('');
  let accountName = $state('');
  let accountType = $state<'primary' | 'sub'>('sub');
  let selectedPrimaryAccount = $state('');
  let primaryAccounts = $state<any[]>([]);
  let chain = $derived($currentChain);
  
  onMount(async () => {
    // Load primary accounts for sub-account creation
    const primaries = await getYakklPrimaryAccounts();
    if (primaries && primaries.length > 0) {
      primaryAccounts = primaries;
      selectedPrimaryAccount = primaries[0].address;
    } else {
      // No primary accounts, force primary account creation
      accountType = 'primary';
    }
  });
  
  function handleBack() {
    goto('/accounts');
  }
  
  async function createAccount() {
    if (!accountName.trim()) {
      error = 'Please enter an account name';
      return;
    }
    
    isCreating = true;
    error = '';
    
    try {
      const profile = await getProfile();
      if (!profile) {
        throw new Error('Profile not found');
      }
      
      const miscStore = $yakklMiscStore;
      if (!miscStore) {
        throw new Error('Security key not available');
      }
      
      if (accountType === 'primary') {
        // Create new primary account with new mnemonic
        await createPortfolioAccount(miscStore, profile);
      } else {
        // Create sub-account from selected primary
        const primaryAccount = primaryAccounts.find(p => p.address === selectedPrimaryAccount);
        if (!primaryAccount) {
          throw new Error('Primary account not found');
        }
        
        // TODO: Implement sub-account creation
        throw new Error('Sub-account creation not yet implemented');
      }
      
      // Success - go back to accounts list
      goto('/accounts');
    } catch (err: any) {
      log.error('Account creation error:', err);
      error = err.message || 'Failed to create account';
    } finally {
      isCreating = false;
    }
  }
</script>

<div class="min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
  <div class="max-w-md mx-auto">
    <button
      onclick={handleBack}
      class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors"
    >
      <ChevronLeft class="w-5 h-5" />
      Back
    </button>
    
    <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Create New Account</h1>
    
    {#if error}
      <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div class="flex gap-3">
          <AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p class="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      </div>
    {/if}
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <form onsubmit={(e) => { e.preventDefault(); createAccount(); }} class="space-y-6">
        <!-- Account Name -->
        <div>
          <label for="accountName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account Name
          </label>
          <input
            id="accountName"
            type="text"
            bind:value={accountName}
            placeholder="My Account"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isCreating}
          />
        </div>
        
        <!-- Account Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account Type
          </label>
          <div class="space-y-3">
            {#if primaryAccounts.length > 0}
              <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <input
                  type="radio"
                  name="accountType"
                  value="sub"
                  bind:group={accountType}
                  class="mt-1"
                  disabled={isCreating}
                />
                <div>
                  <div class="font-medium text-gray-900 dark:text-gray-100">Sub-Account</div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    Create a sub-account linked to an existing primary account
                  </div>
                </div>
              </label>
            {/if}
            
            <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="accountType"
                value="primary"
                bind:group={accountType}
                class="mt-1"
                disabled={isCreating}
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-gray-100">Primary Account</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  Create a new primary account with its own recovery phrase
                </div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Primary Account Selection (for sub-accounts) -->
        {#if accountType === 'sub' && primaryAccounts.length > 0}
          <div>
            <label for="primaryAccount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Parent Account
            </label>
            <select
              id="primaryAccount"
              bind:value={selectedPrimaryAccount}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isCreating}
            >
              {#each primaryAccounts as primary}
                <option value={primary.address}>
                  {primary.name} ({primary.address.slice(0, 6)}...{primary.address.slice(-4)})
                </option>
              {/each}
            </select>
          </div>
        {/if}
        
        <!-- Current Network Info -->
        <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div class="text-sm text-gray-600 dark:text-gray-400">Creating account for</div>
          <div class="font-medium text-gray-900 dark:text-gray-100">
            {chain?.name || 'Ethereum'} {chain?.isTestnet ? '(Testnet)' : ''}
          </div>
        </div>
        
        <!-- Warning for Primary Account -->
        {#if accountType === 'primary'}
          <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p class="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> A new recovery phrase will be generated. Make sure to save it securely as it's the only way to recover this account.
            </p>
          </div>
        {/if}
        
        <!-- Actions -->
        <div class="flex gap-3">
          <button
            type="button"
            onclick={handleBack}
            class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isCreating}
          >
            {#if isCreating}
              <svg class="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            {:else}
              <Plus class="w-4 h-4" />
              Create Account
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>