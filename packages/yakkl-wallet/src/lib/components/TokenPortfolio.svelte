<script lang="ts">
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import MoreLess from './MoreLess.svelte';
	import { tokenStore, isMultiChainView } from '$lib/stores/token.store';
	import { canUseFeature } from '$lib/utils/features';
	import ProtectedValue from './ProtectedValue.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { BigNumber } from '$lib/common/bignumber';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';

	let { tokens = [], className = '', maxRows = 6, loading = false } = $props();

	let expanded = $state(false);
	let sortBy = $state<'name' | 'value' | 'price' | 'quantity'>('value');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let multiChainView = $derived($isMultiChainView);
	let isRefreshing = $state(false);
	let lastRefreshTime = $state(0);
	let timeUntilNextRefresh = $state(0);

	// Rate limiting constants
	const REFRESH_COOLDOWN_MS = 5000; // 5 seconds between refreshes
	const MIN_TIME_BETWEEN_CLICKS = 1000; // 1 second minimum between button clicks

	// Use tokens directly from props - they're already properly formatted from home page
	let displayTokens = $derived(tokens || []);

  // Add comprehensive validation for tokens prop
  $effect(() => {
    // Only log validation issues, not normal operations
    if (process.env.NODE_ENV === 'development' && tokens !== undefined && tokens !== null && !Array.isArray(tokens)) {
      log.error('[TokenPortfolio] Invalid tokens prop - expected array but got:', false, {
        type: typeof tokens,
        value: tokens
      });
    }

    // Validate that tokens is an array
    if (tokens !== undefined && tokens !== null && !Array.isArray(tokens)) {
      console.error('[TokenPortfolio] Invalid tokens prop - expected array but got:', {
        tokens,
        type: typeof tokens
      });
    }

    // Validate each token structure
    if (Array.isArray(tokens)) {
      tokens.forEach((token, index) => {
        if (!token) {
          log.warn(`[TokenPortfolio] Token at index ${index} is null/undefined`, false);
          return;
        }

        const issues = [];
        if (!token.symbol) issues.push('missing symbol');
        if (token.value !== undefined && token.value !== null && !isFinite(Number(token.value)) && typeof token.value !== 'bigint' && typeof token.value !== 'string') {
          issues.push('invalid value type');
        }
        if (token.price !== undefined && token.price !== null && !isFinite(Number(token.price))) {
          issues.push('invalid price');
        }
        if (token.qty !== undefined && token.qty !== null && !isFinite(Number(token.qty))) {
          issues.push('invalid quantity');
        }

        if (issues.length > 0) {
          log.warn(`[TokenPortfolio] Token ${token.symbol || index} has validation issues:`, false, {
            issues,
            token: {
              symbol: token.symbol,
              value: token.value,
              valueType: typeof token.value,
              price: token.price,
              qty: token.qty
            }
          });
        }
      });
    }
  });

	// Update timeUntilNextRefresh reactively instead of using interval
	$effect(() => {
		// Calculate remaining time based on current time
		const now = Date.now();
		const timeSinceLastRefresh = now - lastRefreshTime;
		if (timeSinceLastRefresh >= REFRESH_COOLDOWN_MS) {
			timeUntilNextRefresh = 0;
		} else {
			timeUntilNextRefresh = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
		}
	});

	// Calculate total value of all tokens - values are already in dollars as strings
	let totalValue = $derived.by(() => {
		// Ensure displayTokens is always an array to prevent flickering
		if (!Array.isArray(displayTokens)) {
			return 0;
		}

		const total = displayTokens.reduce((sum, token) => {
			// Guard against undefined tokens
			if (!token || !token.value) {
				return sum;
			}

			// Convert string value to number
			const value = parseFloat(token.value);
			if (isFinite(value)) {
				return sum + value;
			}
			
			return sum;
		}, 0);

		return total;
	});

	// Filter tokens with value > 0 and sort them
	let filteredAndSortedTokens = $derived.by(() => {
		// Ensure displayTokens is always an array to prevent flickering
		if (!Array.isArray(displayTokens)) {
			log.debug('[TokenPortfolio] filteredAndSortedTokens: displayTokens is not array', false, { displayTokens });
			return [];
		}

		// Only log sorting in development when there are tokens
		if (process.env.NODE_ENV === 'development' && displayTokens.length > 0) {
			log.debug('[TokenPortfolio] Sorting tokens:', false, {
				count: displayTokens.length,
				sortBy,
				sortOrder
			});
		}

		// Filter tokens based on value
		const filtered = displayTokens.filter(token => {
		  // Always show native token regardless of value
		  if (token.isNative || token.address === '0x0000000000000000000000000000000000000000') {
		    return true;
		  }
		  // For non-native tokens, only show those with value > 0 OR balance > 0
		  const value = typeof token.value === 'number' ? token.value : parseFloat(token.value || '0');
		  const balance = typeof token.balance === 'number' ? token.balance : parseFloat(token.balance || '0');
		  const qty = typeof token.qty === 'number' ? token.qty : parseFloat(token.qty || '0');

		  // Show token if it has value or balance (even if price is 0)
		  return value > 0 || balance > 0 || qty > 0;
		});

		// Sort tokens - ensure we have valid tokens to prevent errors
		const sorted = [...filtered].filter(token => {
			const isValid = token && token.symbol;
			if (!isValid) {
				log.warn('[TokenPortfolio] filteredAndSortedTokens: Filtering out invalid token', false, { token });
			}
			return isValid;
		}).sort((a, b) => {
			try {
				switch (sortBy) {
					case 'name':
						const aName = a.symbol.toLowerCase();
						const bName = b.symbol.toLowerCase();
						return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);

					case 'value':
						// Use BigNumber for precise value comparison with error handling
						let aVal = 0;
						let bVal = 0;
						try {
							if (typeof a.value === 'number') {
								aVal = a.value;
							} else if (a.value !== undefined && a.value !== null) {
								const aBN = new BigNumber(a.value);
								aVal = aBN.toNumber() || 0;
							}

							if (typeof b.value === 'number') {
								bVal = b.value;
							} else if (b.value !== undefined && b.value !== null) {
								const bBN = new BigNumber(b.value);
								bVal = bBN.toNumber() || 0;
							}

							// Values compared for sorting
						} catch (error) {
							log.error('[TokenPortfolio] filteredAndSortedTokens: Error converting values for sorting', false, {
								error,
								a: { symbol: a.symbol, value: a.value },
								b: { symbol: b.symbol, value: b.value }
							});
							// Fallback to 0 on error to prevent crashes
							aVal = 0;
							bVal = 0;
						}
						return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;

					case 'price':
						const aPrice = a.price || 0;
						const bPrice = b.price || 0;
						return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;

					case 'quantity':
						// Safe conversion to prevent BigInt errors
						const aQty = BigNumberishUtils.toNumberSafe(a.qty) || 0;
						const bQty = BigNumberishUtils.toNumberSafe(b.qty) || 0;
						return sortOrder === 'asc' ? aQty - bQty : bQty - aQty;

					default:
						let aDefault = 0;
						let bDefault = 0;
						try {
							aDefault = typeof a.value === 'number' ? a.value : new BigNumber(a.value || '0').toNumber() || 0;
							bDefault = typeof b.value === 'number' ? b.value : new BigNumber(b.value || '0').toNumber() || 0;
						} catch (error) {
							log.error('[TokenPortfolio] filteredAndSortedTokens: Error in default sort', false, { error });
							// Fallback to 0 on error to prevent crashes
							aDefault = 0;
							bDefault = 0;
						}
						return sortOrder === 'asc' ? aDefault - bDefault : bDefault - aDefault;
				}
			} catch (error) {
				log.error('[TokenPortfolio] filteredAndSortedTokens: Error in sort function', false, {
					error,
					a: { symbol: a?.symbol, value: a?.value },
					b: { symbol: b?.symbol, value: b?.value }
				});
				return 0; // Maintain order on error
			}
		});

		log.debug('[TokenPortfolio] filteredAndSortedTokens: Final sorted tokens', false, {
			sortedCount: sorted.length,
			sorted: sorted.map(t => ({
				symbol: t.symbol,
				value: t.value,
				valueType: typeof t.value,
				formattedValue: formatValue(t.value)
			}))
		});

		return sorted;
	});

	let visible = $derived.by(() => {
		if (!Array.isArray(filteredAndSortedTokens)) {
			log.warn('[TokenPortfolio] visible: filteredAndSortedTokens is not an array', false, { filteredAndSortedTokens });
			return [];
		}

		const result = expanded ? filteredAndSortedTokens : filteredAndSortedTokens.slice(0, maxRows);
		// log.error('[TokenPortfolio] visible tokens calculated', false, {
    //   result,
		// 	expanded,
		// 	maxRows,
		// 	totalTokens: filteredAndSortedTokens.length,
		// 	visibleCount: result.length
		// }); // just for debugging

		return result;
	});

	let hidden = $derived.by(() => {
		if (!Array.isArray(filteredAndSortedTokens)) {
			log.warn('[TokenPortfolio] hidden: filteredAndSortedTokens is not an array', false, { filteredAndSortedTokens });
			return [];
		}

		const result = expanded ? [] : filteredAndSortedTokens.slice(maxRows);
		// log.error('[TokenPortfolio] hidden tokens calculated', false, {
    //   result,
		// 	expanded,
		// 	maxRows,
		// 	totalTokens: filteredAndSortedTokens.length,
		// 	hiddenCount: result.length
		// }); // just for debugging

		return result;
	});


	function formatValue(val: string | number | undefined): string {
		if (val === undefined || val === null) {
			return '$0.00';
		}

		// Convert to number
		const numValue = typeof val === 'string' ? parseFloat(val) : val;
		
		if (!isFinite(numValue) || isNaN(numValue)) {
			return '$0.00';
		}

		const absValue = Math.abs(numValue);

		if (absValue >= 1e12) {
			return `$${(numValue / 1e12).toFixed(1)}T+`;
		} else if (absValue >= 1e9) {
			return `$${(numValue / 1e9).toFixed(1)}B+`;
		} else if (absValue >= 1e6) {
			return `$${(numValue / 1e6).toFixed(1)}M+`;
		} else if (absValue >= 1e3) {
			return `$${(numValue / 1e3).toFixed(1)}K+`;
		}

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(numValue);
	}

	function formatPrice(price: number | undefined | any): string {
		log.debug('[TokenPortfolio] formatPrice called', false, { price, type: typeof price });

		// Extract numeric price from price object if needed
		let numericPrice: number | undefined;
		if (typeof price === 'object' && price !== null && 'price' in price) {
			numericPrice = price.price;
			log.debug('[TokenPortfolio] formatPrice: Extracted price from object', false, { original: price, extracted: numericPrice });
		} else {
			numericPrice = price;
		}

		if (numericPrice === undefined || numericPrice === null || isNaN(numericPrice) || !isFinite(numericPrice)) {
			log.debug('[TokenPortfolio] formatPrice: Invalid price', false, { numericPrice });
			return '$0.00';
		}

		if (numericPrice === 0) {
			log.debug('[TokenPortfolio] formatPrice: Price is zero', false);
			return '$0.00';
		}

		const absPrice = Math.abs(numericPrice);
		log.debug('[TokenPortfolio] formatPrice: Processing valid price', false, { price: numericPrice, absPrice });

		if (absPrice >= 1e6) {
			const result = `$${(numericPrice / 1e6).toFixed(1)}M+`;
			log.debug('[TokenPortfolio] formatPrice: Formatted as millions', false, { result });
			return result;
		} else if (absPrice >= 1e3) {
			const result = `$${(numericPrice / 1e3).toFixed(1)}K+`;
			log.debug('[TokenPortfolio] formatPrice: Formatted as thousands', false, { result });
			return result;
		} else if (absPrice < 0.01) {
			log.debug('[TokenPortfolio] formatPrice: Formatted as sub-penny', false);
			return '< $0.01';
		}

		const result = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: numericPrice < 1 ? 6 : 2
		}).format(numericPrice);

		log.debug('[TokenPortfolio] formatPrice: Formatted as currency', false, { result });
		return result;
	}

	function formatValueFull(val: string | number | undefined): string {
		if (val === undefined || val === null) {
			return '$0.00';
		}

		// Convert to number
		const numValue = typeof val === 'string' ? parseFloat(val) : val;

		if (!isFinite(numValue) || isNaN(numValue)) {
			return '$0.00';
		}

		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(numValue);
	}

	function getFullPriceDisplay(price: number | undefined): string {
		log.debug('[TokenPortfolio] getFullPriceDisplay called', false, { price, type: typeof price });

		if (price === undefined || price === null || isNaN(price) || !isFinite(price)) {
			log.debug('[TokenPortfolio] getFullPriceDisplay: Invalid price', false, { price });
			return '$0.00000000';
		}

		if (price === 0) {
			log.debug('[TokenPortfolio] getFullPriceDisplay: Price is zero', false);
			return '$0.00000000';
		}

		if (price < 0.00000001) {
			const result = `$${price.toExponential(8)}`;
			log.debug('[TokenPortfolio] getFullPriceDisplay: Formatted as exponential', false, { result });
			return result;
		}

		const result = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 10
		}).format(price);

		log.debug('[TokenPortfolio] getFullPriceDisplay: Final result', false, { result });
		return result;
	}

	function toggleMultiChain() {
		tokenStore.toggleMultiChainView();

		// Load multi-network data if switching to multi-network view
		if (!multiChainView) {
			// Multi-chain tokens will be loaded by the store when toggled
			// Non-blocking refresh
			tokenStore.refresh().catch(error => {
				log.warn('[TokenPortfolio] Failed to refresh after toggle:', false, error);
			});
		}
	}

	function handleTokenClick(token: any) {
		// Dispatch a custom event for the parent to handle
		const event = new CustomEvent('tokenclick', {
			detail: { token },
			bubbles: true
		});

		// Find the component element and dispatch the event
		if (typeof document !== 'undefined') {
			const element = document.querySelector('.token-portfolio-container');
			element?.dispatchEvent(event);
		}
	}

	// Refresh function with rate limiting - uses store methods only
	function handleRefresh() {
		const now = Date.now();

		// Check if we're within the cooldown period
		if (now - lastRefreshTime < MIN_TIME_BETWEEN_CLICKS) {
			log.info('[TokenPortfolio] Refresh blocked - too soon after last click', false);
			return;
		}

		// Check if a refresh is already in progress
		if (isRefreshing) {
			log.info('[TokenPortfolio] Refresh already in progress', false);
			return;
		}

		// Check if we're still in cooldown from last successful refresh
		if (now - lastRefreshTime < REFRESH_COOLDOWN_MS) {
			const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - (now - lastRefreshTime)) / 1000);
			log.info(
				`[TokenPortfolio] Please wait ${remainingTime} seconds before refreshing again`,
				false
			);
			return;
		}

		isRefreshing = true;
		lastRefreshTime = now;

		log.info('[TokenPortfolio] Triggering token refresh via store...', false);

		// Use token store refresh which handles all background communication
		tokenStore.refresh(true).then(() => {
			log.info('[TokenPortfolio] Token store refresh completed', false);
			isRefreshing = false;
		}).catch(error => {
			log.warn('[TokenPortfolio] Token store refresh failed:', false, error);
			// Reset the cooldown on error to allow retry sooner
			lastRefreshTime = Date.now() - (REFRESH_COOLDOWN_MS - 2000); // Allow retry in 2 seconds
			isRefreshing = false;
		});
	}
