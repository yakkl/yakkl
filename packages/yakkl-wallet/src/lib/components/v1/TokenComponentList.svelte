<script lang="ts">
	import { getYakklCombinedToken, yakklCombinedTokenStore, getSettings } from '$lib/common/stores';
	import type { Settings, TokenData } from '$lib/common';
	import { onMount } from 'svelte';
	import { log } from '$lib/managers/Logger';
	import { browser_ext } from '$lib/common/environment';
	import { handleOnMessageForPricing } from '$lib/common/listeners/ui/uiListeners';
	import { startPricingChecks } from '$lib/tokens/prices';
	import { updateTokenPrices } from '$lib/common/tokenPriceManager';
	import TokenLineView from './TokenLineView.svelte';
	import * as Accordion from './ui.tmp/accordion';
	import { cn } from '$lib/utils';

	interface Props {
		maxVisibleTokens?: number; // 0 means show all
		maxTokens?: number;
		locked?: boolean;
		className?: string;
	}

	let {
		maxVisibleTokens = 0,
		locked = true,
		maxTokens = locked ? 3 : 0,
		className = ''
	}: Props = $props();

	let tokens: TokenData[] = $state([]);
	let visibleTokens: TokenData[] = $state([]);
	let remainingTokens: TokenData[] = $state([]);
	let isExpanded = $state(false);

	log.info('TokenComponentList', false, 'Mounting');

	onMount(async (): Promise<any> => {
		log.info('TokenComponentList', false, 'onMount');

		const settings: Settings = await getSettings();
		if (!settings.init || !settings.legal.termsAgreed) {
			tokens = [];
			updateTokenDisplay();
		} else {
			getYakklCombinedToken().then((initialTokens) => {
				console.log('TokenComponentList: combined tokens loaded', initialTokens.length);

				// If no tokens are loaded, try to trigger loading them
				if (initialTokens.length === 0) {
					log.warn(
						'TokenComponentList: No tokens loaded from combined store, attempting to load defaults'
					);
					import('$lib/managers/tokens/loadDefaultTokens').then(({ loadDefaultTokens }) => {
						loadDefaultTokens().then(() => {
							// After loading defaults, attempt to get combined tokens again
							getYakklCombinedToken().then((reloadedTokens) => {
								console.log('TokenComponentList: tokens after reload', reloadedTokens.length);
								const effectiveMaxTokens = locked ? maxTokens : maxTokens > 0 ? maxTokens : 0;
								tokens =
									effectiveMaxTokens > 0
										? reloadedTokens.slice(0, effectiveMaxTokens)
										: reloadedTokens;
								updateTokenDisplay();
							});
						});
					});
				}

				const effectiveMaxTokens = locked ? maxTokens : maxTokens > 0 ? maxTokens : 0;
				tokens =
					effectiveMaxTokens > 0 ? initialTokens.slice(0, effectiveMaxTokens) : initialTokens;
				updateTokenDisplay();
			});
		}

		if (browser_ext) {
			browser_ext.runtime.onMessage.addListener(handleOnMessageForPricing as any);
			browser_ext.runtime.sendMessage({ action: 'getTokenData' }).catch(err => {
				// Expected during startup - token data will be loaded when background is ready
				console.debug('Background not ready for getTokenData:', err);
			});

			startPricingChecks();
			updateTokenPrices(); // Initial token price update
		}

		// Subscribe to store changes
		const unsubscribe = yakklCombinedTokenStore.subscribe((newTokens) => {
			// Apply the same token limit logic when store updates
			const effectiveMaxTokens = locked ? maxTokens : maxTokens > 0 ? maxTokens : 0;
			tokens = effectiveMaxTokens > 0 ? newTokens.slice(0, effectiveMaxTokens) : newTokens;
			updateTokenDisplay();
		});

		return () => {
			unsubscribe();
			if (browser_ext) {
				browser_ext.runtime.onMessage.removeListener(handleOnMessageForPricing as any);
			}
		};
	});

	function updateTokenDisplay() {
		// If maxVisibleTokens is 0 or we have fewer tokens than maxVisibleTokens, show all tokens
		if (maxVisibleTokens === 0 || tokens.length <= maxVisibleTokens) {
			visibleTokens = tokens;
			remainingTokens = [];
		} else {
			visibleTokens = tokens.slice(0, maxVisibleTokens);
			remainingTokens = tokens.slice(maxVisibleTokens);
		}
		console.log('updateTokenDisplay', {
			visibleTokens,
			remainingTokens,
			maxVisibleTokens,
			maxTokens,
			locked
		});
	}

	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div class={cn('flex flex-col', className)}>
	<div class="space-y-1">
		{#each visibleTokens as token}
			<TokenLineView {token} {locked} />
		{/each}
	</div>

	{#if remainingTokens.length > 0}
		<Accordion.Root type="single">
			<Accordion.Item value="remaining-tokens">
				<Accordion.Trigger
					class="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					{isExpanded ? 'Show Less' : `Show ${remainingTokens.length} More Tokens`}
				</Accordion.Trigger>
				<Accordion.Content>
					<div class="space-y-1">
						{#each remainingTokens as token}
							<TokenLineView {token} {locked} />
						{/each}
					</div>
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{/if}
</div>
