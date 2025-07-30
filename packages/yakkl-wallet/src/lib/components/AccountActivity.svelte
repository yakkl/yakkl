<!-- AccountActivity.svelte - Shows transactions for a single account on a single chain -->
<script lang="ts">
  import { uiStore } from '$lib/stores/ui.store';
  import { modalStore } from '$lib/stores/modal.store';
  import ProtectedValue from './ProtectedValue.svelte';
  import type { TransactionDisplay, AccountDisplay } from '$lib/types';

  interface Props {
    account: AccountDisplay;
    chainId: number;
    chainName: string;
    transactions: TransactionDisplay[];
    ethPrice?: number;
    showHeader?: boolean;
    maxTransactions?: number;
    onCopyAddress?: (address: string) => void;
    onTransactionClick?: (transaction: TransactionDisplay) => void;
  }

  let {
    account,
    chainId,
    chainName,
    transactions = [],
    ethPrice = 0,
    showHeader = true,
    maxTransactions = 0,
    onCopyAddress,
    onTransactionClick
  }: Props = $props();

  // Filter transactions for this account and chain
  let accountTransactions = $derived(
    transactions.filter(tx =>
      (tx.from.toLowerCase() === account.address.toLowerCase() ||
       tx.to.toLowerCase() === account.address.toLowerCase()) &&
      tx.chainId === chainId
    )
  );

  // Apply max transactions limit if set
  let displayTransactions = $derived(
    maxTransactions > 0
      ? accountTransactions.slice(0, maxTransactions)
      : accountTransactions
  );

  // Calculate account total value from transactions
  let accountTotal = $derived.by(() => {
    return accountTransactions.reduce((total, tx) => {
      const isOutgoing = tx.from.toLowerCase() === account.address.toLowerCase();
      const value = parseFloat(tx.value) || 0;
      return total + (isOutgoing ? -value : value);
    }, 0);
  });

  function formatAmount(value: string): string {
    try {
      const num = parseFloat(value);
      if (Math.abs(num) < 0.0001 && num !== 0) {
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
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function getTransactionDirection(tx: TransactionDisplay): 'sent' | 'received' {
    return tx.from.toLowerCase() === account.address.toLowerCase() ? 'sent' : 'received';
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
      default:
        return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
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
    if (onCopyAddress) {
      onCopyAddress(address);
    } else {
      try {
        await navigator.clipboard.writeText(address);
        uiStore.showSuccess('Address Copied', 'Address has been copied to clipboard');
      } catch (error) {
        console.error('Failed to copy address:', error);
        uiStore.showError('Copy Failed', 'Failed to copy address to clipboard');
      }
    }
  }

  function handleTransactionClick(tx: TransactionDisplay) {
    if (onTransactionClick) {
      onTransactionClick(tx);
    }
  }

  function getAccountType(): string {
    if (account.accountType === 'imported') return 'Imported';
    if (account.accountType === 'contract') return 'Contract';
    if (account.accountType === 'primary') return 'Primary';
    if (account.accountType === 'sub') return 'Sub-account';
    return 'Account';
  }

  function handleShowAllTransactions() {
    // Open modal with all transactions for this account
    modalStore.openModal('transactionList', {
      account,
      chainId,
      chainName,
      transactions: accountTransactions,
      ethPrice
    });
  }
</script>

<div class="account-activity">
  {#if showHeader}
    <!-- Account header -->
    <div class="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg mb-2 border border-blue-100 dark:border-blue-800/30">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Account:</span>
        <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400" title={account.address}>
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
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-zinc-500 dark:text-zinc-400">Type: {getAccountType()}</span>
        <span class="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {accountTransactions.length} tx{accountTransactions.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  {/if}

  {#if displayTransactions.length === 0}
    <div class="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
      No transactions for this account
    </div>
  {:else}
    <!-- Transactions table -->
    <div class="bg-white/50 dark:bg-zinc-900/30 rounded-lg overflow-hidden">
    <table class="w-full table-fixed">
      <colgroup>
        <col class="w-10" /> <!-- Icon -->
        <col /> <!-- Transaction details -->
        <col class="w-24" /> <!-- Status -->
        <col class="w-24" /> <!-- Time -->
      </colgroup>
      <tbody>
        {#each displayTransactions as tx}
          {@const direction = getTransactionDirection(tx)}
          {@const isOutgoing = direction === 'sent'}
          <tr
            class="border-b border-zinc-100/50 dark:border-zinc-800/50 last:border-b-0 hover:bg-amber-50/20 dark:hover:bg-amber-900/10 cursor-pointer transition-all duration-200"
            role="button"
            tabindex="0"
            onclick={() => handleTransactionClick(tx)}
            onkeydown={(e) => e.key === 'Enter' && handleTransactionClick(tx)}
            title="Click to view transaction details"
          >
            <!-- Icon Column -->
            <td class="py-2 px-1">
              <span class="text-lg block text-center" title={tx.type}>
                {getTransactionIcon(tx.type)}
              </span>
            </td>

            <!-- Transaction Details Column -->
            <td class="py-2 px-2">
              <div class="min-w-0">
                {#if tx.type === 'send' || tx.type === 'receive'}
                  {@const fiatValue = calculateFiatValue(tx.value)}
                  <div class="flex items-start flex-col">
                    <span class="font-bold text-sm {isOutgoing ? 'text-red-500' : 'text-green-500'}">
                      <ProtectedValue
                        value={`${isOutgoing ? '−' : '+'}${formatAmount(tx.value)} ETH`}
                        placeholder="******* ***"
                      />
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 truncate block">
                      {isOutgoing ? 'to' : 'from'} {shortAddress(isOutgoing ? tx.to : tx.from)}
                    </span>
                    {#if fiatValue > 0}
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        <ProtectedValue
                          value={formatFiatValue(fiatValue)}
                          placeholder="$***"
                        />
                      </span>
                    {/if}
                  </div>
                {:else if tx.type === 'swap'}
                  <div class="flex items-start flex-col">
                    <span class="font-bold text-sm text-blue-500">Swap</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 truncate block">
                      Contract interaction
                    </span>
                  </div>
                {:else}
                  <div class="flex items-start flex-col">
                    <span class="font-bold text-sm text-purple-500">Contract</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 truncate block">
                      {shortAddress(tx.to)}
                    </span>
                  </div>
                {/if}
              </div>
            </td>

            <!-- Status Column -->
            <td class="py-2 px-2 text-center">
              <span class="inline-block px-2 py-0.5 rounded-full text-xs mt-1 {getStatusColor(tx.status)} whitespace-nowrap">
                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
              </span>
            </td>

            <!-- Time Column -->
            <td class="py-2 px-2 text-right">
              <div class="flex items-center justify-end gap-1">
                <!-- Info icon -->
                <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {formatTime(tx.timestamp)}
                </span>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    </div>

    {#if maxTransactions > 0 && accountTransactions.length > maxTransactions}
      <!-- Show all transactions link -->
      <div class="mt-3 text-center">
        <button
          onclick={() => handleShowAllTransactions()}
          class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Click to show all {accountTransactions.length} transactions
        </button>
      </div>
    {/if}

    {#if showHeader}
      <!-- Account footer with totals -->
      <div class="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1">
        <div class="flex justify-between items-center text-xs">
          <span class="text-zinc-500 dark:text-zinc-400">Account Total:</span>
          <span class="font-medium text-zinc-700 dark:text-zinc-300">
            {accountTransactions.length} transaction{accountTransactions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div class="flex justify-between items-center text-xs">
          <span class="text-zinc-500 dark:text-zinc-400">Network:</span>
          <span class="font-medium text-zinc-700 dark:text-zinc-300">
            {chainName} (Chain {chainId})
          </span>
        </div>
        {#if accountTotal !== 0}
          <div class="flex justify-between items-center text-xs">
            <span class="text-zinc-500 dark:text-zinc-400">Net Volume:</span>
            <span class="font-medium {accountTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
              <ProtectedValue
                value={`${accountTotal >= 0 ? '+' : ''}${formatAmount(accountTotal.toString())} ETH`}
                placeholder="***"
              />
            </span>
          </div>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Ensure status badges are positioned correctly */
  td span.rounded-full {
    margin-top: 4px;
  }
</style>
