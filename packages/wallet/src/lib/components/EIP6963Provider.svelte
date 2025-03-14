<script lang="ts">
  import { onMount } from 'svelte';
  import { eip6963Providers, selectedEIP6963Provider, requestEIP6963Providers, selectEIP6963Provider } from '$lib/stores/eip6963';
  import type { EIP6963ProviderDetail } from '$lib/plugins/providers/network/ethereum_provider/EthereumProviderTypes';

  let accounts: string[] = [];
  let chainId: string | null = null;
  let error: string | null = null;

  onMount(() => {
    // Listen for provider announcements
    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const provider = event.detail;
      eip6963Providers.update(providers => {
        // Update existing provider or add new one
        const existingIndex = providers.findIndex(p => p.info.uuid === provider.info.uuid);
        if (existingIndex >= 0) {
          providers[existingIndex] = provider;
        } else {
          providers = [...providers, provider];
        }
        return providers;
      });
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
    requestEIP6963Providers();

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
    };
  });

  async function handleSelectProvider(provider: EIP6963ProviderDetail) {
    try {
      selectEIP6963Provider(provider);
      // Request accounts when provider is selected
      accounts = await provider.provider.request({ method: 'eth_requestAccounts' }) as string[];
      chainId = await provider.provider.request({ method: 'eth_chainId' }) as string;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to connect to provider';
    }
  }
</script>

<div class="p-4 max-w-3xl mx-auto">
  <h2 class="text-2xl font-semibold mb-4">Available Wallets</h2>

  {#if $eip6963Providers.length === 0}
    <p class="text-gray-600">No wallets available. Please install a compatible wallet.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
      {#each $eip6963Providers as provider}
        <div class="flex items-center p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <img src={provider.info.icon} alt={provider.info.name} class="w-8 h-8" />
          <div class="ml-4 flex-grow">
            <h3 class="text-base font-medium">{provider.info.name}</h3>
            <p class="text-sm text-gray-500 mt-1">ID: {provider.info.uuid}</p>
          </div>
          <button
            on:click={() => handleSelectProvider(provider)}
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Select
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if $selectedEIP6963Provider}
    <div class="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 class="text-lg font-medium mb-2">Connected Provider</h3>
      <p class="text-gray-700">Name: {$selectedEIP6963Provider.info.name}</p>
      {#if accounts.length > 0}
        <p class="text-gray-700 mt-1">Accounts: {accounts.join(', ')}</p>
      {/if}
      {#if chainId}
        <p class="text-gray-700 mt-1">Chain ID: {chainId}</p>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="mt-4 p-4 bg-red-50 text-red-700 rounded">
      {error}
    </div>
  {/if}
</div>
