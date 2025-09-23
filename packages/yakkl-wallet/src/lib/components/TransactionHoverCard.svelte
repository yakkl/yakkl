<script lang="ts">
  import type { TransactionDisplay } from '../types';
  import ProtectedValue from './ProtectedValue.svelte';
  import SimpleHoverCard from './SimpleHoverCard.svelte';
  import { currentChain } from '../stores/chain.store';

  interface Props {
    transaction: TransactionDisplay;
    address: string;
    children: import('svelte').Snippet;
    position?: 'top' | 'bottom' | 'auto';
  }

  let { transaction, address, children, position = 'auto' }: Props = $props();

  let chain = $derived($currentChain);

  function formatAddress(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  }

  function formatFullAmount(value: string): string {
    try {
      const num = parseFloat(value);
      if (num < 0.000001) {
        return num.toExponential(4);
      }
      return num.toFixed(6);
    } catch {
      return value;
    }
  }

  function formatGasPrice(gasPrice: string): string {
    try {
      const gwei = parseFloat(gasPrice) / 1e9;
      return `${gwei.toFixed(2)} Gwei`;
    } catch {
      return 'N/A';
    }
  }

  function formatGasUsed(gasUsed: string, gasPrice: string): string {
    try {
      const gas = BigInt(gasUsed || '0');
      const price = BigInt(gasPrice || '0');
      const ethUsed = (gas * price) / BigInt(1e18);
      // Handle the conversion from BigInt to string for display
      const ethValue = Number(ethUsed) / 1e18 + Number((gas * price) % BigInt(1e18)) / 1e18;
      return ethValue.toFixed(6);
    } catch {
      return '0.000000';
    }
  }

  function formatFiatValue(_ethAmount: string): string {
    try {
      // TODO: Get actual price from price feed service
      // For now, just show placeholder
      // const eth = parseFloat(ethAmount);
      // const fiat = eth * pricePerEth;
      return '≈ $***';
    } catch {
      return '$0.00';
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp));
  }

  function getTransactionType(tx: TransactionDisplay): string {
    if (tx.from.toLowerCase() === address.toLowerCase()) {
      return 'Sent';
    } else if (tx.to.toLowerCase() === address.toLowerCase()) {
      return 'Received';
    } else {
      return 'Contract Interaction';
    }
  }

  // TODO: Get native token price from price feed service

  // Changed: Use $derived instead of $: for runes mode
  let txType = $derived(getTransactionType(transaction));
  let isOutgoing = $derived(transaction.from.toLowerCase() === address.toLowerCase());
  let gasEth = $derived(formatGasUsed(transaction.gasUsed || '0', transaction.gasPrice || '0'));
  let gasFiat = $derived(formatFiatValue(gasEth));
  let valueFiat = $derived(formatFiatValue(transaction.value));
</script>

