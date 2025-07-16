<script lang="ts">
	import type { TokenData } from '$lib/common/interfaces';
	import { log } from '$lib/common/logger-wrapper';
	import { formatPrice, getTokenChange } from '$lib/utilities/utilities';
	import ProtectedValue from './ProtectedValue.svelte';
	import Tooltip from './Tooltip.svelte';

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
	let price = $derived(token?.price?.price ?? 0);
	let priceFormatted = $derived(formatPrice(price));
	let value = $derived(balance ? Number(balance) * price : 0);
	let valueFormatted = $derived(formatPrice(value));

	log.info('TokenLineView', false, {
		token,
		locked,
		balance: token.balance,
		quantity: token.quantity,
		price: token.price?.price
	});

	// Function to format the tooltip price based on the value
	function getTooltipPrice(): string {
		if (price < 0.01) {
			// Format with token decimals and trim trailing zeros
			const formatted = price.toFixed(token.decimals);
			return `$${formatted.replace(/\.?0+$/, '')}`;
		}
		return `${formatPrice(price)}`;
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
				{#if iconUrl?.startsWith('/images/')}
					<!-- Local image files should use img tag -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { const target = e.currentTarget as HTMLImageElement; target.style.display='none'; const nextElement = target.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else if iconUrl?.startsWith('http')}
					<!-- External URLs -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { const target = e.currentTarget as HTMLImageElement; target.style.display='none'; const nextElement = target.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else}
					<!-- Text/emoji icons or missing icons -->
					<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
						{iconUrl || token.symbol?.[0] || '?'}
					</div>
				{/if}
			{/if}
			<div>
				<p class="text-sm font-medium">{token.name} ({token.symbol})</p>
				<!-- <p class="text-xs text-gray-500">Balance: <ProtectedValue value={token.balance?.toString() ?? '0'} placeholder="*******" /></p> -->
			</div>
		</div>
		<div class="text-right">
			<Tooltip content={getTooltipPrice()}>
				<p class="text-sm font-medium">
					{price < 0.01
						? '< .01 ~' + formatPrice(token.price?.price ?? 0)
						: formatPrice(token.price?.price ?? 0)}
				</p>
			</Tooltip>
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
				{#if iconUrl?.startsWith('/images/')}
					<!-- Local image files should use img tag -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { const target = e.currentTarget as HTMLImageElement; target.style.display='none'; const nextElement = target.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else if iconUrl?.startsWith('http')}
					<!-- External URLs -->
					<img src={iconUrl} alt={token.symbol} class="w-6 h-6 rounded-full" onerror={(e) => { const target = e.currentTarget as HTMLImageElement; target.style.display='none'; const nextElement = target.nextElementSibling as HTMLElement; if (nextElement) nextElement.style.display='flex'; }} />
					<div class="w-6 h-6 rounded-full items-center justify-center bg-gray-400 text-white font-bold text-xs" style="display:none;">
						{token.symbol?.[0] || '?'}
					</div>
				{:else}
					<!-- Text/emoji icons or missing icons -->
					<div class="w-6 h-6 rounded-full flex items-center justify-center bg-gray-400 text-white font-bold text-xs">
						{iconUrl || token.symbol?.[0] || '?'}
					</div>
				{/if}
			{/if}
			<div>
				<p class="text-sm font-medium">{token.name} ({token.symbol})</p>
				<!-- <p class="text-xs text-gray-500">Balance: <ProtectedValue value={token.balance?.toString() ?? '0'} placeholder="*******" /></p> -->
			</div>
		</div>
		<div class="text-right">
			<Tooltip content={getTooltipPrice()}>
				<p class="text-sm font-medium">
					{price < 0.01
						? '< .01 ~' + formatPrice(token.price?.price ?? 0)
						: formatPrice(token.price?.price ?? 0)}
				</p>
			</Tooltip>
			<!-- <p class="text-xs {percentChangeColor}">{percentChange ? `${percentChange > 0 ? '+' : ''}${percentChange}%` : '--'}</p> -->
		</div>
	</div>
{/if}
