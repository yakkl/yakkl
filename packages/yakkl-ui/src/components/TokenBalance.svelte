<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface TokenBalanceProps {
    balance: string | number;
    symbol: string;
    decimals?: number;
    usdValue?: number;
    showUsd?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
  }

  const {
    balance,
    symbol,
    decimals = 4,
    usdValue,
    showUsd = true,
    size = 'md',
    className = ''
  }: TokenBalanceProps = $props();

  function formatBalance(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    
    return num.toFixed(decimals);
  }

  function formatUsd(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  $: containerClasses = twMerge(
    'flex flex-col',
    sizeClasses[size],
    className
  );

  $: formattedBalance = formatBalance(balance);
  $: formattedUsd = usdValue ? formatUsd(usdValue) : null;
</script>

<div class={containerClasses}>
  <div class="flex items-baseline gap-1">
    <span class="font-semibold">
      {formattedBalance}
    </span>
    <span class="text-base-content/70">
      {symbol}
    </span>
  </div>
  
  {#if showUsd && formattedUsd}
    <span class="text-sm text-base-content/50">
      {formattedUsd}
    </span>
  {/if}
</div>