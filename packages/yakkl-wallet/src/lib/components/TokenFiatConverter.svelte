<!-- src/lib/components/TokenFiatConverter.svelte -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { onMount } from 'svelte';
  import type { TokenData } from '$lib/common';
  import { PriceManager } from '$lib/managers/PriceManager';
  import { CoinbasePriceProvider } from '$lib/managers/providers/price/coinbase/CoinbasePriceProvider';
  import { CoingeckoPriceProvider } from '$lib/managers/providers/price/coingecko/CoingeckoPriceProvider';
  import { KrakenPriceProvider } from '$lib/managers/providers/price/kraken/KrakenPriceProvider';

  let {
    show = $bindable(false),
    tokens = [],
    selectedToken = null,
    initialTokenAmount = '',
    initialUsdAmount = '',
    onComplete = null as ((amount: string, isUsd: boolean, token?: TokenData) => void) | null,
    compact = false,
    readOnly = false,
    onClose = () => {show = false}
  } = $props<{
    show?: boolean;
    tokens?: TokenData[];
    selectedToken?: TokenData | null;
    initialTokenAmount?: string;
    initialUsdAmount?: string;
    onComplete?: ((amount: string, isUsd: boolean, token?: TokenData) => void) | null;
    compact?: boolean;
    readOnly?: boolean;
    onClose?: () => void;
  }>();

  // State
  let fromToken = $state(selectedToken);
  let tokenAmount = $state(initialTokenAmount);
  let usdAmount = $state(initialUsdAmount);
  let price = $state(0);
  let isLoading = $state(false);

  const priceManager = new PriceManager([
    { provider: new CoinbasePriceProvider(), weight: 5 },
    { provider: new CoingeckoPriceProvider(), weight: 3 },
    { provider: new KrakenPriceProvider(), weight: 2 },
  ]);

  // Conversion logic
  async function updatePrice() {
    if (fromToken) {
      isLoading = true;
      try {
        const result = await priceManager.getMarketPrice(fromToken.symbol);
        price = result && typeof result === 'object' && 'price' in result ? result.price : 0;
      } catch (error) {
        console.error('Failed to fetch price:', error);
        price = 0;
      } finally {
        isLoading = false;
      }
    }
  }

  async function handleTokenChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    fromToken = tokens.find((t: TokenData) => t.symbol === target.value) || null;
    await updatePrice();

    // Update values if one is filled
    if (tokenAmount && price) {
      usdAmount = formatNum(parseFloat(tokenAmount) * price);
    } else if (usdAmount && price) {
      tokenAmount = formatNum(parseFloat(usdAmount) / price);
    }
  }

  async function handleTokenAmountInput(e: Event) {
    const target = e.target as HTMLInputElement;
    tokenAmount = target.value;

    if (!price && fromToken) {
      await updatePrice();
    }

    if (price && tokenAmount) {
      const numValue = parseFloat(tokenAmount);
      if (!isNaN(numValue)) {
        usdAmount = formatNum(numValue * price);
      } else {
        usdAmount = '';
      }
    } else {
      usdAmount = '';
    }
  }

  async function handleUsdAmountInput(e: Event) {
    const target = e.target as HTMLInputElement;
    usdAmount = target.value;

    if (!price && fromToken) {
      await updatePrice();
    }

    if (price && usdAmount) {
      const numValue = parseFloat(usdAmount);
      if (!isNaN(numValue)) {
        tokenAmount = formatNum(numValue / price, 6);
      } else {
        tokenAmount = '';
      }
    } else {
      tokenAmount = '';
    }
  }

  function formatNum(val: number, decimals = 2): string {
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  }

  function applyTokenValue() {
    if (onComplete && fromToken) {
      onComplete(tokenAmount, false, fromToken);
      if (!compact) show = false;
    }
  }

  function applyUsdValue() {
    if (onComplete && fromToken) {
      onComplete(usdAmount, true, fromToken);
      if (!compact) show = false;
    }
  }

  function clearFields() {
    tokenAmount = '';
    usdAmount = '';
    price = 0;
  }

  onMount(async () => {
    if (!fromToken && tokens.length > 0) {
      fromToken = tokens[0];
    }
    if (fromToken) {
      await updatePrice();
    }
  });
