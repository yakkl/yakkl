<script lang="ts">
  import Modal from './Modal.svelte';
  import { onMount } from 'svelte';
  import type { TokenData } from '$lib/common';
	import { PriceManager } from '$lib/plugins/PriceManager';
	import { CoinbasePriceProvider } from '$lib/plugins/providers/price/coinbase/CoinbasePriceProvider';
	import { CoingeckoPriceProvider } from '$lib/plugins/providers/price/coingecko/CoingeckoPriceProvider';
	import { KrakenPriceProvider } from '$lib/plugins/providers/price/kraken/KrakenPriceProvider';
	import { EthereumBigNumber } from '$lib/common/bignumber-ethereum';

  let { show = false, tokens = [], onClose = () => {}, title = 'Conversion Calculator' } = $props<{
    show?: boolean;
    tokens?: TokenData[];
    onClose?: () => void;
    title?: string;
  }>();

  tokens = tokens as TokenData[];

  // Token conversion state
  let fromToken: TokenData | null = $state(null);
  let toToken: TokenData | null = $state(null);
  let fromAmount = $state('');
  let toAmount = $state('');
  let usdAmount = $state('');
  let price = $state(0);

  // ETH unit conversion state
  let wei = $state('');
  let gwei = $state('');
  let ether = $state('');
  let ethPrice = $state(0);

  let ethUnitUsd = $state('');
  $effect(() => {
    if (ether && ethPrice) {
      try {
        // Parse ether as a float and calculate USD value
        const etherNum = parseFloat(ether);
        if (!isNaN(etherNum) && etherNum > 0) {
          const usdValue = etherNum * ethPrice;
          ethUnitUsd = `$${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return;
        }
      } catch {}
    }
    ethUnitUsd = '';
  });

  const priceManager = new PriceManager([
    { provider: new CoinbasePriceProvider(), weight: 5 },
    { provider: new CoingeckoPriceProvider(), weight: 3 },
    { provider: new KrakenPriceProvider(), weight: 2 },
  ]);

  // Helper for formatting
  function formatNum(val: number, decimals = 6) {
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: decimals });
  }

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
      // Remove trailing zeros but keep significant decimals
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

      // Pad decimal part to 9 digits
      const paddedDecimal = decimalPart.padEnd(9, '0').slice(0, 9);

      // Combine and convert to wei
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

      // Pad decimal part to 18 digits
      const paddedDecimal = decimalPart.padEnd(18, '0').slice(0, 18);

      // Combine whole and decimal parts
      const combined = wholePart + paddedDecimal;

      // Remove leading zeros but ensure we have at least one digit
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

  // Fetch ETH price on mount
  onMount(async () => {
    // Only set state to defaults, no price fetching or validation
    fromToken = tokens.length ? tokens[0] : null;
    toToken = tokens.length > 1 ? tokens[1] : null;
    fromAmount = '';
    toAmount = '';
    usdAmount = '';
    price = 0;
    wei = '';
    gwei = '';
    ether = '';

    // Fetch ETH price on mount
    await fetchEthPrice();
  });

  // Fetch price when token is selected
  async function handleFromTokenChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    fromToken = tokens.find((t: TokenData) => t.symbol === target.value) || null;
    if (fromToken) {
      const result = await priceManager.getMarketPrice(fromToken.symbol);
      price = result && typeof result === 'object' && 'price' in result ? result.price : 0;
    } else {
      price = 0;
    }
    // Optionally update USD/Token fields if one is filled
    if (fromAmount && price) {
      usdAmount = formatNum(parseFloat(fromAmount) * price);
    } else if (usdAmount && price) {
      fromAmount = formatNum(parseFloat(usdAmount) / price);
    }
  }

  // Fetch ETH price
  async function fetchEthPrice() {
    try {
      const result = await priceManager.getMarketPrice('ETH-USD');
      ethPrice = result && typeof result === 'object' && 'price' in result ? result.price : 0;
    } catch (error) {
      console.error('Failed to fetch ETH price:', error);
      ethPrice = 0;
    }
  }

  // Token/Fiat conversion logic (no validation)
  async function handleFromAmountInput(e: Event) {
    const target = e.target as HTMLInputElement;
    fromAmount = target.value;
    if (fromToken && !price) {
      const result = await priceManager.getMarketPrice(fromToken.symbol);
      price = result && typeof result === 'object' && 'price' in result ? result.price : 0;
    }
    usdAmount = price ? formatNum(parseFloat(fromAmount) * price) : '';
    toAmount = '';
  }

  async function handleUsdAmountInput(e: Event) {
    const target = e.target as HTMLInputElement;
    usdAmount = target.value;
    if (fromToken && !price) {
      const result = await priceManager.getMarketPrice(fromToken.symbol);
      price = result && typeof result === 'object' && 'price' in result ? result.price : 0;
    }
    fromAmount = price ? formatNum(parseFloat(usdAmount) / price) : '';
    toAmount = '';
  }

  // ETH unit conversion handlers with validation
  function handleWeiInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;

    // Only allow integers for Wei
    if (!/^\d*$/.test(value)) {
      target.value = wei;
      return;
    }

    wei = value;
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

    // Allow decimal point but limit to 9 decimal places
    if (!/^\d*\.?\d{0,9}$/.test(value)) {
      target.value = gwei;
      return;
    }

    gwei = value;
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

    // Allow decimal point but limit to 18 decimal places
    if (!/^\d*\.?\d{0,18}$/.test(value)) {
      target.value = ether;
      return;
    }

    ether = value;
    if (value) {
      wei = etherToWei(value);
      gwei = etherToGwei(value);
    } else {
      wei = '';
      gwei = '';
    }
  }

  // Clear/reset helpers
  function clearTokenFiatFields() {
    fromToken = tokens.length ? tokens[0] : null;
    toToken = tokens.length > 1 ? tokens[1] : null;
    fromAmount = '';
    toAmount = '';
    usdAmount = '';
    price = 0;
  }

  function clearEthUnitFields() {
    wei = '';
    gwei = '';
    ether = '';
  }
</script>

<Modal bind:show {title}>
  <div class="space-y-6 p-4">
    <!-- Token/Fiat Conversion -->
    <div class="relative">
      <h2 class="text-lg font-semibold mb-2">Token ↔ USD Conversion</h2>
      <button type="button" class="absolute top-0 right-0 text-xs text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1" onclick={clearTokenFiatFields} aria-label="Clear">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </button>
      <div class="flex flex-col gap-3">
        <div class="flex gap-2 items-center">
          <select bind:value={fromToken} class="rounded border px-2 py-1" onchange={handleFromTokenChange}>
            {#each tokens as t (t.symbol)}
              <!-- @ts-ignore Svelte does not support explicit typing in #each blocks -->
              <option value={t.symbol}>{t.symbol}</option>
            {/each}
          </select>
          <input type="number" min="0" step="any" placeholder="Token amount" class="rounded border px-2 py-1 flex-1" bind:value={fromAmount} oninput={handleFromAmountInput} />
          <span class="text-gray-500">{fromToken?.symbol}</span>
        </div>
        <div class="flex gap-2 items-center">
          <input type="number" min="0" step="any" placeholder="USD amount" class="rounded border px-2 py-1 flex-1" bind:value={usdAmount} oninput={handleUsdAmountInput} />
          <span class="text-gray-500">USD</span>
        </div>
        <div class="text-xs text-gray-500">1 {fromToken?.symbol} ≈ ${price ? formatNum(price, 2) : '--'}</div>
      </div>
    </div>

    <!-- Divider between sections -->
    <div class="flex justify-center my-4">
      <div class="bg-gray-300 dark:bg-gray-700 h-0.5 rounded w-1/3"></div>
    </div>

    <!-- ETH Unit Conversion -->
    <div class="relative">
      <h2 class="text-lg font-semibold mb-2">ETH Unit Conversion</h2>
      <button type="button" class="absolute top-0 right-0 text-xs text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 px-2 py-1" onclick={clearEthUnitFields} aria-label="Clear">
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
          <span class="text-gray-500 text-sm">wei</span>
        </div>
        <div class="flex gap-2 items-center">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="w-16 text-sm">Gwei</label>
          <input
            type="text"
            inputmode="decimal"
            placeholder="0.0"
            class="rounded border px-3 py-2 flex-1 font-mono text-sm"
            bind:value={gwei}
            oninput={handleGweiInput}
          />
          <span class="text-gray-500 text-sm">gwei</span>
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
          <span class="text-gray-500 text-sm">ETH</span>
        </div>

        <div class="pt-2 space-y-1">
          <div class="text-xs text-gray-500">
            1 ETH ≈ ${ethPrice ? formatNum(ethPrice, 2) : '--'} USD
          </div>
          {#if ethUnitUsd}
            <div class="text-sm text-green-600 dark:text-green-400 font-semibold">
              {ethUnitUsd}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex justify-end mt-6">
      <button type="button" class="btn btn-secondary" onclick={onClose}>Close</button>
    </div>
  </div>
</Modal>
