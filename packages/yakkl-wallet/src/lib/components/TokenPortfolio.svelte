<script lang="ts">
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import MoreLess from './MoreLess.svelte';
	import { tokenStore, isMultiChainView } from '$lib/stores/token.store';
	import { canUseFeature } from '$lib/utils/features';
	import ProtectedValue from './ProtectedValue.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { BigNumber } from '$lib/common/bignumber';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
	// Import portfolio stability service for stable token data
	import { portfolioStability, PortfolioState } from '$lib/services/portfolio-stability.service';

	let { tokens = [], className = '', maxRows = 6, loading = false } = $props();

// Add comprehensive validation for tokens prop
$effect(() => {
	console.log('[TokenPortfolio] Props validation', {
		tokens: {
			value: tokens,
			isArray: Array.isArray(tokens),
			count: tokens?.length || 0,
			type: typeof tokens,
			firstToken: tokens?.[0]
		},
		loading,
		maxRows,
		className
	});
	
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

	let expanded = $state(false);
	let sortBy = $state<'name' | 'value' | 'price' | 'quantity'>('value');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let multiChainView = $derived($isMultiChainView);
	let isRefreshing = $state(false);
	let lastRefreshTime = $state(0);
	let timeUntilNextRefresh = $state(0);
	
	// Get stable token data from stability service
	const stableTokens = portfolioStability.getStableTokens();
	const tokenState = portfolioStability.getPortfolioState();
	
	// Update stability service when tokens prop changes
	$effect(() => {
		console.log('[TokenPortfolio] Tokens prop changed, updating stability service', {
			tokens: {
				count: tokens?.length || 0,
				isArray: Array.isArray(tokens),
				hasValue: !!tokens,
				data: tokens?.slice(0, 2).map(t => ({
					symbol: t?.symbol,
					value: t?.value,
					valueType: typeof t?.value,
					price: t?.price,
					qty: t?.qty
				}))
			}
		});
		
		if (tokens && Array.isArray(tokens) && tokens.length > 0) {
			log.info('[TokenPortfolio] Updating portfolio stability with new tokens', false, { count: tokens.length });
			portfolioStability.updateTokenList(tokens, 'fetched');
		} else {
			log.debug('[TokenPortfolio] No valid tokens to update stability service', false, { tokens });
		}
	});
	
	// Use stable tokens if available, otherwise use props
	let displayTokens = $derived.by(() => {
		const stableTokensArray = $stableTokens;
		const hasStableTokens = Array.isArray(stableTokensArray) && stableTokensArray.length > 0;
		const result = hasStableTokens ? stableTokensArray : tokens;
		
		console.log('[TokenPortfolio] displayTokens derived:', {
			stableTokensCount: stableTokensArray?.length || 0,
			propsTokensCount: tokens?.length || 0,
			usingStable: hasStableTokens,
			resultCount: result?.length || 0,
			resultIsArray: Array.isArray(result),
			firstToken: result?.[0]
		});
		
		return result;
	});

	// Rate limiting constants
	const REFRESH_COOLDOWN_MS = 5000; // 5 seconds between refreshes
	const MIN_TIME_BETWEEN_CLICKS = 1000; // 1 second minimum between button clicks

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

	// Calculate total value of all tokens using BigNumber for precision
	// Values are stored as bigint in cents, need to convert to dollars for display
	let totalValue = $derived.by(() => {
		// Ensure displayTokens is always an array to prevent flickering
		if (!Array.isArray(displayTokens)) {
			log.debug('[TokenPortfolio] totalValue: displayTokens is not array', false, { displayTokens });
			return 0;
		}
		
		const total = displayTokens.reduce((sum, token, index) => {
			// Guard against undefined tokens to prevent flickering
			if (!token || token.value === undefined || token.value === null) {
				log.debug(`[TokenPortfolio] totalValue: Token ${index} is invalid`, false, { token });
				return sum;
			}
			
			// Convert token value to number (dollars) safely
			let value = 0;
			try {
				log.debug(`[TokenPortfolio] totalValue: Processing token ${token.symbol}`, false, {
					token: {
						symbol: token.symbol,
						value: token.value,
						valueType: typeof token.value,
						price: token.price,
						qty: token.qty
					}
				});
				
				if (typeof token.value === 'bigint') {
					// bigint values are in cents, convert to dollars
					value = Number(token.value) / 100;
					log.debug(`[TokenPortfolio] totalValue: Converted bigint ${token.value} to ${value}`, false);
				} else if (typeof token.value === 'number') {
					value = token.value;
					log.debug(`[TokenPortfolio] totalValue: Using number value ${value}`, false);
				} else if (typeof token.value === 'string') {
					// Use BigNumber to handle the conversion
					const bn = new BigNumber(token.value || '0');
					const numValue = bn.toNumber();
					value = numValue || 0;
					log.debug(`[TokenPortfolio] totalValue: Converted string ${token.value} via BigNumber to ${value}`, false, { numValue });
				} else if (token.value && typeof token.value === 'object' && 'toString' in token.value) {
					// Handle BigNumberish types
					const str = token.value.toString();
					const bigintVal = BigInt(str || '0');
					value = Number(bigintVal) / 100; // Assuming cents
					log.debug(`[TokenPortfolio] totalValue: Converted object ${str} to ${value}`, false);
				}
				
				// Validate the result and provide detailed diagnostics
				if (!isFinite(value) || isNaN(value)) {
					log.error(`[TokenPortfolio] totalValue: CRITICAL - NaN/Infinite value detected for ${token.symbol}`, false, {
						originalValue: token.value,
						originalType: typeof token.value,
						convertedValue: value,
						isFinite: isFinite(value),
						isNaN: isNaN(value),
						tokenPrice: token.price,
						tokenQty: token.qty,
						calculationDebug: {
							priceTimesQty: token.price && token.qty ? token.price * token.qty : 'N/A',
							bigintConversion: typeof token.value === 'bigint' ? 
								(token.value <= BigInt(Number.MAX_SAFE_INTEGER) 
									? `${token.value} -> ${Number(token.value)} -> ${Number(token.value) / 100}` 
									: `${token.value} (too large for safe conversion)`) 
								: 'N/A'
						}
					});
					value = 0;
				}
			} catch (error) {
				log.error(`[TokenPortfolio] totalValue: Error converting ${token.symbol} value`, false, {
					error,
					token: {
						symbol: token.symbol,
						value: token.value,
						valueType: typeof token.value
					}
				});
				value = 0;
			}
			
			log.debug(`[TokenPortfolio] totalValue: Token ${token.symbol} contributes ${value} to total`, false);
			return sum + value;
		}, 0);
		
		log.debug('[TokenPortfolio] totalValue: Final total calculated', false, { total, tokenCount: displayTokens.length });
		return total;
	});

	// Filter tokens with value > 0 and sort them
	let filteredAndSortedTokens = $derived.by(() => {
		// Ensure displayTokens is always an array to prevent flickering
		if (!Array.isArray(displayTokens)) {
			log.debug('[TokenPortfolio] filteredAndSortedTokens: displayTokens is not array', false, { displayTokens });
			return [];
		}
		
		console.log('[TokenPortfolio] filteredAndSortedTokens: Processing tokens', {
			tokenCount: displayTokens.length,
			sortBy,
			sortOrder,
			tokens: displayTokens.map(t => ({
				symbol: t?.symbol,
				value: t?.value,
				valueType: typeof t?.value,
				price: t?.price,
				qty: t?.qty
			}))
		});
		
		// For debugging: show all tokens, not just those with value > 0
		// const filtered = displayTokens.filter(token => {
		//   const value = typeof token.value === 'number' ? token.value : parseFloat(token.value || '0');
		//   return value > 0;
		// });
		const filtered = displayTokens; // Show all tokens for now

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
							
							log.debug('[TokenPortfolio] filteredAndSortedTokens: Comparing values', false, {
								a: { symbol: a.symbol, value: a.value, converted: aVal },
								b: { symbol: b.symbol, value: b.value, converted: bVal }
							});
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
		log.debug('[TokenPortfolio] visible tokens calculated', false, {
			expanded,
			maxRows,
			totalTokens: filteredAndSortedTokens.length,
			visibleCount: result.length
		});
		return result;
	});
	
	let hidden = $derived.by(() => {
		if (!Array.isArray(filteredAndSortedTokens)) {
			log.warn('[TokenPortfolio] hidden: filteredAndSortedTokens is not an array', false, { filteredAndSortedTokens });
			return [];
		}
		
		const result = expanded ? [] : filteredAndSortedTokens.slice(maxRows);
		log.debug('[TokenPortfolio] hidden tokens calculated', false, {
			expanded,
			maxRows,
			totalTokens: filteredAndSortedTokens.length,
			hiddenCount: result.length
		});
		return result;
	});

	// Debug effect - extensive logging to track data flow
	$effect(() => {
		// Log every change to understand the data flow
		log.debug('[TokenPortfolio] Data state changed:', false, {
			tokens: {
				count: tokens?.length || 0,
				isArray: Array.isArray(tokens),
				data: tokens?.slice(0, 3).map(t => ({
					symbol: t?.symbol,
					value: t?.value,
					valueType: typeof t?.value,
					price: t?.price,
					qty: t?.qty
				}))
			},
			stableTokens: {
				count: $stableTokens?.length || 0,
				isArray: Array.isArray($stableTokens)
			},
			displayTokens: {
				count: displayTokens?.length || 0,
				isArray: Array.isArray(displayTokens),
				source: $stableTokens?.length > 0 ? 'stable' : 'props'
			},
			filteredAndSortedTokens: {
				count: filteredAndSortedTokens?.length || 0
			},
			totalValue,
			multiChainView,
			sortBy,
			sortOrder,
			tokenState: $tokenState
		});
		
		// Log any NaN values found
		if (Array.isArray(displayTokens)) {
			displayTokens.forEach((token, index) => {
				if (token && token.value !== undefined) {
					const formattedValue = formatValue(token.value);
					if (formattedValue.includes('NaN')) {
						log.error('[TokenPortfolio] NaN detected in token value', false, {
							index,
							token: {
								symbol: token.symbol,
								value: token.value,
								valueType: typeof token.value,
								price: token.price,
								qty: token.qty
							},
							formattedValue
						});
					}
				}
			});
		}
		
		// Comprehensive NaN detection and debugging
		if (isNaN(totalValue) || !isFinite(totalValue)) {
			log.error('[TokenPortfolio] CRITICAL: totalValue is NaN or infinite!', false, {
				totalValue,
				totalValueType: typeof totalValue,
				isNaN: isNaN(totalValue),
				isFinite: isFinite(totalValue),
				displayTokens: displayTokens?.map(t => ({
					symbol: t?.symbol,
					value: t?.value,
					valueType: typeof t?.value,
					price: t?.price,
					qty: t?.qty,
					valueString: String(t?.value),
					valueNumber: typeof t?.value === 'bigint' ? Number(t?.value) / 100 : Number(t?.value),
					priceTimesQty: t?.price && t?.qty ? (
						typeof t?.qty === 'bigint' 
							? t.price * (Number(t?.qty) / Math.pow(10, 18)) // Rough conversion for display
							: t.price * Number(t?.qty)
					) : null
				}))
			});
			
			// Try to identify the problematic token
			if (Array.isArray(displayTokens)) {
				displayTokens.forEach((token, index) => {
					if (token && token.value !== undefined) {
						let testValue = 0;
						try {
							if (typeof token.value === 'bigint') {
								testValue = Number(token.value) / 100;
							} else if (typeof token.value === 'number') {
								testValue = token.value;
							} else if (typeof token.value === 'string') {
								const bn = new BigNumber(token.value || '0');
								testValue = bn.toNumber() || 0;
							}
							
							if (isNaN(testValue) || !isFinite(testValue)) {
								log.error(`[TokenPortfolio] FOUND NaN SOURCE: Token ${token.symbol} at index ${index}`, false, {
									token,
									testValue,
									conversionAttempt: {
										original: token.value,
										type: typeof token.value,
										string: String(token.value),
										number: Number(token.value)
									}
								});
							}
						} catch (error) {
							log.error(`[TokenPortfolio] Error testing token ${token.symbol} value:`, false, { error, token });
						}
					}
				});
			}
		}
	});

	// Helper for long values
	function needsEllipsis(val: number | undefined) {
		const result = String(val ?? '').length > 9;
		log.debug('[TokenPortfolio] needsEllipsis check', false, { val, length: String(val ?? '').length, needsEllipsis: result });
		return result;
	}

	function formatValue(val: number | bigint | undefined): string {
		log.debug('[TokenPortfolio] formatValue called', false, { val, type: typeof val });
		
		if (val === undefined || val === null) {
			log.debug('[TokenPortfolio] formatValue: Value is undefined/null', false);
			return '$0.00';
		}
		
		// Handle zero values
		if (val === 0 || val === 0n) {
			log.debug('[TokenPortfolio] formatValue: Value is zero', false);
			return '$0.00';
		}

		let numValue: number;
		
		try {
			// Convert bigint (cents) to number (dollars) for display
			if (typeof val === 'bigint') {
				numValue = Number(val) / 100;
				log.debug('[TokenPortfolio] formatValue: Converted bigint to number', false, { original: val.toString(), converted: numValue });
			} else {
				numValue = val;
				log.debug('[TokenPortfolio] formatValue: Using number value directly', false, { numValue });
			}
			
			// Validate the numeric value with detailed diagnostics
			if (!isFinite(numValue) || isNaN(numValue)) {
				log.error('[TokenPortfolio] formatValue: CRITICAL - NaN/Infinite detected in formatValue', false, {
					original: val,
					originalType: typeof val,
					converted: numValue,
					isFinite: isFinite(numValue),
					isNaN: isNaN(numValue),
					valAsString: String(val),
					valLength: String(val).length,
					conversionStack: new Error().stack?.split('\n').slice(0, 5)
				});
				return '$0.00';
			}
			
			const absValue = Math.abs(numValue);
			log.debug('[TokenPortfolio] formatValue: Processing valid value', false, { numValue, absValue });

			if (absValue >= 1e12) {
				const result = `$${(numValue / 1e12).toFixed(1)}T+`;
				log.debug('[TokenPortfolio] formatValue: Formatted as trillions', false, { result });
				return result;
			} else if (absValue >= 1e9) {
				const result = `$${(numValue / 1e9).toFixed(1)}B+`;
				log.debug('[TokenPortfolio] formatValue: Formatted as billions', false, { result });
				return result;
			} else if (absValue >= 1e6) {
				const result = `$${(numValue / 1e6).toFixed(1)}M+`;
				log.debug('[TokenPortfolio] formatValue: Formatted as millions', false, { result });
				return result;
			} else if (absValue >= 1e3) {
				const result = `$${(numValue / 1e3).toFixed(1)}K+`;
				log.debug('[TokenPortfolio] formatValue: Formatted as thousands', false, { result });
				return result;
			}

			const result = new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'USD',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(numValue);
			
			log.debug('[TokenPortfolio] formatValue: Formatted as currency', false, { result });
			return result;
		} catch (error) {
			log.error('[TokenPortfolio] formatValue: Failed to format value', false, { val, error });
			return '$0.00';
		}
	}

	function formatPrice(price: number | undefined): string {
		log.debug('[TokenPortfolio] formatPrice called', false, { price, type: typeof price });
		
		if (price === undefined || price === null || isNaN(price) || !isFinite(price)) {
			log.debug('[TokenPortfolio] formatPrice: Invalid price', false, { price });
			return '$0.00';
		}
		
		if (price === 0) {
			log.debug('[TokenPortfolio] formatPrice: Price is zero', false);
			return '$0.00';
		}

		const absPrice = Math.abs(price);
		log.debug('[TokenPortfolio] formatPrice: Processing valid price', false, { price, absPrice });
		
		if (absPrice >= 1e6) {
			const result = `$${(price / 1e6).toFixed(1)}M+`;
			log.debug('[TokenPortfolio] formatPrice: Formatted as millions', false, { result });
			return result;
		} else if (absPrice >= 1e3) {
			const result = `$${(price / 1e3).toFixed(1)}K+`;
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
			maximumFractionDigits: price < 1 ? 6 : 2
		}).format(price);
		
		log.debug('[TokenPortfolio] formatPrice: Formatted as currency', false, { result });
		return result;
	}

	function formatValueFull(val: number | bigint | undefined): string {
		log.debug('[TokenPortfolio] formatValueFull called', false, { val, type: typeof val });
		
		if (val === undefined || val === null) {
			log.debug('[TokenPortfolio] formatValueFull: Value is undefined/null', false);
			return '$0.00';
		}
		
		if (val === 0 || val === 0n) {
			log.debug('[TokenPortfolio] formatValueFull: Value is zero', false);
			return '$0.00';
		}
		
		// Convert bigint (cents) to number (dollars) for display
		let numValue: number;
		if (typeof val === 'bigint') {
			numValue = Number(val) / 100;
			log.debug('[TokenPortfolio] formatValueFull: Converted bigint', false, { original: val.toString(), converted: numValue });
		} else {
			numValue = val;
			log.debug('[TokenPortfolio] formatValueFull: Using number directly', false, { numValue });
		}
		
		if (!isFinite(numValue) || isNaN(numValue)) {
			log.warn('[TokenPortfolio] formatValueFull: Invalid numeric value', false, { val, numValue });
			return '$0.00';
		}
		
		const result = new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(numValue);
		
		log.debug('[TokenPortfolio] formatValueFull: Final result', false, { result });
		return result;
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
									const qty = token.qty;
									log.debug('[TokenPortfolio] Processing quantity for display', false, {
										symbol: token.symbol,
										qty,
										qtyType: typeof qty
									});
									
									if (qty === undefined || qty === null || isNaN(Number(qty))) {
										log.warn('[TokenPortfolio] Invalid quantity detected', false, { symbol: token.symbol, qty });
										return '0';
									}
									
									const qtyStr = String(qty);
									return needsEllipsis(qty) ? qtyStr.slice(0, 9) + '…' : qtyStr;
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
									log.debug('[TokenPortfolio] Formatting value for display', false, {
										symbol: token.symbol,
										value: token.value,
										valueType: typeof token.value
									});
									const result = formatValue(token.value);
									log.debug('[TokenPortfolio] Formatted value result', false, {
										symbol: token.symbol,
										result,
										containsNaN: result.includes('NaN')
									});
									return result;
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
