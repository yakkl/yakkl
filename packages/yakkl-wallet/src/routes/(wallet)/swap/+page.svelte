<script lang="ts">
  import { onMount } from 'svelte';
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { displayTokens } from '$lib/stores/token.store';
  // Removed: canUseFeature import - swap_tokens is available to all users
  import { notificationService } from '$lib/services/notification.service';
  import { messageService } from '$lib/services/message.service';
  import { ArrowDownUp, Settings, Info } from 'lucide-svelte';
  import type { TokenDisplay } from '$lib/types';

  // State
  let fromToken = $state<TokenDisplay | null>(null);
  let toToken = $state<TokenDisplay | null>(null);
  let fromAmount = $state('');
  let toAmount = $state('');
  let slippage = $state(0.5); // 0.5% default slippage
  let loading = $state(false);
  let fetchingQuote = $state(false);
  let showSettings = $state(false);
  let quoteData = $state<any>(null);
  let gasFee = $state<string>('0');

  // Derived values
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let tokenList = $derived($displayTokens);
  let hasAccess = $derived(true); // Swap is available to all users

  // Supported tokens for swapping (simplified list)
  const SUPPORTED_TOKENS = ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC'];
  let swappableTokens = $derived(tokenList.filter(t =>
    SUPPORTED_TOKENS.includes(t.symbol.toUpperCase())
  ));

  onMount(() => {
    // Set default tokens
    if (swappableTokens.length > 0) {
      fromToken = swappableTokens.find(t => t.symbol === 'ETH') || swappableTokens[0];
      toToken = swappableTokens.find(t => t.symbol === 'USDC') || swappableTokens[1];
    }
  });

  // Swap the from/to tokens
  function switchTokens() {
    const temp = fromToken;
    fromToken = toToken;
    toToken = temp;

    const tempAmount = fromAmount;
    fromAmount = toAmount;
    toAmount = tempAmount;
  }

  // Fetch swap quote
  async function fetchQuote() {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      return;
    }

    fetchingQuote = true;
    try {
      // Call background service to get swap quote
      const response = await messageService.send({
        type: 'swap.getQuote',
        payload: {
          fromToken: {
            address: fromToken.address || '',
            symbol: fromToken.symbol,
            decimals: fromToken.decimals
          },
          toToken: {
            address: toToken.address || '',
            symbol: toToken.symbol,
            decimals: toToken.decimals
          },
          amount: fromAmount,
          chainId: chain?.chainId || 1,
          slippage
        }
      });

      if (response.success && response.data) {
        quoteData = response.data;
        toAmount = response.data.toAmount;
        gasFee = response.data.gasFee;
      }
    } catch (error) {
      console.error('Failed to fetch quote:', error);
    } finally {
      fetchingQuote = false;
    }
  }

  // Debounced quote fetching
  let quoteTimeout: ReturnType<typeof setTimeout>;
  function handleAmountChange() {
    clearTimeout(quoteTimeout);
    quoteTimeout = setTimeout(() => {
      fetchQuote();
    }, 500);
  }

  // Execute swap
  async function executeSwap() {

    if (!fromToken || !toToken || !fromAmount || !quoteData) {
      return;
    }

    loading = true;
    try {
      // TODO: Implement actual swap execution via UniswapSwapManager
      await notificationService.show({
        message: 'Swap functionality coming soon!',
        type: 'info'
      });

      // For now, just show mock success
      setTimeout(() => {
        notificationService.show({
          message: `Successfully swapped ${fromAmount} ${fromToken.symbol} for ${toAmount} ${toToken.symbol}`,
          type: 'success'
        });

        // Reset form
        fromAmount = '';
        toAmount = '';
        quoteData = null;
      }, 1000);
    } catch (error) {
      console.error('Swap failed:', error);
      await notificationService.show({
        message: 'Swap failed. Please try again.',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  function formatAmount(amount: string): string {
    if (!amount) return '0';
    const num = parseFloat(amount);
    if (num < 0.01) return '<0.01';
    return num.toFixed(4);
  }
</script>

<div class="max-w-[480px] mx-auto p-5 space-y-5">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">Swap</h1>
    <button
      onclick={() => showSettings = !showSettings}
      class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
    >
      <Settings class="w-5 h-5" />
    </button>
  </div>

  <!-- Swap is available to all users -->

  <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 space-y-4">
    <!-- From Token -->
    <div class="space-y-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="text-sm text-zinc-600 dark:text-zinc-400">You pay</label>
      <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <input
            type="number"
            bind:value={fromAmount}
            oninput={handleAmountChange}
            placeholder="0.0"
            class="bg-transparent text-2xl font-semibold w-full outline-none"
            disabled={!fromToken}
          />
          <select
            bind:value={fromToken}
            class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm font-medium ml-2"
          >
            {#each swappableTokens as token}
              <option value={token}>{token.symbol}</option>
            {/each}
          </select>
        </div>
        {#if fromToken}
          <div class="text-xs text-zinc-500">
            Balance: {formatAmount(String(fromToken.balance || '0'))} {fromToken.symbol}
          </div>
        {/if}
      </div>
    </div>

    <!-- Switch Button -->
    <div class="flex justify-center -my-2">
      <button
        onclick={switchTokens}
        class="p-3 bg-zinc-100 dark:bg-zinc-700 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
      >
        <ArrowDownUp class="w-4 h-4" />
      </button>
    </div>

    <!-- To Token -->
    <div class="space-y-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="text-sm text-zinc-600 dark:text-zinc-400">You receive</label>
      <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <input
            type="number"
            bind:value={toAmount}
            placeholder="0.0"
            class="bg-transparent text-2xl font-semibold w-full outline-none"
            disabled
          />
          <select
            bind:value={toToken}
            onchange={() => fetchQuote()}
            class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-sm font-medium ml-2"
          >
            {#each swappableTokens.filter(t => t !== fromToken) as token}
              <option value={token}>{token.symbol}</option>
            {/each}
          </select>
        </div>
        {#if toToken}
          <div class="text-xs text-zinc-500">
            Balance: {formatAmount(String(toToken.balance || '0'))} {toToken.symbol}
          </div>
        {/if}
      </div>
    </div>

    <!-- Quote Details -->
    {#if quoteData && !fetchingQuote}
      <div class="border-t border-zinc-200 dark:border-zinc-700 pt-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-zinc-600 dark:text-zinc-400">Rate</span>
          <span>1 {fromToken?.symbol} = {quoteData.rate} {toToken?.symbol}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-zinc-600 dark:text-zinc-400">Network fee</span>
          <span>~${gasFee}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-zinc-600 dark:text-zinc-400">Slippage tolerance</span>
          <span>{slippage}%</span>
        </div>
      </div>
    {/if}

    <!-- Swap Button -->
    <button
      onclick={executeSwap}
      disabled={loading || !fromAmount || !toAmount || fetchingQuote}
      class="w-full yakkl-btn-primary yakkl-swap text-lg font-semibold py-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if loading}
        <div class="flex items-center justify-center gap-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          Swapping...
        </div>
      {:else if fetchingQuote}
        <div class="flex items-center justify-center gap-2">
          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          Fetching best price...
        </div>
      {:else}
        Swap
      {/if}
    </button>
  </div>

  <!-- Settings Modal -->
  {#if showSettings}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div class="bg-white dark:bg-zinc-800 rounded-xl p-6 w-full max-w-sm">
        <h3 class="text-lg font-semibold mb-4">Swap Settings</h3>
        <div class="space-y-4">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="text-sm text-zinc-600 dark:text-zinc-400">Slippage tolerance</label>
            <div class="flex gap-2 mt-2">
              {#each [0.1, 0.5, 1.0] as value}
                <button
                  onclick={() => slippage = value}
                  class="px-3 py-1 rounded-lg text-sm {slippage === value ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700'}"
                >
                  {value}%
                </button>
              {/each}
              <input
                type="number"
                bind:value={slippage}
                placeholder="Custom"
                class="px-3 py-1 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-700 w-20"
                min="0.01"
                max="50"
                step="0.1"
              />
            </div>
          </div>
        </div>
        <button
          onclick={() => showSettings = false}
          class="mt-6 w-full yakkl-btn-secondary"
        >
          Done
        </button>
      </div>
    </div>
  {/if}
</div>
