<script lang="ts">
  import type { TransactionDisplay } from '../types';
  import ProtectedValue from './ProtectedValue.svelte';
  import Modal from './Modal.svelte';
  import { currentChain } from '../stores/chain.store';
  import { currentAccount } from '../stores/account.store';
  import { displayTokens } from '../stores/token.store';
  import TransactionTooltips from './TransactionTooltips.svelte';
  import TransactionStatusTooltip from './TransactionStatusTooltip.svelte';
  import TransactionHoverCard from './TransactionHoverCard.svelte';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  // TODO: May need to update tokens to be whatever the symbol for cross-chain transactions

  interface Props {
    show: boolean;
    transaction: TransactionDisplay | null;
    onClose: () => void;
  }

  let { show = $bindable(), transaction, onClose }: Props = $props();

  let chain = $derived($currentChain);
  let account = $derived($currentAccount);
  let tokens = $derived($displayTokens);

  // Get native token price
  let nativeToken = $derived(
    tokens.find(t =>
      t.symbol === chain?.nativeCurrency?.symbol ||
      t.symbol === 'ETH' ||
      t.symbol === 'MATIC' ||
      t.symbol === 'BNB'
    )
  );
  let nativePrice = $derived(nativeToken?.price || 0);

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

  function formatFiatValue(ethAmount: string, ethPrice?: number): string {
    try {
      const eth = parseFloat(ethAmount);
      const price = ethPrice || 0;
      const fiat = eth * price;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(fiat);
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
    if (!account) return 'Transaction';
    if (tx.from.toLowerCase() === account.address.toLowerCase()) {
      return 'Sent';
    } else if (tx.to.toLowerCase() === account.address.toLowerCase()) {
      return 'Received';
    } else {
      return 'Contract Interaction';
    }
  }

  function getExplorerUrl(txHash: string): string {
    const currentChain = chain;
    if (!currentChain) return '#';

    // Use the chain's explorer URL directly
    if (currentChain.explorerUrl) {
      return `${currentChain.explorerUrl}/tx/${txHash}`;
    }

    // Fallback to Etherscan fore ETH
    return `https://etherscan.io/tx/${txHash}`;
  }

  function handleViewOnExplorer() {
    if (!transaction) return;
    const url = getExplorerUrl(transaction.hash);
    if (url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  // TODO: Get native token price from price feed service

  let txType = $derived(transaction ? getTransactionType(transaction) : '');
  let isOutgoing = $derived(transaction && account ? transaction.from.toLowerCase() === account.address.toLowerCase() : false);
  let gasEth = $derived(transaction ? formatGasUsed(transaction.gasUsed || '0', BigNumberishUtils.toNumber(transaction.gasPrice || 0).toString()) : '0');
  let gasFiat = $derived(formatFiatValue(gasEth, BigNumberishUtils.toNumber(nativePrice)));
  let valueFiat = $derived(transaction ? formatFiatValue(BigNumberishUtils.toNumber(transaction.value).toString(), BigNumberishUtils.toNumber(nativePrice)) : '$0.00');
</script>

<Modal bind:show {onClose} title="Transaction Details" className="max-w-lg">
  {#if transaction}
    <div class="space-y-4 text-sm">
      <!-- Transaction Header -->
      <div class="flex items-center gap-2 pb-3 border-b dark:border-zinc-700">
        <span class="text-2xl">
          {transaction.type === 'send' ? '↗️' : transaction.type === 'receive' ? '↙️' : '🔄'}
        </span>
        <div class="flex items-center gap-1">
          <span class="font-bold text-lg dark:text-white">{txType}</span>
          <TransactionStatusTooltip txType={transaction.type} placement="bottom-right" />
        </div>
        <div class="ml-auto flex items-center gap-1">
          <span class="px-2 py-0.5 rounded-full text-xs {
            transaction.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
            transaction.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          }">
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </span>
          <TransactionStatusTooltip status={transaction.status} placement="bottom-left" />
        </div>
      </div>

      <!-- Transaction Hash -->
      <div>
        <div class="flex items-center gap-1 mb-1">
          <span class="font-semibold dark:text-zinc-300">Transaction Hash</span>
          <TransactionTooltips type="hash" placement="auto" />
        </div>
        <div class="flex items-center gap-2">
          <div class="font-mono text-xs break-all dark:text-zinc-400 flex-1">
            <ProtectedValue value={transaction.hash} placeholder="********************************" />
          </div>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            onclick={() => copyToClipboard(transaction.hash, 'Transaction hash')}
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded transition-colors"
            title="Copy hash"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- From/To Addresses -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="flex items-center gap-1 mb-1">
            <span class="font-semibold dark:text-zinc-300">From</span>
            <TransactionTooltips type="from" placement="auto" />
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1">
              <TransactionHoverCard transaction={transaction} address={account?.address || ''}>
                <div class="font-mono text-xs dark:text-zinc-400 cursor-pointer hover:text-blue-500">
                  <ProtectedValue value={formatAddress(transaction.from)} placeholder="********************" />
                </div>
              </TransactionHoverCard>
              {#if account && transaction.from.toLowerCase() === account.address.toLowerCase()}
                <span class="text-xs text-blue-600 dark:text-blue-400">(You)</span>
              {/if}
            </div>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              onclick={() => copyToClipboard(transaction.from, 'From address')}
              class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded transition-colors"
              title="Copy full address"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div>
          <div class="flex items-center gap-1 mb-1">
            <span class="font-semibold dark:text-zinc-300">To</span>
            <TransactionTooltips type="to" placement="auto" />
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-1">
              <TransactionHoverCard transaction={transaction} address={account?.address || ''}>
                <div class="font-mono text-xs dark:text-zinc-400 cursor-pointer hover:text-blue-500">
                  <ProtectedValue value={formatAddress(transaction.to)} placeholder="********************" />
                </div>
              </TransactionHoverCard>
              {#if account && transaction.to.toLowerCase() === account.address.toLowerCase()}
                <span class="text-xs text-blue-600 dark:text-blue-400">(You)</span>
              {/if}
            </div>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              onclick={() => copyToClipboard(transaction.to, 'To address')}
              class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded transition-colors"
              title="Copy full address"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Amount -->
      <div class="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
        <div class="font-semibold dark:text-zinc-300 mb-2">Amount</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span class="text-xs text-zinc-500 dark:text-zinc-500">Native Token</span>
              <TransactionTooltips type="nativeToken" placement="auto" />
            </div>
            <div class="font-mono {isOutgoing ? 'text-red-500' : 'text-green-500'} font-bold text-lg">
              <ProtectedValue
                value={`${isOutgoing ? '−' : '+'}${formatFullAmount(transaction.value)} ${chain?.nativeCurrency?.symbol || 'ETH'}`}
                placeholder="******* ***"
              />
            </div>
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span class="text-xs text-zinc-500 dark:text-zinc-500">Value</span>
              <TransactionTooltips type="value" placement="auto" />
            </div>
            <div class="font-mono {isOutgoing ? 'text-red-500' : 'text-green-500'} font-bold text-lg">
              <ProtectedValue value={valueFiat} placeholder="*******" />
            </div>
          </div>
        </div>
      </div>

      <!-- Gas Information -->
      <div class="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-lg">
        <div class="flex items-center gap-1 mb-2">
          <span class="font-semibold dark:text-zinc-300">Gas Fees</span>
          <TransactionTooltips type="gasCost" placement="auto" />
        </div>
        <div class="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span class="text-zinc-500 dark:text-zinc-500">Gas Price</span>
              <TransactionTooltips type="gasPrice" placement="auto" />
            </div>
            <div class="font-mono dark:text-zinc-400">{formatGasPrice(transaction.gasPrice || '0')}</div>
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span class="text-zinc-500 dark:text-zinc-500">Gas Units Used</span>
              <TransactionTooltips type="gasUnits" placement="auto" />
            </div>
            <div class="font-mono dark:text-zinc-400">{transaction.gasUsed ? parseInt(transaction.gasUsed).toLocaleString() : 'N/A'}</div>
          </div>
          <div>
            <div class="flex items-center gap-1 mb-1">
              <span class="text-zinc-500 dark:text-zinc-500">Total Cost</span>
              <TransactionTooltips type="gasCost" placement="auto" />
            </div>
            <div class="font-mono dark:text-zinc-400">
              <ProtectedValue value={`${gasEth} ETH`} placeholder="******* ***" />
            </div>
            <div class="font-mono text-zinc-500 dark:text-zinc-600">
              <ProtectedValue value={gasFiat} placeholder="******" />
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Info -->
      <div class="text-xs space-y-2">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1">
            <span class="font-semibold dark:text-zinc-300">Block Number:</span>
            <TransactionTooltips type="blockNumber" placement="auto" />
          </div>
          <span class="dark:text-zinc-400">{transaction.blockNumber || 'Pending'}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1">
            <span class="font-semibold dark:text-zinc-300">Nonce:</span>
            <TransactionTooltips type="nonce" placement="auto" />
          </div>
          <span class="dark:text-zinc-400">{transaction.nonce || 'N/A'}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1">
            <span class="font-semibold dark:text-zinc-300">Confirmations:</span>
            <TransactionTooltips type="confirmations" placement="auto" />
          </div>
          <span class="dark:text-zinc-400">{transaction.confirmations || 'N/A'}</span>
        </div>
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-1">
            <span class="font-semibold dark:text-zinc-300">Timestamp:</span>
            <TransactionTooltips type="timestamp" placement="auto" />
          </div>
          <span class="dark:text-zinc-400">{formatTimestamp(transaction.timestamp)}</span>
        </div>
        {#if transaction.functionName}
          <div class="flex justify-between">
            <span class="font-semibold dark:text-zinc-300">Function:</span>
            <span class="dark:text-zinc-400 text-right break-all" style="max-width: 200px;">{transaction.functionName}</span>
          </div>
        {/if}
      </div>

      <!-- Actions -->
      <div class="pt-4 border-t dark:border-zinc-700 flex justify-center gap-3">
        <button
          onclick={onClose}
          class="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          <span>Close</span>
        </button>
        <button
          onclick={handleViewOnExplorer}
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <span>View on Explorer</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </button>
      </div>
    </div>
  {/if}
</Modal>
