<script lang="ts">
  import { accounts, currentAccount, accountStore } from '$lib/stores/account.store';
  import { uiStore } from '$lib/stores/ui.store';
  import { goto } from '$app/navigation';
  import { displayTokens } from '$lib/stores/token.store';
  import Modal from '@yakkl/ui/src/components/Modal.svelte';
  import ProtectedValue from './ProtectedValue.svelte';
  // import EditControls from './EditControls.svelte'; // TODO: Component missing, needs to be created
  import type { AccountDisplay } from '$lib/types';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
  import { DecimalMath } from '$lib/common/DecimalMath';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let allAccounts = $derived($accounts);
  let current = $derived($currentAccount);
  let tokens = $derived($displayTokens);
  let editingAccount = $state<any>(null);
  let showOptions = $state<Record<string, boolean>>({});
  let editingName = $state('');

  async function selectAccount(account: any) {
    if (account.address === current?.address) {
      // If already selected, close modal and go to home
      onClose();
      await goto('/home');
      return;
    }

    try {
      await accountStore.switchAccount(account.address);
      uiStore.showSuccess('Account Switched', `Now using ${account.ens || account.username || 'account'}`);
      onClose();
      await goto('/home');
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
    editingName = account.ens || account.username || '';
  }

  async function saveAccountName() {
    if (!editingAccount || !editingName.trim()) return;

    try {
      // Update account name
      await accountStore.updateAccountName(editingAccount.address, editingName.trim());
      uiStore.showSuccess('Updated', 'Account name updated successfully');
      editingAccount = null;
    } catch (error) {
      console.error('Failed to update account name:', error);
      uiStore.showError('Update Failed', 'Unable to update account name');
    }
  }

  async function printAccount(account: any) {
    // Store account for emergency kit printing
    sessionStorage.setItem('print-account', account.address);
    window.open('/accounts/print-emergency-kit', '_blank');
  }

  async function exportAccount(account: any) {
    sessionStorage.setItem('export-account', account.address);
    await goto('/accounts/export');
    onClose();
  }

  async function deleteAccount(account: any) {
    if (allAccounts.length <= 1) {
      uiStore.showError('Cannot Delete', 'You must have at least one account');
      return;
    }

    if (confirm(`Are you sure you want to delete ${account.ens || account.username || 'this account'}?`)) {
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

  // Calculate total value for account across all tokens
  // Returns the value as a number for comparisons and formatting
  function getAccountValue(address: string): number {
    if (!tokens || !Array.isArray(tokens)) return 0;

    // In multi-chain view, tokens are already filtered by address
    // In single-chain view, we need to check if this is the current account
    if (address === current?.address) {
      // Use BigInt arithmetic to avoid precision loss, then convert to dollars at the end
      let totalBigInt = 0n;
      
      for (const token of tokens) {
        if (!token.value) continue;
        
        try {
          // Convert value to BigInt for safe arithmetic
          // Token values are typically in cents (multiplied by 100)
          const valueBigInt = BigNumberishUtils.toBigInt(token.value);
          totalBigInt += valueBigInt;
        } catch (e) {
          console.debug('Failed to convert token value to BigInt:', token.value, e);
          // If we can't convert, try to use it as a number if it's safe
          if (typeof token.value === 'number' && Number.isSafeInteger(token.value)) {
            totalBigInt += BigInt(Math.floor(token.value));
          }
        }
      }
      
      // Convert from cents (or smallest unit) to dollars for display
      // This is safe because we're dividing by 100, making the number smaller
      return Number(totalBigInt) / 100;
    }

    // For other accounts, we don't have their balance data
    return 0;
  }

  // Get total token count for account
  function getTokenCount(address: string): number {
    if (!tokens || !Array.isArray(tokens) || address !== current?.address) return 0;

    return tokens.filter(token => {
      // Simple approach: get the balance/qty value and check if > 0
      // Handle both TokenDisplay (with qty) and TokenCache (with balance) types
      let amount: any = 0;
      if ('qty' in token) {
        amount = token.qty;
      } else if ('balance' in token) {
        amount = token.balance;
      }
      
      // Use BigInt comparison to avoid conversion errors for large values
      // We only need to know if the balance is > 0, not the exact value
      if (amount === null || amount === undefined || amount === 0) {
        return false;
      }
      
      // If it's already a number and safe, use direct comparison
      if (typeof amount === 'number') {
        return amount > 0;
      }
      
      // For BigInt, string, or other types, convert to BigInt for comparison
      try {
        const bigIntAmount = BigNumberishUtils.toBigInt(amount);
        return bigIntAmount > 0n;
      } catch (e) {
        // If conversion fails, assume no balance
        console.debug('Failed to convert amount to BigInt:', amount, e);
        return false;
      }
    }).length;
  }
</script>

<Modal show={true} {onClose} title="Switch Accounts" className="max-w-2xl">
  <div class="max-h-[60vh] overflow-y-auto">
    <!-- Account List -->
    <div class="space-y-3">
      {#if allAccounts.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No accounts found</p>
        </div>
      {:else}
        {#each allAccounts as account}
          {@const isActive = account.address === current?.address}
          {@const value = getAccountValue(account.address)}
          {@const tokenCount = getTokenCount(account.address)}
          <div class="relative group">
            <!-- Account Item -->
            <div
              class="w-full flex items-center gap-3 p-4 rounded-lg transition-all duration-200 {isActive
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-500 shadow-md'
                : 'bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:shadow-md'}">

              <!-- Edit Controls Overlay - TODO: Implement EditControls component -->
              <!-- <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <EditControls
                  controls={['copy', 'edit', 'delete']}
                  onCopy={() => copyAddress(account.address)}
                  onEdit={() => editAccount(account)}
                  onDelete={() => deleteAccount(account)}
                  hasBalance={getAccountValue(account.address) > 0}
                />
              </div> -->

              <!-- Clickable area for account selection -->
              <button
                onclick={() => selectAccount(account)}
                class="flex-1 flex items-center gap-3 text-left pr-24"
                title={isActive ? 'Click to go to home' : 'Click to switch to this account'}
              >
                <!-- Avatar -->
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {account.ens?.[0]?.toUpperCase() || account.username?.[0]?.toUpperCase() || '?'}
                </div>

                <!-- Account Info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-zinc-900 dark:text-white">
                      {account.ens || account.username || 'Account'}
                    </span>
                    {#if isActive}
                      <span class="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">Active</span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-4 mt-1">
                    <div class="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                      <ProtectedValue value={account.address} placeholder="••••••••••••••••" />
                    </div>
                  </div>
                  <div class="flex items-center gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                    {#if isActive && value > 0}
                      <span class="flex items-center gap-1">
                        <span class="font-medium">Value:</span>
                        <ProtectedValue
                          value={`$${value.toFixed(2)}`}
                          placeholder="$•••••"
                        />
                      </span>
                      <span>•</span>
                      <span>{tokenCount} {tokenCount === 1 ? 'token' : 'tokens'}</span>
                    {:else if !isActive}
                      <span class="italic">Switch to view balance</span>
                    {/if}
                  </div>
                </div>
              </button>
            </div>

            <!-- Tooltip on hover -->
            <div class="absolute left-0 right-0 top-full mt-2 z-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200">
              <div class="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 mx-4">
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Full Address:</span>
                    <span class="font-mono ml-2">{account.address}</span>
                  </div>
                  {#if isActive && getAccountValue(account.address) > 0}
                    <div class="flex justify-between items-center">
                      <span class="text-gray-400">Total Value:</span>
                      <span class="font-medium">${getAccountValue(account.address).toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="flex justify-between items-center">
                    <span class="text-gray-400">Type:</span>
                    <span>{account.accountType || 'Standard'}</span>
                  </div>
                </div>
                <div class="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                  {isActive ? 'Click to go to home page' : 'Click to switch to this account'}
                </div>
              </div>
              <!-- Arrow -->
              <div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
            </div>
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

    <!-- Quick Actions -->
    <div class="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
      <div class="flex justify-center gap-3">
        <button
          onclick={() => exportAccount(current)}
          class="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
          disabled={!current}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Export Current
        </button>
        <button
          onclick={() => printAccount(current)}
          class="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors flex items-center gap-2"
          disabled={!current}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Emergency Kit
        </button>
      </div>
    </div>
  </div>
</Modal>

<!-- Edit Account Modal -->
{#if editingAccount}
  <Modal show={true} onClose={() => editingAccount = null} title="Edit Account Name" className="max-w-sm">
    <div class="space-y-4">
      <input
        type="text"
        bind:value={editingName}
        onkeydown={(e) => {
          if (e.key === 'Enter') {
            saveAccountName();
          }
        }}
        class="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Enter account name"
      />

      <div class="flex gap-3">
        <button
          onclick={() => editingAccount = null}
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={saveAccountName}
          class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  </Modal>
{/if}
