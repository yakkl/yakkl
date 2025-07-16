<script lang="ts">
  import { currentChain, visibleChains } from '../stores/chain.store';
  import { getSettings } from '$lib/common/stores';
  
  let {
    chains = [],
    selectedChain = null,
    showTestnets = false,
    onSwitch = null,
    className = ''
  } = $props();
  
  // Use store data if available
  let storeChains = $derived($visibleChains);
  let storeSelectedChain = $derived($currentChain);
  let showTestnetsSetting = $state(false);

  // Use store data if available, otherwise fallback to props or default
  let effectiveChains = $derived(() => {
    if (storeChains.length > 0) {
      return showTestnetsSetting ? storeChains : storeChains.filter(chain => !chain.isTestnet);
    }
    if (chains.length > 0) {
      return showTestnets ? chains : chains.filter(chain => !chain.isTestnet);
    }
    return [
      { key: 'eth-main', name: 'Ethereum', network: 'Mainnet', icon: '/images/eth.svg', isTestnet: false, chainId: 1 },
      { key: 'eth-sepolia', name: 'Ethereum', network: 'Sepolia', icon: '/images/eth.svg', isTestnet: true, chainId: 11155111 },
      { key: 'sol-main', name: 'Solana', network: 'Mainnet', icon: '/images/sol.svg', isTestnet: false, chainId: 101 }
    ].filter(chain => showTestnetsSetting ? true : !chain.isTestnet);
  });
  
  let effectiveSelectedChain = $derived(() => {
    return storeSelectedChain || selectedChain || effectiveChains[0];
  });

  let menuOpen = $state(false);

  function selectChain(chain: any) {
    if (onSwitch) onSwitch(chain);
    menuOpen = false;
  }
</script>

<div class={`relative ${className}`}>
  <button
    class="yakkl-pill"
    onclick={() => menuOpen = !menuOpen}
    title="Switch Network"
    aria-haspopup="listbox"
    aria-expanded={menuOpen}
  >
    {#if effectiveSelectedChain?.icon?.includes('/')}
      <img src={effectiveSelectedChain.icon} alt={effectiveSelectedChain.name} class="w-6 h-6" />
    {:else}
      <span class="text-xl">{effectiveSelectedChain?.icon || '🌐'}</span>
    {/if}
    <span class="truncate">{effectiveSelectedChain?.name || 'Unknown'}</span>
    <span class="text-xs opacity-70 ml-1 truncate">{effectiveSelectedChain?.network || 'Network'}</span>
    <svg class="ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6 8l4 4 4-4"/></svg>
    {#if (showTestnets || showTestnetsSetting) && effectiveSelectedChain?.isTestnet}
      <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TESTNET</span>
    {/if}
  </button>
  {#if menuOpen}
    <div class="absolute left-0 top-full mt-2 w-56 yakkl-dropdown">
      {#each effectiveChains as chain}
        <button
          class="yakkl-dropdown-item flex items-center gap-2 {chain.key === effectiveSelectedChain?.key ? 'bg-indigo-50 dark:bg-indigo-900' : ''}"
          onclick={() => selectChain(chain)}
          role="option"
          aria-selected={effectiveSelectedChain.key === chain.key}
          title={`Switch to ${chain.name} ${chain.network}`}
        >
          {#if chain.icon?.includes('/')}
            <img src={chain.icon} alt={chain.name} class="w-6 h-6" />
          {:else}
            <span class="text-xl">{chain.icon}</span>
          {/if}
          <div class="flex-1 text-left">
            <div class="font-medium">{chain.name}</div>
            <div class="text-xs opacity-60">{chain.network}</div>
            {#if chain.chainId}
              <div class="text-xs text-zinc-400">ID: {chain.chainId}</div>
            {/if}
          </div>
          {#if (showTestnets || showTestnetsSetting) && chain.isTestnet}
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TEST</span>
          {/if}
          {#if chain.key === effectiveSelectedChain?.key}
            <svg class="w-4 h-4 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
    <button class="fixed inset-0 z-40" style="background:transparent" aria-label="Close menu" onclick={() => menuOpen = false}></button>
  {/if}
</div>
