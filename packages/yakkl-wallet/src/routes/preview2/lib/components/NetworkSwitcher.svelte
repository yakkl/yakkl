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
    class="yakkl-pill"
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
    <div class="absolute left-0 top-full mt-2 w-56 yakkl-dropdown">
      {#each chains as chain}
        {#if showTestnets || !chain.isTestnet}
          <button
            class="yakkl-dropdown-item flex items-center gap-2"
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
