<script lang="ts">
  import Modal from './Modal.svelte';
  import type { TokenDisplay } from '../types';
  import { currentChain } from '../stores/chain.store';
  import { get } from 'svelte/store';
  import ProtectedValue from './v1/ProtectedValue.svelte';

  interface Props {
    show?: boolean;
    token?: TokenDisplay | null;
    onClose?: () => void;
    onSend?: (token: TokenDisplay) => void;
  }

  let { show = false, token = null, onClose = () => {}, onSend = () => {} }: Props = $props();

  function handleAddToWatchlist() {
    // TODO: Implement watchlist functionality
    console.log('Add to watchlist:', token);
  }

  function handleRemoveToken() {
    // TODO: Implement token removal
    console.log('Remove token:', token);
  }

  function handleViewOnExplorer() {
    if (token?.address) {
      const chain = get(currentChain);

      if (chain?.explorerUrl) {
        window.open(`${chain.explorerUrl}/token/${token.address}`, '_blank');
      }
    }
  }

  function formatPrice(price?: number): string {
    if (!price) return '$0.00';
    if (price < 0.01) return '< $0.01';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2
    }).format(price);
  }

  function formatValue(val?: number): string {
    if (!val) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  }

  function formatBalance(balance?: number, symbol?: string): string {
    if (!balance) return '0';
    const formatted = balance < 0.0001 ? balance.toExponential(4) : balance.toFixed(6);
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
            <ProtectedValue value={formatBalance(Number(token.qty), token.symbol)} placeholder="****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">Value</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <ProtectedValue value={formatValue(Number(token.value))} placeholder="*****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">Price</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            <ProtectedValue value={formatPrice(token.price)} placeholder="****" />
          </p>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">24h Change</p>
          <p class="text-sm font-medium {token.change24h && token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}">
            {token.change24h !== undefined ? `${token.change24h >= 0 ? '+' : ''}${token.change24h.toFixed(2)}%` : 'N/A'}
          </p>
        </div>
      </div>

      <!-- Token Info -->
      {#if token.address}
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Contract Address</p>
          <p class="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
            {token.address}
          </p>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex gap-2 pt-2">
        {#if token.qty && Number(token.qty) > 0}
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
          disabled={!token.address}
        >
          View on Explorer
        </button>

        <button
          onclick={handleAddToWatchlist}
          class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium"
        >
          Add to Watchlist
        </button>

        {#if Number(token.qty) === 0}
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
