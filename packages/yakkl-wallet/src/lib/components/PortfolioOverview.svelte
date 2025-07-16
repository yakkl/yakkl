<script lang="ts">
  import { derived } from 'svelte/store';
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain, chainStore } from '$lib/stores/chain.store';
  import { yakklTokenCacheStore } from '$lib/common/stores';
  import { isMultiChainView, tokenStore, grandTotalPortfolioValue, totalPortfolioValue } from '$lib/stores/token.store';
  import ProtectedValue from './ProtectedValue.svelte';
  import { canUseFeature, getPlanBadgeText, getPlanBadgeColor } from '$lib/utils/features';
  import { modalStore } from '$lib/stores/modal.store';
  
  interface NetworkValue {
    chainId: number;
    chainName: string;
    value: number;
    percentage: number;
    icon?: string;
    color: string;
  }
  
  // Props
  let {
    onRefresh = () => {},
    loading = false,
    lastUpdate = null as Date | null,
    className = ''
  } = $props<{
    onRefresh?: () => void;
    loading?: boolean;
    lastUpdate?: Date | null;
    className?: string;
  }>();
  
  // State
  let isExpanded = $state(false);
  let isMultiChain = $state(false);
  let chain = $state(null as any);
  
  // Update reactive values from stores
  $effect(() => {
    isMultiChain = $isMultiChainView;
    chain = $currentChain;
  });
  
  // Debug portfolio values
  $effect(() => {
    console.log('[PortfolioOverview] Debug values:', {
      isMultiChain,
      portfolioTotal: $portfolioTotal,
      networkValues: $networkValues,
      chain: chain?.name,
      chainId: chain?.chainId
    });
  });
  
  // Check if user has Pro access
  const hasProAccess = canUseFeature('advanced_analytics');
  
  // Get total portfolio value based on view mode
  const portfolioTotal = derived(
    [grandTotalPortfolioValue, totalPortfolioValue, isMultiChainView, yakklTokenCacheStore, currentAccount, currentChain, chainStore],
    ([$grand, $single, $isMulti, $cache, $account, $chain, $chainStore]) => {
      if (!$cache || !$account) return 0;
      
      const chains = $chainStore?.chains || [];
      const isCurrentChainTestnet = $chain?.isTestnet || false;
      
      if ($isMulti) {
        // Multi-chain: only include mainnets if current chain is mainnet, only testnets if testnet
        // AND only for the current account
        const filteredTotal = $cache
          .filter(entry => {
            // Must be for current account
            if (entry.walletAddress.toLowerCase() !== $account.address.toLowerCase()) return false;
            
            const entryChain = chains.find(c => c.chainId === entry.chainId);
            const isEntryTestnet = entryChain?.isTestnet || false;
            // Only include chains of the same type (mainnet with mainnet, testnet with testnet)
            return isCurrentChainTestnet === isEntryTestnet;
          })
          .reduce((sum, entry) => sum + (entry.value || 0), 0);
        
        return filteredTotal;
      } else {
        // Single chain: calculate total for current account and current chain
        const singleChainTotal = $cache
          .filter(entry => 
            entry.walletAddress.toLowerCase() === $account.address.toLowerCase() &&
            entry.chainId === $chain.chainId
          )
          .reduce((sum, entry) => sum + (entry.value || 0), 0);
        
        return singleChainTotal || $single;
      }
    }
  );
  
  // Calculate network values from cache
  const networkValues = derived(
    [yakklTokenCacheStore, chainStore, currentAccount, currentChain],
    ([$cache, $chainStore, $account, $currentChain]) => {
      if (!$cache || !$chainStore || !$account) return [];
      
      // Get all chains
      const chains = $chainStore.chains;
      const chainMap = new Map(chains.map(c => [c.chainId, c]));
      const isCurrentChainTestnet = $currentChain?.isTestnet || false;
      
      // Group cache entries by chain and sum values
      const networkTotals = new Map<number, number>();
      let grandTotal = 0;
      
      // Filter entries based on view mode and mainnet/testnet separation
      $cache
        .filter(entry => {
          const entryChain = chainMap.get(entry.chainId);
          const isEntryTestnet = entryChain?.isTestnet || false;
          
          // Only show chains of the same type (mainnet with mainnet, testnet with testnet)
          if (isCurrentChainTestnet !== isEntryTestnet) return false;
          
          // Must be for current account
          if (entry.walletAddress.toLowerCase() !== $account.address.toLowerCase()) return false;
          
          if (isMultiChain) {
            // Multi-chain: show all networks of the same type
            return true;
          } else {
            // Single chain: only current chain
            return entry.chainId === $currentChain?.chainId;
          }
        })
        .forEach(entry => {
          const current = networkTotals.get(entry.chainId) || 0;
          networkTotals.set(entry.chainId, current + (entry.value || 0));
          grandTotal += entry.value || 0;
        });
      
      // Convert to array with metadata
      const values: NetworkValue[] = Array.from(networkTotals.entries())
        .map(([chainId, value]) => {
          const chain = chainMap.get(chainId);
          return {
            chainId,
            chainName: chain?.name || `Chain ${chainId}`,
            value,
            percentage: grandTotal > 0 ? (value / grandTotal) * 100 : 0,
            icon: chain?.icon,
            color: getChainColor(chainId)
          };
        })
        .filter(n => n.value > 0)
        .sort((a, b) => b.value - a.value);
      
      return values;
    }
  );
  
  // Format currency helper
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
  
  // Get chain color based on chainId
  function getChainColor(chainId: number): string {
    const colors: Record<number, string> = {
      1: '#627EEA',      // Ethereum - Blue
      56: '#F3BA2F',     // BSC - Yellow
      137: '#8247E5',    // Polygon - Purple
      42161: '#12AAFF',  // Arbitrum - Light Blue
      10: '#FF0420',     // Optimism - Red
      43114: '#E84142',  // Avalanche - Red
      250: '#1969FF',    // Fantom - Blue
      25: '#002D74',     // Cronos - Dark Blue
      // Testnets
      5: '#94A3B8',      // Goerli - Gray
      11155111: '#64748B', // Sepolia - Gray
      80001: '#9333EA',  // Mumbai - Purple
      97: '#FBBF24',     // BSC Testnet - Yellow
    };
    
    // Default colors for unknown chains
    const defaultColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
    ];
    
    return colors[chainId] || defaultColors[chainId % defaultColors.length];
  }
  
  function formatTime(date: Date | null): string {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
  
  function handleNetworkClick(chainId: number) {
    // Switch to the selected network
    chainStore.switchChain(chainId);
  }
  
  function toggleMultiChain() {
    tokenStore.toggleMultiChainView();
  }
  
  function showUpgrade() {
    modalStore.openModal('upgrade');
  }
</script>

{#if !hasProAccess}
  <!-- Basic User View -->
  <div class="{className} rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300" style="background-color: {getPlanBadgeColor()}20">
    <div class="space-y-3">
      <!-- Header with badge -->
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <span class="truncate max-w-[200px]" title="{isMultiChain ? 'Total Portfolio (All Networks)' : `${chain?.name || 'Current Network'} Portfolio`}">
            {isMultiChain ? 'Total Portfolio' : `${chain?.name || 'Network'} Portfolio`}
          </span>
          <span 
            class="px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap" 
            style="background-color: {getPlanBadgeColor()}"
          >
            {getPlanBadgeText()}
          </span>
        </h3>
        
        <!-- Refresh button -->
        <button
          onclick={onRefresh}
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
          aria-label="Refresh"
          disabled={loading}
        >
          <svg class="w-4 h-4 text-gray-500 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <!-- Value and toggle -->
      {#if $portfolioTotal >= 10000}
        {@const isLargeValue = true}
        <!-- Large value layout - value on its own line -->
        <div class="space-y-3">
          {#if loading}
            <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          {:else}
            <div class="text-3xl font-bold text-gray-900 dark:text-white">
              <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
            </div>
          {/if}
          
          <div class="flex justify-end">
            <button
              onclick={toggleMultiChain}
              class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[100px] text-center {isMultiChain 
                ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700'}"
            >
              {isMultiChain ? 'All Networks' : 'Single Network'}
            </button>
          </div>
        </div>
      {:else}
        <!-- Normal value layout - everything on same line -->
        <div class="flex justify-between items-end">
          {#if loading}
            <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          {:else}
            <div class="text-3xl font-bold text-gray-900 dark:text-white">
              <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
            </div>
          {/if}
          
          <!-- Network Toggle -->
          <button
            onclick={toggleMultiChain}
            class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[100px] text-center {isMultiChain 
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700'}"
          >
            {isMultiChain ? 'All Networks' : 'Single Network'}
          </button>
        </div>
      {/if}
      
      <div class="text-xs text-gray-500 mt-1">
        Updated {formatTime(lastUpdate)}
      </div>
    </div>
    
    <!-- Pro Upgrade Prompt -->
    <div class="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Unlock Network Breakdown</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">See your portfolio distribution across all networks</p>
        </div>
        <button
          onclick={showUpgrade}
          class="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  </div>
{:else}
  <!-- Pro User View -->
  <div class="{className} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="rounded-2xl bg-white dark:bg-zinc-900 p-6">
      <!-- Header -->
      <div class="space-y-3 mb-4">
        <!-- Title and Pro Badge -->
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
            <span class="truncate max-w-[200px]" title="{isMultiChain ? 'Total Portfolio (All Networks)' : `${chain?.name || 'Current Network'} Portfolio`}">
              {isMultiChain ? 'Total Portfolio' : `${chain?.name || 'Network'} Portfolio`}
            </span>
            <span 
              class="px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap" 
              style="background-color: {getPlanBadgeColor()}"
            >
              {getPlanBadgeText()}
            </span>
          </h3>
          
          <!-- Refresh button aligned to the right -->
          <button
            onclick={onRefresh}
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            title="Refresh"
            aria-label="Refresh portfolio data"
            disabled={loading}
          >
            <svg class="w-4 h-4 text-gray-500 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <!-- Value and Controls -->
        {#if $portfolioTotal >= 10000}
          {@const isLargeValue = true}
          <!-- Large value layout - value on its own line -->
          <div class="space-y-3">
            {#if loading}
              <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            {:else}
              <div class="text-4xl font-bold text-gray-900 dark:text-white">
                <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
              </div>
            {/if}
            
            <!-- Network Toggle and Expand -->
            <div class="flex justify-end gap-2">
              <button
                onclick={toggleMultiChain}
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[100px] text-center {isMultiChain 
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700'}"
              >
                {isMultiChain ? 'All Networks' : 'Single Network'}
              </button>
              
              <button
                onclick={() => isExpanded = !isExpanded}
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
              >
                <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        {:else}
          <!-- Normal value layout - everything on same line -->
          <div class="flex justify-between items-end">
            {#if loading}
              <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            {:else}
              <div class="text-4xl font-bold text-gray-900 dark:text-white">
                <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
              </div>
            {/if}
            
            <!-- Network Toggle and Expand -->
            <div class="flex items-center gap-2">
              <button
                onclick={toggleMultiChain}
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[100px] text-center {isMultiChain 
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700' 
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700'}"
              >
                {isMultiChain ? 'All Networks' : 'Single Network'}
              </button>
              
              <button
                onclick={() => isExpanded = !isExpanded}
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
              >
                <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Network Distribution Bar -->
      {#if $networkValues.length > 0 && !loading}
        <div class="mb-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Network Distribution</p>
          <div class="h-8 rounded-full overflow-hidden flex bg-gray-100 dark:bg-zinc-800 shadow-inner">
            {#each $networkValues as network}
              <div
                class="relative group hover:opacity-90 transition-all duration-200 cursor-pointer"
                style="width: {network.percentage}%; background-color: {network.color};"
                title="{network.chainName}: {formatCurrency(network.value)} ({network.percentage.toFixed(1)}%)"
              >
                <span class="sr-only">{network.chainName}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      <!-- Expanded Network Details -->
      {#if isExpanded}
        <div class="mt-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
          {#if $networkValues.length === 0}
            <p class="text-center text-gray-500 dark:text-gray-400 py-4">
              No tokens found across any network
            </p>
          {:else}
            <!-- Scrollable container for 3+ networks -->
            <div class="{$networkValues.length > 3 ? 'max-h-[280px] overflow-y-auto pr-2' : ''} space-y-2" style="scrollbar-width: thin;">
              {#each $networkValues as network}
                <button 
                  class="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left group"
                  onclick={() => handleNetworkClick(network.chainId)}
                  aria-label="Switch to {network.chainName}"
                >
                  <div class="flex items-center gap-3">
                    <!-- Network Icon/Color -->
                    <div 
                      class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0"
                      style="background-color: {network.color};"
                    >
                      {network.chainName.substring(0, 2).toUpperCase()}
                    </div>
                    
                    <!-- Network Info -->
                    <div class="min-w-0">
                      <h4 class="font-medium text-gray-900 dark:text-white truncate">
                        {network.chainName}
                      </h4>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {network.percentage.toFixed(1)}% of portfolio
                      </p>
                    </div>
                  </div>
                  
                  <!-- Value and Action -->
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <div class="text-right">
                      <p class="font-semibold text-gray-900 dark:text-white">
                        <ProtectedValue value={formatCurrency(network.value)} placeholder="****" />
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {network.chainId === 1 ? 'Mainnet' : `Chain ${network.chainId}`}
                      </p>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              {/each}
            </div>
            
            {#if $networkValues.length > 3}
              <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Scroll to see all {$networkValues.length} networks
              </div>
            {/if}
          {/if}
        </div>
      {/if}
      
      <!-- Footer -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {$networkValues.length} active {$networkValues.length === 1 ? 'network' : 'networks'}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          Updated {formatTime(lastUpdate)}
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add smooth transitions for the distribution bar */
  div {
    transition: all 0.2s ease;
  }
</style>
