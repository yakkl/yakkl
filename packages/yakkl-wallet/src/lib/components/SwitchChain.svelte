<script lang="ts">
	import type { YakklCurrentlySelected } from '$lib/common/interfaces';
  import { getYakklCurrentlySelected, setYakklCurrentlySelectedStorage } from '$lib/common/stores';
  import { log } from '$plugins/Logger';
	import { onMount } from 'svelte';

  export let chainId: string; // 'hex'
  export let onApprove: () => void;
  export let onReject: () => void;

  // NOTE: WIP - Adding a switch chain component to the wallet
  
  const chainLabels: Record<string, string> = {
    '0x1': 'Mainnet',
    '0xaa36a7': 'Sepolia',
    '0x89': 'Polygon',
    '0x13881': 'Mumbai'
  };

  let currentChain: YakklCurrentlySelected | null = null;
  let currentChainId: string;
  let currentChainLabel: string | null = null;

  onMount(async () => {
    try {
      const chain = await getYakklCurrentlySelected();
      if (chain) {
        currentChain = chain;
        currentChainId = chain.shortcuts.chainId.toString(16);
        currentChainLabel = chainLabels[currentChainId] || 'Unknown Network';
      } else {
        throw new Error('No chain found');
      }
    } catch (error) {
      log.error('Error switching chain', false, error);
      onReject();
    }
  });

  function handleSwitch() {
    try {
      currentChain.shortcuts.chainId = parseInt(chainId, 16);
      setYakklCurrentlySelectedStorage(currentChain);
      onApprove();
    } catch (error) {
      log.error('Error switching chain', false, error);
      onReject();
    }
  }
</script>

<div class="flex flex-col space-y-4">
  <div class="text-center">
    <h2 class="text-xl font-semibold">Switch Network</h2>
    <p class="text-gray-600">Current Network: {currentChainLabel}</p>
  </div>

  <div class="flex flex-col space-y-2">
    <p class="text-sm text-gray-600">Switch to: {chainLabels[chainId] || 'Unknown Network'}</p>
  </div>

  <div class="flex justify-end space-x-2">
    <button
      class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
      on:click={onReject}
    >
      Reject
    </button>
    <button
      class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
      on:click={handleSwitch}
    >
      Switch Network
    </button>
  </div>
</div>
