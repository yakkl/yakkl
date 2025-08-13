<!-- RecentActivity.svelte - Main wrapper for activity display with proper scoping -->
<script lang="ts">
  import MoreLess from "./MoreLess.svelte";
  import AccountActivity from "./AccountActivity.svelte";
  import ChainActivity from "./ChainActivity.svelte";
  import { recentTransactions, isLoadingTx, transactionStore } from '../stores/transaction.store';
  import { allRecentTransactions, totalTransactionCount } from '../stores/transaction-store-updates';
  import { currentAccount, accountStore } from '../stores/account.store';
  import { currentChain, chainStore } from '$lib/stores/chain.store';
  import { isMultiChainView, tokens } from '$lib/stores/token.store';
  import type { TransactionDisplay } from '../types';
  // import { uiStore } from '$lib/stores/ui.store';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  // Define view modes
  type ViewMode = 'current_account' | 'single_network' | 'all_networks';

  interface Props {
    className?: string;
    maxRows?: number;
    showAll?: boolean;
    onRefresh?: () => void;
    onTransactionClick?: (transaction: TransactionDisplay) => void;
  }

  let { className = '', maxRows = 10, showAll = false, onRefresh, onTransactionClick }: Props = $props();

  // Reactive values from stores
  let transactions = $derived(showAll ? $allRecentTransactions : $recentTransactions);
  let loading = $derived($isLoadingTx);

  // Debug transaction loading
  $effect(() => {
    console.log('RecentActivity: Transaction data:', {
      showAll,
      transactionCount: transactions.length,
      loading,
      firstTransaction: transactions[0] ? {
        hash: transactions[0].hash,
        type: transactions[0].type,
        value: transactions[0].value,
        timestamp: transactions[0].timestamp
      } : null,
      timestamp: Date.now()
    });

    // Also log the full transaction store state
    console.log('RecentActivity: Full transaction store state:', {
      storeTransactions: $transactionStore.transactions.length,
      storeLoading: $transactionStore.loading,
      storeError: $transactionStore.error,
      recentTransactionsCount: $recentTransactions.length,
      allRecentTransactionsCount: $allRecentTransactions.length
    });
  });
  let account = $derived($currentAccount);
  let totalCount = $derived($totalTransactionCount);
  let chain = $derived($currentChain);
  let isMultiChain = $derived($isMultiChainView);
  let tokenList = $derived($tokens);
  let accounts = $derived($accountStore.accounts || []);
  let chains = $derived($chainStore?.chains || []);

  // State for view mode
  let viewMode = $state<ViewMode>('current_account');

  // Sync with multi-chain view when it changes
  $effect(() => {
    if (isMultiChain) {
      viewMode = 'all_networks';
    }
  });

  // Simple effect to log transaction state for debugging
  $effect(() => {
    if (account?.address && chain?.chainId) {
      console.log('RecentActivity: Transaction state:', {
        accountAddress: account.address,
        chainId: chain.chainId,
        transactionCount: transactions.length,
        loading
      });
    }
  });

  // Get ETH price from token list
  let ethPrice = $derived.by(() => {
    const ethToken = tokenList.find(t => t.symbol === 'ETH' || t.symbol === chain?.nativeCurrency?.symbol);
    // Handle the price safely - it might be undefined, null, an object, or already a number
    let price = ethToken?.price;
    
    // If price is an object (like from storage), extract the actual price value
    if (price && typeof price === 'object') {
      // Try different possible property names
      price = price.price || price.value || price.usd || price.USD || 0;
    }
    
    if (price === undefined || price === null) {
      return 0;
    }
    
    // If it's already a number, return it directly
    if (typeof price === 'number') {
      return price;
    }
    
    // If it's a string that looks like a number, parse it
    if (typeof price === 'string' && !isNaN(parseFloat(price))) {
      return parseFloat(price);
    }
    
    // Otherwise try to convert it with BigNumberishUtils as last resort
    try {
      return BigNumberishUtils.toNumber(price);
    } catch (error) {
      console.warn('Failed to convert ETH price to number:', ethToken?.price, 'extracted:', price, error);
      return 0;
    }
  });

  let expanded = $state(false);
  let sortNewestFirst = $state(true);
  let isRefreshing = $state(false);
  let refreshDebounceTimer: number | null = $state(null);

  // Filter chains based on current chain type (mainnet vs testnet)
  let visibleChains = $derived.by(() => {
    if (!chain) return chains;
    const isTestnet = chain.isTestnet || false;
    return chains.filter(c => (c.isTestnet || false) === isTestnet);
  });

  // Sort transactions
  let sortedTransactions = $derived.by(() => {
    const txs = [...transactions];
    return sortNewestFirst
      ? txs.sort((a, b) => b.timestamp - a.timestamp)
      : txs.sort((a, b) => a.timestamp - b.timestamp);
  });

  // Filter transactions based on view mode
  let filteredTransactions = $derived.by(() => {
    if (!account || !chain) return [];

    switch (viewMode) {
      case 'current_account':
        // Only current account on current chain
        return sortedTransactions.filter(tx =>
          (tx.from.toLowerCase() === account.address.toLowerCase() ||
           tx.to.toLowerCase() === account.address.toLowerCase()) &&
          tx.chainId === chain.chainId
        );

      case 'single_network':
        // All accounts on current chain - only show transactions involving our accounts
        const ourAddresses = accounts.map(a => a.address.toLowerCase());
        return sortedTransactions.filter(tx =>
          tx.chainId === chain.chainId &&
          (ourAddresses.includes(tx.from.toLowerCase()) || ourAddresses.includes(tx.to.toLowerCase()))
        );

      case 'all_networks':
        // All accounts on all visible chains (filtered by mainnet/testnet)
        const visibleChainIds = visibleChains.map(c => c.chainId);
        return sortedTransactions.filter(tx => visibleChainIds.includes(tx.chainId));

      default:
        return [];
    }
  });

  // Debug filtered transactions
  $effect(() => {
    console.log('RecentActivity: Filtered transactions:', {
      viewMode,
      totalTransactions: transactions.length,
      sortedTransactions: sortedTransactions.length,
      filteredTransactions: filteredTransactions.length,
      account: account?.address,
      chain: chain?.name,
      chainId: chain?.chainId,
      ourAddresses: accounts.map(a => a.address.toLowerCase())
    });
  });

  // Debounced refresh function - uses store methods only
  async function handleRefresh() {
    if (isRefreshing || refreshDebounceTimer) return;
    isRefreshing = true;

    try {
      // Use transaction store refresh method which handles background communication
      await transactionStore.refresh(true);
      
      // The store will handle background service communication and updates
      console.log('RecentActivity: Triggered transaction refresh via store');
    } catch (error) {
      console.error('RecentActivity: Failed to refresh transactions:', error);
    } finally {
      setTimeout(() => {
        isRefreshing = false;
      }, 1000);

      refreshDebounceTimer = window.setTimeout(() => {
        refreshDebounceTimer = null;
      }, 3000);
    }
  }


  function getViewModeDescription(): string {
    switch (viewMode) {
      case 'current_account':
        return `${account?.address ? account.address.slice(0, 6) + '...' + account.address.slice(-4) : ''} on ${chain?.name || ''}`;
      case 'single_network':
        // In single network mode, show all accounts info
        const accountCount = accounts.length;
        return `${accountCount} account${accountCount !== 1 ? 's' : ''} on ${chain?.name || ''}`;
      case 'all_networks':
        return `${accounts.length} account${accounts.length !== 1 ? 's' : ''} across ${visibleChains.length} network${visibleChains.length !== 1 ? 's' : ''}`;
    }
  }

  // Calculate totals based on view mode
  let viewTotals = $derived.by(() => {
    const totals = {
      transactionCount: filteredTransactions.length,
      accountCount: 0,
      chainCount: 0
    };

    // Get unique accounts and chains
    const uniqueAccounts = new Set<string>();
    const uniqueChains = new Set<number>();

    filteredTransactions.forEach(tx => {
      uniqueAccounts.add(tx.from.toLowerCase());
      uniqueAccounts.add(tx.to.toLowerCase());
      uniqueChains.add(tx.chainId);
    });

    // Filter to only our accounts
    const ourAddresses = accounts.map(a => a.address.toLowerCase());
    const ourAccountsInTx = Array.from(uniqueAccounts).filter(addr =>
      ourAddresses.includes(addr)
    );

    totals.accountCount = ourAccountsInTx.length;
    totals.chainCount = uniqueChains.size;

    return totals;
  });
