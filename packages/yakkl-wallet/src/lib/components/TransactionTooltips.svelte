<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    type: 'hash' | 'from' | 'to' | 'nativeToken' | 'value' | 'gasPrice' | 'gasUnits' | 'gasCost' |
          'blockNumber' | 'nonce' | 'confirmations' | 'timestamp' | 'status' | 'txType';
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  }

  let { type, placement = 'auto' }: Props = $props();

  let showTooltip = $state(false);
  let tooltipTimeout: number | null = null;
  let actualPlacement = $state(placement === 'auto' ? 'bottom' : placement);
  let containerEl = $state<HTMLElement>();
  let tooltipEl = $state<HTMLElement>();

  const tooltips = {
    hash: {
      title: 'Transaction Hash',
      content: 'A unique identifier for this transaction on the blockchain. Like a receipt number, it can be used to look up this transaction on any blockchain explorer.'
    },
    from: {
      title: 'Sender Address',
      content: 'The wallet address that initiated and signed this transaction. This address paid the gas fees.'
    },
    to: {
      title: 'Recipient Address',
      content: 'The wallet address receiving the funds or the smart contract being interacted with.'
    },
    nativeToken: {
      title: 'Native Token Amount',
      content: 'The amount of the blockchain\'s native currency (ETH, MATIC, etc.) transferred in this transaction.'
    },
    value: {
      title: 'Transaction Value',
      content: 'The approximate USD value of the native tokens transferred at the time of the transaction.'
    },
    gasPrice: {
      title: 'Gas Price',
      content: 'The price per unit of gas in Gwei. Higher gas prices result in faster transaction processing. Example: 20 Gwei means you pay 0.00000002 ETH per gas unit.'
    },
    gasUnits: {
      title: 'Gas Units Used',
      content: 'The computational units consumed by this transaction. Simple transfers use ~21,000 units, while complex smart contract interactions use more.'
    },
    gasCost: {
      title: 'Total Gas Cost',
      content: 'The total fee paid for this transaction. Calculated as: Gas Units × Gas Price. Example: 21,000 units × 20 Gwei = 0.00042 ETH.'
    },
    blockNumber: {
      title: 'Block Number',
      content: 'The specific block in the blockchain where this transaction was recorded. Higher numbers mean more recent blocks.'
    },
    nonce: {
      title: 'Transaction Nonce',
      content: 'A sequential number for transactions from this address. Prevents duplicate transactions and ensures they process in order.'
    },
    confirmations: {
      title: 'Confirmations',
      content: 'The number of blocks added after the one containing this transaction. More confirmations mean greater finality. Usually 12+ is considered very secure.'
    },
    timestamp: {
      title: 'Transaction Time',
      content: 'When this transaction was included in a block and permanently recorded on the blockchain.'
    },
    status: {
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
    },
    txType: {
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
    }
  };

  function getTooltipData() {
    if (type === 'status' || type === 'txType') {
      // These have sub-types that we'll handle dynamically
      return null;
    }
    return tooltips[type];
  }

  function calculatePlacement() {
    if (placement !== 'auto' || !containerEl || !tooltipEl) {
      actualPlacement = placement === 'auto' ? 'bottom' : placement;
      return;
    }

    const rect = containerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 10; // Buffer from edges

    // Check space in each direction
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    // Tooltip dimensions (approximate)
    const tooltipWidth = 256; // w-64 = 16rem = 256px
    const tooltipHeight = 100; // Approximate height

    // Determine best placement based on available space
    if (placement === 'auto') {
      // Check if we're near edges and adjust accordingly
      if (spaceLeft < tooltipWidth / 2 && spaceRight > tooltipWidth) {
        // Near left edge, show on right
        actualPlacement = 'right';
      } else if (spaceRight < tooltipWidth / 2 && spaceLeft > tooltipWidth) {
        // Near right edge, show on left
        actualPlacement = 'left';
      } else if (spaceTop < tooltipHeight && spaceBottom > tooltipHeight) {
        // Near top, show below
        actualPlacement = 'bottom';
      } else if (spaceBottom < tooltipHeight && spaceTop > tooltipHeight) {
        // Near bottom, show above
        actualPlacement = 'top';
      } else {
        // Default to bottom if enough space
        actualPlacement = 'bottom';
      }
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

  let tooltip = $derived(getTooltipData());

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

  {#if showTooltip && tooltip}
    <div 
      bind:this={tooltipEl}
      class="absolute z-[9999] animate-in fade-in duration-200 pointer-events-none
        {actualPlacement === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' : 
         actualPlacement === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' : 
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
           actualPlacement === 'left' ? 'right-0 translate-x-1/2 top-1/2 transform -translate-y-1/2' : 
           actualPlacement === 'right' ? 'left-0 -translate-x-1/2 top-1/2 transform -translate-y-1/2' :
           'top-0 -translate-y-1/2 left-1/2 transform -translate-x-1/2'}"
        ></div>
      </div>
    </div>
  {/if}
</div>

