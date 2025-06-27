<script lang="ts">
  import { Plus, X, AlertCircle } from 'lucide-svelte';
  import { ethers } from 'ethers';
  import { yakklTokenDataCustomStore, setYakklTokenDataCustomStorage, updateCombinedTokenStore } from '$lib/common/stores';
  import { get } from 'svelte/store';
  import type { TokenData } from '$lib/common/interfaces';
  
  let { onClose = () => {}, onSuccess = () => {} } = $props();
  
  let tokenAddress = $state('');
  let tokenSymbol = $state('');
  let tokenName = $state('');
  let tokenDecimals = $state(18);
  let loading = $state(false);
  let error = $state('');
  let autoDetecting = $state(false);
  
  // Auto-detect token details from contract
  async function autoDetectToken() {
    if (!ethers.isAddress(tokenAddress)) {
      error = 'Invalid token address';
      return;
    }
    
    autoDetecting = true;
    error = '';
    
    try {
      // This would normally call the blockchain to get token details
      // For now, we'll use a mock implementation
      const mockTokens: Record<string, Partial<TokenData>> = {
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': {
          symbol: 'UNI',
          name: 'Uniswap',
          decimals: 18
        },
        '0x514910771AF9Ca656af840dff83E8264EcF986CA': {
          symbol: 'LINK',
          name: 'ChainLink Token',
          decimals: 18
        }
      };
      
      const mockData = mockTokens[tokenAddress];
      if (mockData) {
        tokenSymbol = mockData.symbol || '';
        tokenName = mockData.name || '';
        tokenDecimals = mockData.decimals || 18;
      } else {
        error = 'Could not auto-detect token details. Please enter manually.';
      }
    } catch (err) {
      error = 'Failed to fetch token details';
    } finally {
      autoDetecting = false;
    }
  }
  
  async function addToken() {
    // Validate inputs
    if (!ethers.isAddress(tokenAddress)) {
      error = 'Invalid token address';
      return;
    }
    
    if (!tokenSymbol || tokenSymbol.length > 11) {
      error = 'Token symbol is required (max 11 characters)';
      return;
    }
    
    if (!tokenName) {
      error = 'Token name is required';
      return;
    }
    
    if (tokenDecimals < 0 || tokenDecimals > 36) {
      error = 'Decimals must be between 0 and 36';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      // Get existing custom tokens
      const customTokens = get(yakklTokenDataCustomStore) || [];
      
      // Check if token already exists
      if (customTokens.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase())) {
        error = 'Token already exists';
        loading = false;
        return;
      }
      
      // Create new token
      const newToken: TokenData = {
        address: tokenAddress,
        name: tokenName,
        symbol: tokenSymbol,
        decimals: tokenDecimals,
        chainId: 1, // TODO: Get from current chain
        isNative: false,
        isStablecoin: false,
        logoURI: '',
        description: '',
        balance: 0n,
        quantity: 0,
        price: {
          price: 0,
          isNative: false,
          provider: '',
          lastUpdated: Date.now(),
          chainId: 1,
          currency: 'USD',
          status: '',
          message: ''
        },
        change: [],
        value: 0,
        tags: ['custom'],
        version: '1.0.0',
        customDefault: 'custom',
        sidepanel: true,
        evmCompatible: true,
        url: ''
      };
      
      // Add to custom tokens
      const updatedTokens = [...customTokens, newToken];
      await setYakklTokenDataCustomStorage(updatedTokens);
      
      // Update combined store
      updateCombinedTokenStore();
      
      onSuccess();
      onClose();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add token';
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
  <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">Add Custom Token</h2>
      <button
        onclick={onClose}
        class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <X class="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </button>
    </div>
    
    <div class="space-y-4">
      <!-- Token Address -->
      <div>
        <label for="token-address" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Token Contract Address
        </label>
        <div class="relative">
          <input
            id="token-address"
            type="text"
            bind:value={tokenAddress}
            onblur={autoDetectToken}
            placeholder="0x..."
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {#if autoDetecting}
            <div class="absolute right-3 top-2.5">
              <div class="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Token Symbol -->
      <div>
        <label for="token-symbol" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Token Symbol
        </label>
        <input
          id="token-symbol"
          type="text"
          bind:value={tokenSymbol}
          placeholder="ETH, USDC, etc."
          maxlength="11"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      <!-- Token Name -->
      <div>
        <label for="token-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Token Name
        </label>
        <input
          id="token-name"
          type="text"
          bind:value={tokenName}
          placeholder="Ethereum, USD Coin, etc."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      <!-- Token Decimals -->
      <div>
        <label for="token-decimals" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Decimals
        </label>
        <input
          id="token-decimals"
          type="number"
          bind:value={tokenDecimals}
          min="0"
          max="36"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      
      <!-- Error Message -->
      {#if error}
        <div class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      {/if}
      
      <!-- Warning -->
      <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Warning:</strong> Only add tokens you trust. Scam tokens can affect your wallet's security.
        </p>
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          onclick={onClose}
          class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onclick={addToken}
          disabled={loading || !tokenAddress || !tokenSymbol || !tokenName}
          class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if loading}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding...
          {:else}
            <Plus class="w-4 h-4" />
            Add Token
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>