<SimpleHoverCard openDelay={200} side={position === 'auto' ? 'top' : position} align="center" sideOffset={5}>
  {#snippet children()}
    {@render children()}
  {/snippet}
  {#snippet content()}
    <div class="max-w-xs bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
    <div class="space-y-2 text-xs">
      <!-- Transaction Header -->
      <div class="font-bold text-base flex items-center gap-2 border-b pb-2 dark:border-zinc-700">
        <span class="text-lg">
          {transaction.type === 'send' ? '↗️' : transaction.type === 'receive' ? '↙️' : '🔄'}
        </span>
        <span class="dark:text-white">{txType}</span>
        <span class="ml-auto px-2 py-0.5 rounded-full text-xs {
          transaction.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
          transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        }">
          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
        </span>
      </div>

      <!-- Transaction Hash -->
      <div>
        <span class="font-semibold dark:text-zinc-300 text-xs">Transaction Hash:</span>
        <div class="font-mono text-[10px] mt-1 break-all dark:text-zinc-400">
          <ProtectedValue value={transaction.hash} placeholder="********************************" />
        </div>
      </div>

      <!-- From/To Addresses -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <span class="font-semibold dark:text-zinc-300 text-xs">From:</span>
          <div class="font-mono text-[10px] mt-1 dark:text-zinc-400">
            <ProtectedValue value={formatAddress(transaction.from)} placeholder="********************" />
            {#if transaction.from.toLowerCase() === address.toLowerCase()}
              <span class="text-[10px] text-blue-600 dark:text-blue-400 ml-1">(You)</span>
            {/if}
          </div>
        </div>
        <div>
          <span class="font-semibold dark:text-zinc-300 text-xs">To:</span>
          <div class="font-mono text-[10px] mt-1 dark:text-zinc-400">
            <ProtectedValue value={formatAddress(transaction.to)} placeholder="********************" />
            {#if transaction.to.toLowerCase() === address.toLowerCase()}
              <span class="text-[10px] text-blue-600 dark:text-blue-400 ml-1">(You)</span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Amount -->
      <div class="bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg">
        <div class="font-semibold dark:text-zinc-300 mb-1 text-xs">Amount:</div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="text-[10px] text-zinc-500 dark:text-zinc-500">Native Token:</span>
            <div class="font-mono {isOutgoing ? 'text-red-500' : 'text-green-500'} font-semibold text-xs">
              {isOutgoing ? '−' : '+'}{formatFullAmount(transaction.value)} {chain?.nativeCurrency?.symbol || 'ETH'}
            </div>
          </div>
          <div>
            <span class="text-[10px] text-zinc-500 dark:text-zinc-500">Fiat Value:</span>
            <div class="font-mono {isOutgoing ? 'text-red-500' : 'text-green-500'} font-semibold text-xs">
              <ProtectedValue value={valueFiat} placeholder="*******" />
            </div>
          </div>
        </div>
      </div>

      <!-- Gas Information -->
      <div class="bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg">
        <div class="font-semibold dark:text-zinc-300 mb-1 text-xs">Gas Fees:</div>
        <div class="grid grid-cols-3 gap-2 text-[10px]">
          <div>
            <span class="text-zinc-500 dark:text-zinc-500">Gas Price:</span>
            <div class="font-mono dark:text-zinc-400 text-[10px]">{formatGasPrice(transaction.gasPrice || '0')}</div>
          </div>
          <div>
            <span class="text-zinc-500 dark:text-zinc-500">Gas Used:</span>
            <div class="font-mono dark:text-zinc-400 text-[10px]">{transaction.gasUsed ? parseInt(transaction.gasUsed).toLocaleString() : 'N/A'}</div>
          </div>
          <div>
            <span class="text-zinc-500 dark:text-zinc-500">Total Cost:</span>
            <div class="font-mono dark:text-zinc-400 text-[10px]">{gasEth} ETH</div>
            <div class="font-mono text-zinc-500 dark:text-zinc-600 text-[10px]">
              <ProtectedValue value={gasFiat} placeholder="******" />
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="text-[10px] space-y-1">
        <div>
          <span class="font-semibold dark:text-zinc-300">Block Number:</span>
          <span class="ml-2 dark:text-zinc-400">{transaction.blockNumber || 'Pending'}</span>
        </div>
        <div>
          <span class="font-semibold dark:text-zinc-300">Nonce:</span>
          <span class="ml-2 dark:text-zinc-400">{transaction.nonce || 'N/A'}</span>
        </div>
        <div>
          <span class="font-semibold dark:text-zinc-300">Timestamp:</span>
          <span class="ml-2 dark:text-zinc-400">{formatTimestamp(transaction.timestamp)}</span>
        </div>
      </div>

      <!-- Click to View -->
      <div class="pt-2 border-t dark:border-zinc-700 text-center">
        <span class="text-[10px] text-blue-600 dark:text-blue-400">Click to view details →</span>
      </div>
    </div>
    </div>
  {/snippet}
</SimpleHoverCard>
