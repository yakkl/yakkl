<script lang="ts">
  import { messagingService } from '$lib/common/messaging';
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { displayTokens } from '$lib/stores/token.store';
  import { notificationService } from '$lib/services/notification.service';
  import { uiStore } from '$lib/stores/ui.store';
  import Modal from './Modal.svelte';
  import PincodeVerify from './PincodeVerify.svelte';
  import { ethers } from 'ethers-v6';
  import { ArrowDownUp, Settings, Info, AlertTriangle } from 'lucide-svelte';
  import type { TokenDisplay } from '$lib/types';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

  let {
    show = $bindable(false),
    fromToken: initialFromToken = null,
    onClose = null,
    onSwap = null
  } = $props();

  // State
  let fromToken = $state<TokenDisplay | null>(initialFromToken);
  let toToken = $state<TokenDisplay | null>(null);
  let fromAmount = $state('');
  let toAmount = $state('');
  let slippage = $state(0.5); // 0.5% default
  let deadline = $state(30); // 30 minutes default
  let poolFee = $state(3000); // 0.3% default

  // UI State
  let loading = $state(false);
  let fetchingQuote = $state(false);
  let showSettings = $state(false);
  let showPincode = $state(false);
  let validationError = $state('');
  let quoteData = $state<any>(null);
  let priceImpact = $state(0);
  let insufficientLiquidity = $state(false);

  // Auto-select fee tier for stablecoins
  let autoFeeEnabled = $state(true);

  // Reactive values
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let tokenList = $derived($displayTokens);

  // Supported tokens for swapping
  const SUPPORTED_TOKENS = ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'AAVE', 'UNI', 'LINK'];
  const STABLECOINS = ['USDC', 'USDT', 'DAI', 'BUSD'];

  let swappableTokens = $derived(tokenList.filter(t =>
    SUPPORTED_TOKENS.includes(t.symbol.toUpperCase())
  ));

  // Initialize default tokens
  $effect(() => {
    if (swappableTokens.length > 0 && !fromToken) {
      fromToken = swappableTokens.find(t => t.symbol === 'ETH') || swappableTokens[0];
      toToken = swappableTokens.find(t => t.symbol === 'USDC') || swappableTokens[1];
    }
  });

  // Auto-adjust fee tier for stablecoin pairs
  $effect(() => {
    if (autoFeeEnabled && fromToken && toToken) {
      const isStablecoinPair =
        STABLECOINS.includes(fromToken.symbol) &&
        STABLECOINS.includes(toToken.symbol);

      if (isStablecoinPair) {
        poolFee = 500; // 0.05% for stablecoin pairs
      } else {
        poolFee = 3000; // 0.3% default
      }
    }
  });

  // Swap tokens
  function switchTokens() {
    const temp = fromToken;
    fromToken = toToken;
    toToken = temp;

    const tempAmount = fromAmount;
    fromAmount = toAmount;
    toAmount = tempAmount;

    // Clear quote data
    quoteData = null;
  }

  // Validate swap
  function validateSwap(): boolean {
    validationError = '';

    if (!fromToken || !toToken) {
      validationError = 'Please select tokens';
      return false;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      validationError = 'Please enter an amount';
      return false;
    }

    const balance = fromToken.balance && typeof fromToken.balance === 'number' 
      ? fromToken.balance 
      : (fromToken.balance ? BigNumberishUtils.toNumber(fromToken.balance) : 0);
    if (parseFloat(fromAmount) > balance) {
      validationError = 'Insufficient balance';
      return false;
    }

    if (fromToken.address === toToken.address) {
      validationError = 'Cannot swap same token';
      return false;
    }

    return true;
  }

  // Fetch quote
  async function fetchQuote() {
    if (!validateSwap()) return;

    fetchingQuote = true;
    insufficientLiquidity = false;

    try {
      const response = await messagingService.sendMessage('swap.getQuote', {
        fromToken: {
          address: fromToken!.address,
          symbol: fromToken!.symbol,
          decimals: fromToken!.decimals
        },
        toToken: {
          address: toToken!.address,
          symbol: toToken!.symbol,
          decimals: toToken!.decimals
        },
        amount: fromAmount,
        chainId: chain?.chainId || 1,
        slippage,
        fee: poolFee
      });

      if (response.success && response.data) {
        quoteData = response.data;
        toAmount = response.data.toAmount;

        // Calculate price impact
        const impactPercent = parseFloat(response.data.priceImpact || '0');
        priceImpact = impactPercent;

        // Check for high price impact
        if (impactPercent > 5) {
          validationError = 'High price impact! Consider smaller amount.';
        }
      } else {
        throw new Error(response.error || 'Failed to get quote');
      }
    } catch (error: any) {
      console.error('Quote error:', error);

      if (error.message?.includes('insufficient liquidity')) {
        insufficientLiquidity = true;
        validationError = 'Insufficient liquidity for this trade';
      } else {
        validationError = 'Failed to fetch quote. Please try again.';
      }
    } finally {
      fetchingQuote = false;
    }
  }

  // Debounced quote fetching
  let quoteTimeout: ReturnType<typeof setTimeout>;
  function handleAmountChange() {
    clearTimeout(quoteTimeout);
    quoteTimeout = setTimeout(() => {
      if (fromAmount && fromToken && toToken) {
        fetchQuote();
      }
    }, 500);
  }

  // Handle PIN success
  async function handlePinSuccess() {
    showPincode = false;
    await executeSwap();
  }

  // Execute swap
  async function executeSwap() {
    if (!quoteData || !fromToken || !toToken) return;

    loading = true;
    try {
      // Check allowance for ERC20 tokens
      if (fromToken.address !== ethers.ZeroAddress) {
        const allowanceResponse = await messagingService.sendMessage('swap.checkAllowance', {
          tokenAddress: fromToken.address,
          ownerAddress: account?.address,
          spenderAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564' // Uniswap V3 Router
        });

        if (allowanceResponse.success) {
          const allowance = allowanceResponse.data.allowance && typeof allowanceResponse.data.allowance === 'bigint' 
            ? allowanceResponse.data.allowance 
            : BigNumberishUtils.toBigInt(allowanceResponse.data.allowance || 0);
          const amountIn = ethers.parseUnits(fromAmount, fromToken.decimals || 18);

          if (allowance < amountIn) {
            // Need approval
            notificationService.show({
              message: 'Approving token for swap...',
              type: 'info'
            });

            const approvalResponse = await messagingService.sendMessage('swap.approve', {
              tokenAddress: fromToken.address,
              spenderAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
              amount: amountIn.toString()
            });

            if (!approvalResponse.success) {
              throw new Error('Failed to approve token');
            }

            // Wait a bit for approval to be mined
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // Execute swap
      const swapResponse = await messagingService.sendMessage('swap.execute', {
        fromToken: {
          address: fromToken.address,
          symbol: fromToken.symbol,
          decimals: fromToken.decimals
        },
        toToken: {
          address: toToken.address,
          symbol: toToken.symbol,
          decimals: toToken.decimals
        },
        fromAmount,
        amountOutMinimum: quoteData.amountOutMinimum,
        slippage,
        fee: poolFee,
        deadline: Math.floor(Date.now() / 1000) + (deadline * 60)
      });

      if (swapResponse.success && swapResponse.data) {
        // Show success notification
        notificationService.show({
          title: 'Swap Initiated!',
          message: `Transaction hash: ${swapResponse.data.txHash}`,
          type: 'success'
        });

        // Show pending transaction UI
        uiStore.showTransactionPending(swapResponse.data.txHash);

        // Call parent handler
        if (onSwap) {
          onSwap(swapResponse.data);
        }

        // Close modal
        show = false;
        resetForm();
      } else {
        throw new Error(swapResponse.error || 'Swap failed');
      }
    } catch (error: any) {
      console.error('Swap error:', error);
      notificationService.show({
        title: 'Swap Failed',
        message: error.message,
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  // Submit handler
  function handleSubmit() {
    if (!validateSwap() || !quoteData) return;

    // Show PIN verification
    showPincode = true;
  }

  // Reset form
  function resetForm() {
    fromAmount = '';
    toAmount = '';
    quoteData = null;
    validationError = '';
    priceImpact = 0;
  }

  // Format functions
  function formatAmount(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0';
    if (num < 0.0001) return '<0.0001';
    if (num < 1) return num.toFixed(6);
    if (num < 100) return num.toFixed(4);
    return num.toFixed(2);
  }

  function formatUSD(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function getPriceImpactColor(impact: number): string {
    if (impact < 0.5) return 'text-green-600';
    if (impact < 3) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getFeeLabel(fee: number): string {
    switch (fee) {
      case 100: return '0.01%';
      case 500: return '0.05%';
      case 3000: return '0.3%';
      case 10000: return '1%';
      default: return `${fee / 10000}%`;
    }
  }
</script>

<Modal
  bind:show
  title="Swap Tokens"
  onClose={() => {
    show = false;
    resetForm();
    if (onClose) onClose();
  }}
>
  <div class="space-y-4">
    <!-- From Token -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
      <label for="swap-from-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        You pay
      </label>
      <div class="flex gap-3">
        <input
          id="swap-from-amount"
          type="number"
          bind:value={fromAmount}
          oninput={handleAmountChange}
          placeholder="0.0"
          step="any"
          class="flex-1 text-2xl font-semibold bg-transparent outline-none"
          disabled={!fromToken}
        />
        <select
          bind:value={fromToken}
          class="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
        >
          {#each swappableTokens as token}
            <option value={token}>
              {token.symbol}
            </option>
          {/each}
        </select>
      </div>
      {#if fromToken}
        <div class="mt-2 flex justify-between text-sm text-gray-500">
          <span>Balance: {formatAmount(fromToken.balance && typeof fromToken.balance === 'number' ? fromToken.balance : (fromToken.balance ? BigNumberishUtils.toNumber(fromToken.balance) : 0))}</span>
          <button
            class="text-indigo-600 hover:text-indigo-800"
            onclick={() => {
              const balance = fromToken?.balance && typeof fromToken.balance === 'number' 
              ? fromToken.balance 
              : (fromToken?.balance ? BigNumberishUtils.toNumber(fromToken.balance) : 0);
            fromAmount = balance.toString();
              handleAmountChange();
            }}
          >
            MAX
          </button>
        </div>
      {/if}
    </div>

    <!-- Switch Button -->
    <div class="flex justify-center -my-2 relative z-10">
      <button
        onclick={switchTokens}
        class="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
      >
        <ArrowDownUp class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </button>
    </div>

    <!-- To Token -->
    <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
      <label for="swap-to-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        You receive
      </label>
      <div class="flex gap-3">
        <input
          id="swap-to-amount"
          type="number"
          bind:value={toAmount}
          placeholder="0.0"
          class="flex-1 text-2xl font-semibold bg-transparent outline-none"
          disabled
        />
        <select
          bind:value={toToken}
          onchange={() => fromAmount && fetchQuote()}
          class="px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
        >
          {#each swappableTokens.filter(t => t !== fromToken) as token}
            <option value={token}>
              {token.symbol}
            </option>
          {/each}
        </select>
      </div>
      {#if toToken}
        <div class="mt-2 text-sm text-gray-500">
          Balance: {formatAmount(toToken.balance && typeof toToken.balance === 'number' ? toToken.balance : (toToken.balance ? BigNumberishUtils.toNumber(toToken.balance) : 0))}
        </div>
      {/if}
    </div>

    <!-- Quote Details -->
    {#if quoteData && !fetchingQuote}
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Rate</span>
          <span>1 {fromToken?.symbol} = {formatAmount(quoteData.rate)} {toToken?.symbol}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Network Fee</span>
          <span>{formatUSD(parseFloat(quoteData.gasFee))}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Pool Fee</span>
          <span>{getFeeLabel(poolFee)}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Slippage Tolerance</span>
          <span>{slippage}%</span>
        </div>
        {#if priceImpact > 0}
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Price Impact</span>
            <span class={getPriceImpactColor(priceImpact)}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
        {/if}
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Minimum Received</span>
          <span>{formatAmount(quoteData.amountOutMinimum)} {toToken?.symbol}</span>
        </div>
      </div>
    {/if}

    <!-- Warnings -->
    {#if priceImpact > 5}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2">
        <AlertTriangle class="w-5 h-5 text-red-600 flex-shrink-0" />
        <div class="text-sm text-red-700 dark:text-red-300">
          <p class="font-medium">High price impact!</p>
          <p>Consider trading a smaller amount to reduce price impact.</p>
        </div>
      </div>
    {/if}

    {#if insufficientLiquidity}
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex gap-2">
        <Info class="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <div class="text-sm text-yellow-700 dark:text-yellow-300">
          <p>Insufficient liquidity for this trade.</p>
          <p>Try a smaller amount or different token pair.</p>
        </div>
      </div>
    {/if}

    <!-- Error Display -->
    {#if validationError && !priceImpact}
      <div class="text-red-600 text-sm">{validationError}</div>
    {/if}

    <!-- Settings Button -->
    <button
      onclick={() => showSettings = !showSettings}
      class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
    >
      <Settings class="w-4 h-4" />
      Transaction Settings
    </button>

    <!-- Action Buttons -->
    <div class="flex gap-3">
      <button
        class="flex-1 yakkl-btn-secondary"
        onclick={() => {
          show = false;
          resetForm();
          if (onClose) onClose();
        }}
      >
        Cancel
      </button>
      <button
        class="flex-1 yakkl-btn-primary"
        disabled={loading || fetchingQuote || !fromAmount || !toAmount || !!validationError}
        onclick={handleSubmit}
      >
        {#if loading}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Swapping...
          </div>
        {:else if fetchingQuote}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Getting quote...
          </div>
        {:else}
          Swap
        {/if}
      </button>
    </div>
  </div>
</Modal>

<!-- Settings Modal -->
{#if showSettings}
  <Modal
    show={showSettings}
    title="Transaction Settings"
    onClose={() => showSettings = false}
  >
    <div class="space-y-4">
      <!-- Slippage Tolerance -->
      <div>
        <label for="slippage-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Slippage Tolerance
        </label>
        <div class="flex gap-2">
          {#each [0.1, 0.5, 1.0] as value}
            <button
              onclick={() => slippage = value}
              class="px-3 py-1 rounded-lg text-sm {slippage === value ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}"
            >
              {value}%
            </button>
          {/each}
          <input
            id="slippage-input"
            type="number"
            bind:value={slippage}
            placeholder="Custom"
            class="px-3 py-1 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 w-20"
            min="0.01"
            max="50"
            step="0.1"
          />
        </div>
      </div>

      <!-- Transaction Deadline -->
      <div>
        <label for="deadline-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Transaction Deadline
        </label>
        <div class="flex items-center gap-2">
          <input
            id="deadline-input"
            type="number"
            bind:value={deadline}
            class="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 w-20"
            min="1"
            max="60"
          />
          <span class="text-sm text-gray-500">minutes</span>
        </div>
      </div>

      <!-- Pool Fee -->
      <div>
        <label for="pool-fee-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Pool Fee Tier
        </label>
        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              bind:checked={autoFeeEnabled}
              class="rounded"
            />
            <span class="text-sm">Auto-select for stablecoins</span>
          </label>
          <select
            id="pool-fee-select"
            bind:value={poolFee}
            disabled={autoFeeEnabled}
            class="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            <option value={100}>0.01% - Best for stablecoins</option>
            <option value={500}>0.05% - Best for stablecoin pairs</option>
            <option value={3000}>0.3% - Best for most pairs</option>
            <option value={10000}>1% - Best for exotic pairs</option>
          </select>
        </div>
      </div>

      <button
        onclick={() => showSettings = false}
        class="w-full yakkl-btn-primary"
      >
        Done
      </button>
    </div>
  </Modal>
{/if}

<!-- PIN Verification -->
{#if showPincode}
  <PincodeVerify
    show={showPincode}
    onVerified={handlePinSuccess}
    onRejected={() => showPincode = false}
  />
{/if}
