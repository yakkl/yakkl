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

<ul class="overflow-hidden">
	{#each tokens as token}
		<li class="mb-3 relative overflow-hidden">
			<button
				class="w-full flex items-start rounded-lg p-3 transition-colors duration-200 overflow-hidden {token?.customDefault === 'custom'
					? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
					: token?.sidepanel
						? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
						: 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}"
				onclick={() => onTokenSelect(token)}
			>
				<div
					class="w-6 h-6 flex items-center justify-center rounded-full {token?.customDefault === 'custom'
						? 'bg-emerald-500'
						: token?.sidepanel
							? 'bg-blue-500'
							: 'bg-gray-500'} text-white mr-3 shrink-0"
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
					<div class="flex items-center justify-between mb-1">
						<div class="flex items-center space-x-2">
							<h3 class="text-sm font-semibold text-gray-800">
								{token?.customDefault === 'custom' ? 'CUSTOM TOKEN' : 'COMMON TOKEN'}
							</h3>
							{#if token?.sidepanel}
								<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
									Visible
								</span>
							{/if}
							{#if token?.customDefault === 'custom'}
								<span class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
									Custom
								</span>
							{/if}
						</div>
					</div>
					<p class="text-sm font-medium text-gray-700 truncate mb-1" title={token.name}>
						{token.name}
					</p>
					<div class="flex items-center space-x-4 mb-2">
						<span class="text-xs text-gray-500 font-semibold" title="Token Symbol">
							{token.symbol}
						</span>
						{#if token.balance !== undefined && token.balance !== null}
							{@const rawBalance = typeof token.balance === 'bigint' ? Number(token.balance) / Math.pow(10, token.decimals || 18) : Number(token.balance)}
							{@const balanceNumber = isNaN(rawBalance) ? 0 : rawBalance}
							{@const balanceValue = balanceNumber * (token.price?.price || 0)}
							<SimpleTooltip content={`${balanceNumber.toFixed(8)} ${token.symbol} ≈ ${preciseFormatter.format(balanceValue)}`}>
								<span class="text-xs text-gray-600 font-medium cursor-help" title="Token Balance">
									Balance: {balanceNumber.toFixed(4)} {balanceValue > 0 ? `≈ ${currencyFormatter.format(balanceValue)}` : ''}
								</span>
							</SimpleTooltip>
						{/if}
					</div>
					<p class="text-xs text-gray-500 font-mono truncate mb-2" title={token.address}>
						{token.address}
					</p>

					<!-- Token info badges -->
					<div class="flex items-center space-x-2">
						{#if token.decimals}
							<span class="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
								{token.decimals} decimals
							</span>
						{/if}
						{#if token.price?.price !== undefined && token.price?.price !== null}
							{@const priceValue = Number(token.price.price)}
							{#if !isNaN(priceValue) && priceValue > 0}
								<SimpleTooltip content={preciseFormatter.format(priceValue)}>
									<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full cursor-help">
										{priceValue < 0.01 ? '~< $0.01' : currencyFormatter.format(priceValue)}
									</span>
								</SimpleTooltip>
							{/if}
						{/if}
						{#if token.change}
							{@const percentageValue = getTokenChange(token.change, '24h')}
							{#if percentageValue !== null}
								<span class="text-xs px-2 py-1 rounded-full {percentageValue >= 0
									? 'bg-green-100 text-green-700'
									: 'bg-red-100 text-red-700'}">
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
