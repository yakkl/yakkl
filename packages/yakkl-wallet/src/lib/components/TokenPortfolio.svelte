<script lang="ts">
  import SimpleTooltip from "$lib/components/SimpleTooltip.svelte";
  import MoreLess from "./MoreLess.svelte";
  import { tokenStore, isMultiChainView } from '$lib/stores/token.store';
  import { canUseFeature } from '$lib/utils/features';

  let { tokens = [], className = '', maxRows = 4, loading = false } = $props();

  let expanded = $state(false);
  let visible = $state(tokens.slice(0, maxRows));
  let hidden = $state(tokens.slice(maxRows));
  let multiChainView = $derived($isMultiChainView);

  $effect(() => {
    visible = expanded ? tokens : tokens.slice(0, maxRows);
    hidden = expanded ? [] : tokens.slice(maxRows);
  });

  // Helper for long values
  function needsEllipsis(val: number | undefined) {
    return String(val ?? '').length > 9;
  }
  
  function formatValue(val: number | undefined): string {
    if (!val) return '0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatPrice(price: number | undefined): string {
    if (!price) return '$0.00';
    if (price < 0.01) {
      return '< $0.01';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
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
    
    // Load multi-chain data if switching to multi-chain view
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
  <div class="flex items-center justify-between mb-2">
    <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Token Portfolio</div>
    {#if canUseFeature('multi_chain_portfolio')}
      <button
        onclick={toggleMultiChain}
        class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors {multiChainView ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}"
        title={multiChainView ? 'Switch to single chain view' : 'Switch to multi-chain view'}
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {multiChainView ? 'Multi-Chain' : 'Single Chain'}
      </button>
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
  {:else if tokens.length === 0}
    <div class="text-center py-8 text-gray-500 dark:text-gray-400">
      <p>No tokens found</p>
      <p class="text-sm mt-2">Add tokens to see them here</p>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-3 overflow-auto">
      {#each visible as token}
        <button
          onclick={() => handleTokenClick(token)}
          class="rounded-xl shadow flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-700 p-3 transition hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-300 min-w-0 cursor-pointer w-full"
          title="Click to manage {token.symbol}">
          {#if token.icon?.startsWith('/') || token.icon?.startsWith('http')}
            <img src={token.icon} alt={token.symbol} class="w-8 h-8 mb-1 rounded-full" onerror={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }} />
            <div class={`w-8 h-8 mb-1 rounded-full items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`} style="display:none;">
              {token.icon || token.symbol?.[0] || '?'}
            </div>
          {:else}
            <div class={`w-8 h-8 mb-1 rounded-full flex items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}>
              {token.icon || token.symbol?.[0] || '?'}
            </div>
          {/if}
          <div class="font-bold text-base text-center mt-1">{token.symbol}</div>
          <SimpleTooltip content={`${token.qty || 0} ${token.symbol}`}>
            <div class="text-xs text-zinc-400 dark:text-zinc-200 truncate max-w-[96px] text-center cursor-help mt-0.5">
              {needsEllipsis(token.qty) ? `${token.qty}`.slice(0, 9) + "…" : (token.qty || 0)}
            </div>
          </SimpleTooltip>
          
          <!-- Market Price -->
          <SimpleTooltip content={getFullPriceDisplay(token.price)}>
            <div class="text-xs text-zinc-500 dark:text-zinc-400 text-center cursor-help">
              {formatPrice(token.price)}
            </div>
          </SimpleTooltip>
          
          <!-- Total Value -->
          <SimpleTooltip content={formatValue(token.value)}>
            <div class="text-sm text-zinc-600 dark:text-zinc-300 truncate max-w-[96px] text-center cursor-help font-medium">
              {formatValue(token.value)}
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
