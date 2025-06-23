<script lang="ts">
	import { onMount } from 'svelte';
	import type { SwapToken } from '$lib/common/interfaces';
	import { ethers as ethersv6 } from 'ethers-v6';
	import { getTokenBalance } from '$lib/utilities/balanceUtils';
	import type { TokenService } from '$lib/managers/blockchains/evm/TokenService';
	import type { Provider } from '$lib/managers/Provider';

	interface Props {
		token: SwapToken;
		address?: string | null;
		provider?: Provider | null;
		tokenService?: TokenService<any> | null;
		className?: string;
		balanceText?: string;
	}

	let {
		token,
		address = null,
		provider = null,
		tokenService = null,
		className = $bindable('text-gray-500 '),
		balanceText = 'Balance: '
	}: Props = $props();

	let balance: bigint = $state(0n);

	onMount(async () => {
		await getBalance();
	});

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

	async function getBalance() {
		if (!address || !token) {
			balance = 0n;
		} else {
			try {
				balance = await getTokenBalance(token, address, provider, tokenService);
				if (balance <= 0n) className += 'text-red-500';
			} catch (error) {
				// Only log non-network errors, suppress network timeouts
				if (shouldShowErrorToUser(error)) {
					console.error('[TokenBalance] Balance fetch error:', error);
				}
				// Keep existing balance or set to 0
				balance = balance || 0n;
			}
		}
	}

	$effect(() => {
		if (token) {
			getBalance();
		}
	});
</script>

<span class={className}>
	{balanceText}{ethersv6.formatUnits(balance ? balance.toString() : '0', token.decimals)}
	{token.symbol}
</span>
