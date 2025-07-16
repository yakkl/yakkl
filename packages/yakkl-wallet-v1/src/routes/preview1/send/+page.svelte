<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Send flow state
	let currentStep = $state(1);
	let recipient = $state('');
	let amount = $state('');
	let selectedAsset = $state({
		symbol: 'ETH',
		name: 'Ethereum',
		balance: '0.1736',
		value: '$40.28',
		icon: '⟐',
		decimals: 18
	});
	let memo = $state('');
	let gasPrice = $state('normal');
	let estimatedFee = $state('$0.85');
	let estimatedTime = $state('~2 min');

	// Mock recent contacts
	let recentContacts = $state([
		{ address: '0x742d35Cc6635C0532925a3b8D400e1234567890a', name: 'Alice.eth', avatar: '👩' },
		{ address: '0x851d45Cc6635C0532925a3b8D400e1234567890b', name: 'Bob', avatar: '👨' },
		{ address: '0x962e56Cc6635C0532925a3b8D400e1234567890c', name: 'Charlie.eth', avatar: '🧑' }
	]);

	// Mock assets for selection
	let availableAssets = $state([
		{ symbol: 'ETH', name: 'Ethereum', balance: '0.1736', value: '$40.28', icon: '⟐' },
		{ symbol: 'USDT', name: 'Tether USD', balance: '297.92', value: '$297.92', icon: '₮' },
		{ symbol: 'USDC', name: 'USD Coin', balance: '150.00', value: '$150.00', icon: '💵' }
	]);

	let isValidRecipient = $derived(
		recipient.length > 0 && 
		(recipient.includes('.eth') || recipient.startsWith('0x'))
	);

	let isValidAmount = $derived(
		amount.length > 0 && 
		parseFloat(amount) > 0 && 
		parseFloat(amount) <= parseFloat(selectedAsset.balance)
	);

	function selectContact(contact: any) {
		recipient = contact.address;
		currentStep = 2;
	}

	function handleRecipientNext() {
		if (isValidRecipient) {
			currentStep = 2;
		}
	}

	function handleAmountNext() {
		if (isValidAmount) {
			currentStep = 3;
		}
	}

	function setPercentage(percent: number) {
		const balance = parseFloat(selectedAsset.balance);
		if (percent === 100) {
			// Max button - subtract estimated fee
			const maxAmount = balance - 0.001; // Reserve for gas
			amount = Math.max(0, maxAmount).toFixed(6);
		} else {
			amount = (balance * (percent / 100)).toFixed(6);
		}
	}

	function handleConfirm() {
		// TODO: Implement actual send transaction
		console.log('Sending:', { recipient, amount, selectedAsset, memo, gasPrice });
		
		// Show success and navigate back
		alert('Transaction sent successfully!');
		goto('/new-wallet');
	}

	function goBack() {
		if (currentStep > 1) {
			currentStep--;
		} else {
			goto('/new-wallet');
		}
	}
</script>