</script>

<div
	class={`bg-white/70 dark:bg-zinc-800 p-4 rounded-2xl shadow space-y-2 relative z-10 token-portfolio-container ${className}`}
>
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Token Portfolio</div>
			<div class="flex items-center gap-2">
				{#if canUseFeature('multi_chain_portfolio')}
					<button
						onclick={toggleMultiChain}
						class="flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors {multiChainView
							? 'bg-indigo-600 text-white'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'}"
						title={multiChainView
							? 'Switch to single network view'
							: 'Switch to multi-network view'}
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
						{multiChainView ? 'Multi-Network' : 'Single Network'}
					</button>
				{/if}

				<!-- Refresh Button -->
				<SimpleTooltip
					content={isRefreshing
						? 'Refreshing...'
						: timeUntilNextRefresh > 0
							? `Wait ${timeUntilNextRefresh}s`
							: 'Refresh token balances'}
					position="top"
				>
					<button
						onclick={handleRefresh}
						disabled={isRefreshing || timeUntilNextRefresh > 0}
						class="p-1.5 rounded-lg transition-all {isRefreshing || timeUntilNextRefresh > 0
							? 'bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
						aria-label="Refresh tokens"
					>
						<svg
							class="w-4 h-4 {isRefreshing ? 'animate-spin' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				</SimpleTooltip>
			</div>
		</div>

		<!-- Sort controls -->
    <!-- Removed debug console.error -->

		{#if filteredAndSortedTokens.length > 0}
			<div class="flex items-center gap-2 text-xs">
				<span class="text-zinc-500 dark:text-zinc-400">Sort by:</span>
				<div class="flex gap-1">
					<button
						onclick={() => {
							sortBy = 'name';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'name'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'value';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'value'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Value {sortBy === 'value' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'price';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'price'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Price {sortBy === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
					<button
						onclick={() => {
							sortBy = 'quantity';
							sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
						}}
						class="px-2 py-0.5 rounded transition-colors {sortBy === 'quantity'
							? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
							: 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'}"
					>
						Qty {sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
					</button>
				</div>
			</div>
		{/if}
	</div>

	{#if loading}
		<div class="grid grid-cols-2 gap-3">
			{#each Array(4) as _}
				<div class="rounded-xl shadow bg-zinc-100 dark:bg-zinc-700 p-3 animate-pulse">
					<div class="w-8 h-8 mb-1 rounded-full bg-zinc-300 dark:bg-zinc-600 mx-auto"></div>
					<div class="h-4 bg-zinc-300 dark:bg-zinc-600 rounded mt-2"></div>
					<div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-3/4 mx-auto"></div>
					<div class="h-3 bg-zinc-300 dark:bg-zinc-600 rounded mt-1 w-1/2 mx-auto"></div>
				</div>
			{/each}
		</div>
	{:else if filteredAndSortedTokens.length === 0}
		<div class="text-center py-8 text-gray-500 dark:text-gray-400">
			<p>No tokens with value found</p>
			<p class="text-sm mt-2">
				{tokens.length > 0
					? `${tokens.length} tokens hidden (zero value)`
					: 'Add tokens to see them here'}
			</p>
			{#if multiChainView}
				<p class="text-xs mt-1 text-zinc-400">Viewing all networks</p>
			{/if}
		</div>
	{:else}
		<div
			class="grid grid-cols-2 gap-3 overflow-y-auto {expanded ? 'max-h-[400px]' : 'max-h-[300px]'}"
			style="scrollbar-width: thin;"
		>
			{#each visible as token}
				{@const isImagePath =
					token.icon &&
					(token.icon.startsWith('/') ||
						token.icon.startsWith('http') ||
						token.icon.includes('.svg') ||
						token.icon.includes('.png') ||
						token.icon.includes('.jpg') ||
						token.icon.includes('.jpeg') ||
						token.icon.includes('.gif') ||
						token.icon.includes('.webp'))}
				<button
					onclick={() => handleTokenClick(token)}
					class="rounded-xl shadow flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-700 p-3 transition hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-300 min-w-0 cursor-pointer w-full"
					title="Click to manage {token.symbol}"
				>
					{#if isImagePath}
						<!-- Image files (local or remote) -->
						<img
							src={token.icon}
							alt={token.symbol}
							class="w-8 h-8 mb-1 rounded-full"
							onerror={(e) => {
								(e.currentTarget as HTMLElement).style.display = 'none';
								(
									(e.currentTarget as HTMLElement).nextElementSibling as HTMLElement
								)?.style.setProperty('display', 'flex');
							}}
						/>
						<div
							class={`w-8 h-8 mb-1 rounded-full items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}
							style="display:none;"
						>
							{token.symbol?.[0] || '?'}
						</div>
					{:else}
						<!-- Text/emoji icons or missing icons -->
						<div
							class={`w-8 h-8 mb-1 rounded-full flex items-center justify-center ${token.color || 'bg-gray-400'} text-white font-bold text-lg`}
						>
							{token.icon || token.symbol?.[0] || '?'}
						</div>
					{/if}
					<div class="font-bold text-base text-center mt-1">{token.symbol}</div>
					<SimpleTooltip
						content={`${token.qty || 0} ${token.symbol}`}
						position="auto"
						maxWidth="200px"
					>
						<div
							class="text-xs text-zinc-400 dark:text-zinc-200 truncate max-w-[96px] text-center cursor-help mt-0.5"
						>
							<ProtectedValue
								value={(() => {
									// Use balance field, fallback to qty if needed
									const qty = token.balance || token.qty || '0';

									// Format the number properly
									const num = typeof qty === 'string' ? parseFloat(qty) : Number(qty);
									if (isNaN(num)) return '0';

									// Format with appropriate decimals
									if (num === 0) return '0';
									if (num < 0.0001) return '<0.0001';
									if (num < 1) return num.toFixed(4);
									if (num < 100) return num.toFixed(2);
									return num.toLocaleString();
								})()}
								placeholder="****"
							/>
						</div>
					</SimpleTooltip>

					<!-- Market Price -->
					<SimpleTooltip
						content={getFullPriceDisplay(token.price)}
						position="auto"
						maxWidth="250px"
					>
						<div class="text-xs text-zinc-500 dark:text-zinc-400 text-center cursor-help">
							<ProtectedValue
								value={(() => {
									log.debug('[TokenPortfolio] Formatting price for display', false, {
										symbol: token.symbol,
										price: token.price,
										priceType: typeof token.price
									});
									return formatPrice(token.price);
								})()}
								placeholder="****"
							/>
						</div>
					</SimpleTooltip>

					<!-- Total Value -->
					<SimpleTooltip content={formatValueFull(token.value)} position="auto" maxWidth="200px">
						<div
							class="text-zinc-600 dark:text-zinc-300 text-center cursor-help font-medium {formatValue(
								token.value
							).length > 8
								? 'text-xs'
								: 'text-sm'} {formatValue(token.value).length > 10
								? 'break-all'
								: 'truncate max-w-[96px]'}"
						>
							<ProtectedValue
								value={(() => {
									// Simply display the value if it exists
									if (token.value !== undefined && token.value !== null) {
										// If value is already calculated, just format it
										return formatValue(token.value);
									}

									// Calculate value = price * balance if both exist
									const balance = token.balance || token.qty || 0;
									const price = token.price || 0;

									if (price && balance) {
										const balanceNum = typeof balance === 'string' ? parseFloat(balance) : Number(balance);
										const priceNum = typeof price === 'number' ? price : parseFloat(price || '0');
										const value = balanceNum * priceNum;

										// Format as currency
										if (value === 0) return '$0.00';
										if (value < 0.01) return '<$0.01';
										return `$${value.toFixed(2)}`;
									}

									return '$0.00';
								})()}
								placeholder="*****"
							/>
						</div>
					</SimpleTooltip>
					{#if token.change24h !== undefined}
						<div
							class="text-xs mt-0.5 font-medium {token.change24h >= 0
								? 'text-green-500'
								: 'text-red-500'}"
						>
							{token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
						</div>
					{/if}
				</button>
			{/each}
		</div>
		{#if hidden.length}
			<MoreLess
				count={hidden.length}
				text="more"
				lessText="less"
				{expanded}
				className="mt-2"
				onclick={() => (expanded = !expanded)}
			/>
		{/if}
	{/if}

	{#if filteredAndSortedTokens.length > 0}
		<!-- Value Footer -->
		<div class="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
			<div class="flex justify-between items-center">
				<span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Value:</span>
				<span class="text-sm font-bold text-zinc-800 dark:text-zinc-200">
					<ProtectedValue
						value={(() => {
							log.debug('[TokenPortfolio] Formatting total value for display', false, {
								totalValue,
								totalValueType: typeof totalValue
							});
							const result = formatValue(totalValue);
							log.debug('[TokenPortfolio] Formatted total value result', false, {
								result,
								containsNaN: result.includes('NaN')
							});
							return result;
						})()}
						placeholder="*****"
					/>
				</span>
			</div>
		</div>
	{/if}
</div>
