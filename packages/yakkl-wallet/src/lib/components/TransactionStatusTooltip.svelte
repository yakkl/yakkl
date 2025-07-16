<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    status?: 'confirmed' | 'pending' | 'failed';
    txType?: 'send' | 'receive' | 'swap' | 'contract';
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto' | 'bottom-left' | 'bottom-right';
  }

  let { status, txType, placement = 'auto' }: Props = $props();

  let showTooltip = $state(false);
  let tooltipTimeout: number | null = null;
  let actualPlacement = $state(placement === 'auto' ? 'bottom' : placement);
  let containerEl = $state<HTMLElement>();
  let tooltipEl = $state<HTMLElement>();

  const statusTooltips = {
    confirmed: {
      title: 'Confirmed Status',
      content: 'Transaction successfully completed and permanently recorded on the blockchain.'
    },
    pending: {
      title: 'Pending Status',
      content: 'Transaction submitted but waiting to be included in a block. May take longer if gas price is low.'
    },
    failed: {
      title: 'Failed Status',
      content: 'Transaction was processed but failed to complete. Gas fees are still consumed even for failed transactions.'
    }
  };

  const txTypeTooltips = {
    send: {
      title: 'Sent Transaction',
      content: 'You sent tokens from your wallet to another address.'
    },
    receive: {
      title: 'Received Transaction',
      content: 'You received tokens from another address into your wallet.'
    },
    swap: {
      title: 'Token Swap',
      content: 'You exchanged one token for another using a decentralized exchange.'
    },
    contract: {
      title: 'Contract Interaction',
      content: 'You interacted with a smart contract (DeFi protocol, NFT mint, etc.).'
    }
  };

  function calculatePlacement() {
    if (placement !== 'auto' || !containerEl || !tooltipEl) {
      actualPlacement = placement === 'auto' ? 'bottom' : placement;
      return;
    }
    
    // Ensure window is defined (SSR safety)
    if (typeof window === 'undefined') {
      actualPlacement = 'bottom';
      return;
    }

    const rect = containerEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Tooltip dimensions (approximate)
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    const tooltipHeight = 100; // Approximate height
    
    // Check space in each direction
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;
    
    // Determine best placement based on available space
    if (spaceLeft < tooltipWidth && spaceRight > tooltipWidth) {
      // Not enough space on left, show on right
      actualPlacement = 'right';
    } else if (spaceRight < tooltipWidth && spaceLeft > tooltipWidth) {
      // Not enough space on right, show on left
      actualPlacement = 'left';
    } else if (spaceTop < tooltipHeight && spaceBottom > tooltipHeight) {
      actualPlacement = 'bottom';
    } else if (spaceBottom < tooltipHeight && spaceTop > tooltipHeight) {
      actualPlacement = 'top';
    } else {
      actualPlacement = 'bottom';
    }
  }

  function handleMouseEnter() {
    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    showTooltip = true;
    // Calculate placement after showing tooltip
    setTimeout(calculatePlacement, 0);
  }

  function handleMouseLeave() {
    tooltipTimeout = window.setTimeout(() => {
      showTooltip = false;
    }, 200);
  }

  let tooltip = $derived(
    status ? statusTooltips[status] : txType ? txTypeTooltips[txType] : null
  );
  
  // Recalculate on window resize
  onMount(() => {
    const handleResize = () => {
      if (showTooltip) {
        calculatePlacement();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });
</script>

{#if tooltip}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={containerEl}
  class="relative inline-flex items-center"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <svg class="w-3 h-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>

  {#if showTooltip}
    <div 
      bind:this={tooltipEl}
      class="absolute z-[9999] animate-in fade-in duration-200 pointer-events-none
        {actualPlacement === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' : 
         actualPlacement === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' : 
         actualPlacement === 'bottom-left' ? 'top-full mt-2 right-0' :
         actualPlacement === 'bottom-right' ? 'top-full mt-2 left-0' :
         actualPlacement === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' : 
         actualPlacement === 'right' ? 'left-full ml-2 top-1/2 transform -translate-y-1/2' : 
         'top-full mt-2 left-1/2 transform -translate-x-1/2'}"
    >
      <div class="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 w-64 max-w-xs">
        <div class="font-semibold mb-1">{tooltip.title}</div>
        <div class="text-gray-300 leading-relaxed">{tooltip.content}</div>
        <!-- Arrow -->
        <div class="absolute rotate-45 w-2 h-2 bg-gray-900
          {actualPlacement === 'top' ? 'bottom-0 translate-y-1/2 left-1/2 transform -translate-x-1/2' : 
           actualPlacement === 'bottom' ? 'top-0 -translate-y-1/2 left-1/2 transform -translate-x-1/2' : 
           actualPlacement === 'bottom-left' ? 'top-0 -translate-y-1/2 right-4' :
           actualPlacement === 'bottom-right' ? 'top-0 -translate-y-1/2 left-4' :
           actualPlacement === 'left' ? 'right-0 translate-x-1/2 top-1/2 transform -translate-y-1/2' : 
           actualPlacement === 'right' ? 'left-0 -translate-x-1/2 top-1/2 transform -translate-y-1/2' :
           'top-0 -translate-y-1/2 left-1/2 transform -translate-x-1/2'}"
        ></div>
      </div>
    </div>
  {/if}
</div>
{/if}
