<script lang="ts">
  import Modal from './Modal.svelte';
  import ProtectedValue from './ProtectedValue.svelte';
  import { displayTokens, isMultiChainView } from '$lib/stores/token.store';
  import { currentChain, chainStore } from '$lib/stores/chain.store';
  import type { TokenDisplay } from '$lib/types';
  import { get } from 'svelte/store';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  function formatCurrency(value: number | bigint): string {
    // Convert bigint (cents) to number (dollars) for display
    const numValue = typeof value === 'bigint' ? Number(value) / 100 : value;
    if (numValue === 0) return '$0.00';

    const absValue = Math.abs(numValue);
    if (absValue >= 1e12) {
      return `$${(numValue / 1e12).toFixed(1)}T+`;
    } else if (absValue >= 1e9) {
      return `$${(numValue / 1e9).toFixed(1)}B+`;
    } else if (absValue >= 1e6) {
      return `$${(numValue / 1e6).toFixed(1)}M+`;
    } else if (absValue >= 1e3) {
      return `$${(numValue / 1e3).toFixed(1)}K+`;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  }

  function formatCurrencyFull(value: number | bigint): string {
    // Convert bigint (cents) to number (dollars) for display
    const numValue = typeof value === 'bigint' ? Number(value) / 100 : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  }

  function formatBalance(balance: number | bigint): string {
    // Convert to number for display purposes only
    const numBalance = typeof balance === 'bigint' ? Number(balance) : balance;
    if (numBalance === 0) return '0';

    const absBalance = Math.abs(numBalance);
    if (absBalance >= 1e12) {
      return `${(numBalance / 1e12).toFixed(1)}T+`;
    } else if (absBalance >= 1e9) {
      return `${(numBalance / 1e9).toFixed(1)}B+`;
    } else if (absBalance >= 1e6) {
      return `${(numBalance / 1e6).toFixed(1)}M+`;
    } else if (absBalance >= 1e3) {
      return `${(numBalance / 1e3).toFixed(1)}K+`;
    } else if (absBalance < 0.0001) {
      return numBalance.toExponential(4);
    } else if (absBalance < 1) {
      return numBalance.toFixed(6);
    } else if (absBalance < 1000) {
      return numBalance.toFixed(4);
    }

    return numBalance.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function formatBalanceFull(balance: number | bigint): string {
    const numBalance = typeof balance === 'bigint' ? Number(balance) : balance;
    if (numBalance === 0) return '0';
    if (numBalance < 0.0001) return numBalance.toExponential(4);
    if (numBalance < 1) return numBalance.toFixed(6);
    return numBalance.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }

  interface Props {
    show?: boolean;
    onClose?: () => void;
  }

  let {
    show = $bindable(false),
    onClose = () => { show = false; }
  }: Props = $props();

  interface NetworkBreakdown {
    chainId: number;
    chainName: string;
    network: string;
    totalValue: number;
    tokenCount: number;
    tokens: TokenDisplay[];
    isTestnet: boolean;
  }

  let isMultiChain = $derived($isMultiChainView);
  let tokens = $derived($displayTokens);
  let currentChainData = $derived($currentChain);

  // Group tokens by network
  let networkBreakdowns = $derived.by(() => {
    const groups = new Map<number, NetworkBreakdown>();

    // Ensure tokens is an array
    const tokenArray = Array.isArray(tokens) ? tokens : [];

    // Get chain information
    const chains = get(chainStore).chains;
    const chainMap = new Map(chains.map(c => [c.chainId, c]));

    for (const token of tokenArray) {
      if (!token.chainId) continue;

      // Skip tokens with 0 value unless specifically requested
      if (!token.value || token.value === 0) continue;

      let group = groups.get(token.chainId);
      if (!group) {
        const chainInfo = chainMap.get(token.chainId);
        const chainName = chainInfo ? chainInfo.name : 'Unknown';
        const network = chainInfo ? chainInfo.network : `Network ${token.chainId}`;

        group = {
          chainId: token.chainId,
          chainName: chainName,
          network: network,
          totalValue: 0,
          tokenCount: 0,
          tokens: [],
          isTestnet: chainInfo?.isTestnet || false
        };
        groups.set(token.chainId, group);
      }

      // Use BigNumber arithmetic for accuracy
      const tokenValue = BigNumberishUtils.toBigInt(token.value || 0);
      const currentTotal = BigNumberishUtils.toBigInt(group.totalValue);
      group.totalValue = Number(BigNumberishUtils.add(currentTotal, tokenValue));
      group.tokenCount++;
      group.tokens.push(token);
    }

    // Sort by total value descending using BigNumber comparison
    return Array.from(groups.values()).sort((a, b) =>
      BigNumberishUtils.compare(b.totalValue, a.totalValue)
    );
  });

  let totalValue = $derived(
    Array.isArray(networkBreakdowns) ? networkBreakdowns.reduce((sum, network) => sum + network.totalValue, 0) : 0
  );

  let expandedChains = $state(new Set<number>());

  function toggleNetwork(chainId: number) {
    if (expandedChains.has(chainId)) {
      expandedChains.delete(chainId);
    } else {
      expandedChains.add(chainId);
    }
    expandedChains = new Set(expandedChains);
  }
</script>

<Modal bind:show title="Portfolio Details" {onClose}>
  {#snippet children()}
    <div class="space-y-4">
      <!-- Total Summary -->
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4">
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {isMultiChain ? 'Multi-Network Total' : 'Current Network Total'}
          </span>
          <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            <ProtectedValue value={formatCurrency(totalValue)} placeholder="*******" />
          </span>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Across {networkBreakdowns.length} network{networkBreakdowns.length !== 1 ? 's' : ''} •
          {networkBreakdowns.reduce((sum, network) => sum + network.tokenCount, 0)} token{networkBreakdowns.reduce((sum, network) => sum + network.tokenCount, 0) !== 1 ? 's' : ''}
        </div>
      </div>

      <!-- Network Breakdowns -->
      <div class="space-y-2">
        {#each networkBreakdowns as network}
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <!-- Network Header -->
            <button
              class="w-full px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onclick={() => toggleNetwork(network.chainId)}
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span class="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {network.chainName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div class="text-left">
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {network.chainName} {network.network}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {network.tokenCount} token{network.tokenCount !== 1 ? 's' : ''} • ID: {network.chainId}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-900 dark:text-gray-100">
                  <ProtectedValue value={formatCurrency(network.totalValue)} placeholder="******" />
                </span>
                <svg
                  class="w-4 h-4 text-gray-400 transition-transform duration-200"
                  class:rotate-180={expandedChains.has(network.chainId)}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            <!-- Token List -->
            {#if expandedChains.has(network.chainId)}
              <div class="border-t border-gray-200 dark:border-gray-700">
                <table class="w-full table-fixed">
                  <colgroup>
                    <col class="w-[35%]" />
                    <col class="w-[25%]" />
                    <col class="w-[20%]" />
                    <col class="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr class="bg-gray-50 dark:bg-gray-800/30 text-xs text-gray-500 dark:text-gray-400">
                      <th class="text-left px-3 py-2">Token</th>
                      <th class="text-right px-3 py-2">Balance</th>
                      <th class="text-right px-3 py-2">Price</th>
                      <th class="text-right px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each network.tokens.sort((a, b) => BigNumberishUtils.compare(b.value || 0, a.value || 0)) as token}
                      <tr class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td class="px-3 py-3">
                          <div class="flex items-center gap-2">
                            {#if token.icon}
                              {@const isImagePath = token.icon && (token.icon.startsWith('/') || token.icon.startsWith('http') || token.icon.includes('.svg') || token.icon.includes('.png') || token.icon.includes('.jpg') || token.icon.includes('.jpeg') || token.icon.includes('.gif') || token.icon.includes('.webp'))}
                              {#if isImagePath}
                                <!-- Image files (local or remote) -->
                                <img src={token.icon} alt={token.symbol} class="w-6 h-6 rounded-full"
                                     onerror={(e) => {
                                       const target = e.currentTarget as HTMLImageElement;
                                       target.style.display='none';
                                       const nextElement = target.nextElementSibling as HTMLElement;
                                       if (nextElement) nextElement.style.display='flex';
                                     }} />
                                <div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
                                  {token.symbol?.[0] || '?'}
                                </div>
                              {:else}
                                <!-- Text/emoji icons -->
                                <div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
                                  {token.icon || token.symbol?.[0] || '?'}
                                </div>
                              {/if}
                            {:else}
                              <div class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                                {token.symbol?.[0] || '?'}
                              </div>
                            {/if}
                            <div>
                              <div class="font-medium text-gray-900 dark:text-gray-100">
                                {token.symbol}
                              </div>
                              <div class="text-xs text-gray-500 dark:text-gray-400">
                                {token.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-3 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                          <div class="cursor-help" title={`${formatBalanceFull(BigNumberishUtils.toNumber(token.qty || 0))} ${token.symbol}`}>
                            <ProtectedValue
                              value={formatBalance(BigNumberishUtils.toNumber(token.qty || 0))}
                              placeholder="****"
                            />
                          </div>
                        </td>
                        <td class="px-3 py-3 text-right text-sm text-gray-900 dark:text-gray-100">
                          {#if token.price}
                            <div class="cursor-help" title={formatCurrencyFull(BigNumberishUtils.toNumber(token.price))}>
                              <ProtectedValue value={formatCurrency(BigNumberishUtils.toNumber(token.price))} placeholder="****" />
                            </div>
                          {:else}
                            <span class="text-gray-400">--</span>
                          {/if}
                        </td>
                        <td class="px-3 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                          {#if token.value}
                            <div class="cursor-help" title={formatCurrencyFull(BigNumberishUtils.toNumber(token.value))}>
                              <ProtectedValue value={formatCurrency(BigNumberishUtils.toNumber(token.value))} placeholder="*****" />
                            </div>
                          {:else}
                            <span class="text-gray-400">$0.00</span>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </div>
        {/each}
      </div>

      {#if networkBreakdowns.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="font-medium">No tokens with value</p>
          <p class="text-sm mt-2">Your tokens will appear here once they have a value</p>
        </div>
      {/if}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="flex justify-between items-center">
      <div class="text-xs text-gray-500 dark:text-gray-400">
        {currentChainData?.isTestnet ? 'Showing testnet tokens' : 'Showing mainnet tokens only'}
      </div>
      <button
        class="px-4 py-2 text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        onclick={onClose}
      >
        Close
      </button>
    </div>
  {/snippet}
</Modal>
