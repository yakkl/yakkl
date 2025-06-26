<script lang="ts">
  let { chains = [], selectedChain = null, onSwitch = null, showTestnets = false, className = '' } = $props();

  // Dummy data for illustration
  if (!chains.length) {
    chains = [
      { key: 'eth-main', name: 'Ethereum', network: 'Mainnet', icon: '/images/eth.svg', isTestnet: false },
      { key: 'eth-sepolia', name: 'Ethereum', network: 'Sepolia', icon: '/images/eth.svg', isTestnet: true },
      { key: 'sol-main', name: 'Solana', network: 'Mainnet', icon: '🔷', isTestnet: false }
    ];
  }
  if (!selectedChain) selectedChain = chains[0];

  function handleSwitch(chain: any) {
    if (onSwitch) onSwitch(chain);
  }
</script>

<div class={`relative inline-block ${className}`}>
  <button class="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-xl text-sm font-semibold shadow border border-zinc-200 dark:border-zinc-700">
    <span class="text-xl">{selectedChain.icon}</span>
    <span>{selectedChain.name} <span class="text-xs opacity-70 ml-1">{selectedChain.network}</span></span>
    <svg class="ml-1 w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M6 8l4 4 4-4"/></svg>
    {#if showTestnets && selectedChain.isTestnet}
      <span class="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TESTNET</span>
    {/if}
  </button>
  <!-- Dropdown -->
  <div class="absolute left-0 mt-1 w-56 bg-white dark:bg-zinc-900 shadow-lg rounded-xl z-50 border border-zinc-100 dark:border-zinc-800 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition duration-200">
    {#each chains as chain}
      {#if showTestnets || !chain.isTestnet}
        <button class="flex items-center w-full px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
          onclick={() => handleSwitch(chain)}>
          <span class="text-xl mr-2">{chain.icon}</span>
          <span>{chain.name} <span class="ml-2 text-xs opacity-60">{chain.network}</span></span>
          {#if showTestnets && chain.isTestnet}
            <span class="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100 font-bold">TESTNET</span>
          {/if}
        </button>
      {/if}
    {/each}
  </div>
</div>
