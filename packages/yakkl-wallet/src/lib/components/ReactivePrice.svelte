<script lang="ts">
  import { type TokenDisplay } from '$lib/types';
  import ProtectedValue from './ProtectedValue.svelte';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  interface Props {
    token: TokenDisplay | undefined;
    format?: 'price' | 'value' | 'full';
    showChange?: boolean;
    className?: string;
  }

  let { token, format = 'price', showChange = false, className = '' }: Props = $props();

  function formatPrice(price: number | undefined): string {
    if (!price) return '$0.00';
    if (price < 0.01) {
      return '< $0.01';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  }

  function formatValue(val: number | undefined): string {
    if (!val) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatFullPrice(price: number | undefined): string {
    if (!price) return '$0.00000000';
    if (price < 0.00000001) {
      return `$${price.toExponential(8)}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 10
    }).format(price);
  }

  let displayValue = $derived.by(() => {
    if (!token) return '$0.00';

    switch (format) {
      case 'value':
        // Convert bigint (cents) to number (dollars) for display
        const valueInDollars = typeof token.value === 'bigint' ? Number(token.value) / 100 : Number(token.value);
        return formatValue(valueInDollars);
      case 'full':
        return formatFullPrice(typeof token.price === 'number' ? token.price : 0);
      default:
        return formatPrice(typeof token.price === 'number' ? token.price : 0);
    }
  });

  let changeClass = $derived(
    token?.change24h !== undefined
      ? (typeof token.change24h === 'number' ? token.change24h : 0) >= 0 ? 'text-green-500' : 'text-red-500'
      : ''
  );
</script>

<div class={className}>
  <ProtectedValue value={displayValue} placeholder="*****" />
  {#if showChange && token?.change24h !== undefined}
    <span class="text-xs ml-1 {changeClass}">
      {(typeof token.change24h === 'number' ? token.change24h : 0) >= 0 ? '+' : ''}{(typeof token.change24h === 'number' ? token.change24h : 0).toFixed(2)}%
    </span>
  {/if}
</div>
