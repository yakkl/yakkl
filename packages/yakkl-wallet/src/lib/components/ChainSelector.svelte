<!-- ChainSelector.svelte -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { AlertCircle, Loader2, Network, Search } from 'lucide-svelte';
  import { detectBlockchainAddress } from '$lib/common/address-detector';
  import { resolveChainForAddress, type ChainResolutionResult } from '$lib/common/chain-resolver';

  // Chain metadata
  const CHAIN_INFO = {
    ETH: { name: 'Ethereum', color: 'bg-blue-500', icon: '🔷' },
    BASE: { name: 'Base', color: 'bg-blue-600', icon: '🔵' },
    ARBITRUM: { name: 'Arbitrum', color: 'bg-blue-400', icon: '🔷' },
    OPTIMISM: { name: 'Optimism', color: 'bg-red-500', icon: '🔴' },
    MATIC: { name: 'Polygon', color: 'bg-purple-500', icon: '🟣' },
    BSC: { name: 'BNB Chain', color: 'bg-yellow-500', icon: '🟡' },
    AVAX: { name: 'Avalanche', color: 'bg-red-600', icon: '🔺' }
  };

  // Props using new $props() rune
  interface Props {
    show?: boolean;
    initialAddress?: string;
    currentNetwork?: string;
    onClose?: () => void;
  }

  let {
    show = $bindable(false),
    initialAddress = '',
    currentNetwork = null,
    onClose = () => {
      show = false;
    }
  }: Props = $props();

  // State using $state() rune
  let address = $state(initialAddress);
  let detecting = $state(false);
  let resolution = $state<ChainResolutionResult | null>(null);
  let showAllChains = $state(false);
  let error = $state<string | null>(null);

  // Derived state using $derived() rune
  let probableChains = $derived(
    resolution?.probableChains.slice(0, showAllChains ? undefined : 3) || []
  );

  let otherChains = $derived(
    resolution?.allPossibleChains.filter(
      chain => !resolution.probableChains.find(pc => pc.chain === chain)
    ) || []
  );

  function close() {
    show = false;
    // Clear all state when closing
    address = '';
    resolution = null;
    showAllChains = false;
    error = null;
    detecting = false;
    onClose();
  }

  // Methods
  async function handleAddressSubmit() {
    error = null;

    if (!address) return;

    // First detect if it's a valid address
    const detection = detectBlockchainAddress(address);

    if (!detection.success) {
      error = 'Invalid address format';
      return;
    }

    detecting = true;

    try {
      // Resolve the most likely chain
      const result = await resolveChainForAddress(address, {
        quickMode: false,
        userContext: {
          currentNetwork: currentNetwork || localStorage.getItem('yakkl_current_network')
        }
      });

      resolution = result;
    } catch (err) {
      error = 'Failed to analyze address';
    } finally {
      detecting = false;
    }
  }

  function getConfidenceBadge(confidence: number) {
    if (confidence > 0.8) return { text: 'High', color: 'bg-green-500' };
    if (confidence > 0.6) return { text: 'Medium', color: 'bg-yellow-500' };
    return { text: 'Low', color: 'bg-gray-500' };
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleAddressSubmit();
    }
  }

  function setExampleAddress(exampleAddress: string) {
    address = exampleAddress;
  }
</script>

