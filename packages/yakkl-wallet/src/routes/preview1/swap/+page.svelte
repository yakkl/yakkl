<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Swap state
	let fromAsset = $state({
		symbol: 'ETH',
		name: 'Ethereum',
		balance: '0.1736',
		value: '$40.28',
		icon: '⟐',
		price: 2320.50
	});

	let toAsset = $state({
		symbol: 'USDT',
		name: 'Tether USD',
		balance: '297.92',
		value: '$297.92',
		icon: '₮',
		price: 1.00
	});

	let fromAmount = $state('');
	let toAmount = $state('');
	let slippage = $state(0.5);
	let showSlippageSettings = $state(false);

	// Mock available tokens
	let availableTokens = $state([
		{ symbol: 'ETH', name: 'Ethereum', balance: '0.1736', icon: '⟐', price: 2320.50 },
		{ symbol: 'USDT', name: 'Tether USD', balance: '297.92', icon: '₮', price: 1.00 },
		{ symbol: 'USDC', name: 'USD Coin', balance: '150.00', icon: '💵', price: 1.00 },
		{ symbol: 'PEPE', name: 'Pepe', balance: '1432.37', icon: '🐸', price: 0.000012 },
		{ symbol: 'UNI', name: 'Uniswap', balance: '25.50', icon: '🦄', price: 8.45 }
	]);

	let swapRate = $derived(
		fromAsset && toAsset ? fromAsset.price / toAsset.price : 0
	);

	let estimatedGas = $state('$3.21');
	let priceImpact = $state('0.1%');
	let minimumReceived = $derived(
		toAmount ? (parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6) : '0'
	);

	let showFromSelector = $state(false);
	let showToSelector = $state(false);

	// Calculate to amount when from amount changes
	$effect(() => {
		if (fromAmount && swapRate) {
			const calculated = parseFloat(fromAmount) * swapRate;
			toAmount = calculated.toFixed(6);
		} else if (!fromAmount) {
			toAmount = '';
		}
	});

	function swapTokens() {
		const temp = fromAsset;
		fromAsset = toAsset;
		toAsset = temp;
		
		// Clear amounts
		fromAmount = '';
		toAmount = '';
	}

	function selectFromToken(token: any) {
		fromAsset = { ...token, balance: token.balance, value: `$${(parseFloat(token.balance) * token.price).toFixed(2)}` };
		showFromSelector = false;
		fromAmount = '';
		toAmount = '';
	}

	function selectToToken(token: any) {
		toAsset = { ...token, balance: token.balance, value: `$${(parseFloat(token.balance) * token.price).toFixed(2)}` };
		showToSelector = false;
		fromAmount = '';
		toAmount = '';
	}

	function setMaxAmount() {
		fromAmount = fromAsset.balance;
	}

	function handleSwap() {
		// TODO: Implement actual swap
		console.log('Swapping:', { fromAsset, toAsset, fromAmount, toAmount, slippage });
		alert('Swap executed successfully!');
		goto('/new-wallet');
	}

	function goBack() {
		goto('/new-wallet');
	}

	let isValidSwap = $derived(
		fromAmount && 
		toAmount && 
		parseFloat(fromAmount) > 0 && 
		parseFloat(fromAmount) <= parseFloat(fromAsset.balance)
	);
</script>