<svelte:head>
	<title>Send - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto">
		<!-- Step 1: Recipient -->
		{#if currentStep === 1}
			<div class="p-4 space-y-6" in:fly={{ x: -20, duration: 300 }}>
				<div class="flex items-center space-x-4">
					<BackButton onclick={goBack} />
					<div>
						<h1 class="text-xl font-semibold text-text-primary">Send To</h1>
						<p class="text-sm text-text-muted">Choose recipient</p>
					</div>
				</div>

				<!-- Recipient Input -->
				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Recipient Address</label>
					<div class="relative">
						<input
							bind:value={recipient}
							placeholder="0x... or name.eth"
							class="w-full px-4 py-3 bg-surface border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
						/>
						{#if recipient}
							<button
								onclick={() => recipient = ''}
								class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</div>
				</div>

				<!-- Recent Contacts -->
				{#if recentContacts.length > 0}
					<div class="space-y-3">
						<h3 class="text-sm font-medium text-text-primary">Recent Contacts</h3>
						<div class="space-y-2">
							{#each recentContacts as contact (contact.address)}
								<button
									onclick={() => selectContact(contact)}
									class="w-full flex items-center space-x-3 p-3 bg-surface hover:bg-surface-elevated rounded-card transition-all group"
								>
									<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
										{contact.avatar}
									</div>
									<div class="flex-1 text-left">
										<p class="font-medium text-text-primary group-hover:text-primary-600 transition-colors">
											{contact.name}
										</p>
										<p class="text-sm text-text-muted">
											{contact.address.slice(0, 6)}...{contact.address.slice(-4)}
										</p>
									</div>
									<svg class="w-5 h-5 text-text-muted group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Continue Button -->
				<div class="fixed bottom-4 left-4 right-4">
					<button
						onclick={handleRecipientNext}
						disabled={!isValidRecipient}
						class="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-card transition-all disabled:cursor-not-allowed"
					>
						Continue
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 2: Amount -->
		{#if currentStep === 2}
			<div class="p-4 space-y-6" in:fly={{ x: -20, duration: 300 }}>
				<div class="flex items-center space-x-4">
					<BackButton onclick={goBack} />
					<div>
						<h1 class="text-xl font-semibold text-text-primary">Send Amount</h1>
						<p class="text-sm text-text-muted">Enter amount to send</p>
					</div>
				</div>

				<!-- Asset Selection -->
				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Asset</label>
					<button class="w-full flex items-center justify-between p-3 bg-surface hover:bg-surface-elevated rounded-card transition-all group">
						<div class="flex items-center space-x-3">
							<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg">
								{selectedAsset.icon}
							</div>
							<div class="text-left">
								<p class="font-medium text-text-primary">{selectedAsset.symbol}</p>
								<p class="text-sm text-text-muted">Balance: {selectedAsset.balance}</p>
							</div>
						</div>
						<svg class="w-5 h-5 text-text-muted group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
				</div>

				<!-- Amount Input -->
				<div class="space-y-3">
					<label class="block text-sm font-medium text-text-primary">Amount</label>
					<div class="relative">
						<input
							bind:value={amount}
							type="number"
							step="any"
							placeholder="0.00"
							class="w-full px-4 py-4 text-2xl bg-surface border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-center"
						/>
						<div class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">
							{selectedAsset.symbol}
						</div>
					</div>
					
					{#if amount}
						<p class="text-center text-text-muted">
							≈ ${(parseFloat(amount) * (parseFloat(selectedAsset.value.replace('$', '')) / parseFloat(selectedAsset.balance))).toFixed(2)}
						</p>
					{/if}
				</div>

				<!-- Percentage Buttons -->
				<div class="grid grid-cols-4 gap-2">
					<button
						onclick={() => setPercentage(25)}
						class="py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-button transition-colors"
					>
						25%
					</button>
					<button
						onclick={() => setPercentage(50)}
						class="py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-button transition-colors"
					>
						50%
					</button>
					<button
						onclick={() => setPercentage(75)}
						class="py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-button transition-colors"
					>
						75%
					</button>
					<button
						onclick={() => setPercentage(100)}
						class="py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-button transition-colors"
					>
						MAX
					</button>
				</div>

				<!-- Optional Memo -->
				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Memo (Optional)</label>
					<input
						bind:value={memo}
						placeholder="Add a note..."
						class="w-full px-4 py-3 bg-surface border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
					/>
				</div>

				<!-- Continue Button -->
				<div class="fixed bottom-4 left-4 right-4">
					<button
						onclick={handleAmountNext}
						disabled={!isValidAmount}
						class="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-card transition-all disabled:cursor-not-allowed"
					>
						Review Transaction
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 3: Confirm -->
		{#if currentStep === 3}
			<div class="p-4 space-y-6" in:fly={{ x: -20, duration: 300 }}>
				<div class="flex items-center space-x-4">
					<BackButton onclick={goBack} />
					<div>
						<h1 class="text-xl font-semibold text-text-primary">Confirm Send</h1>
						<p class="text-sm text-text-muted">Review transaction details</p>
					</div>
				</div>

				<!-- Transaction Summary -->
				<div class="bg-surface rounded-card p-4 space-y-4">
					<div class="text-center space-y-2">
						<div class="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl mx-auto">
							{selectedAsset.icon}
						</div>
						<h3 class="text-2xl font-bold text-text-primary">{amount} {selectedAsset.symbol}</h3>
						<p class="text-text-muted">
							≈ ${(parseFloat(amount) * (parseFloat(selectedAsset.value.replace('$', '')) / parseFloat(selectedAsset.balance))).toFixed(2)}
						</p>
					</div>
				</div>

				<!-- Transaction Details -->
				<div class="space-y-4">
					<div class="flex justify-between items-center py-3 border-b border-border-light">
						<span class="text-text-secondary">To</span>
						<div class="text-right">
							<p class="text-text-primary font-medium">
								{recipient.includes('.eth') ? recipient : `${recipient.slice(0, 6)}...${recipient.slice(-4)}`}
							</p>
						</div>
					</div>

					<div class="flex justify-between items-center py-3 border-b border-border-light">
						<span class="text-text-secondary">Network Fee</span>
						<div class="text-right">
							<p class="text-text-primary font-medium">{estimatedFee}</p>
							<p class="text-xs text-text-muted">{estimatedTime}</p>
						</div>
					</div>

					{#if memo}
						<div class="flex justify-between items-center py-3 border-b border-border-light">
							<span class="text-text-secondary">Memo</span>
							<p class="text-text-primary font-medium">{memo}</p>
						</div>
					{/if}

					<div class="flex justify-between items-center py-3 font-semibold text-lg">
						<span class="text-text-primary">Total</span>
						<div class="text-right">
							<p class="text-text-primary">
								{(parseFloat(amount) + 0.001).toFixed(6)} {selectedAsset.symbol}
							</p>
							<p class="text-sm text-text-muted">+ {estimatedFee} fee</p>
						</div>
					</div>
				</div>

				<!-- Gas Options -->
				<div class="space-y-3">
					<label class="block text-sm font-medium text-text-primary">Transaction Speed</label>
					<div class="grid grid-cols-3 gap-2">
						<button
							onclick={() => gasPrice = 'slow'}
							class="p-3 text-center rounded-card border transition-all {gasPrice === 'slow' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-text-secondary hover:border-border-light'}"
						>
							<div class="text-sm font-medium">Slow</div>
							<div class="text-xs">~5 min</div>
							<div class="text-xs">$0.65</div>
						</button>
						<button
							onclick={() => gasPrice = 'normal'}
							class="p-3 text-center rounded-card border transition-all {gasPrice === 'normal' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-text-secondary hover:border-border-light'}"
						>
							<div class="text-sm font-medium">Normal</div>
							<div class="text-xs">~2 min</div>
							<div class="text-xs">$0.85</div>
						</button>
						<button
							onclick={() => gasPrice = 'fast'}
							class="p-3 text-center rounded-card border transition-all {gasPrice === 'fast' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface text-text-secondary hover:border-border-light'}"
						>
							<div class="text-sm font-medium">Fast</div>
							<div class="text-xs">~30 sec</div>
							<div class="text-xs">$1.20</div>
						</button>
					</div>
				</div>

				<!-- Confirm Button -->
				<div class="fixed bottom-4 left-4 right-4">
					<button
						onclick={handleConfirm}
						class="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-card transition-all"
					>
						Confirm & Send
					</button>
				</div>
			</div>
		{/if}
	</main>
</div>