<Modal bind:show title="YAKKL Smart Chain Detection" {onClose} className="z-[1000]">
  <div class="p-4 mt-4">
    <!-- Icon header -->
    <div class="flex items-center gap-2 mb-4">
      <Network class="w-6 h-6 text-blue-600" />
      <span class="text-lg font-medium">Smart Chain Detection</span>
    </div>

  <!-- Address Input -->
  <div class="mb-6">
    <div class="relative">
      <input
        type="text"
        bind:value={address}
        onkeydown={handleKeyDown}
        placeholder="Enter or paste blockchain address..."
        class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        title="Enter a blockchain address to identify which networks it may belong to"
      />
      <button
        onclick={handleAddressSubmit}
        disabled={detecting}
        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50"
        title="Click to analyze address"
        aria-label="Analyze address"
      >
        {#if detecting}
          <Loader2 class="w-5 h-5 animate-spin" />
        {:else}
          <Search class="w-5 h-5" />
        {/if}
      </button>
    </div>
    {#if error}
      <div class="mt-2 text-red-600 text-sm flex items-center gap-1">
        <AlertCircle class="w-4 h-4" />
        {error}
      </div>
    {/if}
  </div>

  <!-- Example Addresses -->
  <div class="mb-6 p-4 bg-gray-50 rounded-lg">
    <p class="text-sm text-gray-600 mb-2">Try these example addresses:</p>
    <div class="space-y-1">
      <button
        onclick={() => setExampleAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f2BD27')}
        class="text-sm text-blue-600 hover:underline block"
        title="Click to use this example Ethereum/EVM address"
      >
        EVM Address (works on multiple chains)
      </button>
      <button
        onclick={() => setExampleAddress('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')}
        class="text-sm text-blue-600 hover:underline block"
        title="Click to use this example Bitcoin address"
      >
        Bitcoin SegWit Address
      </button>
    </div>
  </div>

  <!-- Chain Resolution Results -->
  {#if resolution}
    <div class="space-y-4 z-[990]">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="font-semibold text-blue-900 mb-2">
          Multi-Chain Address Detected
        </h3>
        <p class="text-sm text-blue-700">
          This address format is compatible with multiple blockchain networks.
          We've analyzed on-chain data and usage patterns to suggest the most likely chain.
        </p>
      </div>

      <!-- Recommended Chains -->
      <div class="space-y-3">
        <h4 class="font-semibold text-gray-700">Probable Chains:</h4>

        {#each probableChains as chain}
          {@const chainInfo = CHAIN_INFO[chain.chain] || { name: chain.chain, color: 'bg-gray-500', icon: '⭕' }}
          {@const badge = getConfidenceBadge(chain.confidence)}

          <div
            class="w-full p-4 rounded-lg border-2 {chain.confidence > 0.7
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white'}"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">{chainInfo.icon}</span>
                <div class="text-left">
                  <p class="font-semibold">{chainInfo.name}</p>
                  <p class="text-sm text-gray-600">{chain.reason}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 text-xs font-semibold text-white rounded {badge.color}">
                  {badge.text}
                </span>
              </div>
            </div>

            {#if chain.activity}
              <div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                {#if chain.activity.hasActivity}
                  <span>Active • {chain.activity.nonce} transactions</span>
                {/if}
                {#if chain.activity.isContract}
                  <span class="ml-2">• Contract</span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Show All Chains Toggle -->
      {#if !showAllChains && resolution.allPossibleChains.length > 3}
        <button
          onclick={() => showAllChains = true}
          class="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          title="Click to view all compatible blockchain networks"
        >
          Show all {resolution.allPossibleChains.length} compatible chains
        </button>
      {/if}

      <!-- All Other Chains -->
      {#if showAllChains && otherChains.length > 0}
        <div class="border-t pt-4">
          <h4 class="font-semibold text-gray-700 mb-3">Other Compatible Chains:</h4>
          <div class="grid grid-cols-2 gap-2">
            {#each otherChains as chain}
              {@const chainInfo = CHAIN_INFO[chain] || { name: chain, color: 'bg-gray-500', icon: '⭕' }}

              <div
                class="p-3 rounded-lg border flex items-center gap-2 border-gray-200 bg-white"
              >
                <span>{chainInfo.icon}</span>
                <span class="text-sm font-medium">{chainInfo.name}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Close button -->
  <div class="flex justify-end mt-6">
    <button type="button" class="btn btn-secondary" onclick={close}>
      Close
    </button>
  </div>
  </div>
</Modal>

<style>
  /* Add any component-specific styles here if needed */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
