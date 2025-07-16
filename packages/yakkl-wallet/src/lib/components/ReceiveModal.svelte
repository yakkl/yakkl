<script lang="ts">
  import { ReceiveService } from '../features/basic/receive/receive.service';
  import { currentAccount } from '../stores/account.store';
  import { currentChain } from '../stores/chain.store';

  let {
    show = $bindable(false),
    onClose = null
  } = $props();

  const receiveService = ReceiveService.getInstance();

  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let amount = $state('');
  let message = $state('');
  let selectedToken = $state('ETH');
  let paymentRequest = $state(null);
  let loading = $state(false);
  let error = $state('');
  let copied = $state(false);

  // Available tokens for receive
  const tokens = ['ETH', 'USDC', 'USDT', 'DAI'];

  async function generateRequest() {
    if (!account) return;

    loading = true;
    error = '';

    try {
      const response = await receiveService.generatePaymentRequest(
        amount || undefined,
        selectedToken === 'ETH' ? undefined : selectedToken,
        message || undefined
      );

      if (response.success && response.data) {
        paymentRequest = response.data;
      } else {
        error = response.error?.message || 'Failed to generate payment request';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      loading = false;
    }
  }

  async function copyAddress() {
    try {
      const response = await receiveService.copyAddressToClipboard();
      if (response.success) {
        copied = true;
        setTimeout(() => copied = false, 2000);
      }
    } catch (err) {
      error = 'Failed to copy address';
    }
  }

  async function shareRequest() {
    if (!paymentRequest) return;

    try {
      await receiveService.sharePaymentRequest(paymentRequest);
    } catch (err) {
      error = 'Failed to share payment request';
    }
  }

  function closeModal() {
    amount = '';
    message = '';
    selectedToken = 'ETH';
    paymentRequest = null;
    error = '';
    copied = false;
    if (onClose) onClose();
  }

  function formatAddress(addr: string): string {
    const formats = receiveService.getAddressDisplayFormats(addr);
    return formats.middle;
  }

  // Generate basic request on mount
  $effect(() => {
    if (show && account && !paymentRequest) {
      generateRequest();
    }
  });
</script>

{#if show}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in"
    onclick={closeModal}
    onkeydown={e => e.key === 'Escape' && closeModal()}
    role="button"
    tabindex="0">
    <div class="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 min-w-[320px] w-full max-w-md flex flex-col gap-4 animate-in slide-in-from-bottom-10"
      onclick={e => e.stopPropagation()}
      onkeydown={e => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      tabindex="0">

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
          <span class="font-bold text-lg">Receive Crypto</span>
        </div>
        <button
          class="text-2xl text-gray-400 hover:text-red-500 transition-colors"
          onclick={closeModal}
          aria-label="Close modal"
        >
          ×
        </button>
      </div>

      {#if account}
        <!-- Address Display -->
        <div class="text-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Address</div>
          <div class="font-mono text-sm bg-white dark:bg-zinc-700 p-3 rounded-lg border">
            {formatAddress(account.address)}
          </div>
          <button
            class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            onclick={copyAddress}
          >
            {copied ? '✓ Copied!' : 'Copy Address'}
          </button>
        </div>

        <!-- Optional Amount -->
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">
            Amount (Optional)
          </label>
          <div class="flex gap-2">
            <input
              type="number"
              bind:value={amount}
              placeholder="0.00"
              class="flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-white"
            />
            <select
              bind:value={selectedToken}
              class="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-white"
            >
              {#each tokens as token}
                <option value={token}>{token}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Optional Message -->
        <div>
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">
            Message (Optional)
          </label>
          <input
            type="text"
            bind:value={message}
            placeholder="Payment for..."
            class="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-900 dark:text-white"
          />
        </div>

        <!-- Generate Request Button -->
        <button
          class="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60"
          onclick={generateRequest}
          disabled={loading}
        >
          {#if loading}
            <div class="flex items-center justify-center gap-2">
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </div>
          {:else}
            Update Payment Request
          {/if}
        </button>

        <!-- Payment Request Display -->
        {#if paymentRequest}
          <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
            <div class="text-sm font-semibold mb-2 text-blue-800 dark:text-blue-200">
              Payment Request Generated
            </div>

            <!-- QR Code Placeholder -->
            <div class="w-32 h-32 mx-auto mb-3 bg-white rounded-lg border-2 border-blue-200 flex items-center justify-center">
              <div class="text-xs text-gray-500 text-center">
                QR Code<br />
                <span class="text-xs">(Implementation needed)</span>
              </div>
            </div>

            <!-- Request Details -->
            {#if paymentRequest.amount}
              <div class="text-center mb-2">
                <span class="font-bold text-lg">{paymentRequest.amount} {paymentRequest.token || 'ETH'}</span>
              </div>
            {/if}

            {#if paymentRequest.message}
              <div class="text-center text-sm text-gray-600 dark:text-gray-400 mb-3">
                "{paymentRequest.message}"
              </div>
            {/if}

            <!-- Share Button -->
            <button
              class="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              onclick={shareRequest}
            >
              Share Payment Request
            </button>
          </div>
        {/if}

        <!-- Error Display -->
        {#if error}
          <div class="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
            {error}
          </div>
        {/if}

        <!-- Instructions -->
        <div class="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <strong>How to receive:</strong><br />
          • Share your address or QR code with the sender<br />
          • Or send them the payment request link<br />
          • Funds will appear in your wallet once confirmed
        </div>
      {:else}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>No account selected</p>
        </div>
      {/if}
    </div>
  </div>
{/if}
