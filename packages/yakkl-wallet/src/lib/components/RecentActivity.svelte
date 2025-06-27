<script lang="ts">
  import MoreLess from "./MoreLess.svelte";
  import { recentTransactions, isLoadingTx } from '../stores/transaction.store';
  import { currentAccount } from '../stores/account.store';
  import type { TransactionDisplay } from '../types';
  import { currentChain } from '../stores/chain.store';

  let { className = '', maxRows = 4 } = $props();

  // Reactive values from stores
  let transactions = $derived($recentTransactions);
  let loading = $derived($isLoadingTx);
  let account = $derived($currentAccount);

  let expanded = $state(false);
  let visible = $derived(expanded ? transactions : transactions.slice(0, maxRows));
  let hidden = $derived(expanded ? [] : transactions.slice(maxRows));

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
    return tx.from.toLowerCase() === account?.address.toLowerCase() ? 'sent' : 'received';
  }

  function getExplorerUrl(txHash: string): string {
    const chain = $currentChain;
    if (!chain) return '#';

    // Use the chain's explorer URL directly
    if (chain.explorerUrl) {
      return `${chain.explorerUrl}/tx/${txHash}`;
    }
    
    // Fallback to Etherscan
    return `https://etherscan.io/tx/${txHash}`;
  }

  function handleTransactionClick(tx: TransactionDisplay) {
    const url = getExplorerUrl(tx.hash);
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
</script>

<div class={`bg-white/70 dark:bg-zinc-800 rounded-2xl shadow p-4 mt-3 relative z-10 ${className}`}>
  <div class="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">Recent Activity</div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(3) as _}
        <div class="flex items-center gap-2 py-2 animate-pulse">
          <div class="w-8 h-4 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
          <div class="flex-1 h-3 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
          <div class="w-16 h-3 bg-zinc-300 dark:bg-zinc-600 rounded"></div>
        </div>
      {/each}
    </div>
  {:else if transactions.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
      <p class="font-medium">No recent activity</p>
      <p class="text-sm mt-2">Your transactions will appear here</p>
    </div>
  {:else}
    <ul class="space-y-1 max-h-44 overflow-y-auto">
      {#each visible as tx}
        {@const direction = getTransactionDirection(tx)}
        {@const isOutgoing = direction === 'sent'}
        <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
        <li
          class="flex items-center gap-2 text-xs border-b border-zinc-100 dark:border-zinc-700 py-2 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
          role="button"
          tabindex="0"
          onclick={() => handleTransactionClick(tx)}
          onkeydown={(e) => e.key === 'Enter' && handleTransactionClick(tx)}
          title={`Transaction: ${tx.hash}\nClick to view on explorer`}
        >
          <!-- Transaction Icon -->
          <span class="text-lg" title={tx.type}>
            {getTransactionIcon(tx.type)}
          </span>

          <!-- Transaction Details -->
          <div class="flex-1 min-w-0">
            {#if tx.type === 'send' || tx.type === 'receive'}
              <div class="flex items-center gap-1">
                <span class="font-bold {isOutgoing ? 'text-red-500' : 'text-green-500'}">
                  {isOutgoing ? '−' : '+'}
                  {formatAmount(tx.value)} ETH
                </span>
              </div>
              <div class="text-gray-400 dark:text-gray-500 truncate">
                {isOutgoing ? 'to' : 'from'} {shortAddress(isOutgoing ? tx.to : tx.from)}
              </div>
            {:else if tx.type === 'swap'}
              <div class="font-bold text-blue-500">Swap</div>
              <div class="text-gray-400 dark:text-gray-500 truncate">
                Contract interaction
              </div>
            {:else}
              <div class="font-bold text-purple-500">Contract</div>
              <div class="text-gray-400 dark:text-gray-500 truncate">
                {shortAddress(tx.to)}
              </div>
            {/if}
          </div>

          <!-- Status Badge -->
          <span class="px-2 py-0.5 rounded-full text-xs {getStatusColor(tx.status)} whitespace-nowrap">
            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
          </span>

          <!-- Transaction Info -->
          <div class="flex items-center gap-1">
            <!-- External link icon -->
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>

            <!-- Timestamp -->
            <span class="text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {formatTime(tx.timestamp)}
            </span>
          </div>
        </li>
      {/each}
    </ul>

    {#if hidden.length > 0}
      <MoreLess
        count={hidden.length}
        text="more"
        lessText="less"
        expanded={expanded}
        className="mt-2"
        onclick={() => expanded = !expanded}
      />
    {/if}
  {/if}
</div>
