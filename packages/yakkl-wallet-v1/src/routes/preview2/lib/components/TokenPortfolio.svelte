<script lang="ts">
  import SimpleTooltip from "$lib/components/SimpleTooltip.svelte";
  import MoreLess from "./MoreLess.svelte";

  let { tokens = [], className = '', maxRows = 4, loading = false } = $props();

  let expanded = $state(false);
  let visible = $state(tokens.slice(0, maxRows));
  let hidden = $state(tokens.slice(maxRows));

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
</script>

<div class={`bg-white/70 dark:bg-zinc-800 p-4 rounded-2xl shadow space-y-2 relative z-10 ${className}`}>
  <div class="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-200">Token Portfolio</div>
  
  {#if loading}
    <div class="grid grid-cols-2 gap-3">
      {#each Array(4) as _, i}
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
        <div class="rounded-xl shadow flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-700 p-3 transition hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-300 min-w-0">
          {#if token.icon?.startsWith('/') || token.icon?.startsWith('http')}
            <img src={token.icon} alt={token.symbol} class="w-8 h-8 mb-1 rounded-full" />
          {:else}
            <div class={`w-8 h-8 mb-1 rounded-full flex items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}>
              {token.icon || token.symbol[0]}
            </div>
          {/if}
          <div class="font-bold text-base text-center mt-1">{token.symbol}</div>
          <SimpleTooltip content={`${token.qty || 0} ${token.symbol}`}>
            <div class="text-xs text-zinc-400 dark:text-zinc-200 truncate max-w-[96px] text-center cursor-help mt-0.5">
              {needsEllipsis(token.qty) ? `${token.qty}`.slice(0, 9) + "…" : (token.qty || 0)}
            </div>
          </SimpleTooltip>
          <SimpleTooltip content={formatValue(token.value)}>
            <div class="text-sm text-zinc-600 dark:text-zinc-300 truncate max-w-[96px] text-center cursor-help">
              {formatValue(token.value)}
            </div>
          </SimpleTooltip>
        </div>
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
