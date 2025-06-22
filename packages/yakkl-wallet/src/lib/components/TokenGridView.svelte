<script lang="ts">
	import TokenGridItem from './TokenGridItem.svelte';
	import SkeletonBalance from './SkeletonBalance.svelte';
	import type { TokenData } from '$lib/common/interfaces';
	import { accountTokenCacheManager } from '$lib/managers/AccountTokenCacheManager';
	import { yakklCurrentlySelectedStore } from '$lib/common/stores';
	import { onMount } from 'svelte';
	import { log } from '$lib/managers/Logger';

	// Props using $props()
	const {
		tokens = [],
		onTokenClick,
		accountAddress = '',
		showSkeleton = false
	} = $props<{
		tokens: TokenData[];
		onTokenClick: (token: TokenData) => void;
		accountAddress?: string;
		showSkeleton?: boolean;
	}>();

	let accountTokens = $state<TokenData[]>([]);
	let isLoading = $state(false); // Start with false to show any existing data
	let currentAccountAddress = $state('');

	// Effect to handle account changes and load cached data
	$effect(() => {
		const selectedAccount = $yakklCurrentlySelectedStore;
		const targetAddress = accountAddress || selectedAccount?.shortcuts?.address;

		if (targetAddress && targetAddress !== currentAccountAddress) {
			currentAccountAddress = targetAddress;
			loadAccountTokens(targetAddress);
		}
	});

	// Effect to update tokens when props change
	$effect(() => {
		if (tokens && tokens.length > 0) {
			accountTokens = tokens;
			isLoading = false;

			// Cache the tokens for the current account
			if (currentAccountAddress) {
				accountTokenCacheManager.setCachedTokensForAccount(currentAccountAddress, tokens);
			}
		}
	});

	async function loadAccountTokens(address: string) {
		try {
			isLoading = true;

			// First, try to load from cache for immediate display
			const cachedTokens = accountTokenCacheManager.getCachedTokensForAccount(address);

			if (cachedTokens && cachedTokens.length > 0) {
				accountTokens = cachedTokens;
				isLoading = false;
				log.debug('[TokenGridView] Loaded cached tokens for account:', false, {
					address,
					tokenCount: cachedTokens.length
				});

				// Check if cache is stale and needs refresh
				if (accountTokenCacheManager.isAccountTokensStale(address)) {
					log.debug('[TokenGridView] Account tokens are stale, background refresh needed');
					// This would trigger a background refresh in a real implementation
					// The parent component should handle this via token service updates
				}
			} else {
				// No cached data, show skeleton while waiting for parent to provide tokens
				accountTokens = [];
				log.debug('[TokenGridView] No cached tokens found for account:', false, { address });
			}
		} catch (error) {
			log.warn('[TokenGridView] Error loading account tokens:', false, error);
			isLoading = false;
		}
	}

	onMount(() => {
		// Clean up expired cache entries on mount
		accountTokenCacheManager.cleanupExpired();
	});
</script>

<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-2 h-full overflow-y-scroll">
	{#if showSkeleton || isLoading}
		<!-- Show skeleton placeholders while loading -->
		{#each Array(6) as _, i}
			<div class="rounded-md p-1 border border-gray-200 dark:border-gray-700">
				<div
					class="flex flex-col items-center justify-center p-1 w-full h-full rounded-lg border shadow-md bg-white"
				>
					<div class="w-8 h-8 bg-gray-200 rounded-full animate-pulse mb-2"></div>
					<SkeletonBalance className="mb-1" showLabel={false} />
					<SkeletonBalance className="text-sm" showLabel={false} />
				</div>
			</div>
		{/each}
	{:else if accountTokens && accountTokens.length > 0}
		<!-- Show actual tokens -->
		{#each accountTokens as token}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="cursor-pointer hover:shadow-lg transition-all duration-200 rounded-md p-1 border border-gray-200 dark:border-gray-700"
				onclick={() => onTokenClick(token)}
				role="button"
				tabindex="0"
				aria-label="Token item for {token.symbol}"
			>
				<TokenGridItem {token} accountAddress={currentAccountAddress} />
			</div>
		{/each}
	{:else}
		<!-- Empty state -->
		<div class="col-span-full flex flex-col items-center justify-center py-8 text-gray-500">
			<svg class="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
				></path>
			</svg>
			<p class="text-center">No tokens found for this account</p>
			<p class="text-sm text-center mt-1">Tokens will appear here when detected</p>
		</div>
	{/if}
</div>
