<script lang="ts">
  import { onMount } from 'svelte';
  import { currentChain, visibleChains } from '../stores/chain.store';
  import { getProfile } from '$lib/common/stores';

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

  // Load testnet setting on mount
  onMount(async () => {
    try {
      const currentProfile = await getProfile();
      // Check for testnet setting in preferences
      if (currentProfile?.preferences) {
        showTestnetsSetting = currentProfile.preferences.showTestNetworks || false;
      }
    } catch (error) {
      console.warn('Failed to load testnet settings:', error);
      showTestnetsSetting = false;
    }
  });

  // Use store data if available, otherwise fallback to props or default
  let effectiveChains = $derived.by(() => {
    const chainsArray = storeChains.length > 0 ? storeChains :
                       chains.length > 0 ? chains :
                       [
                         { key: 'eth-mainnet', name: 'Ethereum', network: 'Mainnet', icon: '/images/eth.svg', isTestnet: false, chainId: 1 },
                         { key: 'eth-sepolia', name: 'Ethereum', network: 'Sepolia', icon: '/images/eth.svg', isTestnet: true, chainId: 11155111 },
                         { key: 'polygon-mainnet', name: 'Polygon', network: 'Mainnet', icon: '🟣', isTestnet: false, chainId: 137 },
                         { key: 'solana-mainnet', name: 'Solana', network: 'Mainnet', icon: '/images/sol.svg', isTestnet: false, chainId: 101 }
                       ];

    const filtered = showTestnetsSetting || showTestnets ? chainsArray : chainsArray.filter(chain => !chain.isTestnet);
    console.log('NetworkSwitcher effectiveChains:', filtered);
    return filtered;
  });

  let effectiveSelectedChain = $derived.by(() => {
    const selected = storeSelectedChain || selectedChain || effectiveChains[0] || { name: 'Unknown', network: 'Network' };
    console.log('NetworkSwitcher effectiveSelectedChain:', selected);
    return selected;
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
    <!-- Invisible backdrop to close menu when clicking outside -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="fixed inset-0 z-40" onclick={() => menuOpen = false} onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}></div>
    <div class="absolute left-0 top-full mt-2 w-56 yakkl-dropdown z-50">
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
  {/if}
</div>
