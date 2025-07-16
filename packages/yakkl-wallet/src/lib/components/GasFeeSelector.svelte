<script lang="ts">
  import { onMount } from 'svelte';
  import { Zap, Clock, Gauge } from 'lucide-svelte';
  import { browser } from '$app/environment';
  import { messageService } from '$lib/services/message.service';
  // import { type GasEstimate } from '$lib/types';

  interface Props {
    chainId?: number;
    onSelect?: (option: GasOption) => void;
    selectedOption?: 'slow' | 'normal' | 'fast';
    customGasLimit?: string;
    customGasPrice?: string;
    showCustom?: boolean;
  }

  interface GasOption {
    speed: 'slow' | 'normal' | 'fast';
    label: string;
    time: string;
    gasPrice: string;
    priorityFee: string;
    totalFee: string;
    fiatValue: string;
  }

  let {
    chainId = 1,
    onSelect = () => {},
    selectedOption = $bindable('normal'),
    customGasLimit = $bindable(''),
    customGasPrice = $bindable(''),
    showCustom = false
  }: Props = $props();

  let gasOptions = $state<GasOption[]>([
    {
      speed: 'slow',
      label: 'Slow',
      time: '~5 min',
      gasPrice: '10',
      priorityFee: '1',
      totalFee: '11',
      fiatValue: '$0.65'
    },
    {
      speed: 'normal',
      label: 'Normal',
      time: '~2 min',
      gasPrice: '15',
      priorityFee: '2',
      totalFee: '17',
      fiatValue: '$0.85'
    },
    {
      speed: 'fast',
      label: 'Fast',
      time: '~30 sec',
      gasPrice: '20',
      priorityFee: '3',
      totalFee: '23',
      fiatValue: '$1.20'
    }
  ]);

  let loading = $state(false);
  let showAdvanced = $state(false);

  onMount(async () => {
    if (browser) {
      await fetchGasEstimates();
    }
  });

  async function fetchGasEstimates() {
    try {
      loading = true;
      const response = await messageService.send({
        method: 'yakkl_getGasEstimates',
        params: { chainId }
      });

      if (response.data?.result) {
        const estimates = response.data?.result as any;

        // Update gas options with real data
        gasOptions = [
          {
            speed: 'slow',
            label: 'Slow',
            time: '~5 min',
            gasPrice: estimates.low.gasPrice || '10',
            priorityFee: estimates.low.priorityFee || '1',
            totalFee: estimates.low.totalFee || '11',
            fiatValue: estimates.low.fiatValue || '$0.65'
          },
          {
            speed: 'normal',
            label: 'Normal',
            time: '~2 min',
            gasPrice: estimates.medium.gasPrice || '15',
            priorityFee: estimates.medium.priorityFee || '2',
            totalFee: estimates.medium.totalFee || '17',
            fiatValue: estimates.medium.fiatValue || '$0.85'
          },
          {
            speed: 'fast',
            label: 'Fast',
            time: '~30 sec',
            gasPrice: estimates.high.gasPrice || '20',
            priorityFee: estimates.high.priorityFee || '3',
            totalFee: estimates.high.totalFee || '23',
            fiatValue: estimates.high.fiatValue || '$1.20'
          }
        ];
      }
    } catch (error) {
      console.error('Error fetching gas estimates:', error);
    } finally {
      loading = false;
    }
  }

  function selectOption(option: GasOption) {
    selectedOption = option.speed;
    onSelect(option);
  }

  function getIcon(speed: 'slow' | 'normal' | 'fast') {
    switch (speed) {
      case 'slow':
        return Clock;
      case 'normal':
        return Gauge;
      case 'fast':
        return Zap;
    }
  }

  function handleCustomGas() {
    if (customGasLimit && customGasPrice) {
      const customOption: GasOption = {
        speed: 'fast',
        label: 'Custom',
        time: 'Variable',
        gasPrice: customGasPrice,
        priorityFee: '0',
        totalFee: customGasPrice,
        fiatValue: 'Custom'
      };
      onSelect(customOption);
    }
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Transaction Speed</label>
    {#if loading}
      <div class="text-xs text-gray-500 dark:text-gray-400">Updating gas prices...</div>
    {/if}
  </div>

  <div class="grid grid-cols-3 gap-2">
    {#each gasOptions as option}
      {@const Icon = getIcon(option.speed)}
      <button
        onclick={() => selectOption(option)}
        class="relative p-3 text-center rounded-lg border-2 transition-all duration-200 {
          selectedOption === option.speed
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }"
      >
        <div class="flex items-center justify-center mb-1">
          <Icon class="w-4 h-4 {selectedOption === option.speed ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}" />
        </div>
        <div class="text-sm font-medium {selectedOption === option.speed ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}">
          {option.label}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{option.time}</div>
        <div class="text-xs font-medium {selectedOption === option.speed ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}">
          {option.fiatValue}
        </div>
        {#if selectedOption === option.speed}
          <div class="absolute top-1 right-1">
            <div class="w-2 h-2 bg-indigo-500 rounded-full"></div>
          </div>
        {/if}
      </button>
    {/each}
  </div>

  {#if showCustom}
    <button
      onclick={() => showAdvanced = !showAdvanced}
      class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
    >
      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
    </button>

    {#if showAdvanced}
      <div class="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gas Limit
          </label>
          <input
            type="text"
            bind:value={customGasLimit}
            placeholder="21000"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gas Price (Gwei)
          </label>
          <input
            type="text"
            bind:value={customGasPrice}
            placeholder="20"
            class="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <button
          onclick={handleCustomGas}
          disabled={!customGasLimit || !customGasPrice}
          class="w-full py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Apply Custom Gas
        </button>
      </div>
    {/if}
  {/if}

  <div class="text-xs text-gray-500 dark:text-gray-400">
    <div class="flex items-center justify-between">
      <span>Selected: {gasOptions.find(o => o.speed === selectedOption)?.totalFee || '0'} Gwei</span>
      <button
        onclick={fetchGasEstimates}
        class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
      >
        Refresh
      </button>
    </div>
  </div>
</div>
