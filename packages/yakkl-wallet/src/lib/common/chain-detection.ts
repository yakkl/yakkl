// File: src/lib/utils/chain-detection.ts
// Complete chain detection utilities for YAKKL wallet

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { resolveChainForAddress, saveChainSelection, type ChainResolutionResult } from './chain-resolver';
import { detectBlockchainAddress } from './address-detector';

// Re-export types from the main modules
export type {
	ChainConfig,
	ChainActivity,
	ChainResolutionResult
} from './chain-resolver';

// Import the core functions
export {
	resolveChainForAddress,
	saveChainSelection,
} from './chain-resolver';

// Svelte stores for reactive chain management
export const currentChain: Writable<string | null> = writable(null);
export const recentAddresses: Writable<Map<string, string>> = writable(new Map());
export const chainResolutionCache: Writable<Map<string, ChainResolutionResult>> = writable(
	new Map()
);

// Enhanced chain detection with caching
export async function detectAndResolveChain(
	address: string,
	options: {
		useCache?: boolean;
		quickMode?: boolean;
		forceRefresh?: boolean;
	} = {}
): Promise<ChainResolutionResult | null> {
	// Check cache first
	if (options.useCache && !options.forceRefresh) {
		const cache = get(chainResolutionCache);
		const cached = cache.get(address);
		if (cached) {
			return cached;
		}
	}

	// Detect basic format
	const detection = detectBlockchainAddress(address);
	if (!detection.success) {
		return null;
	}

	// For non-EVM addresses, return simple result
	if (!detection.detected_chains.includes('ETH')) {
		const result: ChainResolutionResult = {
			address,
			detectedFormat: detection,
			probableChains: detection.detected_chains.map((chain) => ({
				chain,
				confidence: 1.0,
				reason: 'Unique address format'
			})),
			recommendedChain: detection.detected_chains[0],
			allPossibleChains: detection.detected_chains
		};

		// Update cache
		chainResolutionCache.update((cache) => {
			cache.set(address, result);
			return cache;
		});

		return result;
	}

	// For EVM addresses, do full resolution
	const result = await resolveChainForAddress(address, {
		quickMode: options.quickMode,
		checkOnChain: !options.quickMode,
		userContext: {
			currentNetwork: get(currentChain) || undefined
		}
	});

	// Update cache
	chainResolutionCache.update((cache) => {
		cache.set(address, result);
		return cache;
	});

	return result;
}

// Utility to track and remember chain selections
export function rememberChainSelection(address: string, chain: string) {
	// Save to store
	recentAddresses.update((addresses) => {
		addresses.set(address, chain);
		return addresses;
	});

	// Save to localStorage
	saveChainSelection(address, chain);

	// Update current chain if needed
	currentChain.set(chain);
}

// Get chain suggestions based on recent activity
export function getChainSuggestions(limit: number = 5): string[] {
	const addresses = get(recentAddresses);
	const chainCounts = new Map<string, number>();

	addresses.forEach((chain) => {
		chainCounts.set(chain, (chainCounts.get(chain) || 0) + 1);
	});

	return Array.from(chainCounts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([chain]) => chain);
}

// Clipboard utility with chain detection
export async function pasteAndDetectAddress(): Promise<{
	address: string;
	detection: ChainResolutionResult | null;
} | null> {
	try {
		const text = await navigator.clipboard.readText();
		const trimmed = text.trim();

		// Basic validation
		if (!trimmed || trimmed.length < 20 || trimmed.length > 100) {
			return null;
		}

		const detection = await detectAndResolveChain(trimmed, {
			quickMode: true,
			useCache: true
		});

		return {
			address: trimmed,
			detection
		};
	} catch (err) {
		console.error('Failed to read clipboard:', err);
		return null;
	}
}

// Chain switching helper
export async function switchToChain(
	chainId: string,
	callbacks?: {
		onSuccess?: (chainId: string) => void;
		onError?: (error: Error) => void;
	}
) {
	try {
		currentChain.set(chainId);

		// If using Web3 provider (MetaMask, etc.)
		if (typeof window !== 'undefined' && (window as any).ethereum) {
			const chainIdHex = '0x' + parseInt(getChainConfig(chainId)?.chainId || '1').toString(16);

			try {
				await (window as any).ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: chainIdHex }]
				});
			} catch (switchError: any) {
				// Chain not added to wallet, try to add it
				if (switchError.code === 4902) {
					const config = getChainConfig(chainId);
					if (config) {
						await (window as any).ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: chainIdHex,
									chainName: config.name,
									nativeCurrency: {
										name: config.nativeCurrency,
										symbol: config.nativeCurrency,
										decimals: 18
									},
									rpcUrls: [config.rpcUrl]
								}
							]
						});
					}
				} else {
					throw switchError;
				}
			}
		}

		callbacks?.onSuccess?.(chainId);
	} catch (error) {
		callbacks?.onError?.(error as Error);
	}
}

