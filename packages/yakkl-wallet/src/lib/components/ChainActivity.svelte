<!-- ChainActivity.svelte - Shows all accounts' transactions for a single chain -->
<script lang="ts">
  import AccountActivity from './AccountActivity.svelte';
  import type { TransactionDisplay, ChainDisplay, AccountDisplay } from '$lib/types';
  
  interface Props {
    chain: ChainDisplay;
    accounts: AccountDisplay[];
    transactions: TransactionDisplay[];
    ethPrice?: number;
    showChainHeader?: boolean;
    showAccountHeaders?: boolean;
    maxAccountsToShow?: number;
    maxTransactionsPerAccount?: number;
    expanded?: boolean;
    onTransactionClick?: (transaction: TransactionDisplay) => void;
  }
  
  let {
    chain,
    accounts = [],
    transactions = [],
    ethPrice = 0,
    showChainHeader = true,
    showAccountHeaders = true,
    maxAccountsToShow = 0,
    maxTransactionsPerAccount = 3,
    expanded = false,
    onTransactionClick
  }: Props = $props();
  
  // Filter transactions for this chain
  let chainTransactions = $derived(
    transactions.filter(tx => tx.chainId === chain.chainId)
  );
  
  // Get accounts that have transactions on this chain
  let accountsWithTransactions = $derived.by(() => {
    return accounts.filter(account => {
      return chainTransactions.some(tx => 
        tx.from.toLowerCase() === account.address.toLowerCase() ||
        tx.to.toLowerCase() === account.address.toLowerCase()
      );
    });
  });
  
  // Apply display limit
  let activeAccounts = $derived(
    maxAccountsToShow > 0 
      ? accountsWithTransactions.slice(0, maxAccountsToShow)
      : accountsWithTransactions
  );
  
  // Calculate chain totals
  let chainTotals = $derived.by(() => {
    const totals = {
      transactionCount: chainTransactions.length,
      totalValue: 0,
      accountCount: accountsWithTransactions.length
    };
    
    // Calculate net value changes across all accounts
    accounts.forEach(account => {
      const accountTxs = chainTransactions.filter(tx =>
        tx.from.toLowerCase() === account.address.toLowerCase() ||
        tx.to.toLowerCase() === account.address.toLowerCase()
      );
      
      accountTxs.forEach(tx => {
        const isOutgoing = tx.from.toLowerCase() === account.address.toLowerCase();
        const value = parseFloat(tx.value) || 0;
        totals.totalValue += isOutgoing ? -value : value;
      });
    });
    
    return totals;
  });
  
  let isExpanded = $state(expanded);
  
  function formatValue(value: number): string {
    if (Math.abs(value) < 0.0001) {
      return value.toExponential(2);
    }
    return value.toFixed(4);
  }
  
  // Generate a compact grid of account addresses for the header
  function getAccountPreview(): string[] {
    return activeAccounts.slice(0, 6).map(acc => {
      const addr = acc.address;
      return `${addr.slice(0, 4)}...${addr.slice(-2)}`;
    });
  }
</script>

<div class="chain-activity">
  {#if showChainHeader}
    <!-- Chain header (clickable) -->
    <button
      onclick={() => isExpanded = !isExpanded}
      class="w-full bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-800 dark:to-zinc-700 px-4 py-3 rounded-lg mb-3 hover:from-gray-100 hover:to-gray-200 dark:hover:from-zinc-700 dark:hover:to-zinc-600 transition-colors cursor-pointer"
      title={isExpanded ? "Click to collapse" : "Click to expand"}
      aria-label={isExpanded ? "Collapse chain details" : "Expand chain details"}
    >
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <!-- Chain icon/indicator -->
          <div class="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-sm flex items-center justify-center">
            {#if chain.icon}
              <img src={chain.icon} alt={chain.name} class="w-5 h-5" />
            {:else}
              <span class="text-xs font-bold text-gray-600 dark:text-gray-400">
                {chain.name.substring(0, 2).toUpperCase()}
              </span>
            {/if}
          </div>
          
          <div class="text-left">
            <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              {chain.name}
            </h3>
            <p class="text-xs text-zinc-500 dark:text-zinc-400">
              Chain ID: {chain.chainId}
            </p>
          </div>
        </div>
        
        <!-- Expand/Collapse indicator -->
        <div class="p-1.5">
          <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" 
               fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      <!-- Account preview grid -->
      {#if activeAccounts.length > 0}
        <div class="grid grid-cols-3 gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-2">
          {#each getAccountPreview() as addr}
            <span class="truncate" title="Account address">{addr}</span>
          {/each}
          {#if activeAccounts.length > 6}
            <span class="text-zinc-400 dark:text-zinc-500">+{activeAccounts.length - 6} more</span>
          {/if}
        </div>
      {/if}
      
      <!-- Chain summary stats -->
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-4">
          <span class="text-zinc-600 dark:text-zinc-300">
            <span class="font-medium">{chainTotals.accountCount}</span> 
            <span class="text-zinc-500 dark:text-zinc-400">account{chainTotals.accountCount !== 1 ? 's' : ''}</span>
          </span>
          <span class="text-zinc-600 dark:text-zinc-300">
            <span class="font-medium">{chainTotals.transactionCount}</span> 
            <span class="text-zinc-500 dark:text-zinc-400">transaction{chainTotals.transactionCount !== 1 ? 's' : ''}</span>
          </span>
        </div>
        {#if chainTotals.totalValue !== 0}
          <span class="font-medium {chainTotals.totalValue >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
            {chainTotals.totalValue >= 0 ? '+' : ''}{formatValue(chainTotals.totalValue)} ETH
          </span>
        {/if}
      </div>
    </button>
  {/if}
  
  {#if isExpanded || !showChainHeader}
    <!-- Account activities -->
    {#if activeAccounts.length === 0}
      <div class="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
        No activity on {chain.name}
      </div>
    {:else}
      <div class="space-y-6">
        {#each activeAccounts as account, index}
          {#if index > 0}
            <!-- Account separator with decorative line -->
            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div class="relative flex justify-center">
                <span class="bg-white dark:bg-zinc-900 px-3 text-xs text-gray-500 dark:text-gray-400">
                  •••
                </span>
              </div>
            </div>
          {/if}
          <AccountActivity
            {account}
            chainId={chain.chainId}
            chainName={chain.name}
            transactions={chainTransactions}
            {ethPrice}
            showHeader={showAccountHeaders}
            maxTransactions={maxTransactionsPerAccount}
            {onTransactionClick}
          />
        {/each}
        
        {#if maxAccountsToShow > 0 && accountsWithTransactions.length > maxAccountsToShow}
          <div class="text-center text-xs text-zinc-500 dark:text-zinc-400 py-2">
            Showing {activeAccounts.length} of {accountsWithTransactions.length} accounts with activity
          </div>
        {/if}
      </div>
    {/if}
  {:else}
    <!-- Collapsed state - show brief summary (clickable) -->
    <button 
      onclick={() => isExpanded = true}
      class="w-full text-center py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
      title="Click to expand and view account details"
    >
      Click to expand and view account details
    </button>
  {/if}
  
  {#if showChainHeader && chainTransactions.length > 0}
    <!-- Chain footer -->
    <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs text-center text-zinc-500 dark:text-zinc-400">
      Total: {chainTotals.transactionCount} transactions across {chainTotals.accountCount} accounts on {chain.name}
    </div>
  {/if}
</div>

<style>
  .chain-activity {
    position: relative;
  }
</style>