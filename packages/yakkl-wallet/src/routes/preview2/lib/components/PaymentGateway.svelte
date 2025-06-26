<script lang="ts">
  import { CryptoPaymentService } from '../features/payment/crypto-payment/crypto-payment.service';
  import { currentAccount } from '../stores/account.store';
  import { currentChain } from '../stores/chain.store';
  import { canUseFeature } from '../stores/plan.store';
  import { uiStore } from '../stores/ui.store';

  let {
    paymentRequestId = '',
    merchantId = '',
    onPaymentComplete = null,
    onPaymentFailed = null,
    onCancel = null,
    embedded = false
  } = $props();

  const cryptoPaymentService = CryptoPaymentService.getInstance();

  // State
  let step = $state('loading'); // 'loading' | 'review' | 'processing' | 'success' | 'failed'
  let paymentRequest = $state(null);
  let merchantInfo = $state(null);
  let paymentInvoice = $state(null);
  let payment = $state(null);
  let gasEstimate = $state('');
  let loading = $state(false);
  let error = $state('');
  let countdown = $state(0);

  // Reactive values
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let canPay = $derived(canUseFeature('crypto_payment'));

  // Initialize payment data
  $effect(() => {
    if (paymentRequestId) {
      loadPaymentData();
    }
  });

  // Countdown timer for payment expiration
  let countdownInterval;
  $effect(() => {
    if (paymentRequest && paymentRequest.expiresAt > Date.now()) {
      countdownInterval = setInterval(() => {
        const remaining = Math.max(0, paymentRequest.expiresAt - Date.now());
        countdown = Math.floor(remaining / 1000);
        
        if (remaining <= 0) {
          error = 'Payment request has expired';
          step = 'failed';
          clearInterval(countdownInterval);
        }
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  async function loadPaymentData() {
    loading = true;
    error = '';

    try {
      // Validate payment request
      const validationResponse = await cryptoPaymentService.validatePaymentRequest(paymentRequestId);
      if (!validationResponse.success) {
        error = 'Invalid or expired payment request';
        step = 'failed';
        return;
      }

      // Generate payment invoice
      const invoiceResponse = await cryptoPaymentService.generatePaymentInvoice(paymentRequestId);
      if (!invoiceResponse.success || !invoiceResponse.data) {
        error = 'Failed to generate payment invoice';
        step = 'failed';
        return;
      }

      paymentInvoice = invoiceResponse.data;
      paymentRequest = paymentInvoice.paymentRequest;
      merchantInfo = paymentInvoice.merchantInfo;

      // Estimate gas if user has account
      if (account) {
        const gasResponse = await cryptoPaymentService.estimatePaymentGas(paymentRequestId, account.address);
        if (gasResponse.success && gasResponse.data) {
          gasEstimate = gasResponse.data;
        }
      }

      step = 'review';
    } catch (err) {
      error = 'Failed to load payment data';
      step = 'failed';
    } finally {
      loading = false;
    }
  }

  async function executePayment() {
    if (!paymentRequest || !account) return;

    loading = true;
    error = '';
    step = 'processing';

    try {
      const response = await cryptoPaymentService.executePayment(paymentRequestId);

      if (response.success && response.data) {
        payment = response.data;
        step = 'success';
        
        // Show success notification
        uiStore.showTransactionPending(payment.txHash || '');
        
        // Call success callback
        if (onPaymentComplete) {
          onPaymentComplete(payment);
        }
      } else {
        error = response.error?.message || 'Payment failed';
        step = 'failed';
        
        if (onPaymentFailed) {
          onPaymentFailed(error);
        }
      }
    } catch (err) {
      error = 'Payment execution failed';
      step = 'failed';
      
      if (onPaymentFailed) {
        onPaymentFailed(error);
      }
    } finally {
      loading = false;
    }
  }

  function cancelPayment() {
    if (onCancel) {
      onCancel();
    }
  }

  function formatCountdown(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatAmount(amount: string, currency: string): string {
    return cryptoPaymentService.formatPaymentAmount(amount, currency);
  }

  function getTrustScoreColor(score: number): string {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getTrustScoreLabel(score: number): string {
    if (score >= 0.9) return 'Highly Trusted';
    if (score >= 0.7) return 'Trusted';
    return 'Caution Required';
  }
</script>

<div class="w-full max-w-md mx-auto {embedded ? '' : 'min-h-screen flex items-center justify-center p-4'}">
  <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden {embedded ? '' : 'w-full'}">
    
    <!-- Loading State -->
    {#if step === 'loading'}
      <div class="p-8 text-center">
        <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Loading payment details...</p>
      </div>
    {/if}

    <!-- Payment Review -->
    {#if step === 'review'}
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="text-center">
          <h2 class="text-xl font-bold mb-2">Payment Request</h2>
          <p class="text-gray-600 dark:text-gray-400">Review the details below</p>
        </div>

        <!-- Merchant Info -->
        {#if merchantInfo}
          <div class="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold">Merchant</h3>
              {#if merchantInfo.verified}
                <span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded-full flex items-center gap-1">
                  ✓ Verified
                </span>
              {/if}
            </div>
            
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Name:</span>
                <span class="font-medium">{merchantInfo.name}</span>
              </div>
              
              {#if merchantInfo.website}
                <div class="flex justify-between">
                  <span>Website:</span>
                  <a href={merchantInfo.website} target="_blank" class="text-blue-500 hover:text-blue-600">
                    {merchantInfo.website}
                  </a>
                </div>
              {/if}
              
              <div class="flex justify-between">
                <span>Trust Score:</span>
                <span class="{getTrustScoreColor(merchantInfo.trustScore)}">
                  {(merchantInfo.trustScore * 100).toFixed(0)}% ({getTrustScoreLabel(merchantInfo.trustScore)})
                </span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Payment Details -->
        {#if paymentRequest}
          <div class="border rounded-lg p-4">
            <h3 class="font-semibold mb-3">Payment Details</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Description:</span>
                <span class="font-medium text-right">{paymentRequest.description}</span>
              </div>
              
              <div class="flex justify-between">
                <span>Amount:</span>
                <span class="font-bold text-lg">{formatAmount(paymentRequest.amount, paymentRequest.currency)}</span>
              </div>
              
              <div class="flex justify-between">
                <span>Network Fee:</span>
                <span>{paymentInvoice?.networkFee || 'Calculating...'} ETH</span>
              </div>
              
              {#if countdown > 0}
                <div class="flex justify-between">
                  <span>Expires in:</span>
                  <span class="font-mono {countdown < 300 ? 'text-red-500' : 'text-gray-600'}">{formatCountdown(countdown)}</span>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- User Account Info -->
        {#if account}
          <div class="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <h3 class="font-semibold mb-2">Payment From</h3>
            <div class="text-sm">
              <div class="font-mono">{account.address.slice(0, 6)}...{account.address.slice(-4)}</div>
              {#if chain}
                <div class="text-gray-600 dark:text-gray-400">Network: {chain.name}</div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
            <p class="text-red-600 dark:text-red-400 text-sm">
              Please connect your wallet to continue with the payment.
            </p>
          </div>
        {/if}

        <!-- Action Buttons -->
        <div class="space-y-3">
          {#if account && canPay}
            <button 
              class="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
              onclick={executePayment}
              disabled={loading || countdown <= 0}
            >
              {#if loading}
                <div class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </div>
              {:else}
                Pay {formatAmount(paymentRequest?.amount || '0', paymentRequest?.currency || 'ETH')}
              {/if}
            </button>
          {:else if !canPay}
            <div class="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 mb-2">Crypto payments require a Pro subscription</p>
              <button class="text-blue-500 hover:text-blue-600 text-sm">
                Upgrade to Pro
              </button>
            </div>
          {/if}
          
          <button 
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onclick={cancelPayment}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Processing State -->
    {#if step === 'processing'}
      <div class="p-8 text-center">
        <div class="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h3 class="text-lg font-semibold mb-2">Processing Payment</h3>
        <p class="text-gray-600 dark:text-gray-400">
          Please wait while we process your transaction...
        </p>
      </div>
    {/if}

    <!-- Success State -->
    {#if step === 'success'}
      <div class="p-8 text-center">
        <div class="text-6xl mb-4">✅</div>
        <h3 class="text-xl font-semibold mb-2">Payment Successful!</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          Your payment has been sent and is being confirmed on the blockchain.
        </p>
        
        {#if payment}
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 text-sm">
            <div class="space-y-1">
              <div><strong>Payment ID:</strong> {payment.id}</div>
              <div><strong>Amount:</strong> {formatAmount(payment.amount, payment.currency)}</div>
              {#if payment.txHash}
                <div><strong>Transaction:</strong> 
                  <button 
                    class="text-blue-500 hover:text-blue-600 break-all"
                    onclick={() => window.open(`https://etherscan.io/tx/${payment.txHash}`, '_blank')}
                  >
                    {payment.txHash.slice(0, 10)}...
                  </button>
                </div>
              {/if}
            </div>
          </div>
        {/if}
        
        <button 
          class="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          onclick={() => window.close()}
        >
          Close
        </button>
      </div>
    {/if}

    <!-- Failed State -->
    {#if step === 'failed'}
      <div class="p-8 text-center">
        <div class="text-6xl mb-4">❌</div>
        <h3 class="text-xl font-semibold mb-2">Payment Failed</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          {error || 'The payment could not be processed.'}
        </p>
        
        <div class="space-y-3">
          <button 
            class="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            onclick={() => { step = 'review'; error = ''; }}
          >
            Try Again
          </button>
          
          <button 
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onclick={cancelPayment}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Error Display -->
    {#if error && step !== 'failed'}
      <div class="mx-6 mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
        {error}
      </div>
    {/if}
  </div>
</div>