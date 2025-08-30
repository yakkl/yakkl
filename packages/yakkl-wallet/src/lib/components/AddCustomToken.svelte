<script lang="ts">
  import { createForm } from 'svelte-forms-lib';
  import * as yup from 'yup';
  import { onMount } from 'svelte';
  import Modal from '$lib/components/Modal.svelte';
  import { messageService } from '$lib/services/message.service';
  import { tokenStore } from '$lib/stores/token.store';
  import { chainStore } from '$lib/stores/chain.store';
  import { get } from 'svelte/store';
  import { notificationService } from '$lib/services/notification.service';
  import { Coins, AlertCircle, Info } from 'lucide-svelte';
  import type { TokenData } from '$lib/common/interfaces';
  import { VERSION } from '$lib/common/constants';
  import { BigNumber } from '$lib/common/bignumber';

  interface Props {
    show?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
  }

  let {
    show = $bindable(false),
    onSuccess = () => {},
    onCancel = () => {
      show = false;
    }
  }: Props = $props();

  let loading = $state(false);
  let autoDetecting = $state(false);
  let currentChainId = $state(1);

  onMount(() => {
    const chainState = get(chainStore);
    currentChainId = chainState.currentChain?.chainId || 1;
    updateInitialValues({
      address: '',
      name: '',
      symbol: '',
      decimals: 18,
      chainId: currentChainId
    });
  });

  const { form, errors, handleChange, handleSubmit, updateInitialValues, updateValidateField } = createForm({
    initialValues: {
      address: '',
      name: '',
      symbol: '',
      decimals: 18,
      chainId: 1
    },
    validationSchema: yup.object().shape({
      address: yup.string()
        .required('Token contract address is required')
        .matches(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
      name: yup.string().required('Token name is required'),
      symbol: yup.string().required('Token symbol is required').max(12, 'Symbol too long'),
      decimals: yup.number()
        .required('Decimals is required')
        .min(0, 'Decimals must be positive')
        .max(18, 'Decimals too large'),
      chainId: yup.number().required('Chain ID is required')
    }),
    onSubmit: async (values) => {
      await handleAddToken(values);
    }
  });

  async function autoDetectToken() {
    if (!$form.address || !$form.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return;
    }

    try {
      autoDetecting = true;

      // Call background service to fetch token details
      const response = await messageService.send({
        type: 'blockchain.getTokenDetails',
        payload: {
          address: $form.address,
          chainId: currentChainId
        }
      });

      if (response.success && response.data) {
        const tokenDetails = response.data;
        updateInitialValues({
          address: $form.address,
          name: tokenDetails.name || '',
          symbol: tokenDetails.symbol || '',
          decimals: tokenDetails.decimals || 18,
          chainId: currentChainId
        });

        notificationService.show({
          message: 'Token details detected automatically',
          type: 'success'
        });
      }
    } catch (error) {
      console.error('Error auto-detecting token:', error);
      notificationService.show({
        message: 'Could not auto-detect token details. Please enter manually.',
        type: 'warning'
      });
    } finally {
      autoDetecting = false;
    }
  }

  async function handleAddToken(values: any) {
    try {
      loading = true;

      const newToken: TokenData = {
        address: values.address,
        name: values.name,
        symbol: values.symbol.toUpperCase(),
        decimals: values.decimals,
        chainId: values.chainId,
        balance: 0n,
        quantity: new BigNumber(0),
        price: {
          price: 0,
          isNative: false,
          provider: '',
          lastUpdated: new Date(),
          chainId: values.chainId,
          currency: 'USD',
          status: 0,
          message: ''
        },
        change: [],
        value: 0,
        tags: ['custom'],
        customDefault: 'custom',
        logoURI: '',
        version: VERSION,
        sidepanel: true,
        evmCompatible: true,
        isNative: false,
        isStablecoin: false
      };

      // Add token to store
      await tokenStore.addCustomToken(newToken);

      // Fetch initial balance
      messageService.send({
        method: 'yakkl_getTokenBalance',
        params: {
          tokenAddress: values.address,
          chainId: values.chainId
        }
      }).then(response => {
        if (response.success && response.data) {
          tokenStore.updateTokenBalance(values.address, response.data.balance);
        }
      });

      notificationService.show({
        message: `${values.symbol} added successfully`,
        type: 'success'
      });

      onSuccess();
      show = false;
      resetForm();
    } catch (error) {
      console.error('Error adding token:', error);
      notificationService.show({
        message: 'Failed to add token. Please try again.',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    updateInitialValues({
      address: '',
      name: '',
      symbol: '',
      decimals: 18,
      chainId: currentChainId
    });
  }
</script>

<Modal bind:show title="Add Custom Token" onClose={onCancel}>
  <form onsubmit={handleSubmit} class="p-6 space-y-4">
    <div class="flex items-center justify-center mb-4">
      <div class="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-full">
        <Coins class="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
      </div>
    </div>

    <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-2">
      <Info class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <p class="text-sm text-blue-800 dark:text-blue-200">
        Add any ERC-20 token by entering its contract address. Token details can be auto-detected for verified contracts.
      </p>
    </div>

    <div>
      <label for="address" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Token Contract Address <span class="text-red-500">*</span>
      </label>
      <div class="flex gap-2">
        <input
          type="text"
          id="address"
          placeholder="0x..."
          class="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          bind:value={$form.address}
          onchange={handleChange}
          onblur={autoDetectToken}
        />
        <button
          type="button"
          onclick={autoDetectToken}
          disabled={autoDetecting || !$form.address}
          class="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {autoDetecting ? 'Detecting...' : 'Auto-detect'}
        </button>
      </div>
      {#if $errors.address}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.address}</p>
      {/if}
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Token Name <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          placeholder="e.g., USD Coin"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          bind:value={$form.name}
          onchange={handleChange}
          disabled={autoDetecting}
        />
        {#if $errors.name}
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.name}</p>
        {/if}
      </div>

      <div>
        <label for="symbol" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
          Token Symbol <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="symbol"
          placeholder="e.g., USDC"
          class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          bind:value={$form.symbol}
          onchange={handleChange}
          disabled={autoDetecting}
        />
        {#if $errors.symbol}
          <p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.symbol}</p>
        {/if}
      </div>
    </div>

    <div>
      <label for="decimals" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
        Token Decimals <span class="text-red-500">*</span>
      </label>
      <input
        type="number"
        id="decimals"
        min="0"
        max="18"
        placeholder="18"
        class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        bind:value={$form.decimals}
        onchange={handleChange}
        disabled={autoDetecting}
      />
      {#if $errors.decimals}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{$errors.decimals}</p>
      {/if}
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Most tokens use 18 decimals. Stablecoins like USDC often use 6.
      </p>
    </div>

    <div class="hidden">
      <input type="hidden" bind:value={$form.chainId} />
    </div>

    <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex gap-2">
      <AlertCircle class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
      <div class="text-sm text-yellow-800 dark:text-yellow-200">
        <p class="font-medium">Security Warning</p>
        <p>Only add tokens from trusted sources. Malicious tokens can appear legitimate but may be scams.</p>
      </div>
    </div>

    <div class="flex justify-end gap-3 pt-4">
      <button
        type="button"
        onclick={onCancel}
        class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Adding...' : 'Add Token'}
      </button>
    </div>
  </form>
</Modal>
