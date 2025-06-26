<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Mock user data
	let selectedAccount = $state({
		name: 'YAKKL',
		address: '0xF9...CB34',
		fullAddress: '0xeF9B5B...CB34',
		network: 'Ethereum Mainnet'
	});

	let selectedAsset = $state({
		symbol: 'ETH',
		name: 'Ethereum',
		icon: '⟐',
		network: 'Ethereum'
	});

	let availableAssets = $state([
		{ symbol: 'ETH', name: 'Ethereum', icon: '⟐', network: 'Ethereum' },
		{ symbol: 'USDT', name: 'Tether USD', icon: '₮', network: 'Ethereum' },
		{ symbol: 'USDC', name: 'USD Coin', icon: '💵', network: 'Ethereum' }
	]);

	let showAssetSelector = $state(false);
	let showShareOptions = $state(false);
	let copiedToClipboard = $state(false);

	// Generate QR code data URL (simplified for demo)
	let qrCodeUrl = $derived(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedAccount.fullAddress}`);

	function copyAddress() {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(selectedAccount.fullAddress);
			copiedToClipboard = true;
			setTimeout(() => {
				copiedToClipboard = false;
			}, 2000);
		}
	}

	function selectAsset(asset: any) {
		selectedAsset = asset;
		showAssetSelector = false;
	}

	function shareAddress() {
		if (navigator.share) {
			navigator.share({
				title: 'My YAKKL Wallet Address',
				text: `Send ${selectedAsset.symbol} to this address:`,
				url: selectedAccount.fullAddress
			});
		} else {
			showShareOptions = true;
		}
	}

	function goBack() {
		goto('/new-wallet');
	}
</script>

<svelte:head>
	<title>Receive - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto p-4 space-y-6">
		<div class="flex items-center space-x-4">
			<BackButton onclick={goBack} />
			<div>
				<h1 class="text-xl font-semibold text-text-primary">Receive {selectedAsset.symbol}</h1>
				<p class="text-sm text-text-muted">Share your address to receive crypto</p>
			</div>
		</div>

		<!-- Asset Selection -->
		<div class="space-y-2">
			<label class="block text-sm font-medium text-text-primary">Asset to Receive</label>
			<button 
				onclick={() => showAssetSelector = !showAssetSelector}
				class="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-elevated rounded-card transition-all group"
			>
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
						{selectedAsset.icon}
					</div>
					<div class="text-left">
						<p class="font-medium text-text-primary">{selectedAsset.symbol}</p>
						<p class="text-sm text-text-muted">{selectedAsset.network}</p>
					</div>
				</div>
				<svg class="w-5 h-5 text-text-muted group-hover:text-primary-500 transition-colors {showAssetSelector ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{#if showAssetSelector}
				<div 
					in:fly={{ y: -10, duration: 200 }}
					out:fly={{ y: -10, duration: 150 }}
					class="bg-surface-elevated rounded-card border border-border p-2 space-y-1"
				>
					{#each availableAssets as asset (asset.symbol)}
						<button
							onclick={() => selectAsset(asset)}
							class="w-full flex items-center space-x-3 p-3 rounded-button hover:bg-background transition-all {asset.symbol === selectedAsset.symbol ? 'bg-primary-50 text-primary-700' : ''}"
						>
							<div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
								{asset.icon}
							</div>
							<div class="text-left">
								<p class="font-medium">{asset.symbol}</p>
								<p class="text-xs text-text-muted">{asset.network}</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- QR Code Section -->
		<div class="bg-surface rounded-card p-6 text-center space-y-4">
			<div class="w-48 h-48 mx-auto bg-white rounded-card p-4 shadow-md">
				<img 
					src={qrCodeUrl} 
					alt="QR Code for wallet address" 
					class="w-full h-full object-contain"
					loading="lazy"
				/>
			</div>
			
			<div class="space-y-2">
				<p class="text-sm text-text-muted">Scan QR code to send {selectedAsset.symbol}</p>
				<p class="text-xs text-text-muted">Only send {selectedAsset.symbol} to this address</p>
			</div>
		</div>

		<!-- Address Section -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<label class="text-sm font-medium text-text-primary">Your Address</label>
				<span class="text-xs text-text-muted bg-surface px-2 py-1 rounded-full">
					{selectedAccount.network}
				</span>
			</div>
			
			<div class="bg-surface rounded-card p-4 space-y-3">
				<div class="flex items-center space-x-3">
					<div class="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
						<span class="text-white font-bold text-sm">Y</span>
					</div>
					<div>
						<p class="font-medium text-text-primary">{selectedAccount.name}</p>
						<p class="text-sm text-text-muted">{selectedAccount.address}</p>
					</div>
				</div>
				
				<div class="bg-background rounded-button p-3">
					<p class="text-sm font-mono text-text-primary break-all">
						{selectedAccount.fullAddress}
					</p>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="grid grid-cols-2 gap-3">
			<button
				onclick={copyAddress}
				class="flex items-center justify-center space-x-2 py-3 bg-surface hover:bg-surface-elevated rounded-card transition-all group"
			>
				{#if copiedToClipboard}
					<svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					<span class="text-sm font-medium text-success">Copied!</span>
				{:else}
					<svg class="w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					<span class="text-sm font-medium text-text-secondary group-hover:text-primary-500 transition-colors">Copy</span>
				{/if}
			</button>

			<button
				onclick={shareAddress}
				class="flex items-center justify-center space-x-2 py-3 bg-surface hover:bg-surface-elevated rounded-card transition-all group"
			>
				<svg class="w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
				</svg>
				<span class="text-sm font-medium text-text-secondary group-hover:text-primary-500 transition-colors">Share</span>
			</button>
		</div>

		<!-- Security Warning -->
		<div class="bg-warning-50 border border-warning-200 rounded-card p-4">
			<div class="flex items-start space-x-3">
				<svg class="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
				<div class="space-y-1">
					<p class="text-sm font-medium text-warning-800">Security Notice</p>
					<p class="text-xs text-warning-700">
						Only send {selectedAsset.symbol} on {selectedAsset.network} to this address. 
						Sending other assets may result in permanent loss.
					</p>
				</div>
			</div>
		</div>
	</main>
</div>

<!-- Share Options Modal -->
{#if showShareOptions}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4"
		onclick={() => showShareOptions = false}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<div 
			class="bg-surface-elevated rounded-card p-4 w-full max-w-sm"
			onclick={(e) => e.stopPropagation()}
			in:fly={{ y: 50, duration: 200 }}
			out:fly={{ y: 50, duration: 150 }}
		>
			<h3 class="font-medium text-text-primary mb-3">Share Address</h3>
			<div class="space-y-2">
				<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors">
					Copy Link
				</button>
				<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors">
					Email
				</button>
				<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors">
					Message
				</button>
			</div>
		</div>
	</div>
{/if}