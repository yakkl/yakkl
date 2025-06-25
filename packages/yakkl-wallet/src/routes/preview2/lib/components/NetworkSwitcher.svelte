<script lang="ts">
  let {
    chains = [],
    selectedChain = null,
    showTestnets = false,
    onSwitch = null,
    className = ''
  } = $props();

  if (!chains.length) {
    chains = [
      { key: 'eth-main', name: 'Ethereum', network: 'Mainnet', icon: '/images/eth.svg', isTestnet: false },
      { key: 'eth-sepolia', name: 'Ethereum', network: 'Sepolia', icon: '/images/eth.svg', isTestnet: true },
      { key: 'sol-main', name: 'Solana', network: 'Mainnet', icon: '/images/sol.svg', isTestnet: false }
    ];
  }
  if (!selectedChain) selectedChain = chains[0];

  let menuOpen = $state(false);

  function selectChain(chain: any) {
    if (onSwitch) onSwitch(chain);
    menuOpen = false;
  }
</script>

<div class={`relative ${className}`}>
  <button
    class="yakkl-pill flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-3 py-2 rounded-full text-sm font-semibold shadow border border-zinc-200 dark:border-zinc-700 hover:ring-1 hover:ring-indigo-400 transition"
    onclick={() => menuOpen = !menuOpen}
    aria-haspopup="listbox"
    aria-expanded={menuOpen}
  >
    {#if selectedChain.icon?.includes('/')}
      <img src={selectedChain.icon} alt={selectedChain.name} class="w-6 h-6" />
    {:else}
      <span class="text-xl">{selectedChain.icon}</span>
    {/if}
    <span class="truncate">{selectedChain.name}</span>
    <span class="text-xs opacity-70 ml-1 truncate">{selectedChain.network}</span>
    <svg class="ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6 8l4 4 4-4"/></svg>
    {#if showTestnets && selectedChain.isTestnet}
      <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TESTNET</span>
    {/if}
  </button>
  {#if menuOpen}
    <div class="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-[100] py-2">
      {#each chains as chain}
        {#if showTestnets || !chain.isTestnet}
          <button
            class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            onclick={() => selectChain(chain)}
            role="option"
            aria-selected={selectedChain.key === chain.key}
          >
            {#if chain.icon?.includes('/')}
              <img src={chain.icon} alt={chain.name} class="w-6 h-6" />
            {:else}
              <span class="text-xl">{chain.icon}</span>
            {/if}
            <span class="truncate">{chain.name}</span>
            <span class="ml-2 text-xs opacity-60">{chain.network}</span>
            {#if showTestnets && chain.isTestnet}
              <span class="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TESTNET</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
    <button class="fixed inset-0 z-40" style="background:transparent" aria-label="Close menu" onclick={() => menuOpen = false}></button>
  {/if}
</div>