</script>

<div class={`bg-gradient-to-br from-amber-50/30 to-amber-100/20 dark:from-amber-900/10 dark:to-amber-800/5 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 p-4 mt-3 relative z-10 overflow-hidden ${className}`}>
  <!-- Subtle pattern overlay -->
  <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" style="background-image: url('data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 viewBox=%220 0 40 40%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22%23d97706%22 fill-opacity=%221%22%3E%3Cpath d=%22M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z%22/%3E%3C/g%3E%3C/svg%3E');"></div>
  <div class="relative">
  <div class="space-y-2 mb-3">
    <!-- Header row -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col">
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Recent Activity</div>
        <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          {getViewModeDescription()}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- View mode toggle - Improved styling -->
        <!-- <button
          onclick={() => {
            if (viewMode === 'current_account') {
              viewMode = 'single_network';
            } else if (viewMode === 'single_network') {
              viewMode = 'all_networks';
            } else {
              viewMode = 'current_account';
            }
          }}
          class="px-2 py-1 text-xs font-medium rounded-md border transition-all duration-200 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700"
          title="Click to change view mode"
        >
          {viewMode === 'current_account' ? 'Current Account' : viewMode === 'single_network' ? 'Single Network' : 'All Networks'}
        </button> -->

        <!-- Sort toggle -->
        <button
          onclick={() => sortNewestFirst = !sortNewestFirst}
          class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all duration-200 shadow-sm"
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

        <!-- Refresh button -->
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
  {:else if filteredTransactions.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
      <p class="font-medium">No recent activity</p>
      <p class="text-sm mt-2">
        {#if viewMode === 'current_account'}
          No transactions for this account on {chain?.name || 'this network'}
        {:else if viewMode === 'single_network'}
          No transactions on {chain?.name || 'this network'}
        {:else}
          No transactions across any network
        {/if}
      </p>
    </div>
  {:else}
    <div class="overflow-y-auto max-h-96">
      {#if viewMode === 'current_account' && account && chain}
        <!-- Current Account View -->
        <AccountActivity
          {account}
          chainId={chain.chainId}
          chainName={chain.name}
          transactions={filteredTransactions}
          {ethPrice}
          showHeader={false}
          maxTransactions={expanded ? 0 : maxRows}
          {onTransactionClick}
        />

      {:else if viewMode === 'single_network' && chain}
        <!-- Single Network View -->
        <ChainActivity
          {chain}
          {accounts}
          transactions={filteredTransactions}
          {ethPrice}
          showChainHeader={false}
          showAccountHeaders={true}
          maxAccountsToShow={expanded ? 0 : 5}
          maxTransactionsPerAccount={expanded ? 0 : 3}
          expanded={true}
          {onTransactionClick}
        />

      {:else if viewMode === 'all_networks'}
        <!-- All Networks View -->
        <div class="space-y-4">
          {#each visibleChains as networkChain}
            {@const networkTxs = filteredTransactions.filter(tx => tx.chainId === networkChain.chainId)}
            {#if networkTxs.length > 0}
              <ChainActivity
                chain={networkChain}
                {accounts}
                transactions={networkTxs}
                {ethPrice}
                showChainHeader={true}
                showAccountHeaders={true}
                maxAccountsToShow={expanded ? 0 : 3}
                maxTransactionsPerAccount={expanded ? 0 : 2}
                expanded={false}
                {onTransactionClick}
              />
            {/if}
          {/each}
        </div>
      {/if}
    </div>

    {#if !expanded && filteredTransactions.length > maxRows && viewMode === 'current_account'}
      <MoreLess
        count={filteredTransactions.length - maxRows}
        text="more"
        lessText="less"
        expanded={expanded}
        className="mt-2"
        onclick={() => expanded = !expanded}
      />
    {/if}
  {/if}

  <!-- Footer with totals -->
  {#if viewTotals.transactionCount > 0 && !loading}
    <div class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
      <div class="text-center">
        <span class="text-xs text-zinc-500 dark:text-zinc-400">
          {#if viewMode === 'current_account'}
            {viewTotals.transactionCount} transaction{viewTotals.transactionCount !== 1 ? 's' : ''} for current account
          {:else if viewMode === 'single_network'}
            {viewTotals.transactionCount} transaction{viewTotals.transactionCount !== 1 ? 's' : ''} across {viewTotals.accountCount} account{viewTotals.accountCount !== 1 ? 's' : ''}
          {:else}
            {viewTotals.transactionCount} transaction{viewTotals.transactionCount !== 1 ? 's' : ''} across {viewTotals.chainCount} network{viewTotals.chainCount !== 1 ? 's' : ''} and {viewTotals.accountCount} account{viewTotals.accountCount !== 1 ? 's' : ''}
          {/if}
        </span>
      </div>
    </div>
  {/if}
  </div>
</div>

<style>
  /* Add smooth transitions */
  div {
    transition: all 0.2s ease;
  }
</style>
