<script lang="ts">
  import MoreLess from "./MoreLess.svelte";
  import { recentTransactions, isLoadingTx, transactionStore } from '../stores/transaction.store';
  // Added: Import all transactions and count for full display
  import { allRecentTransactions, totalTransactionCount } from '../stores/transaction-store-updates';
  import { currentAccount } from '../stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { isMultiChainView, tokens } from '$lib/stores/token.store';
  import type { TransactionDisplay } from '../types';
  // currentChain import removed - now handled in TransactionDetailModal
  import TransactionDetailModal from './TransactionDetailModal.svelte';
  import ProtectedValue from './v1/ProtectedValue.svelte';
  import { uiStore } from '$lib/stores/ui.store';

  // Added: showAll prop to display all transactions instead of limiting
  interface Props {
    className?: string;
    maxRows?: number;
    showAll?: boolean;
    onRefresh?: () => void;
  }

  let { className = '', maxRows = 10, showAll = false, onRefresh }: Props = $props();

  // Reactive values from stores
  // Updated: Use all transactions if showAll is true
  let transactions = $derived(showAll ? $allRecentTransactions : $recentTransactions);
  let loading = $derived($isLoadingTx);
  let account = $derived($currentAccount);
  let totalCount = $derived($totalTransactionCount);
  let chain = $derived($currentChain);
  let isMultiChain = $derived($isMultiChainView);
  let tokenList = $derived($tokens);
  
  // Get ETH price from token list
  let ethPrice = $derived.by(() => {
    const ethToken = tokenList.find(t => t.symbol === 'ETH' || t.symbol === chain?.nativeCurrency?.symbol);
    return ethToken?.price || 0;
  });

  let expanded = $state(false);
  let sortNewestFirst = $state(true);
  let sortedTransactions = $derived.by(() => {
    const txs = [...transactions];
    return sortNewestFirst 
      ? txs.sort((a, b) => b.timestamp - a.timestamp)
      : txs.sort((a, b) => a.timestamp - b.timestamp);
  });
  let visible = $derived(expanded ? sortedTransactions : sortedTransactions.slice(0, maxRows));
  let hidden = $derived(expanded ? [] : sortedTransactions.slice(maxRows));
  let selectedTransaction = $state<TransactionDisplay | null>(null);
  let showDetailModal = $state(false);
  let isRefreshing = $state(false);
  let refreshDebounceTimer: number | null = $state(null);

  // Debounced refresh function
  async function handleRefresh() {
    // Prevent rapid clicks
    if (isRefreshing || refreshDebounceTimer) return;

    isRefreshing = true;

    try {
      // Call the refresh function or use the transaction store
      if (onRefresh) {
        onRefresh();
      } else {
        // Default refresh behavior using transaction store
        await transactionStore.refresh(true);
      }
    } finally {
      // Keep the spinner for at least 1 second for visual feedback
      setTimeout(() => {
        isRefreshing = false;
      }, 1000);

      // Set debounce timer to prevent rapid refreshes (3 second cooldown)
      refreshDebounceTimer = window.setTimeout(() => {
        refreshDebounceTimer = null;
      }, 3000);
    }
  }

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

  // Explorer URL handling moved to TransactionDetailModal

  function handleTransactionClick(tx: TransactionDisplay) {
    selectedTransaction = tx;
    showDetailModal = true;
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
    try {
      await navigator.clipboard.writeText(address);
      uiStore.showSuccess('Address Copied', 'Address has been copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
      uiStore.showError('Copy Failed', 'Failed to copy address to clipboard');
    }
  }
  
  // Get all unique addresses with account info for multi-network view
  async function getAllAccountsWithInfo(): Promise<Array<{address: string, type: string}>> {
    if (!account) return [];
    
    try {
      // Get all accounts from account store
      const { accountStore } = await import('$lib/stores/account.store');
      const { get } = await import('svelte/store');
      const allAccounts = get(accountStore).accounts;
      
      // Map accounts with their type
      return allAccounts.map(acc => ({
        address: acc.address,
        type: getAccountType(acc)
      }));
    } catch (error) {
      console.error('Failed to get all addresses:', error);
      return [{address: account.address, type: 'Primary'}]; // Fallback to current address
    }
  }
  
  // Determine account type based on account properties
  function getAccountType(account: any): string {
    if (account.imported) return 'Imported';
    if (account.isContract) return 'Contract';
    if (account.isPrimary) return 'Primary';
    if (account.isSubAccount) return 'Sub-account';
    return 'Primary'; // Default
  }
  
  // Group transactions by address
  function groupTransactionsByAddress(txs: TransactionDisplay[]): Map<string, TransactionDisplay[]> {
    const grouped = new Map<string, TransactionDisplay[]>();
    
    txs.forEach(tx => {
      // Group by the user's address (from or to, depending on direction)
      const userAddress = tx.from.toLowerCase() === account?.address.toLowerCase() ? tx.from : tx.to;
      
      if (!grouped.has(userAddress)) {
        grouped.set(userAddress, []);
      }
      grouped.get(userAddress)!.push(tx);
    });
    
    return grouped;
  }
  
  // Calculate transaction summary by network
  function getNetworkSummary() {
    const summary = new Map<string, number>();
    transactions.forEach(tx => {
      // In real implementation, get network from tx.chainId
      const network = chain?.name || 'Unknown';
      summary.set(network, (summary.get(network) || 0) + 1);
    });
    return summary;
  }
</script>

<div class={`bg-white/70 dark:bg-zinc-800 rounded-2xl shadow p-4 mt-3 relative z-10 ${className}`}>
  <div class="space-y-2 mb-3">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Recent Activity</div>
      <div class="flex items-center gap-2">
        <!-- Sort toggle with better styling -->
        <button
          onclick={() => sortNewestFirst = !sortNewestFirst}
          class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label={sortNewestFirst ? "Sort oldest first" : "Sort newest first"}
          title={sortNewestFirst ? "Currently: Newest first. Click to sort oldest first" : "Currently: Oldest first. Click to sort newest first"}
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
        
        <button
          onclick={handleRefresh}
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          aria-label="Refresh transactions"
          title={isRefreshing || refreshDebounceTimer ? "Please wait before refreshing again" : "Refresh transactions"}
          disabled={isRefreshing || loading || !!refreshDebounceTimer}
        >
          <svg class="w-4 h-4 text-gray-500 dark:text-gray-400 {isRefreshing ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Address display only for single account view -->
    {#if account && !isMultiChain}
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span class="font-mono" title={account.address}>{shortAddress(account.address)}</span>
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
    {/if}
  </div>

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
    <div class="overflow-y-auto max-h-96">
      {#if isMultiChain}
        <!-- Multi-chain view: Group by address -->
        {#await getAllAccountsWithInfo() then accountsInfo}
          {@const groupedTxs = groupTransactionsByAddress(sortedTransactions)}
          {#each accountsInfo as accountInfo}
            {@const addressTxs = groupedTxs.get(accountInfo.address) || []}
            {#if addressTxs.length > 0}
              <div class="mb-4">
                <!-- Address header -->
                <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-700/50 px-3 py-2 rounded-lg mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ethereum:</span>
                    <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400" title={accountInfo.address}>
                      {shortAddress(accountInfo.address)}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">Type: {accountInfo.type}</span>
                    <button
                      onclick={() => copyAddress(accountInfo.address)}
                      class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded transition-colors"
                      aria-label="Copy address"
                      title="Copy address"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <!-- Transactions for this address -->
                <table class="w-full table-fixed">
                  <colgroup>
                    <col class="w-10" /> <!-- Icon -->
                    <col /> <!-- Transaction details -->
                    <col class="w-24" /> <!-- Status -->
                    <col class="w-24" /> <!-- Time -->
                  </colgroup>
                  <tbody>
                    {#each addressTxs.slice(0, expanded ? undefined : 3) as tx}
                      {@const direction = getTransactionDirection(tx)}
                      {@const isOutgoing = direction === 'sent'}
                      <tr
                        class="border-b border-zinc-100 dark:border-zinc-700 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
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
                          <span class="inline-block px-2 py-0.5 rounded-full text-xs {getStatusColor(tx.status)} whitespace-nowrap">
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
            {:else}
              <div class="mb-4">
                <div class="flex items-center justify-between bg-gray-50 dark:bg-zinc-700/50 px-3 py-2 rounded-lg mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Ethereum:</span>
                    <span class="font-mono text-xs text-zinc-600 dark:text-zinc-400" title={accountInfo.address}>
                      {shortAddress(accountInfo.address)}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-zinc-500 dark:text-zinc-400">Type: {accountInfo.type}</span>
                    <button
                      onclick={() => copyAddress(accountInfo.address)}
                      class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-0.5 rounded transition-colors"
                      aria-label="Copy address"
                      title="Copy address"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
                  No transactions
                </div>
              </div>
            {/if}
          {/each}
        {/await}
      {:else}
        <!-- Single address view: Regular table -->
        <table class="w-full table-fixed">
          <colgroup>
            <col class="w-10" /> <!-- Icon -->
            <col /> <!-- Transaction details -->
            <col class="w-24" /> <!-- Status -->
            <col class="w-24" /> <!-- Time -->
          </colgroup>
          <tbody>
            {#each visible as tx}
              {@const direction = getTransactionDirection(tx)}
              {@const isOutgoing = direction === 'sent'}
              <tr
                class="border-b border-zinc-100 dark:border-zinc-700 last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 cursor-pointer transition-colors"
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
                <span class="inline-block px-2 py-0.5 rounded-full text-xs {getStatusColor(tx.status)} whitespace-nowrap">
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
    {/if}
  </div>

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

  <!-- Added: Total transaction count at the bottom -->
  {#if totalCount > 0 && !loading}
    <div class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
      {#if isMultiChain}
        <!-- Multi-network summary -->
        <div class="space-y-2">
          <div class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Network Summary</div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            {#each Array.from(getNetworkSummary()) as [network, count]}
              <div class="flex justify-between items-center bg-gray-50 dark:bg-zinc-700/50 rounded px-2 py-1">
                <span class="text-zinc-600 dark:text-zinc-400">{network}:</span>
                <span class="font-medium text-zinc-700 dark:text-zinc-300">{count} tx</span>
              </div>
            {/each}
          </div>
          <div class="text-center pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span class="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Total: {totalCount} transactions across all networks
            </span>
          </div>
        </div>
      {:else}
        <!-- Single network summary -->
        <div class="text-center">
          <span class="text-xs text-zinc-500 dark:text-zinc-400">
            Showing {visible.length} of {totalCount} total transactions
          </span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Transaction Detail Modal -->
<TransactionDetailModal
  bind:show={showDetailModal}
  transaction={selectedTransaction}
  onClose={() => {
    showDetailModal = false;
    selectedTransaction = null;
  }}
/>
