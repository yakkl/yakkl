<!-- src/lib/components/ConversionCalculator.svelte -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import TokenFiatConverter from './TokenFiatConverter.svelte';
  import EthUnitConverter from './EthUnitConverter.svelte';
  import type { TokenData } from '$lib/common';

  let {
    show = $bindable(false),
    tokens = [],
    initialTab = 'token' as 'token' | 'eth',
    onClose = () => {show = false},
    onComplete = null as ((value: string, type: 'token' | 'usd' | 'wei' | 'gwei' | 'ether', token?: TokenData) => void) | null
  } = $props<{
    show?: boolean;
    tokens?: TokenData[];
    initialTab?: 'token' | 'eth';
    onClose?: () => void;
    onComplete?: ((value: string, type: 'token' | 'usd' | 'wei' | 'gwei' | 'ether', token?: TokenData) => void) | null;
  }>();

  // Tab state - using $state for internal component state
  let activeTab = $state<'token' | 'eth'>(initialTab);

  // Tab state
  let showTokenConverter = $derived(activeTab === 'token');
  let showEthConverter = $derived(activeTab === 'eth');

  // Handle completions from child components
  function handleTokenComplete(amount: string, isUsd: boolean, token?: TokenData) {
    if (onComplete) {
      onComplete(amount, isUsd ? 'usd' : 'token', token);
    }
    show = false;
  }

  function handleEthComplete(value: string, unit: 'wei' | 'gwei' | 'ether') {
    if (onComplete) {
      onComplete(value, unit);
    }
    show = false;
  }
</script>

<Modal bind:show title="Conversion Calculator" {onClose}>
  <div class="p-4">
    <!-- Tab Navigation -->
    <div class="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        type="button"
        class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors"
        class:bg-white={activeTab === 'token'}
        class:dark:bg-gray-700={activeTab === 'token'}
        class:text-blue-600={activeTab === 'token'}
        class:dark:text-blue-400={activeTab === 'token'}
        class:text-gray-600={activeTab !== 'token'}
        class:dark:text-gray-400={activeTab !== 'token'}
        onclick={() => activeTab = 'token'}
      >
        Token ↔ USD
      </button>
      <button
        type="button"
        class="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors"
        class:bg-white={activeTab === 'eth'}
        class:dark:bg-gray-700={activeTab === 'eth'}
        class:text-blue-600={activeTab === 'eth'}
        class:dark:text-blue-400={activeTab === 'eth'}
        class:text-gray-600={activeTab !== 'eth'}
        class:dark:text-gray-400={activeTab !== 'eth'}
        onclick={() => activeTab = 'eth'}
      >
        ETH Units
      </button>
    </div>

    <!-- Content -->
    <div class="mt-4">
      {#if showTokenConverter}
        <TokenFiatConverter
          {tokens}
          compact={true}
          show={true}
          onComplete={handleTokenComplete}
        />
      {:else if showEthConverter}
        <EthUnitConverter
          compact={true}
          show={true}
          showUsdValue={true}
          onComplete={handleEthComplete}
        />
      {/if}
    </div>

    <div class="flex justify-end mt-6">
      <button type="button" class="btn btn-secondary" onclick={onClose}>
        Close
      </button>
    </div>
  </div>
</Modal>
