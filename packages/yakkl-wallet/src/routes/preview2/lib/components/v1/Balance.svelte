<script lang="ts">
	import { onMount } from 'svelte';
	import type { BigNumberish, BlockTag } from '$lib/common';
	import { ethers as ethersv6 } from 'ethers-v6';
	import type { Provider } from '$lib/managers/Provider';

	interface Props {
		symbol: string;
		address?: string | null;
		blockTag?: BlockTag | 'latest';
		units?: number | string;
		provider: Provider;
		className?: string;
		balanceText?: string;
	}

	let {
		symbol,
		address = null,
		blockTag = 'latest',
		units = 18,
		provider,
		className = '',
		balanceText = 'Balance: '
	}: Props = $props();

	let balance: BigNumberish = $state(0n);

	// Helper function to determine if an error should be shown to the user
	function shouldShowErrorToUser(error: any): boolean {
		const errorMessage = error?.message || error?.toString() || '';

		// Network/API errors that should be handled silently
		const networkErrors = [
			'missing response',
			'timeout',
			'TIMEOUT',
			'SERVER_ERROR',
			'NETWORK_ERROR',
			'Failed to fetch',
			'fetch',
			'Connection failed',
			'Request timeout',
			'eth_getBalance',
			'call revert exception',
			'alchemy.com',
			'infura.io',
			'requestBody',
			'serverError',
			'code=SERVER_ERROR',
			'version=web/',
			'JsonRpcError',
			'RPC Error',
			'getBalance',
			'Balance fetch'
		];

		return !networkErrors.some((pattern) =>
			errorMessage.toLowerCase().includes(pattern.toLowerCase())
		);
	}

	onMount(async () => {
		if (!address || !provider) {
			return;
		}
		try {
			balance = await provider.getBalance(address, blockTag);

			// Update cache with fetched balance
			if (balance && symbol === 'ETH') {
				// Only cache ETH/native token balances
				const { balanceCacheManager } = await import('$lib/managers/BalanceCacheManager');
				const { yakklPricingStore } = await import('$lib/common/stores');
				const { get } = await import('svelte/store');
				const currentPrice = get(yakklPricingStore)?.price;
				if (currentPrice) {
					balanceCacheManager.setCachedBalance(address, balance, currentPrice);
				}
			}
		} catch (error) {
			// Only log non-network errors, suppress network timeouts
			if (shouldShowErrorToUser(error)) {
				console.error('[Balance] Balance fetch error:', error);
			}
			// Keep existing balance or set to 0
			balance = balance || 0n;
		}
	});
</script>

<span class="text-gray-500 {className}">
	{balanceText}{ethersv6.formatUnits(balance ? balance.toString() : '0', units)}
	{symbol.toUpperCase()}
</span>
