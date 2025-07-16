<script lang="ts">
	import type { TokenData } from '$lib/common';
	import TokenForm from './TokenForm.svelte';
	import Confirmation from './Confirmation.svelte';
	import EditControls from './EditControls.svelte';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import { getTokenChange } from '$lib/utilities/utilities';

	interface Props {
		tokens?: TokenData[];
		onTokenSelect?: (token: TokenData) => void;
		onTokenUpdate?: (token: TokenData) => void;
		onTokenDelete?: (token: TokenData) => void;
	}

	let {
		tokens = [],
		onTokenSelect = () => {},
		onTokenUpdate = () => {},
		onTokenDelete = () => {}
	}: Props = $props();

	let selectedToken: TokenData | null = $state(null);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);

	// Currency formatter for USD values
	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	// Formatter for precise values (shows more decimals)
	const preciseFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 8
	});

	function handleEdit(token: TokenData) {
		selectedToken = token;
		showEditModal = true;
	}

	function handleDelete(token: TokenData) {
		if (token?.customDefault === 'custom') {
			selectedToken = token;
			showDeleteModal = true;
		}
	}

	function confirmDelete() {
		if (selectedToken && selectedToken?.customDefault === 'custom') {
			onTokenDelete(selectedToken);
			showDeleteModal = false;
			selectedToken = null;
		}
	}
</script>

<ul class="space-y-2">
	{#each tokens as token}
		<li class="relative group">
			<button
				class="w-full flex items-start rounded-2xl p-4 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-lg {token?.customDefault === 'custom'
					? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700 hover:from-emerald-100 hover:to-emerald-200/50 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30'
					: token?.sidepanel
						? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-blue-200/50 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30'
						: 'bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-800/50 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-700 hover:from-zinc-50 hover:to-zinc-100 dark:hover:from-zinc-800/70 dark:hover:to-zinc-900/70'}"
				onclick={() => onTokenSelect(token)}
			>
				<div
					class="w-10 h-10 flex items-center justify-center rounded-xl {token?.customDefault === 'custom'
						? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
						: token?.sidepanel
							? 'bg-gradient-to-br from-blue-500 to-blue-600'
							: 'bg-gradient-to-br from-zinc-500 to-zinc-600'} text-white mr-4 shrink-0 shadow-md"
				>
					{#if token?.customDefault === 'custom'}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-3 h-3"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-3 h-3"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z"
								clip-rule="evenodd"
							/>
						</svg>
					{/if}
				</div>
				<div class="flex-1 min-w-0 overflow-hidden">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<h3 class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
								{token?.customDefault === 'custom' ? 'Custom Token' : 'Common Token'}
							</h3>
							{#if token?.sidepanel}
								<span class="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full font-medium">
									Visible
								</span>
							{/if}
							{#if token?.customDefault === 'custom'}
								<span class="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
									Custom
								</span>
							{/if}
						</div>
					</div>
					<p class="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate mb-1" title={token.name}>
						{token.name}
					</p>
					<div class="flex items-center gap-3 mb-2">
						<span class="text-sm text-zinc-600 dark:text-zinc-400 font-medium" title="Token Symbol">
							{token.symbol}
						</span>
						{#if token.balance !== undefined && token.balance !== null}
							{@const rawBalance = typeof token.balance === 'bigint' ? Number(token.balance) / Math.pow(10, token.decimals || 18) : Number(token.balance)}
							{@const balanceNumber = isNaN(rawBalance) ? 0 : rawBalance}
							{@const balanceValue = balanceNumber * (token.price?.price || 0)}
							<SimpleTooltip content={`${balanceNumber.toFixed(8)} ${token.symbol} ≈ ${preciseFormatter.format(balanceValue)}`}>
								<span class="text-sm text-zinc-700 dark:text-zinc-300 font-medium cursor-help" title="Token Balance">
									{balanceNumber.toFixed(4)} {balanceValue > 0 ? `≈ ${currencyFormatter.format(balanceValue)}` : ''}
								</span>
							</SimpleTooltip>
						{/if}
					</div>
					<p class="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate mb-3" title={token.address}>
						{token.address}
					</p>

					<!-- Token info badges -->
					<div class="flex items-center gap-2 flex-wrap">
						{#if token.decimals}
							<span class="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full font-medium">
								{token.decimals} decimals
							</span>
						{/if}
						{#if token.price?.price !== undefined && token.price?.price !== null}
							{@const priceValue = Number(token.price.price)}
							{#if !isNaN(priceValue) && priceValue > 0}
								<SimpleTooltip content={preciseFormatter.format(priceValue)}>
									<span class="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full font-medium cursor-help">
										{priceValue < 0.01 ? '~< $0.01' : currencyFormatter.format(priceValue)}
									</span>
								</SimpleTooltip>
							{/if}
						{/if}
						{#if token.change}
							{@const percentageValue = getTokenChange(token.change, '24h')}
							{#if percentageValue !== null}
								<span class="text-[10px] px-2 py-0.5 rounded-full font-medium {percentageValue >= 0
									? 'bg-green-500/10 text-green-600 dark:text-green-400'
									: 'bg-red-500/10 text-red-600 dark:text-red-400'}">
									{percentageValue >= 0 ? '+' : ''}{percentageValue.toFixed(2)}%
								</span>
							{/if}
						{/if}
					</div>
				</div>
			</button>
			<EditControls
				onCopy={() => navigator.clipboard.writeText(token.address)}
				onEdit={() => handleEdit(token)}
				onDelete={() => handleDelete(token)}
				controls={token?.customDefault === 'custom' ? ['copy', 'edit', 'delete'] : ['copy', 'edit']}
				hasBalance={token.balance && Number(token.balance) > 0}
			/>
		</li>
	{/each}
</ul>

<TokenForm bind:show={showEditModal} token={selectedToken} onSubmit={onTokenUpdate} />

<Confirmation
	bind:show={showDeleteModal}
	onConfirm={confirmDelete}
	title="Delete Token"
	message="Are you sure you want to delete this token? This action cannot be undone."
/>
