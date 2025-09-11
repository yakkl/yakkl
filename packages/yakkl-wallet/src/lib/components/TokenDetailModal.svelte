<script lang="ts">
  import Modal from '@yakkl/ui/src/components/Modal.svelte';
  import type { TokenDisplay } from '../types';
  import { currentChain } from '../stores/chain.store';
  import { get } from 'svelte/store';
  import ProtectedValue from './ProtectedValue.svelte';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
  import type { BigNumberish } from '$lib/common/bignumber';

  interface Props {
    show?: boolean;
    token?: TokenDisplay | null;
    onClose?: () => void;
    onSend?: (token: TokenDisplay) => void;
  }

  let { show = $bindable(false), token = null, onClose = () => {}, onSend = () => {} }: Props = $props();

  // Check if token is native (ETH, MATIC, etc.)
  const isNativeToken = $derived(
    token?.address === '0x0000000000000000000000000000000000000000' ||
    token?.address?.toLowerCase() === '0x0' ||
    !token?.address
  );

  function handleAddToWatchlist() {
    // TODO: Implement watchlist functionality
    console.log('Add to watchlist:', token);
  }

  function handleRemoveToken() {
    // TODO: Implement token removal
    console.log('Remove token:', token);
  }

  function handleViewOnExplorer() {
    const chain = get(currentChain);
    
    if (chain?.explorerUrl) {
      if (isNativeToken) {
        // For native tokens, just open the explorer homepage or a specific page for the native token
        window.open(chain.explorerUrl, '_blank');
      } else if (token?.address) {
        // For regular tokens, open the token page
        window.open(`${chain.explorerUrl}/token/${token.address}`, '_blank');
      }
    }
  }

  function formatPrice(price?: number): string {
    if (!price || price <= 0) return '$0.00';
    if (price < 0.01) return '< $0.01';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  }

  // Helper functions for safe type conversion
  function getNumericPrice(price?: number | BigNumberish | any): number {
    if (!price) return 0;
    
    try {
      // Handle direct number
      if (typeof price === 'number') {
        return price;
      }
      
      // Handle MarketPriceData or object with price property
      if (typeof price === 'object' && 'price' in price) {
        return typeof price.price === 'number' ? price.price : BigNumberishUtils.toNumber(price.price);
      }
      
      // Handle BigNumberish
      return BigNumberishUtils.toNumber(price);
    } catch (error) {
      console.warn('Failed to convert price:', price, error);
      return 0;
    }
  }

  function getNumericQuantity(qty?: number | BigNumberish): number {
    if (!qty) return 0;
    
    try {
      if (typeof qty === 'number') {
        return qty;
      } else {
        // Use safe conversion to prevent crashes with large BigInt values
        return BigNumberishUtils.toNumberSafe(qty);
      }
    } catch (error) {
      console.warn('Failed to convert quantity:', qty, error);
      return 0;
    }
  }

  function getChangeColorClass(change24h?: number | BigNumberish): string {
    if (change24h === undefined || change24h === null) return 'text-gray-500';
    
    try {
      const numChange = typeof change24h === 'number' ? change24h : BigNumberishUtils.toNumber(change24h);
      return numChange >= 0 ? 'text-green-600' : 'text-red-600';
    } catch (error) {
      console.warn('Failed to convert change24h:', change24h, error);
      return 'text-gray-500';
    }
  }

  function formatChange24h(change24h?: number | BigNumberish): string {
    if (change24h === undefined || change24h === null) return 'N/A';
    
    try {
      const numChange = typeof change24h === 'number' ? change24h : BigNumberishUtils.toNumber(change24h);
      return `${numChange >= 0 ? '+' : ''}${numChange.toFixed(2)}%`;
    } catch (error) {
      console.warn('Failed to format change24h:', change24h, error);
      return 'N/A';
    }
  }

  function formatValue(val?: number | bigint | BigNumberish): string {
    if (!val) return '$0.00';
    
    let numValue: number;
    
    try {
      if (typeof val === 'bigint') {
        // BigInt values are stored as cents, convert to dollars
        numValue = Number(val) / 100;
      } else if (typeof val === 'number') {
        numValue = val;
      } else {
        // Use BigNumberishUtils for safe conversion
        numValue = BigNumberishUtils.toNumber(val);
      }
    } catch (error) {
      console.warn('Failed to convert value for formatting:', val, error);
      return '$0.00';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  }

  function formatBalance(balance?: number | BigNumberish, symbol?: string): string {
    if (!balance) return '0';
    
    let numBalance: number;
    
    try {
      if (typeof balance === 'number') {
        numBalance = balance;
      } else {
        // Use safe conversion to prevent warnings with large BigInt values
        numBalance = BigNumberishUtils.toNumberSafe(balance);
      }
    } catch (error) {
      console.warn('Failed to convert balance for formatting:', balance, error);
      return '0';
    }
    
    const formatted = numBalance < 0.0001 ? numBalance.toExponential(4) : numBalance.toFixed(6);
    return `${formatted} ${symbol || ''}`;
  }
</script>

<Modal {show} {onClose} title="Token Details">
  {#if token}
    <div class="space-y-4">
      <!-- Token Header -->
      <div class="flex items-center gap-4">
        {#if token.icon?.startsWith('/') || token.icon?.startsWith('http')}
          <img
            src={token.icon}
            alt={token.symbol}
            class="w-16 h-16 rounded-full"
            onerror={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
            }}
          />
          <div
            class="w-16 h-16 rounded-full items-center justify-center {token.color || 'bg-gray-400'} text-white font-bold text-2xl"
            style="display:none;"
          >
            {token.icon || token.symbol?.[0] || '?'}
          </div>
        {:else}
          <div class="w-16 h-16 rounded-full flex items-center justify-center {token.color || 'bg-gray-400'} text-white font-bold text-2xl">
            {token.icon || token.symbol?.[0] || '?'}
          </div>
        {/if}

        <div class="flex-1">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">{token.name || token.symbol}</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
        </div>
      </div>

      <!-- Token Stats -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">Balance</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <ProtectedValue value={formatBalance(token.qty, token.symbol)} placeholder="****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">Value</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <ProtectedValue value={formatValue(token.value)} placeholder="*****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">Price</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <ProtectedValue value={formatPrice(getNumericPrice(token.price))} placeholder="****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">24h Change</p>
          <p class="text-sm font-medium {getChangeColorClass(token.change24h)}">
            {formatChange24h(token.change24h)}
          </p>
        </div>
      </div>

      <!-- Token Info -->
      {#if token.address && !isNativeToken}
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Contract Address</p>
          <p class="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
            {token.address}
          </p>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-2 pt-2">
        {#if token.qty && getNumericQuantity(token.qty) > 0}
          <button
            onclick={() => onSend(token)}
            class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Send {token.symbol}
          </button>
        {/if}

        <button
          onclick={handleViewOnExplorer}
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          View on Explorer
        </button>

        <button
          onclick={handleAddToWatchlist}
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
        >
          Add to Watchlist
        </button>

        {#if getNumericQuantity(token.qty) === 0}
          <button
            onclick={handleRemoveToken}
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Remove
          </button>
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-center text-gray-500 dark:text-gray-400">No token selected</p>
  {/if}
</Modal>
