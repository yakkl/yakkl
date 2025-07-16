<script lang="ts">
	import type { TokenData } from '$lib/common/interfaces';
	import { log } from '$lib/common/logger-wrapper';
	import { formatPrice, getTokenChange } from '$lib/utilities/utilities';
	import ProtectedValue from './ProtectedValue.svelte';

	let {
		token,
		locked = true,
		className = ''
	} = $props<{
		token: TokenData;
		locked?: boolean;
		className?: string;
	}>();

	// Determine the 24h percentChange color
	const percentChange: number | null = getTokenChange(token.change, '24h');
	const percentChangeColor =
		percentChange === null
			? 'text-slate-900'
			: percentChange >= 0
				? 'text-green-500'
				: 'text-red-500';

	// Use derived for computed values to avoid reactivity loops
	let balance = $derived(token?.balance);
	
	let price = $derived.by(() => {
		let extractedPrice = 0;
		
		// Handle both direct price number and price object
		if (typeof token?.price === 'number') {
			extractedPrice = token.price;
		} else if (token?.price?.price !== undefined) {
			extractedPrice = token.price.price;
		} else {
			extractedPrice = 0;
		}
		
		// TEMPORARY: Add hardcoded prices for testing
		if (extractedPrice === 0) {
			if (token.symbol === 'ETH' || token.symbol === 'WETH') {
				extractedPrice = 2345.67;
			} else if (token.symbol === 'USDC' || token.symbol === 'USDT') {
				extractedPrice = 1.00;
			} else if (token.symbol === 'DAI') {
				extractedPrice = 0.9999;
			} else if (token.symbol === 'SHIB') {
				extractedPrice = 0.00000823;
			}
		}
		
		return extractedPrice;
	});
	
	let priceFormatted = $derived(formatPrice(price));
	let value = $derived(balance ? Number(balance) * price : 0);
	let valueFormatted = $derived(formatPrice(value));
	
	// Use effect only for logging, not for setting state
	$effect(() => {
		// Log the price extraction for debugging
		log.debug('TokenLineView price extraction', false, {
			symbol: token.symbol,
			tokenPrice: token.price,
			extractedPrice: price,
			hardcodedPrice: price
		});
	});

	log.info('TokenLineView', false, {
		tokenSymbol: token.symbol,
		tokenName: token.name,
		locked,
		balance: token.balance,
		quantity: token.quantity,
		priceObject: token.price,
		priceValue: token.price?.price,
		value: token.value
	});

	// Function to format the tooltip price based on the value
	function getTooltipPrice(): string {
		if (!price || price === 0) {
			return '$0.00';
		}
		// Always show full precision in tooltip
		const decimals = price < 0.000001 ? 12 : price < 0.01 ? 8 : 6;
		const formatted = price.toFixed(decimals);
		// Remove trailing zeros but keep at least 2 decimal places
		const trimmed = formatted.replace(/(\.\d\d)\d*?0+$/, '$1').replace(/\.?0+$/, '');
		return `$${trimmed}`;
	}
	
	// Function to format the display price
	function getDisplayPrice(): string {
		// Debug log
		console.log(`[TokenLineView] getDisplayPrice for ${token.symbol}:`, {
			tokenPrice: token?.price,
			priceValue: price,
			tokenValue: token?.value
		});
		
		// First check if we have any price data at all
		if (token?.price === null || token?.price === undefined) {
			return '---'; // No price data available
		}
		
		// Extract the actual price value
		let actualPrice = 0;
		if (typeof token.price === 'number') {
			actualPrice = token.price;
		} else if (token.price?.price !== undefined) {
			actualPrice = token.price.price;
		}
		
		// Format based on value
		if (!actualPrice || actualPrice === 0) {
			return '$0.00';
		}
		if (actualPrice < 0.01) {
			return '~< $0.01';
		}
		return formatPrice(actualPrice);
	}
</script>

{#if token.url}
	<a
		href={token.url}
		target="_blank"
		rel="noopener noreferrer"
		class="flex justify-between items-center py-1.5 px-2 border-b border-gray-200 border-solid hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer {className}"
	>
		<div class="flex items-center gap-2 item">
			{#if token.icon || token.logoURI}
				{@const iconUrl = token.icon || token.logoURI}
				{@const isImagePath = iconUrl && (iconUrl.startsWith('/') || iconUrl.startsWith('http') || iconUrl.includes('.svg') || iconUrl.includes('.png') || iconUrl.includes('.jpg') || iconUrl.includes('.jpeg') || iconUrl.includes('.gif') || iconUrl.includes('.webp'))}
				{#if isImagePath}
					<!-- Image files (local or remote) -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else}
					<!-- Text/emoji icons -->
					<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
						{iconUrl || token.symbol?.[0] || '?'}
					</div>
				{/if}
			{:else}
				<!-- No icon provided -->
				<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
					{token.symbol?.[0] || '?'}
				</div>
			{/if}
			<div>
				<p class="text-sm font-medium">{token.name} ({token.symbol})</p>
				<!-- <p class="text-xs text-gray-500">Balance: <ProtectedValue value={token.balance?.toString() ?? '0'} placeholder="*******" /></p> -->
			</div>
		</div>
		<div class="text-right">
			<span 
				class="text-sm font-medium cursor-help text-gray-900 dark:text-gray-100" 
				title={getTooltipPrice()}
			>
				{getDisplayPrice()}
			</span>
			<!-- <p class="text-xs {percentChangeColor}">{percentChange ? `${percentChange > 0 ? '+' : ''}${percentChange}%` : '--'}</p> -->
		</div>
	</a>
{:else}
	<div
		class="flex justify-between items-center py-1.5 px-2 border-b border-gray-200 border-solid hover:bg-gray-50 dark:hover:bg-zinc-800 item {className}"
	>
		<div class="flex items-center gap-2">
			{#if token.icon || token.logoURI}
				{@const iconUrl = token.icon || token.logoURI}
				{@const isImagePath = iconUrl && (iconUrl.startsWith('/') || iconUrl.startsWith('http') || iconUrl.includes('.svg') || iconUrl.includes('.png') || iconUrl.includes('.jpg') || iconUrl.includes('.jpeg') || iconUrl.includes('.gif') || iconUrl.includes('.webp'))}
				{#if isImagePath}
					<!-- Image files (local or remote) -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else}
					<!-- Text/emoji icons -->
					<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
						{iconUrl || token.symbol?.[0] || '?'}
					</div>
				{/if}
			{:else}
				<!-- No icon provided -->
				<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
					{token.symbol?.[0] || '?'}
				</div>
			{/if}
			<div>
				<p class="text-sm font-medium">{token.name} ({token.symbol})</p>
				<!-- <p class="text-xs text-gray-500">Balance: <ProtectedValue value={token.balance?.toString() ?? '0'} placeholder="*******" /></p> -->
			</div>
		</div>
		<div class="text-right">
			<span 
				class="text-sm font-medium cursor-help text-gray-900 dark:text-gray-100" 
				title={getTooltipPrice()}
			>
				{getDisplayPrice()}
			</span>
			<!-- <p class="text-xs {percentChangeColor}">{percentChange ? `${percentChange > 0 ? '+' : ''}${percentChange}%` : '--'}</p> -->
		</div>
	</div>
{/if}
