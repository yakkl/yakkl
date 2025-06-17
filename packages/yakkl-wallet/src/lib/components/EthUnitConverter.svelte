<!-- src/lib/components/EthUnitConverter.svelte -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { onMount } from 'svelte';
  import { PriceManager } from '$lib/managers/PriceManager';
  import { CoinbasePriceProvider } from '$lib/managers/providers/price/coinbase/CoinbasePriceProvider';
  import { CoingeckoPriceProvider } from '$lib/managers/providers/price/coingecko/CoingeckoPriceProvider';
  import { KrakenPriceProvider } from '$lib/managers/providers/price/kraken/KrakenPriceProvider';
  import { log } from '$lib/managers/Logger';

  let {
    show = $bindable(false),
    initialValue = '',
    initialUnit = 'ether' as 'wei' | 'gwei' | 'ether',
    onComplete = null as ((value: string, unit: 'wei' | 'gwei' | 'ether') => void) | null,
    compact = false,
    showUsdValue = true,
    onClose = () => {show = false}
  } = $props<{
    show?: boolean;
    initialValue?: string;
    initialUnit?: 'wei' | 'gwei' | 'ether';
    onComplete?: ((value: string, unit: 'wei' | 'gwei' | 'ether') => void) | null;
    compact?: boolean;
    showUsdValue?: boolean;
    onClose?: () => void;
  }>();

  // ETH unit conversion state
  let wei = $state('');
  let gwei = $state('');
  let ether = $state('');
  let ethPrice = $state(0);
  let selectedUnit = $state<'wei' | 'gwei' | 'ether'>(initialUnit);

  // USD calculation
  let ethUnitUsd = $derived.by(() => {
    if (ether && ethPrice && showUsdValue) {
      const etherNum = parseFloat(ether);
      if (!isNaN(etherNum) && etherNum > 0) {
        const usdValue = etherNum * ethPrice;
        return `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    return '';
  });

  const priceManager = new PriceManager([
    { provider: new CoinbasePriceProvider(), weight: 5 },
    { provider: new CoingeckoPriceProvider(), weight: 3 },
    { provider: new KrakenPriceProvider(), weight: 2 },
  ]);

  // ETH conversion functions
  function weiToGwei(wei: string): string {
    try {
      if (!wei || wei === '0') return '';
      const weiNum = BigInt(wei);
      const gweiWhole = weiNum / 1_000_000_000n;
      const remainder = weiNum % 1_000_000_000n;

      if (remainder === 0n) {
        return gweiWhole.toString();
      }

      const remainderStr = remainder.toString().padStart(9, '0');
      const trimmed = remainderStr.replace(/0+$/, '');

      if (trimmed) {
        return `${gweiWhole}.${trimmed}`;
      }
      return gweiWhole.toString();
    } catch {
      return '';
    }
  }

  function weiToEther(wei: string): string {
    try {
      if (!wei || wei === '0') return '';
      const weiNum = BigInt(wei);
      const etherWhole = weiNum / 1_000_000_000_000_000_000n;
      const remainder = weiNum % 1_000_000_000_000_000_000n;

      if (remainder === 0n) {
        return etherWhole.toString();
      }

      const remainderStr = remainder.toString().padStart(18, '0');
      const trimmed = remainderStr.replace(/0+$/, '');

      if (trimmed) {
        return `${etherWhole}.${trimmed}`;
      }
      return etherWhole.toString();
    } catch {
      return '';
    }
  }

  function gweiToWei(gwei: string): string {
    try {
      if (!gwei) return '';
      const parts = gwei.split('.');
      const wholePart = parts[0] || '0';
      const decimalPart = parts[1] || '';

      const paddedDecimal = decimalPart.padEnd(9, '0').slice(0, 9);
      const gweiInWei = BigInt(wholePart) * 1_000_000_000n;
      const decimalInWei = BigInt(paddedDecimal);

      return (gweiInWei + decimalInWei).toString();
    } catch {
      return '';
    }
  }

  function gweiToEther(gwei: string): string {
    try {
      if (!gwei) return '';
      const weiValue = gweiToWei(gwei);
      return weiToEther(weiValue);
    } catch {
      return '';
    }
  }

  function etherToWei(ether: string): string {
    try {
      if (!ether) return '';
      const parts = ether.split('.');
      const wholePart = parts[0] || '0';
      const decimalPart = parts[1] || '';

      const paddedDecimal = decimalPart.padEnd(18, '0').slice(0, 18);
      const combined = wholePart + paddedDecimal;

      return BigInt(combined).toString();
    } catch {
      return '';
    }
  }

  function etherToGwei(ether: string): string {
    try {
      if (!ether) return '';
      const weiValue = etherToWei(ether);
      return weiToGwei(weiValue);
    } catch {
      return '';
    }
  }

  // Fetch ETH price
  async function fetchEthPrice() {
    try {
      const result = await priceManager.getMarketPrice('ETH-USD');
      ethPrice = result && typeof result === 'object' && 'price' in result ? result.price : 0;
    } catch (error) {
      log.error('Failed to fetch ETH price:', false, error);
      ethPrice = 0;
    }
  }

  // Input handlers
  function handleWeiInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (!/^\d*$/.test(value)) {
      target.value = wei;
      return;
    }

    wei = value;
    selectedUnit = 'wei';
    if (value) {
      gwei = weiToGwei(value);
      ether = weiToEther(value);
    } else {
      gwei = '';
      ether = '';
    }
  }

  function handleGweiInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (!/^\d*\.?\d{0,9}$/.test(value)) {
      target.value = gwei;
      return;
    }

    gwei = value;
    selectedUnit = 'gwei';
    if (value) {
      wei = gweiToWei(value);
      ether = gweiToEther(value);
    } else {
      wei = '';
      ether = '';
    }
  }

  function handleEtherInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    if (!/^\d*\.?\d{0,18}$/.test(value)) {
      target.value = ether;
      return;
    }

    ether = value;
    selectedUnit = 'ether';
    if (value) {
      wei = etherToWei(value);
      gwei = etherToGwei(value);
    } else {
      wei = '';
      gwei = '';
    }
  }

  function applyValue() {
    if (onComplete) {
      const value = selectedUnit === 'wei' ? wei : selectedUnit === 'gwei' ? gwei : ether;
      onComplete(value, selectedUnit);
      if (!compact) show = false;
    }
  }

  function clearFields() {
    wei = '';
    gwei = '';
    ether = '';
  }

  onMount(async () => {
    if (showUsdValue) {
      await fetchEthPrice();
    }

    if (initialValue) {
      switch (initialUnit) {
        case 'wei':
          wei = initialValue;
          handleWeiInput({ target: { value: initialValue } } as any);
          break;
        case 'gwei':
          gwei = initialValue;
          handleGweiInput({ target: { value: initialValue } } as any);
          break;
        case 'ether':
          ether = initialValue;
          handleEtherInput({ target: { value: initialValue } } as any);
          break;
      }
    }
  });
</script>

{#if compact}
  <!-- Inline version for embedding -->
  <div class="eth-converter-compact space-y-2 p-3 border rounded-lg">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-sm font-medium">ETH Unit Converter</h3>
      <button
        type="button"
        class="text-xs text-gray-500 hover:text-gray-700"
        onclick={clearFields}
      >
        Clear
      </button>
    </div>

    <div class="space-y-2">
      <div class="flex gap-2 items-center">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="w-12 text-xs">Wei</label>
        <input
          type="text"
          pattern="[0-9]*"
          inputmode="numeric"
          placeholder="0"
          class="rounded border px-2 py-1 flex-1 font-mono text-xs"
          bind:value={wei}
          oninput={handleWeiInput}
        />
      </div>
      <div class="flex gap-2 items-center">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="w-12 text-xs">Gwei (gas)</label>
        <input
          type="text"
          inputmode="decimal"
          placeholder="0.0"
          class="rounded border px-2 py-1 flex-1 font-mono text-xs"
          bind:value={gwei}
          oninput={handleGweiInput}
        />
      </div>
      <div class="flex gap-2 items-center">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="w-12 text-xs">ETH</label>
        <input
          type="text"
          inputmode="decimal"
          placeholder="0.0"
          class="rounded border px-2 py-1 flex-1 font-mono text-xs"
          bind:value={ether}
          oninput={handleEtherInput}
        />
      </div>
    </div>

    {#if showUsdValue && ethUnitUsd}
      <div class="text-xs text-green-600 dark:text-green-400 font-semibold mt-2">
        {ethUnitUsd}
      </div>
    {/if}

    {#if onComplete}
      <div class="flex justify-end mt-2">
        <button
          type="button"
          class="btn btn-sm btn-primary"
          onclick={applyValue}
        >
          Apply
        </button>
      </div>
    {/if}
  </div>
{:else}
  <!-- Modal version -->
  <Modal bind:show title="ETH Unit Converter" {onClose}>
    <div class="space-y-4 p-4 mt-4">
      <div class="relative">
        <button
          type="button"
          class="absolute -top-8 right-0 text-xs text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1"
          onclick={clearFields}
          aria-label="Clear"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>

        <div class="flex flex-col gap-3">
          <div class="flex gap-2 items-center">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="w-16 text-sm">Wei</label>
            <input
              type="text"
              pattern="[0-9]*"
              inputmode="numeric"
              placeholder="0"
              class="rounded border px-3 py-2 flex-1 font-mono text-sm"
              bind:value={wei}
              oninput={handleWeiInput}
            />
          </div>
          <div class="flex gap-2 items-center">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="w-16 text-sm">Gwei (gas)</label>
            <input
              type="text"
              inputmode="decimal"
              placeholder="0.0"
              class="rounded border px-3 py-2 flex-1 font-mono text-sm"
              bind:value={gwei}
              oninput={handleGweiInput}
            />
          </div>
          <div class="flex gap-2 items-center">
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="w-16 text-sm">Ether</label>
            <input
              type="text"
              inputmode="decimal"
              placeholder="0.0"
              class="rounded border px-3 py-2 flex-1 font-mono text-sm"
              bind:value={ether}
              oninput={handleEtherInput}
            />
          </div>

          {#if showUsdValue}
            <div class="pt-2 space-y-1">
              <div class="text-xs text-gray-500">
                1 ETH ≈ ${ethPrice ? ethPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'} USD
              </div>
              {#if ethUnitUsd}
                <div class="text-sm text-green-600 dark:text-green-400 font-semibold">
                  {ethUnitUsd}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        {#if onComplete}
          <button type="button" class="btn btn-primary" onclick={applyValue}>
            Apply
          </button>
        {/if}
        <button type="button" class="btn btn-secondary" onclick={onClose}>
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
