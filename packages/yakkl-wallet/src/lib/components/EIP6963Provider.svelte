<script lang="ts">
  import { onMount } from 'svelte';
  import { eip6963Providers, selectedEIP6963Provider, requestEIP6963Providers, selectEIP6963Provider } from '$lib/stores/eip6963';
  import type { EIP6963ProviderDetail } from '$lib/plugins/providers/network/ethereum_provider/eip-types';
  import { log } from '$lib/plugins/Logger';

  let accounts: string[] = [];
  let chainId: string | null = null;
  let networkVersion: string | null = null;
  let error: string | null = null;

  // Helper function to format chainId for display
  function formatChainId(chainIdHex: string): string {
    try {
      // If it's already a decimal string, return as is
      if (!chainIdHex.startsWith('0x')) return chainIdHex;

      // Convert hex to decimal
      const decimal = parseInt(chainIdHex, 16);
      return `${chainIdHex} (${decimal})`;
    } catch (e) {
      log.error('Error formatting chainId', true, e);
      return chainIdHex;
    }
  }

  async function updateProviderState(provider: EIP6963ProviderDetail) {
    try {
      // Get initial state
      const [initialAccounts, initialChainId, initialNetVersion] = await Promise.all([
        provider.provider.request({ method: 'eth_accounts' }),
        provider.provider.request({ method: 'eth_chainId' }),
        provider.provider.request({ method: 'net_version' })
      ]);

      log.debug('Initial provider state', true, {
        accounts: initialAccounts,
        chainId: initialChainId,
        networkVersion: initialNetVersion
      });

      accounts = initialAccounts as string[];
      chainId = initialChainId as string;
      networkVersion = initialNetVersion as string;
    } catch (e) {
      log.error('Error getting initial provider state', true, e);
    }
  }

  async function handleSelectProvider(provider: EIP6963ProviderDetail) {
    try {
      log.debug('Selecting provider', true, { provider: provider.info.name });
      selectEIP6963Provider(provider);

      // Update initial state
      await updateProviderState(provider);

      // Request accounts (this will trigger permission request)
      try {
        const requestedAccounts = await provider.provider.request({
          method: 'eth_requestAccounts'
        }) as string[];
        log.debug('Requested accounts received', true, { accounts: requestedAccounts });
        accounts = requestedAccounts;
      } catch (e) {
        log.error('Error requesting accounts', true, e);
        // Don't throw here - we still want to show the read-only state
      }

      // Listen for chain changes
      provider.provider.on('chainChanged', (newChainId: string) => {
        log.debug('Chain changed', true, { newChainId });
        chainId = newChainId;
      });

      // Listen for account changes
      provider.provider.on('accountsChanged', (newAccounts: string[]) => {
        log.debug('Accounts changed', true, { newAccounts });
        accounts = newAccounts;
      });

    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to connect to provider';
      log.error('Error selecting provider', true, e);
    }
  }

  onMount(() => {
    // Listen for provider announcements
    const handleAnnounce = (event: CustomEvent<EIP6963ProviderDetail>) => {
      const provider = event.detail;
      log.debug('Provider announced', true, { provider: provider.info.name });
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

      // If this is the selected provider, update its state
      if ($selectedEIP6963Provider?.info.uuid === provider.info.uuid) {
        updateProviderState(provider);
      }
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
    requestEIP6963Providers();

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce as EventListener);
    };
  });
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
        <p class="text-gray-700 mt-1">Chain ID: {formatChainId(chainId)}</p>
      {/if}
      {#if networkVersion}
        <p class="text-gray-700 mt-1">Network Version: {networkVersion}</p>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="mt-4 p-4 bg-red-50 text-red-700 rounded">
      {error}
    </div>
  {/if}
</div>
