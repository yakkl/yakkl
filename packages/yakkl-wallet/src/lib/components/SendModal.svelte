<script lang="ts">
  import { transactionStore, isLoadingTx, txError } from '../stores/transaction.store';
  import { canUseFeature } from '../stores/plan.store';
  import { ethers } from 'ethers';
  import GasFeeSelector from './GasFeeSelector.svelte';

  let {
    show = $bindable(false),
    onClose = null,
    onSend = null,
    tokens = [],
    chain = { icon: '/images/eth.svg', name: 'Ethereum' },
    mode = 'send' // or 'swap'
  } = $props();

  let recipient = $state('');
  let amount = $state('');
  let selectedToken = $state(tokens[0] || { symbol: 'ETH', icon: '/images/eth.svg' });
  let gasEstimate = $state('');
  let estimatingGas = $state(false);
  let validationError = $state('');
  let gasSpeed = $state<'slow' | 'standard' | 'fast'>('standard');
  let gasPrice = $state({
    slow: '10',
    standard: '20',
    fast: '30'
  });

  // Reactive values
  let sending = $derived($isLoadingTx);
  let error = $derived($txError);

  // Update selected token when tokens change
  $effect(() => {
    if (tokens.length > 0 && !selectedToken) {
      selectedToken = tokens[0];
    }
  });

  // Validate address format
  function validateAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // Validate amount
  function validateAmount(amt: string): boolean {
    const num = parseFloat(amt);
    return !isNaN(num) && num > 0;
  }

  // Estimate gas when inputs change
  $effect(() => {
    if (recipient && amount && validateAddress(recipient) && validateAmount(amount)) {
      estimateGas();
    }
  });

  async function estimateGas() {
    if (!canUseFeature('send_tokens')) return;
    
    estimatingGas = true;
    try {
      const isETH = selectedToken.symbol === 'ETH';
      const response = await transactionStore.estimateGas(
        recipient,
        amount,
        isETH ? undefined : selectedToken.address
      );
      
      if (response.success && response.data) {
        const gasInEth = ethers.formatEther(response.data);
        gasEstimate = `~${parseFloat(gasInEth).toFixed(6)} ETH`;
      }
    } catch (error) {
      gasEstimate = 'Unable to estimate';
    } finally {
      estimatingGas = false;
    }
  }

  function validateInputs(): string | null {
    if (!recipient) return 'Recipient address is required';
    if (!validateAddress(recipient)) return 'Invalid recipient address';
    if (!amount) return 'Amount is required';
    if (!validateAmount(amount)) return 'Invalid amount';
    if (parseFloat(amount) > selectedToken.qty) return 'Insufficient balance';
    return null;
  }

  function closeModal() {
    recipient = '';
    amount = '';
    gasEstimate = '';
    validationError = '';
    transactionStore.clearError();
    if (onClose) onClose();
  }

  async function submitSend() {
    // Validate inputs
    const validation = validateInputs();
    if (validation) {
      validationError = validation;
      return;
    }

    if (!canUseFeature('send_tokens')) {
      validationError = 'Send feature requires Pro plan';
      return;
    }

    try {
      const isETH = selectedToken.symbol === 'ETH';
      const txHash = await transactionStore.sendTransaction(
        recipient,
        amount,
        isETH ? undefined : selectedToken.address
      );
      
      // Call the parent callback if provided
      if (onSend) {
        await onSend({ 
          recipient, 
          amount, 
          token: selectedToken,
          txHash 
        });
      }
      
      closeModal();
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Transaction failed';
    }
  }

  async function submitSwap() {
    // TODO: Implement swap functionality
    validationError = 'Swap functionality coming soon';
  }

  function handleSubmit() {
    validationError = '';
    if (mode === 'send') {
      submitSend();
    } else {
      submitSwap();
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
    onclick={closeModal}
    onkeydown={e => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Send tokens modal"
    tabindex="-1">
    <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 min-w-[320px] w-full max-w-xs flex flex-col gap-4 animate-in slide-in-from-bottom-10"
      onclick={e => e.stopPropagation()}
      onkeydown={e => e.stopPropagation()}
      role="presentation">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          {#if chain?.icon}
            {#if chain.icon.startsWith('/')}
              <img src={chain.icon} alt={chain.name} class="w-6 h-6" />
            {:else}
              <span class="text-xl">{chain.icon}</span>
            {/if}
          {/if}
          <span class="font-bold text-lg capitalize">
            {mode === 'send' ? 'Send Tokens' : 'Swap Tokens'}
          </span>
        </div>
        <button 
          class="text-2xl text-gray-400 hover:text-red-500 transition-colors" 
          onclick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>

      <!-- Token Selection for Swap -->
      {#if mode === 'swap'}
        <div>
          <label for="from-token-select" class="block text-xs mb-1 text-gray-600 dark:text-gray-400">From Token</label>
          <select 
            id="from-token-select"
            bind:value={selectedToken} 
            class="w-full rounded bg-zinc-100 dark:bg-zinc-800 p-2 mb-1 text-zinc-900 dark:text-white"
          >
            {#each tokens as token}
              <option value={token}>{token.symbol} ({token.qty})</option>
            {/each}
          </select>
        </div>
      {:else}
        <!-- Token selection for Send -->
        <div>
          <label for="send-token-select" class="block text-xs mb-1 text-gray-600 dark:text-gray-400">Token</label>
          <select 
            id="send-token-select"
            bind:value={selectedToken} 
            class="w-full rounded bg-zinc-100 dark:bg-zinc-800 p-2 mb-1 text-zinc-900 dark:text-white"
          >
            {#each tokens as token}
              <option value={token}>
                {token.symbol} (Balance: {token.qty})
              </option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Recipient Address -->
      <div>
        <label for="recipient-input" class="block text-xs mb-1 text-gray-600 dark:text-gray-400">
          {mode === 'send' ? 'Recipient Address' : 'To Token'}
        </label>
        <input 
          id="recipient-input"
          type="text" 
          bind:value={recipient} 
          placeholder="0x..." 
          class="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-white border {!recipient || validateAddress(recipient) ? 'border-transparent' : 'border-red-400'}"
          aria-invalid={recipient && !validateAddress(recipient)}
          aria-describedby={validationError ? "validation-error" : null}
        />
      </div>

      <!-- Amount -->
      <div>
        <label for="amount-input" class="block text-xs mb-1 text-gray-600 dark:text-gray-400">Amount</label>
        <div class="relative">
          <input 
            id="amount-input"
            type="number" 
            min="0" 
            step="any" 
            bind:value={amount} 
            placeholder="0.00" 
            class="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-white border {!amount || validateAmount(amount) ? 'border-transparent' : 'border-red-400'}"
            aria-invalid={amount && !validateAmount(amount)}
            aria-describedby={validationError ? "validation-error" : null}
          />
          <button 
            class="absolute right-2 top-2 text-xs text-blue-500 hover:text-blue-600"
            onclick={() => amount = selectedToken.qty?.toString() || '0'}
          >
            MAX
          </button>
        </div>
      </div>

      <!-- Gas Fee Selector -->
      {#if mode === 'send'}
        <GasFeeSelector 
          selectedSpeed={gasSpeed}
          {gasPrice}
          onSelect={(speed) => gasSpeed = speed}
        />
      {/if}

      <!-- Error Display -->
      {#if validationError}
        <div id="validation-error" class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
          {validationError}
        </div>
      {/if}

      {#if error.hasError}
        <div class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded" role="alert">
          {error.message}
        </div>
      {/if}

      <!-- Submit Button -->
      <button 
        class="w-full p-3 rounded-xl font-semibold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed {mode === 'send' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white"
        disabled={!recipient || !amount || sending || !canUseFeature(mode === 'send' ? 'send_tokens' : 'swap_tokens')}
        onclick={handleSubmit}
      >
        {#if sending}
          <div class="flex items-center justify-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            {mode === 'send' ? 'Sending...' : 'Swapping...'}
          </div>
        {:else if !canUseFeature(mode === 'send' ? 'send_tokens' : 'swap_tokens')}
          Upgrade to Pro
        {:else}
          {mode === 'send' ? 'Send' : 'Swap'}
        {/if}
      </button>
    </div>
  </div>
{/if}