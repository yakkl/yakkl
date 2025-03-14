import { get, writable } from 'svelte/store';
import type { EIP6963ProviderDetail } from '$lib/plugins/providers/network/ethereum_provider/EthereumProviderTypes';

// Store for available EIP-6963 providers
export const eip6963Providers = writable<EIP6963ProviderDetail[]>([]);

// Store for the currently selected provider
export const selectedEIP6963Provider = writable<EIP6963ProviderDetail | null>(null);

// Function to request providers
export function requestEIP6963Providers() {
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

// Function to select a provider
export function selectEIP6963Provider(provider: EIP6963ProviderDetail) {
  selectedEIP6963Provider.set(provider);
}

// Function to get accounts from the selected provider
export async function getEIP6963Accounts() {
  const provider = get(selectedEIP6963Provider);
  if (!provider) {
    throw new Error('No provider selected');
  }
  return await provider.provider.request({ method: 'eth_accounts' });
}

// Function to get chain ID from the selected provider
export async function getEIP6963ChainId() {
  const provider = get(selectedEIP6963Provider);
  if (!provider) {
    throw new Error('No provider selected');
  }
  return await provider.provider.request({ method: 'eth_chainId' });
}

// Function to request accounts from the selected provider
export async function requestEIP6963Accounts() {
  const provider = get(selectedEIP6963Provider);
  if (!provider) {
    throw new Error('No provider selected');
  }
  return await provider.provider.request({ method: 'eth_requestAccounts' });
}
