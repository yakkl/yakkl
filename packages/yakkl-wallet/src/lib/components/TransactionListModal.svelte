<!-- TransactionListModal.svelte - Modal to show all transactions for an account -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import ProtectedValue from './ProtectedValue.svelte';
  import TransactionDetailModal from './TransactionDetailModal.svelte';
  import type { TransactionDisplay } from '$lib/types';
  import type { YakklAccount as Account } from '$lib/types';
  import { uiStore } from '$lib/stores/ui.store';
  
  interface Props {
    show?: boolean;
    account: Account;
    chainId: number;
    chainName: string;
    transactions: TransactionDisplay[];
    ethPrice?: number;
    onClose?: () => void;
  }
  
  let {
    show = false,
    account,
    chainId,
    chainName,
    transactions = [],
    ethPrice = 0,
    onClose
  }: Props = $props();
  
  let selectedTransaction = $state<TransactionDisplay | null>(null);
  let showDetailModal = $state(false);
  let sortNewestFirst = $state(true);
  
  // Sort transactions
  let sortedTransactions = $derived.by(() => {
    const txs = [...transactions];
    return sortNewestFirst 
      ? txs.sort((a, b) => b.timestamp - a.timestamp)
      : txs.sort((a, b) => a.timestamp - b.timestamp);
  });
  
  // Calculate account total
  let accountTotal = $derived.by(() => {
    return transactions.reduce((total, tx) => {
      const isOutgoing = tx.from.toLowerCase() === account.address.toLowerCase();
      const value = parseFloat(tx.value) || 0;
      return total + (isOutgoing ? -value : value);
    }, 0);
  });
  
  function formatAmount(value: string): string {
    try {
      const num = parseFloat(value);
      if (num < 0.0001) {
        return num.toExponential(2);
      }
      return num.toFixed(4);
    } catch {
      return value;
    }
  }
  
  function calculateFiatValue(ethAmount: string): number {
    try {
      const amount = parseFloat(ethAmount);
      return amount * ethPrice;
    } catch {
      return 0;
    }
  }
  
  function formatFiatValue(value: number): string {
    if (value === 0) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  function shortAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  function getTransactionDirection(tx: TransactionDisplay): 'sent' | 'received' {
    return tx.from.toLowerCase() === account.address.toLowerCase() ? 'sent' : 'received';
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  }
  
  function getTransactionIcon(type: string): string {
    switch (type) {
      case 'send':
        return '↗️';
      case 'receive':
        return '↙️';
      case 'swap':
        return '🔄';
      case 'contract':
        return '📄';
      default:
        return '💸';
    }
  }
  
  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      uiStore.showSuccess('Address Copied', 'Address has been copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      uiStore.showError('Copy Failed', 'Failed to copy address to clipboard');
    }
  }
  
  function handleTransactionClick(tx: TransactionDisplay) {
    selectedTransaction = tx;
    showDetailModal = true;
  }
  
  function handleClose() {
    if (onClose) {
      onClose();
    }
  }
</script>

<Modal bind:show onClose={handleClose} width="max-w-3xl">
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          All Transactions
        </h2>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Account: 
          </span>
          <span class="font-mono text-sm text-gray-700 dark:text-gray-300">
            {shortAddress(account.address)}
          </span>
          <button
            onclick={() => copyAddress(account.address)}
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded transition-colors"
            aria-label="Copy address"
            title="Copy address"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            on {chainName}
          </span>
        </div>
      </div>
      
      <!-- Sort toggle -->
      <button
        onclick={() => sortNewestFirst = !sortNewestFirst}
        class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label={sortNewestFirst ? "Sort oldest first" : "Sort newest first"}
        title={sortNewestFirst ? "Currently: Newest first" : "Currently: Oldest first"}
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if sortNewestFirst}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
          {/if}
        </svg>
        <span>{sortNewestFirst ? 'Newest' : 'Oldest'}</span>
      </button>
    </div>
    
    <!-- Summary stats -->
    <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Total Transactions</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">{transactions.length}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Net Change</p>
          <p class="text-lg font-semibold {accountTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
            <ProtectedValue
              value={`${accountTotal >= 0 ? '+' : ''}${formatAmount(accountTotal.toString())} ETH`}
              placeholder="***"
            />
          </p>
        </div>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">USD Value</p>
          <p class="text-lg font-semibold text-gray-900 dark:text-white">
            <ProtectedValue
              value={formatFiatValue(Math.abs(accountTotal) * ethPrice)}
              placeholder="$***"
            />
          </p>
        </div>
      </div>
    </div>
    
    <!-- Transactions list -->
    <div class="max-h-[60vh] overflow-y-auto">
      {#if sortedTransactions.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          No transactions found
        </div>
      {:else}
        <div class="space-y-2">
          {#each sortedTransactions as tx}
            {@const direction = getTransactionDirection(tx)}
            {@const isOutgoing = direction === 'sent'}
            {@const fiatValue = calculateFiatValue(tx.value)}
            <div
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
              role="button"
              tabindex="0"
              onclick={() => handleTransactionClick(tx)}
              onkeydown={(e) => e.key === 'Enter' && handleTransactionClick(tx)}
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <!-- Icon -->
                  <span class="text-2xl" title={tx.type}>
                    {getTransactionIcon(tx.type)}
                  </span>
                  
                  <!-- Transaction details -->
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-base {isOutgoing ? 'text-red-500' : 'text-green-500'}">
                        <ProtectedValue
                          value={`${isOutgoing ? '−' : '+'}${formatAmount(tx.value)} ETH`}
                          placeholder="******* ***"
                        />
                      </span>
                      {#if fiatValue > 0}
                        <span class="text-sm text-gray-500 dark:text-gray-400">
                          <ProtectedValue
                            value={formatFiatValue(fiatValue)}
                            placeholder="$***"
                          />
                        </span>
                      {/if}
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {isOutgoing ? 'To' : 'From'}: {shortAddress(isOutgoing ? tx.to : tx.from)}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatTime(tx.timestamp)}
                    </p>
                  </div>
                </div>
                
                <!-- Status -->
                <div class="text-right">
                  <span class="inline-block px-2 py-1 rounded-full text-xs {getStatusColor(tx.status)}">
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Footer -->
    <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
      <button
        onclick={handleClose}
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
      >
        Close
      </button>
    </div>
  </div>
</Modal>

<!-- Transaction Detail Modal -->
<TransactionDetailModal
  bind:show={showDetailModal}
  transaction={selectedTransaction}
  onClose={() => {
    showDetailModal = false;
    selectedTransaction = null;
  }}
/>