<script lang="ts">
  import SimpleTooltip from "$lib/components/SimpleTooltip.svelte";
  import MoreLess from "./MoreLess.svelte";
  import { tokenStore, isMultiChainView } from '$lib/stores/token.store';
  import { canUseFeature } from '$lib/utils/features';
  import ProtectedValue from './v1/ProtectedValue.svelte';

  let { tokens = [], className = '', maxRows = 6, loading = false } = $props();

  let expanded = $state(false);
  let sortBy = $state<'name' | 'value' | 'price' | 'quantity'>('value');
  let sortOrder = $state<'asc' | 'desc'>('desc');
  let multiChainView = $derived($isMultiChainView);
  
  // Filter tokens with value > 0 and sort them
  let filteredAndSortedTokens = $derived.by(() => {
    // Filter tokens with value > 0
    const filtered = tokens.filter(token => {
      const value = typeof token.value === 'number' ? token.value : parseFloat(token.value || '0');
      return value > 0;
    });
    
    // Sort tokens
    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'name':
          aVal = a.symbol.toLowerCase();
          bVal = b.symbol.toLowerCase();
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
          
        case 'value':
          aVal = typeof a.value === 'number' ? a.value : parseFloat(a.value || '0');
          bVal = typeof b.value === 'number' ? b.value : parseFloat(b.value || '0');
          break;
          
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
          
        case 'quantity':
          aVal = a.qty || 0;
          bVal = b.qty || 0;
          break;
          
        default:
          aVal = typeof a.value === 'number' ? a.value : parseFloat(a.value || '0');
          bVal = typeof b.value === 'number' ? b.value : parseFloat(b.value || '0');
      }
      
      if (sortBy !== 'name') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
    
    return sorted;
  });
  
  let visible = $derived(expanded ? filteredAndSortedTokens : filteredAndSortedTokens.slice(0, maxRows));
  let hidden = $derived(expanded ? [] : filteredAndSortedTokens.slice(maxRows));

  // Debug effect
  $effect(() => {
    // Debug token values
    if (tokens.length > 0) {
      console.log('[TokenPortfolio] Debug tokens:', {
        tokenCount: tokens.length,
        filteredCount: filteredAndSortedTokens.length,
        firstToken: tokens[0],
        multiChainView,
        sortBy,
        sortOrder,
        tokens: tokens.map(t => ({ symbol: t.symbol, value: t.value, price: t.price, qty: t.qty }))
      });
    }
  });

  // Helper for long values
  function needsEllipsis(val: number | undefined) {
    return String(val ?? '').length > 9;
  }
  
  function formatValue(val: number | undefined): string {
    if (!val) return '$0.00';
    
    const absValue = Math.abs(val);
    if (absValue >= 1e12) {
      return `$${(val / 1e12).toFixed(1)}T+`;
    } else if (absValue >= 1e9) {
      return `$${(val / 1e9).toFixed(1)}B+`;
    } else if (absValue >= 1e6) {
      return `$${(val / 1e6).toFixed(1)}M+`;
    } else if (absValue >= 1e3) {
      return `$${(val / 1e3).toFixed(1)}K+`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatPrice(price: number | undefined): string {
    if (!price) return '$0.00';
    
    const absPrice = Math.abs(price);
    if (absPrice >= 1e6) {
      return `$${(price / 1e6).toFixed(1)}M+`;
    } else if (absPrice >= 1e3) {
      return `$${(price / 1e3).toFixed(1)}K+`;
    } else if (absPrice < 0.01) {
      return '< $0.01';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  }
  
  function formatValueFull(val: number | undefined): string {
    if (!val) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function getFullPriceDisplay(price: number | undefined): string {
    if (!price) return '$0.00000000';
    if (price < 0.00000001) {
      return `$${price.toExponential(8)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 10
    }).format(price);
  }

  async function toggleMultiChain() {
    tokenStore.toggleMultiChainView();
    
    // Load multi-network data if switching to multi-network view
    if (!multiChainView) {
      // Multi-chain tokens will be loaded by the store when toggled
      await tokenStore.refresh();
    }
  }

  function handleTokenClick(token: any) {
    // Dispatch a custom event for the parent to handle
    const event = new CustomEvent('tokenclick', { 
      detail: { token },
      bubbles: true 
    });
    
    // Find the component element and dispatch the event
    if (typeof document !== 'undefined') {
      const element = document.querySelector('.token-portfolio-container');
      element?.dispatchEvent(event);
    }
  }
</script>

<div class={`bg-white/70 dark:bg-zinc-800 p-4 rounded-2xl shadow space-y-2 relative z-10 token-portfolio-container ${className}`}>
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Token Portfolio</div>
      {#if canUseFeature('multi_chain_portfolio')}
        <button
          onclick={toggleMultiChain}
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors {multiChainView ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}"
          title={multiChainView ? 'Switch to single network view' : 'Switch to multi-network view'}
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {multiChainView ? 'Multi-Network' : 'Single Network'}
        </button>
      {/if}
    </div>
    
    <!-- Sort controls -->
    {#if filteredAndSortedTokens.length > 0}
      <div class="flex items-center gap-2 text-xs">
        <span class="text-zinc-500 dark:text-zinc-400">Sort by:</span>
        <div class="flex gap-1">
          <button
            onclick={() => { sortBy = 'name'; sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }}
            class="px-2 py-0.5 rounded transition-colors {sortBy === 'name' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
          >
            Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onclick={() => { sortBy = 'value'; sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }}
            class="px-2 py-0.5 rounded transition-colors {sortBy === 'value' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
          >
            Value {sortBy === 'value' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onclick={() => { sortBy = 'price'; sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }}
            class="px-2 py-0.5 rounded transition-colors {sortBy === 'price' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
          >
            Price {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button
            onclick={() => { sortBy = 'quantity'; sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; }}
            class="px-2 py-0.5 rounded transition-colors {sortBy === 'quantity' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
          >
            Qty {sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>
      </div>
    {/if}
  </div>
  
  {#if loading}
    <div class="grid grid-cols-2 gap-3">
      {#each Array(4) as _}
        <div class="rounded-xl shadow bg-zinc-100 dark:bg-zinc-700 p-3 animate-pulse">
          <div class="w-8 h-8 mb-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto"></div>
          <div class="h-4 bg-zinc-300 dark:bg-zinc-600 rounded mt-2"></div>
          <div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-3/4 mx-auto"></div>
          <div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-1/2 mx-auto"></div>
        </div>
      {/each}
    </div>
  {:else if filteredAndSortedTokens.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p>No tokens with value found</p>
      <p class="text-sm mt-2">{tokens.length > 0 ? `${tokens.length} tokens hidden (zero value)` : 'Add tokens to see them here'}</p>
      {#if multiChainView}
        <p class="text-xs mt-1 text-zinc-400">Viewing all networks</p>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-3 overflow-y-auto {expanded ? 'max-h-[400px]' : 'max-h-[300px]'}" style="scrollbar-width: thin;">
      {#each visible as token}
        {@const isImagePath = token.icon && (token.icon.startsWith('/') || token.icon.startsWith('http') || token.icon.includes('.svg') || token.icon.includes('.png') || token.icon.includes('.jpg') || token.icon.includes('.jpeg') || token.icon.includes('.gif') || token.icon.includes('.webp'))}
        <button
          onclick={() => handleTokenClick(token)}
          class="rounded-xl shadow flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-700 p-3 transition hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-300 min-w-0 cursor-pointer w-full"
          title="Click to manage {token.symbol}">
          {#if isImagePath}
            <!-- Image files (local or remote) -->
            <img src={token.icon} alt={token.symbol} class="w-8 h-8 mb-1 rounded-full" onerror={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }} />
            <div class={`w-8 h-8 mb-1 rounded-full items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`} style="display:none;">
              {token.symbol?.[0] || '?'}
            </div>
          {:else}
            <!-- Text/emoji icons or missing icons -->
            <div class={`w-8 h-8 mb-1 rounded-full flex items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}>
              {token.icon || token.symbol?.[0] || '?'}
            </div>
          {/if}
          <div class="font-bold text-base text-center mt-1">{token.symbol}</div>
          <SimpleTooltip content={`${token.qty || 0} ${token.symbol}`} position="auto" maxWidth="200px">
            <div class="text-xs text-zinc-400 dark:text-zinc-200 truncate max-w-[96px] text-center cursor-help mt-0.5">
              <ProtectedValue 
                value={needsEllipsis(token.qty) ? `${token.qty}`.slice(0, 9) + "…" : String(token.qty || 0)}
                placeholder="****"
              />
            </div>
          </SimpleTooltip>
          
          <!-- Market Price -->
          <SimpleTooltip content={getFullPriceDisplay(token.price)} position="auto" maxWidth="250px">
            <div class="text-xs text-zinc-500 dark:text-zinc-400 text-center cursor-help">
              <ProtectedValue value={formatPrice(token.price)} placeholder="****" />
            </div>
          </SimpleTooltip>
          
          <!-- Total Value -->
          <SimpleTooltip content={formatValueFull(token.value)} position="auto" maxWidth="200px">
            <div class="text-sm text-zinc-600 dark:text-zinc-300 truncate max-w-[96px] text-center cursor-help font-medium">
              <ProtectedValue value={formatValue(token.value)} placeholder="*****" />
            </div>
          </SimpleTooltip>
          {#if token.change24h !== undefined}
            <div class="text-xs mt-0.5 font-medium {token.change24h >= 0 ? 'text-green-500' : 'text-red-500'}">
              {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
            </div>
          {/if}
        </button>
      {/each}
    </div>
    {#if hidden.length}
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
