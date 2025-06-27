<script lang="ts">
  import { BuyService } from '../features/payment/buy/buy.service';
  import { canUseFeature } from '../stores/plan.store';
  import { currentAccount } from '../stores/account.store';
  import { uiStore } from '../stores/ui.store';

  let {
    show = $bindable(false),
    onClose = null
  } = $props();

  const buyService = BuyService.getInstance();

  // State
  let step = $state('amount'); // 'amount' | 'payment' | 'review' | 'processing' | 'success'
  let amount = $state('100');
  let currency = $state('USD');
  let cryptoCurrency = $state('ETH');
  let selectedPaymentMethod = $state(null);
  let quote = $state(null);
  let order = $state(null);
  let loading = $state(false);
  let error = $state('');

  // Data
  let supportedCurrencies = $state(['USD', 'EUR', 'GBP', 'CAD']);
  let supportedCryptoCurrencies = $state(['ETH', 'BTC', 'USDC', 'USDT']);
  let paymentMethods = $state([]);
  let limits = $state({ min: 10, max: 1000, daily: 1000, monthly: 10000, currency: 'USD' });

  // Reactive values
  let account = $derived($currentAccount);
  let canBuy = $derived(canUseFeature('buy_crypto_card'));

  // Load initial data
  $effect(() => {
    if (show && canBuy) {
      loadInitialData();
    }
  });

  async function loadInitialData() {
    loading = true;
    try {
      const [currenciesRes, cryptosRes, paymentMethodsRes, limitsRes] = await Promise.all([
        buyService.getSupportedCurrencies(),
        buyService.getSupportedCryptoCurrencies(),
        buyService.getPaymentMethods(),
        buyService.getBuyLimits()
      ]);

      if (currenciesRes.success && currenciesRes.data) {
        supportedCurrencies = currenciesRes.data;
      }

      if (cryptosRes.success && cryptosRes.data) {
        supportedCryptoCurrencies = cryptosRes.data;
      }

      if (paymentMethodsRes.success && paymentMethodsRes.data) {
        paymentMethods = paymentMethodsRes.data;
      }

      if (limitsRes.success && limitsRes.data) {
        limits = limitsRes.data;
      }
    } catch (err) {
      error = 'Failed to load buy options';
    } finally {
      loading = false;
    }
  }

  async function getQuote() {
    if (!validateAmount()) return;

    loading = true;
    error = '';

    try {
      const response = await buyService.getBuyQuote(
        parseFloat(amount),
        currency,
        cryptoCurrency
      );

      if (response.success && response.data) {
        quote = response.data;
        step = 'payment';
      } else {
        error = response.error?.message || 'Failed to get quote';
      }
    } catch (err) {
      error = 'Failed to get quote';
    } finally {
      loading = false;
    }
  }

  async function executePurchase() {
    if (!quote || !selectedPaymentMethod) return;

    loading = true;
    error = '';

    try {
      const response = await buyService.executeBuyOrder(quote, selectedPaymentMethod.id);

      if (response.success && response.data) {
        order = response.data;
        step = 'success';
        
        // Show success notification
        uiStore.showSuccess(
          'Purchase Initiated',
          `Your order for ${quote.cryptoAmount} ${quote.cryptoCurrency} has been placed.`
        );
      } else {
        error = response.error?.message || 'Purchase failed';
      }
    } catch (err) {
      error = 'Purchase failed';
    } finally {
      loading = false;
    }
  }

  function validateAmount(): boolean {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      error = 'Please enter a valid amount';
      return false;
    }
    if (amt < limits.min) {
      error = `Minimum amount is ${limits.min} ${limits.currency}`;
      return false;
    }
    if (amt > limits.max) {
      error = `Maximum amount is ${limits.max} ${limits.currency}`;
      return false;
    }
    return true;
  }

  function closeModal() {
    step = 'amount';
    amount = '100';
    selectedPaymentMethod = null;
    quote = null;
    order = null;
    error = '';
    if (onClose) onClose();
  }

  function goToStep(newStep: string) {
    step = newStep;
    error = '';
  }

  function formatCurrency(value: number, curr: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(value);
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
    onclick={closeModal}
    onkeydown={e => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-label="Buy crypto modal">
    <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 min-w-[380px] w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto"
      onclick={e => e.stopPropagation()}
      onkeydown={e => e.stopPropagation()}>
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="text-xl">💳</span>
          <span class="font-bold text-lg">Buy Crypto</span>
        </div>
        <button 
          class="text-2xl text-gray-400 hover:text-red-500 transition-colors" 
          onclick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>

      {#if !canBuy}
        <!-- Upgrade Required -->
        <div class="text-center py-8">
          <div class="text-4xl mb-4">🔒</div>
          <h3 class="text-lg font-semibold mb-2">Pro Feature</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Buying crypto with fiat requires a Pro subscription
          </p>
          <button class="yakkl-btn-primary">
            Upgrade to Pro
          </button>
        </div>
      {:else if !account}
        <!-- No Account -->
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No account selected</p>
        </div>
      {:else}
        <!-- Step 1: Amount -->
        {#if step === 'amount'}
          <div class="space-y-4">
            <!-- Amount Input -->
            <div>
              <label for="buy-amount-input" class="block text-sm font-medium mb-2">Amount to Spend</label>
              <div class="flex gap-2">
                <input 
                  id="buy-amount-input"
                  type="number" 
                  bind:value={amount} 
                  placeholder="100" 
                  class="flex-1 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-white border {error && !validateAmount() ? 'border-red-400' : 'border-transparent'}"
                  aria-invalid={error && !validateAmount()}
                  aria-describedby="amount-limits"
                />
                <select 
                  bind:value={currency}
                  class="px-3 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-white"
                  aria-label="Select currency"
                >
                  {#each supportedCurrencies as curr}
                    <option value={curr}>{curr}</option>
                  {/each}
                </select>
              </div>
              <div id="amount-limits" class="text-xs text-gray-500 mt-1">
                Limits: {formatCurrency(limits.min)} - {formatCurrency(limits.max)}
              </div>
            </div>

            <!-- Crypto Selection -->
            <div>
              <label for="crypto-select" class="block text-sm font-medium mb-2">Cryptocurrency</label>
              <select 
                id="crypto-select"
                bind:value={cryptoCurrency}
                class="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-900 dark:text-white"
              >
                {#each supportedCryptoCurrencies as crypto}
                  <option value={crypto}>{crypto}</option>
                {/each}
              </select>
            </div>

            <!-- Continue Button -->
            <button 
              class="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
              onclick={getQuote}
              disabled={loading || !validateAmount()}
            >
              {#if loading}
                <div class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Getting Quote...
                </div>
              {:else}
                Get Quote
              {/if}
            </button>
          </div>
        {/if}

        <!-- Step 2: Payment Method -->
        {#if step === 'payment'}
          <div class="space-y-4">
            <!-- Quote Display -->
            {#if quote}
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
                <h4 class="font-semibold mb-2">Quote</h4>
                <div class="space-y-1 text-sm">
                  <div class="flex justify-between">
                    <span>Amount:</span>
                    <span>{formatCurrency(quote.amount, quote.currency)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>You'll receive:</span>
                    <span class="font-semibold">{quote.cryptoAmount.toFixed(6)} {quote.cryptoCurrency}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Rate:</span>
                    <span>{formatCurrency(quote.rate)} per {quote.cryptoCurrency}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Fees:</span>
                    <span>{formatCurrency(quote.fees.total)}</span>
                  </div>
                  <hr class="my-2" />
                  <div class="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(quote.total)}</span>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Payment Methods -->
            <div>
              <label class="block text-sm font-medium mb-2">Payment Method</label>
              {#if paymentMethods.length === 0}
                <div class="text-center py-4 text-gray-500">
                  <p class="mb-2">No payment methods found</p>
                  <button class="text-blue-500 hover:text-blue-600 text-sm">
                    Add Payment Method
                  </button>
                </div>
              {:else}
                <div class="space-y-2">
                  {#each paymentMethods as method}
                    <button 
                      class="w-full p-3 border rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors {selectedPaymentMethod?.id === method.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}"
                      onclick={() => selectedPaymentMethod = method}
                      aria-pressed={selectedPaymentMethod?.id === method.id}
                      aria-label="Select {method.name} payment method"
                    >
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="font-medium">{method.name}</div>
                          {#if method.last4}
                            <div class="text-sm text-gray-500">•••• {method.last4}</div>
                          {/if}
                        </div>
                        <div class="text-sm text-gray-500">
                          {method.type.toUpperCase()}
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button 
                class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onclick={() => goToStep('amount')}
              >
                Back
              </button>
              <button 
                class="flex-1 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                onclick={executePurchase}
                disabled={!selectedPaymentMethod || loading}
              >
                {#if loading}
                  Processing...
                {:else}
                  Buy Now
                {/if}
              </button>
            </div>
          </div>
        {/if}

        <!-- Step 3: Success -->
        {#if step === 'success'}
          <div class="text-center py-8">
            <div class="text-6xl mb-4">✅</div>
            <h3 class="text-xl font-semibold mb-2">Purchase Successful!</h3>
            {#if order}
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                Your order for {order.cryptoAmount} {order.cryptoCurrency} has been placed.
              </p>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div class="text-sm space-y-1">
                  <div><strong>Order ID:</strong> {order.id}</div>
                  <div><strong>Status:</strong> {order.status}</div>
                  <div><strong>Estimated Time:</strong> 5-10 minutes</div>
                </div>
              </div>
            {/if}
            <button 
              class="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              onclick={closeModal}
            >
              Done
            </button>
          </div>
        {/if}

        <!-- Error Display -->
        {#if error}
          <div class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        {/if}

        <!-- Info Footer -->
        {#if step === 'amount'}
          <div class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <strong>Secure Purchase:</strong><br />
            • Powered by Stripe for secure payment processing<br />
            • Crypto delivered directly to your wallet<br />
            • Industry-standard encryption and security
          </div>
        {/if}
      {/if}
    </div>
  </div>
{/if}