<svelte:head>
	<title>Swap - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto p-4 space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-4">
				<BackButton onclick={goBack} />
				<div>
					<h1 class="text-xl font-semibold text-text-primary">Swap Tokens</h1>
					<p class="text-sm text-text-muted">Exchange one token for another</p>
				</div>
			</div>
			
			<!-- Slippage Settings -->
			<button
				onclick={() => showSlippageSettings = !showSlippageSettings}
				class="p-2 rounded-button hover:bg-surface transition-colors"
				aria-label="Slippage settings"
			>
				<svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			</button>
		</div>

		<!-- Slippage Settings Panel -->
		{#if showSlippageSettings}
			<div 
				class="bg-surface rounded-card p-4 border border-border"
				in:fly={{ y: -10, duration: 200 }}
				out:fly={{ y: -10, duration: 150 }}
			>
				<h3 class="font-medium text-text-primary mb-3">Slippage Tolerance</h3>
				<div class="grid grid-cols-4 gap-2 mb-3">
					<button
						onclick={() => slippage = 0.1}
						class="py-2 text-sm font-medium rounded-button transition-all {slippage === 0.1 ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
					>
						0.1%
					</button>
					<button
						onclick={() => slippage = 0.5}
						class="py-2 text-sm font-medium rounded-button transition-all {slippage === 0.5 ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
					>
						0.5%
					</button>
					<button
						onclick={() => slippage = 1.0}
						class="py-2 text-sm font-medium rounded-button transition-all {slippage === 1.0 ? 'bg-primary-500 text-white' : 'bg-background text-text-secondary hover:bg-surface'}"
					>
						1.0%
					</button>
					<input
						bind:value={slippage}
						type="number"
						step="0.1"
						min="0"
						max="50"
						class="py-2 px-2 text-sm text-center bg-background border border-border rounded-button focus:ring-2 focus:ring-primary-500 focus:border-transparent"
						placeholder="Custom"
					/>
				</div>
				<p class="text-xs text-text-muted">
					Your transaction will revert if the price changes unfavorably by more than this percentage.
				</p>
			</div>
		{/if}

		<!-- From Token -->
		<div class="space-y-2">
			<div class="flex justify-between items-center">
				<label class="text-sm font-medium text-text-primary">From</label>
				<span class="text-xs text-text-muted">
					Balance: {fromAsset.balance} {fromAsset.symbol}
				</span>
			</div>
			
			<div class="bg-surface rounded-card p-4">
				<div class="flex items-center justify-between mb-3">
					<button
						onclick={() => showFromSelector = !showFromSelector}
						class="flex items-center space-x-2 hover:bg-background rounded-button p-2 transition-all group"
					>
						<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
							{fromAsset.icon}
						</div>
						<div class="text-left">
							<p class="font-medium text-text-primary">{fromAsset.symbol}</p>
							<p class="text-xs text-text-muted">{fromAsset.name}</p>
						</div>
						<svg class="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					<button
						onclick={setMaxAmount}
						class="text-xs font-medium text-primary-500 hover:text-primary-600 transition-colors bg-primary-50 px-2 py-1 rounded"
					>
						MAX
					</button>
				</div>
				
				<input
					bind:value={fromAmount}
					type="number"
					step="any"
					placeholder="0.0"
					class="w-full text-2xl bg-transparent border-none outline-none text-text-primary placeholder-text-muted"
				/>
				
				{#if fromAmount}
					<p class="text-sm text-text-muted mt-1">
						≈ ${(parseFloat(fromAmount) * fromAsset.price).toFixed(2)}
					</p>
				{/if}
			</div>

			{#if showFromSelector}
				<div 
					class="bg-surface-elevated rounded-card border border-border p-2 space-y-1 max-h-60 overflow-y-auto"
					in:fly={{ y: -10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
				>
					{#each availableTokens as token (token.symbol)}
						<button
							onclick={() => selectFromToken(token)}
							class="w-full flex items-center justify-between p-3 rounded-button hover:bg-background transition-all {token.symbol === fromAsset.symbol ? 'bg-primary-50 text-primary-700' : ''}"
						>
							<div class="flex items-center space-x-3">
								<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
									{token.icon}
								</div>
								<div class="text-left">
									<p class="font-medium">{token.symbol}</p>
									<p class="text-xs text-text-muted">{token.name}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium">{token.balance}</p>
								<p class="text-xs text-text-muted">${(parseFloat(token.balance) * token.price).toFixed(2)}</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Swap Button -->
		<div class="flex justify-center">
			<button
				onclick={swapTokens}
				class="p-3 bg-surface hover:bg-surface-elevated rounded-full transition-all group border-2 border-border"
			>
				<svg class="w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
				</svg>
			</button>
		</div>

		<!-- To Token -->
		<div class="space-y-2">
			<div class="flex justify-between items-center">
				<label class="text-sm font-medium text-text-primary">To</label>
				<span class="text-xs text-text-muted">
					Balance: {toAsset.balance} {toAsset.symbol}
				</span>
			</div>
			
			<div class="bg-surface rounded-card p-4">
				<div class="flex items-center justify-between mb-3">
					<button
						onclick={() => showToSelector = !showToSelector}
						class="flex items-center space-x-2 hover:bg-background rounded-button p-2 transition-all group"
					>
						<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
							{toAsset.icon}
						</div>
						<div class="text-left">
							<p class="font-medium text-text-primary">{toAsset.symbol}</p>
							<p class="text-xs text-text-muted">{toAsset.name}</p>
						</div>
						<svg class="w-4 h-4 text-text-muted group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>
				
				<input
					bind:value={toAmount}
					type="number"
					step="any"
					placeholder="0.0"
					readonly
					class="w-full text-2xl bg-transparent border-none outline-none text-text-primary placeholder-text-muted cursor-not-allowed"
				/>
				
				{#if toAmount}
					<p class="text-sm text-text-muted mt-1">
						≈ ${(parseFloat(toAmount) * toAsset.price).toFixed(2)}
					</p>
				{/if}
			</div>

			{#if showToSelector}
				<div 
					class="bg-surface-elevated rounded-card border border-border p-2 space-y-1 max-h-60 overflow-y-auto"
					in:fly={{ y: -10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
				>
					{#each availableTokens as token (token.symbol)}
						<button
							onclick={() => selectToToken(token)}
							class="w-full flex items-center justify-between p-3 rounded-button hover:bg-background transition-all {token.symbol === toAsset.symbol ? 'bg-primary-50 text-primary-700' : ''}"
						>
							<div class="flex items-center space-x-3">
								<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
									{token.icon}
								</div>
								<div class="text-left">
									<p class="font-medium">{token.symbol}</p>
									<p class="text-xs text-text-muted">{token.name}</p>
								</div>
							</div>
							<div class="text-right">
								<p class="text-sm font-medium">{token.balance}</p>
								<p class="text-xs text-text-muted">${(parseFloat(token.balance) * token.price).toFixed(2)}</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Swap Details -->
		{#if fromAmount && toAmount}
			<div class="bg-surface rounded-card p-4 space-y-3" in:fade={{ duration: 200 }}>
				<h3 class="text-sm font-medium text-text-primary">Swap Details</h3>
				
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-text-secondary">Rate</span>
						<span class="text-text-primary">
							1 {fromAsset.symbol} = {swapRate.toFixed(6)} {toAsset.symbol}
						</span>
					</div>
					
					<div class="flex justify-between">
						<span class="text-text-secondary">Price Impact</span>
						<span class="text-success">{priceImpact}</span>
					</div>
					
					<div class="flex justify-between">
						<span class="text-text-secondary">Network Fee</span>
						<span class="text-text-primary">{estimatedGas}</span>
					</div>
					
					<div class="flex justify-between">
						<span class="text-text-secondary">Slippage Tolerance</span>
						<span class="text-text-primary">{slippage}%</span>
					</div>
					
					<div class="flex justify-between border-t border-border-light pt-2">
						<span class="text-text-secondary">Minimum Received</span>
						<span class="text-text-primary font-medium">
							{minimumReceived} {toAsset.symbol}
						</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Swap Button -->
		<div class="pb-4">
			<button
				onclick={handleSwap}
				disabled={!isValidSwap}
				class="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-card transition-all disabled:cursor-not-allowed"
			>
				{!fromAmount ? 'Enter Amount' : !isValidSwap ? 'Insufficient Balance' : 'Swap Tokens'}
			</button>
		</div>
	</main>
</div>