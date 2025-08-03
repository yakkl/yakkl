<script lang="ts">
  import { transactionStore, isLoadingTx, txError } from '../stores/transaction.store';
  import { currentAccount, accountStore } from '../stores/account.store';
  import { currentChain } from '../stores/chain.store';
  import { ethers } from 'ethers-v6';
  import { get } from 'svelte/store';
  import GasFeeSelector from './GasFeeSelector.svelte';
  import PincodeVerify from './PincodeVerify.svelte';
  import Contacts from './Contacts.svelte';
  import Modal from './Modal.svelte';
  import { uiStore } from '../stores/ui.store';
  import { notificationService } from '../services/notification.service';
  import { messagingService } from '$lib/common/messaging';
  import type { TokenDisplay } from '../types';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
  import { BigNumber } from '$lib/common/bignumber';

  let {
    show = $bindable(false),
    onClose = null,
    onSend = null,
    tokens = [],
    chain = null,
    mode = 'send', // or 'swap'
    selectedToken: preSelectedToken = null
  } = $props();

  // Tab state
  let activeTab = $state<'amount' | 'fees' | 'activity'>('amount');

  // Form state
  let recipient = $state('');
  let recipientENS = $state(''); // Resolved ENS name
  let amount = $state('');
  let hexData = $state('');
  let selectedToken = $state(preSelectedToken || tokens[0] || { symbol: 'ETH', icon: '/images/eth.svg' });
  let valueType = $state<'crypto' | 'fiat'>('crypto');
  let fiatAmount = $state('');

  // Gas state
  let gasEstimate = $state('21000');
  let estimatingGas = $state(false);
  let gasSpeed = $state<'slow' | 'normal' | 'fast'>('normal');
  let gasPrice = $state({
    slow: '10',
    standard: '20',
    fast: '30'
  });
  let customGasPrice = $state('');
  let customGasLimit = $state('');
  let gasTrend = $state<'up' | 'down' | 'flat'>('flat');

  // UI state
  let validationError = $state('');
  let showContacts = $state(false);
  let showPincode = $state(false);
  let showHexData = $state(false);
  let showZeroValueWarning = $state(false);
  let transactionHistory = $state<any[]>([]);
  let loadingHistory = $state(false);

  // Reactive values
  let sending = $derived($isLoadingTx);
  let error = $derived($txError);
  let account = $derived($currentAccount);
  let currentNetwork = $derived($currentChain);

  // Calculate total cost
  let totalCost = $derived.by(() => {
    if (!amount || !gasEstimate || !gasPrice.standard) return '0';
    try {
      const amountWei = ethers.parseEther(amount || '0');
      const gasWei = BigInt(gasEstimate) * ethers.parseUnits(gasPrice[gasSpeed] || gasPrice.standard, 'gwei');
      const total = amountWei + gasWei;
      return ethers.formatEther(total);
    } catch {
      return '0';
    }
  });

  // ENS Resolution
  $effect(() => {
    if (recipient && recipient.endsWith('.eth')) {
      resolveENS(recipient);
    } else {
      recipientENS = '';
    }
  });

  async function resolveENS(ensName: string) {
    try {
      const response = await messagingService.sendMessage('resolveENS', { name: ensName });
      if (response.success && response.data) {
        recipientENS = response.data;
      }
    } catch (error) {
      console.error('ENS resolution failed:', error);
    }
  }

  // Load transaction history when activity tab is active
  $effect(() => {
    if (activeTab === 'activity' && account?.address) {
      loadTransactionHistory();
    }
  });

  async function loadTransactionHistory() {
    loadingHistory = true;
    try {
      const response = await messagingService.sendMessage('getTransactionHistory', {
        address: account?.address,
        limit: 10
      });
      if (response.success && response.data) {
        transactionHistory = response.data;
      }
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    } finally {
      loadingHistory = false;
    }
  }

  // Validate address format
  function validateAddress(address: string): boolean {
    if (!address || typeof address !== 'string') return false;
    try {
      return ethers.isAddress(address) || address.endsWith('.eth');
    } catch {
      return false;
    }
  }

  // Validate amount
  function validateAmount(): boolean {
    if (!amount || parseFloat(amount) < 0) {
      validationError = 'Please enter a valid amount';
      return false;
    }

    const balance = parseFloat(selectedToken.balance || '0');
    if (parseFloat(amount) > balance) {
      validationError = 'Insufficient balance';
      return false;
    }

    // Check for zero value transaction
    if (parseFloat(amount) === 0 && !showZeroValueWarning) {
      showZeroValueWarning = true;
      return false;
    }

    return true;
  }

  // Estimate gas
  async function estimateGas() {
    estimatingGas = true;
    try {
      const isETH = selectedToken.symbol === 'ETH';
      const to = recipientENS || recipient;

      const response = await transactionStore.estimateGas(
        to,
        amount,
        isETH ? undefined : selectedToken.address
      );

      if (response.success && response.data) {
        // response.data is the gas estimate as a string
        gasEstimate = response.data;
      }
    } catch (error) {
      console.error('Gas estimation failed:', error);
    } finally {
      estimatingGas = false;
    }
  }

  // Handle contact selection
  function handleContactSelect(contact: any) {
    recipient = contact.address;
    showContacts = false;
    if (activeTab === 'amount') {
      estimateGas();
    }
  }

  // Handle PIN verification success
  async function handlePinSuccess() {
    showPincode = false;
    await executeTransaction();
  }

  // Execute transaction
  async function executeTransaction() {
    try {
      const to = recipientENS || recipient;
      const value = amount;

      // Prepare transaction
      const tx = {
        to,
        value: ethers.parseEther(value),
        data: hexData || '0x',
        gasLimit: customGasLimit || gasEstimate,
        maxFeePerGas: customGasPrice ? ethers.parseUnits(customGasPrice, 'gwei') : undefined,
        maxPriorityFeePerGas: gasPrice[gasSpeed] ? ethers.parseUnits(gasPrice[gasSpeed], 'gwei') : undefined
      };

      // For ERC20 tokens
      if (selectedToken.symbol !== 'ETH' && selectedToken.address) {
        // Create transfer data
        const transferData = ethers.hexlify(
          ethers.concat([
            '0xa9059cbb', // transfer(address,uint256) method ID
            ethers.zeroPadValue(to, 32),
            ethers.zeroPadValue(ethers.toBeHex(ethers.parseUnits(value, selectedToken.decimals || 18), 32), 32)
          ])
        );

        tx.to = selectedToken.address;
        tx.value = 0n;
        tx.data = transferData;
      }

      // Send transaction
      const response = await transactionStore.sendTransaction(
        to,
        value,
        selectedToken.symbol !== 'ETH' ? selectedToken.address : undefined
      );

      // The store returns the tx hash directly on success or throws on error
      if (response) {
        // Show success notification
        notificationService.show({
          title: 'Transaction Sent',
          message: `Transaction hash: ${response}`,
          type: 'success'
        });

        // Call parent handler
        if (onSend) {
          onSend({ hash: response });
        }

        // Close modal
        show = false;

        // Reset form
        resetForm();
      }
    } catch (error: any) {
      validationError = error.message || 'Transaction failed';
      console.error('Transaction error:', error);
    }
  }

  // Form submission
  async function handleSubmit() {
    validationError = '';

    // Validate recipient
    if (!validateAddress(recipient)) {
      validationError = 'Please enter a valid address';
      return;
    }

    // Validate amount
    if (!validateAmount()) {
      return;
    }

    // Show PIN verification
    showPincode = true;
  }

  // Reset form
  function resetForm() {
    recipient = '';
    recipientENS = '';
    amount = '';
    hexData = '';
    activeTab = 'amount';
    showZeroValueWarning = false;
    validationError = '';
  }

  // Format currency
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }

  // Toggle value type
  function toggleValueType() {
    valueType = valueType === 'crypto' ? 'fiat' : 'crypto';
    // Convert between crypto and fiat
    if (valueType === 'fiat' && amount) {
      const price = selectedToken.price || 0;
      // Use BigNumber for precise calculation
      const amountBN = new BigNumber(amount);
      const valueBN = amountBN.mulByPrice(price, selectedToken.decimals || 18);
      fiatAmount = BigNumber.fromWei(valueBN.toBigInt(0), 18);
    } else if (valueType === 'crypto' && fiatAmount) {
      const price = selectedToken.price || 1;
      amount = (parseFloat(fiatAmount) / price).toFixed(6);
    }
  }

  // Update selected token when tokens change
  $effect(() => {
    if (preSelectedToken) {
      selectedToken = preSelectedToken;
    } else if (tokens.length > 0 && !selectedToken) {
      selectedToken = tokens[0];
    }
  });

  // Auto-estimate gas when inputs change
  $effect(() => {
    if (recipient && amount && validateAddress(recipient)) {
      const debounceTimer = setTimeout(() => {
        estimateGas();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  });
</script>

<Modal bind:show title={mode === 'send' ? 'Send Tokens' : 'Swap Tokens'} onClose={() => {
  show = false;
  resetForm();
  if (onClose) onClose();
}}>
  <!-- Tabs -->
  <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
    <button
      class="px-4 py-2 text-sm font-medium {activeTab === 'amount' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'amount'}
    >
      Amount
    </button>
    <button
      class="px-4 py-2 text-sm font-medium {activeTab === 'fees' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'fees'}
    >
      Fees
    </button>
    <button
      class="px-4 py-2 text-sm font-medium {activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}"
      onclick={() => activeTab = 'activity'}
    >
      Activity
    </button>
  </div>

  <!-- Tab Content -->
  {#if activeTab === 'amount'}
    <div class="space-y-4">
      <!-- Token Selection -->
      <div>
        <label for="token-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token</label>
        <select
          id="token-select"
          bind:value={selectedToken}
          class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
        >
          {#each tokens as token}
            <option value={token}>
              {token.symbol} - Balance: {token.balance || '0'}
            </option>
          {/each}
        </select>
      </div>

      <!-- Recipient Address -->
      <div>
        <label for="recipient-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Recipient Address
        </label>
        <div class="relative">
          <input
            id="recipient-input"
            type="text"
            bind:value={recipient}
            placeholder="0x... or ENS name"
            class="w-full p-3 pr-10 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
          />
          <button
            aria-label="Select from contacts"
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
            onclick={() => showContacts = true}
            title="Select from contacts"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
        {#if recipientENS}
          <p class="mt-1 text-sm text-green-600">Resolved to: {recipientENS}</p>
        {/if}
      </div>

      <!-- Amount -->
      <div>
        <label for="amount-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Amount
        </label>
        <div class="relative">
          <input
            id="amount-input"
            type="number"
            value={valueType === 'crypto' ? amount : fiatAmount}
            oninput={(e) => {
              const target = e.target as HTMLInputElement;
              const value = target.value;
              if (valueType === 'crypto') {
                amount = value;
              } else {
                fiatAmount = value;
              }
            }}
            placeholder={valueType === 'crypto' ? '0.0' : '$0.00'}
            step="any"
            class="w-full p-3 pr-24 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
          />
          <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded"
              onclick={() => {
                const balance = selectedToken.balance || '0';
                amount = balance;
                if (valueType === 'fiat') {
                  // Use BigNumber for precise calculation
                  const balanceBN = new BigNumber(balance);
                  const valueBN = balanceBN.mulByPrice(selectedToken.price || 0, selectedToken.decimals || 18);
                  fiatAmount = BigNumber.fromWei(valueBN.toBigInt(0), 18);
                }
              }}
            >
              MAX
            </button>
            <button
              class="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded"
              onclick={toggleValueType}
            >
              {valueType === 'crypto' ? 'USD' : selectedToken.symbol}
            </button>
          </div>
        </div>
        {#if valueType === 'crypto' && amount && selectedToken.price}
          <p class="mt-1 text-sm text-gray-500">≈ {formatCurrency(new BigNumber(amount).mulByPrice(selectedToken.price, selectedToken.decimals || 18).toNumber())}</p>
        {:else if valueType === 'fiat' && fiatAmount && selectedToken.price}
          <p class="mt-1 text-sm text-gray-500">≈ {(new BigNumber(fiatAmount).toNumber() / selectedToken.price).toFixed(6)} {selectedToken.symbol}</p>
        {/if}
      </div>

      <!-- Advanced Options -->
      <details class="border-t pt-4">
        <summary class="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
          Advanced Options
        </summary>
        <div class="mt-4 space-y-4">
          <!-- Hex Data -->
          <div>
            <label for="hex-data-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hex Data (Optional)
            </label>
            <textarea
              id="hex-data-input"
              bind:value={hexData}
              placeholder="0x..."
              rows="2"
              class="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-mono text-sm"
            ></textarea>
          </div>
        </div>
      </details>

      <!-- Zero Value Warning -->
      {#if showZeroValueWarning}
        <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ You're about to send a 0 value transaction. This is valid but will still cost gas fees.
            This is often used to cancel pending transactions.
          </p>
          <div class="mt-2 flex gap-2">
            <button
              class="text-sm px-3 py-1 bg-yellow-600 text-white rounded"
              onclick={() => {
                showZeroValueWarning = false;
                handleSubmit();
              }}
            >
              Continue
            </button>
            <button
              class="text-sm px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded"
              onclick={() => showZeroValueWarning = false}
            >
              Cancel
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else if activeTab === 'fees'}
    <div class="space-y-4">
      <GasFeeSelector
        selectedOption={gasSpeed}
        bind:customGasPrice
        bind:customGasLimit
        showCustom={true}
        onSelect={(option) => {
          gasSpeed = option.speed;
          gasPrice[option.speed] = option.gasPrice;
        }}
      />

      <!-- Gas Trend Indicator -->
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <span class="text-sm font-medium">Gas Trend</span>
        <div class="flex items-center gap-2">
          {#if gasTrend === 'up'}
            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l9.293-9.293m0 0v7.586m0-7.586h-7.586" />
            </svg>
            <span class="text-sm text-red-500">Rising</span>
          {:else if gasTrend === 'down'}
            <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7l-9.293 9.293m0 0h7.586m-7.586 0V8.707" />
            </svg>
            <span class="text-sm text-green-500">Falling</span>
          {:else}
            <svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14" />
            </svg>
            <span class="text-sm text-yellow-500">Stable</span>
          {/if}
        </div>
      </div>

      <!-- Total Cost Summary -->
      <div class="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
        <h4 class="font-medium mb-2">Transaction Summary</h4>
        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span>Amount:</span>
            <span>{amount || '0'} {selectedToken.symbol}</span>
          </div>
          <div class="flex justify-between">
            <span>Estimated Gas:</span>
            <span>{gasEstimate} units</span>
          </div>
          <div class="flex justify-between">
            <span>Gas Price:</span>
            <span>{gasPrice[gasSpeed]} Gwei</span>
          </div>
          <hr class="my-2 border-gray-300 dark:border-gray-600" />
          <div class="flex justify-between font-medium">
            <span>Total Cost:</span>
            <span>{totalCost} ETH</span>
          </div>
        </div>
      </div>
    </div>
  {:else if activeTab === 'activity'}
    <div class="space-y-4">
      {#if loadingHistory}
        <div class="flex justify-center py-8">
          <div class="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {:else if transactionHistory.length > 0}
        <div class="space-y-2">
          {#each transactionHistory as tx}
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex justify-between items-start">
                <div>
                  <p class="text-sm font-medium">{tx.type === 'send' ? 'Sent' : 'Received'}</p>
                  <p class="text-xs text-gray-500">{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</p>
                  <p class="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium">{tx.value} {tx.symbol}</p>
                  <a
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs text-indigo-600 hover:underline"
                  >
                    View on Explorer
                  </a>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-center py-8 text-gray-500">No recent transactions</p>
      {/if}
    </div>
  {/if}

  <!-- Error Display -->
  {#if validationError}
    <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <p class="text-sm text-red-800 dark:text-red-200">{validationError}</p>
    </div>
  {/if}

  <!-- Action Buttons -->
  <div class="flex gap-3 mt-6">
    <button
      class="flex-1 p-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      onclick={() => {
        show = false;
        resetForm();
        if (onClose) onClose();
      }}
    >
      Cancel
    </button>
    <button
      class="flex-1 p-3 rounded-xl font-semibold shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed {mode === 'send' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} text-white"
      disabled={!recipient || !amount || sending}
      onclick={handleSubmit}
    >
      {#if sending}
        <div class="flex items-center justify-center gap-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {mode === 'send' ? 'Sending...' : 'Swapping...'}
        </div>
      {:else}
        {mode === 'send' ? 'Send' : 'Swap'}
      {/if}
    </button>
  </div>
</Modal>

<!-- Contacts Modal -->
{#if showContacts}
  <!-- TODO: Implement contacts modal -->
  <Modal show={showContacts} title="Select Contact" onClose={() => showContacts = false}>
    <p class="text-center py-8 text-gray-500">Contacts feature coming soon</p>
  </Modal>
{/if}

<!-- PIN Verification Modal -->
{#if showPincode}
  <PincodeVerify
    show={showPincode}
    onVerified={handlePinSuccess}
    onRejected={() => showPincode = false}
  />
{/if}

<style>
  /* Custom styles for the modal */
  details summary::-webkit-details-marker {
    display: none;
  }

  details[open] summary::after {
    transform: rotate(180deg);
  }

  details summary::after {
    content: '▼';
    display: inline-block;
    margin-left: 0.5rem;
    transition: transform 0.2s;
  }
</style>