</script>

{#if compact}
  <!-- Inline version -->
  <div class="token-converter-compact space-y-2 p-3 border rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-medium">Token ↔ USD</h3>
      <button
        type="button"
        class="text-xs text-gray-500 hover:text-gray-700"
        onclick={clearFields}
        disabled={readOnly}
      >
        Clear
      </button>
    </div>

    <div class="space-y-2">
      <div class="flex gap-2 items-center">
        <select
          bind:value={fromToken}
          class="rounded border px-2 py-1 text-sm"
          onchange={handleTokenChange}
          disabled={readOnly || tokens.length <= 1}
        >
          {#each tokens as t (t.symbol)}
            <option value={t}>{t.symbol}</option>
          {/each}
        </select>
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          class="rounded border px-2 py-1 flex-1 text-sm"
          bind:value={tokenAmount}
          oninput={handleTokenAmountInput}
          disabled={readOnly}
        />
        <span class="text-gray-500 text-sm">{fromToken?.symbol || 'Token'}</span>
      </div>

      <div class="flex gap-2 items-center">
        <input
          type="number"
          min="0"
          step="any"
          placeholder="0.00"
          class="rounded border px-2 py-1 flex-1 text-sm"
          bind:value={usdAmount}
          oninput={handleUsdAmountInput}
          disabled={readOnly}
        />
        <span class="text-gray-500 text-sm">USD</span>
      </div>
    </div>

    <div class="text-xs text-gray-500 mt-2">
      1 {fromToken?.symbol || 'Token'} ≈ ${price ? formatNum(price, 2) : '--'}
      {#if isLoading}
        <span class="ml-1">(loading...)</span>
      {/if}
    </div>

    {#if onComplete && !readOnly}
      <div class="flex justify-end gap-2 mt-2">
        <button
          type="button"
          class="btn btn-sm btn-secondary"
          onclick={applyTokenValue}
        >
          Use Token
        </button>
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onclick={applyUsdValue}
        >
          Use USD
        </button>
      </div>
    {/if}
  </div>
{:else}
  <!-- Modal version -->
  <Modal bind:show title="Token ↔ USD Converter" {onClose}>
    <div class="space-y-4 p-4 mt-4">
      <div class="relative">
        <button
          type="button"
          class="absolute -top-8 right-0 text-xs text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1"
          onclick={clearFields}
          aria-label="Clear"
          disabled={readOnly}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>

        <div class="flex flex-col gap-3">
          <div class="flex gap-2 items-center">
            <select
              bind:value={fromToken}
              class="rounded border px-2 py-1"
              onchange={handleTokenChange}
              disabled={readOnly || tokens.length <= 1}
            >
              {#each tokens as t (t.symbol)}
                <option value={t}>{t.symbol}</option>
              {/each}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Token amount"
              class="rounded border px-2 py-1 flex-1"
              bind:value={tokenAmount}
              oninput={handleTokenAmountInput}
              disabled={readOnly}
            />
            <span class="text-gray-500">{fromToken?.symbol || 'Token'}</span>
          </div>

          <div class="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="USD amount"
              class="rounded border px-2 py-1 flex-1"
              bind:value={usdAmount}
              oninput={handleUsdAmountInput}
              disabled={readOnly}
            />
            <span class="text-gray-500">USD</span>
          </div>

          <div class="text-xs text-gray-500">
            1 {fromToken?.symbol || 'Token'} ≈ ${price ? formatNum(price, 2) : '--'}
            {#if isLoading}
              <span class="ml-2 text-blue-500">(updating...)</span>
            {/if}
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        {#if onComplete && !readOnly}
          <button type="button" class="btn btn-secondary" onclick={applyTokenValue}>
            Use Token Amount
          </button>
          <button type="button" class="btn btn-primary" onclick={applyUsdValue}>
            Use USD Amount
          </button>
        {/if}
        <button type="button" class="btn btn-secondary" onclick={onClose}>
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