// Helper to get chain configuration
function getChainConfig(chainId: string): any {
	// Import from your chain config
	const configs: any = {
		ETH: {
			chainId: 1,
			name: 'Ethereum',
			nativeCurrency: 'ETH',
			rpcUrl: 'https://eth.llamarpc.com'
		},
		BASE: {
			chainId: 8453,
			name: 'Base',
			nativeCurrency: 'ETH',
			rpcUrl: 'https://base.llamarpc.com'
		}
		// ... add other chains
	};

	return configs[chainId];
}

// Export a ready-to-use action for Svelte components
export function chainDetectionAction(node: HTMLInputElement) {
	let timeout: NodeJS.Timeout;

	async function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value.trim();

		// Clear existing timeout
		clearTimeout(timeout);

		// Debounce detection
		timeout = setTimeout(async () => {
			if (value.length >= 26) {
				// Minimum valid address length
				const result = await detectAndResolveChain(value, {
					quickMode: true,
					useCache: true
				});

				if (result) {
					node.dispatchEvent(
						new CustomEvent('chaindetected', {
							detail: result
						})
					);
				}
			}
		}, 500);
	}

	node.addEventListener('input', handleInput);

	return {
		destroy() {
			clearTimeout(timeout);
			node.removeEventListener('input', handleInput);
		}
	};
}

// File: src/routes/utils/address-detector/+page.svelte
// Example SvelteKit page using the chain detection

/*
<script lang="ts">
  import ChainSelector from '$lib/components/ChainSelector.svelte';
  import { detectAndResolveChain, rememberChainSelection, currentChain } from '$lib/utils/chain-detection';
  import { onMount } from 'svelte';

  let selectedAddress = $state('');
  let selectedChain = $state('');

  onMount(() => {
    // Check URL params for address
    const params = new URLSearchParams(window.location.search);
    const addr = params.get('address');
    if (addr) {
      selectedAddress = addr;
    }
  });

  function handleChainSelected(chain: string, address: string) {
    selectedChain = chain;
    rememberChainSelection(address, chain);

    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('address', address);
    url.searchParams.set('chain', chain);
    window.history.pushState({}, '', url);
  }
</script>

<div class="container mx-auto py-8">
  <ChainSelector
    initialAddress={selectedAddress}
    currentNetwork={$currentChain}
    onChainSelected={handleChainSelected}
  />

  {#if selectedChain}
    <div class="mt-8 p-6 bg-gray-100 rounded-lg">
      <h3 class="text-lg font-semibold mb-2">Integration Example:</h3>
      <pre class="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto">
        <code>{`// Use in your wallet
const chain = '${selectedChain}';
const address = '${selectedAddress}';

// Switch network
await switchToChain(chain);

// Send transaction
const tx = await sendTransaction({
  to: address,
  value: amount,
  chain: chain
});`}</code>
      </pre>
    </div>
  {/if}
</div>
*/

// File: src/lib/components/AddressInput.svelte
// Reusable address input with built-in chain detection

/*
<script lang="ts">
  import { chainDetectionAction } from '$lib/utils/chain-detection';
  import type { ChainResolutionResult } from '$lib/utils/chain-detection';

  interface Props {
    value?: string;
    placeholder?: string;
    onChainDetected?: (result: ChainResolutionResult) => void;
  }

  let {
    value = $bindable(''),
    placeholder = 'Enter blockchain address...',
    onChainDetected = () => {}
  }: Props = $props();

  let showChainHint = $state(false);
  let detectedChain = $state<string | null>(null);

  function handleChainDetected(event: CustomEvent<ChainResolutionResult>) {
    const result = event.detail;
    if (result.recommendedChain) {
      detectedChain = result.recommendedChain;
      showChainHint = true;
      onChainDetected(result);
    }
  }
</script>

<div class="relative">
  <input
    bind:value
    use:chainDetectionAction
    on:chaindetected={handleChainDetected}
    {placeholder}
    class="w-full px-4 py-2 border rounded-lg"
  />

  {#if showChainHint && detectedChain}
    <div class="absolute top-full mt-1 text-sm text-gray-600">
      Detected: {detectedChain} network
    </div>
  {/if}
</div>
*/
