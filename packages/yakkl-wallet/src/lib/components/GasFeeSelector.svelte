<script lang="ts">
  import { Zap, Gauge, Turtle } from 'lucide-svelte';
  import SimpleTooltip from './SimpleTooltip.svelte';
  
  export let selectedSpeed: 'slow' | 'standard' | 'fast' = 'standard';
  export let gasPrice = {
    slow: '10',
    standard: '20',
    fast: '30'
  };
  export let estimatedTime = {
    slow: '~10 min',
    standard: '~3 min',
    fast: '~30 sec'
  };
  export let onSelect: (speed: 'slow' | 'standard' | 'fast') => void = () => {};
  
  const speeds = [
    {
      id: 'slow' as const,
      label: 'Slow',
      icon: Turtle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      id: 'standard' as const,
      label: 'Standard',
      icon: Gauge,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'fast' as const,
      label: 'Fast',
      icon: Zap,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  ];
  
  function formatGwei(gwei: string): string {
    return `${gwei} Gwei`;
  }
</script>

<div class="space-y-3">
  <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Gas Fee</h3>
  
  <div class="grid grid-cols-3 gap-2">
    {#each speeds as speed}
      <button
        onclick={() => {
          selectedSpeed = speed.id;
          onSelect(speed.id);
        }}
        class="relative p-3 rounded-lg border-2 transition-all {
          selectedSpeed === speed.id
            ? `${speed.borderColor} ${speed.bgColor}`
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }"
      >
        <div class="flex flex-col items-center gap-1">
          <svelte:component 
            this={speed.icon} 
            class="w-5 h-5 {selectedSpeed === speed.id ? speed.color : 'text-gray-400 dark:text-gray-500'}"
          />
          <span class="text-xs font-medium {
            selectedSpeed === speed.id 
              ? 'text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400'
          }">
            {speed.label}
          </span>
          <SimpleTooltip content={`Gas Price: ${formatGwei(gasPrice[speed.id])}`}>
            <span class="text-xs {
              selectedSpeed === speed.id 
                ? 'text-gray-700 dark:text-gray-300' 
                : 'text-gray-500 dark:text-gray-500'
            }">
              {formatGwei(gasPrice[speed.id])}
            </span>
          </SimpleTooltip>
          <span class="text-xs text-gray-500 dark:text-gray-500">
            {estimatedTime[speed.id]}
          </span>
        </div>
        
        {#if selectedSpeed === speed.id}
          <div class="absolute top-1 right-1 w-2 h-2 rounded-full {speed.color.replace('text-', 'bg-')}"></div>
        {/if}
      </button>
    {/each}
  </div>
  
  <div class="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
    <p>Gas fees go to network validators, not YAKKL. Prices update every 15 seconds.</p>
  </div>
</div>