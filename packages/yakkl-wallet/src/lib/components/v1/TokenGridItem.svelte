<script lang="ts">
	import type { TokenData } from '$lib/common/interfaces';
	import { formatPrice, getTokenChange } from '$lib/utilities/utilities';
	import ProtectedValue from './ProtectedValue.svelte';
	import SkeletonBalance from './SkeletonBalance.svelte';
	import * as HoverCard from './ui.tmp/hover-card';
	import { accountTokenCacheManager } from '$lib/managers/AccountTokenCacheManager';
	import { log } from '$lib/managers/Logger';

	interface Props {
		token: TokenData;
		isLarge?: boolean;
		className?: string;
		onClick?: (token: TokenData) => void;
		accountAddress?: string;
	}

	let {
		token,
		isLarge = false,
		className = 'bg-white',
		onClick = () => {},
		accountAddress = ''
	}: Props = $props();

	// Determine the 24h percentChange color
	const percentChange: number | null = getTokenChange(token.change, '24h');
	const percentChangeColor =
		percentChange === null
			? 'text-slate-900'
			: percentChange >= 0
				? 'text-green-500'
				: 'text-red-500';

	let balance = $state(token?.balance);
	let price = $state(0);
	let priceFormatted = $state('');
	let value = $state(0);
	let valueFormatted = $state('');
	let isLoadingBalance = $state(false);
	let isStale = $state(false);

	$effect(() => {
		// Check if the token data is stale and needs refreshing
		if (accountAddress && token.address) {
			isStale = accountTokenCacheManager.isTokenStale(accountAddress, token.address);
		}

		balance = token?.balance;
		price = token?.price?.price ?? 0;
		priceFormatted = formatPrice(price);

		// Calculate value based on balance and price
		if (balance && price) {
			// Handle both number and BigInt balance types
			const balanceNum =
				typeof balance === 'bigint'
					? Number(balance) / Math.pow(10, token.decimals || 18)
					: Number(balance);
			value = balanceNum * price;
		} else {
			value = 0;
		}

		valueFormatted = formatPrice(value);

		// Update cache when token data changes
		if (accountAddress && token.address) {
			accountTokenCacheManager.updateTokenForAccount(accountAddress, token);
		}
	});

	// Format balance for display
	function formatBalance(balance: any): string {
		if (!balance) return '0';

		try {
			let balanceNum: number;

			if (typeof balance === 'bigint') {
				// Convert from wei to token units
				balanceNum = Number(balance) / Math.pow(10, token.decimals || 18);
			} else {
				balanceNum = Number(balance);
			}

			// Format based on magnitude
			if (balanceNum >= 1000000) {
				return (balanceNum / 1000000).toFixed(2) + 'M';
			} else if (balanceNum >= 1000) {
				return (balanceNum / 1000).toFixed(2) + 'K';
			} else if (balanceNum >= 1) {
				return balanceNum.toFixed(4);
			} else {
				return balanceNum.toFixed(6);
			}
		} catch (error) {
			log.warn('[TokenGridItem] Error formatting balance:', false, error);
			return '0';
		}
	}
</script>

<HoverCard.Root openDelay={300}>
	<HoverCard.Trigger>
		<div
			class="flex flex-col items-center justify-center p-1 w-full h-full rounded-lg border shadow-md {className} {isStale
				? 'opacity-75'
				: ''}"
		>
			{#if token.logoURI}
				<img
					src={token.logoURI}
					alt={token.symbol}
					class="{isLarge ? 'w-14 h-14' : 'w-8 h-8'} rounded-full"
					onerror={() => {}}
				/>
			{:else}
				<div
					class="{isLarge
						? 'w-14 h-14'
						: 'w-8 h-8'} rounded-full bg-gray-200 flex items-center justify-center"
				>
					<span class="text-xs font-bold text-gray-600"
						>{token.symbol?.slice(0, 2).toUpperCase()}</span
					>
				</div>
			{/if}

			<h3 class="font-bold mt-2 text-md flex items-center gap-1">
				{token.symbol}
				{#if isStale}
					<svg class="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
			</h3>

			{#if isLoadingBalance}
				<SkeletonBalance className="mt-1" showLabel={false} />
			{:else}
				<p class="text-gray-500 mt-1 text-sm">
					Value:
					{#if value > 0}
						<span><ProtectedValue value={valueFormatted} placeholder="*******" /></span>
					{:else}
						<span class="text-gray-400">-----</span>
					{/if}
				</p>
			{/if}

			{#if isLarge}
				{#if isLoadingBalance}
					<SkeletonBalance className="mt-1" showLabel={false} />
					<SkeletonBalance className="mt-1" showLabel={false} />
				{:else}
					<p class="text-gray-500 mt-1 text-sm">
						Price:
						{#if price > 0}
							<span><ProtectedValue value={priceFormatted} placeholder="*******" /></span>
						{:else}
							<span class="text-gray-400">-----</span>
						{/if}
					</p>
					<p class="text-gray-600 mt-1 text-xs">
						Qty:
						{#if balance}
							<span><ProtectedValue value={formatBalance(balance)} placeholder="*******" /></span>
						{:else}
							<span class="text-gray-400">0</span>
						{/if}
					</p>
				{/if}
			{/if}
		</div>
	</HoverCard.Trigger>
	<HoverCard.Content class="w-80 bg-white cursor-pointer p-4" align="end">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="flex justify-between space-x-4" onclick={() => onClick(token)}>
			<div class="space-y-2 text-slate-900 text-md">
				<div class="font-bold mb-1 flex items-center gap-2">
					{#if token.logoURI}
						<img src={token.logoURI} alt={token.symbol} class="w-8 h-8" onerror={() => {}} />
					{:else}
						<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
							<span class="text-xs font-bold text-gray-600"
								>{token.symbol?.slice(0, 2).toUpperCase()}</span
							>
						</div>
					{/if}
					<span class="font-semibold leading-6">{token.name} - {token.symbol}</span>
					{#if isStale}
						<span class="text-xs text-yellow-600 bg-yellow-100 px-1 rounded">Stale</span>
					{/if}
				</div>

				<p>
					Price:
					{#if price > 0}
						<span><ProtectedValue value={priceFormatted} placeholder="*******" /></span>
					{:else}
						<span class="text-gray-400">-----</span>
					{/if}
				</p>

				<p>
					Value:
					{#if value > 0}
						<span><ProtectedValue value={valueFormatted} placeholder="*******" /></span>
					{:else}
						<span class="text-gray-400">$0.00</span>
					{/if}
				</p>

				<p>
					Quantity:
					{#if balance}
						<span><ProtectedValue value={formatBalance(balance)} placeholder="*******" /></span>
					{:else}
						<span class="text-gray-400">0</span>
					{/if}
				</p>

				<p>
					Change: <span class={percentChangeColor}
						>{percentChange ? percentChange.toFixed(2) : '--'}%</span
					>
				</p>

				{#if token.address}
					<p class="text-xs text-gray-500">
						Address: {token.address.slice(0, 6)}...{token.address.slice(-4)}
					</p>
				{/if}
			</div>
		</div>
	</HoverCard.Content>
</HoverCard.Root>
