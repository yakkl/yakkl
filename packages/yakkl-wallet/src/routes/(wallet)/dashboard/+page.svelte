<script lang="ts">
	import { onMount } from 'svelte';
	import ViewContainer from '$lib/components/views/ViewContainer.svelte';
	import ViewSwitcher from '$lib/components/views/ViewSwitcher.svelte';
	import { viewStore, currentView, isRefreshing } from '$lib/stores/view.store';
	import { currentAccount } from '$lib/stores/account.store';
	import { currentChain } from '$lib/stores/chain.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { notificationService } from '$lib/services/notification.service';
	import { log } from '$lib/common/logger-wrapper';
	import SendModal from '$lib/components/SendModalEnhanced.svelte';
	import SwapModal from '$lib/components/SwapModalV2.svelte';
	import Receive from '$lib/components/Receive.svelte';
	import BuyModal from '$lib/components/BuyModal.svelte';
	import AddCustomToken from '$lib/components/AddCustomToken.svelte';
	import TokenDetailModal from '$lib/components/TokenDetailModal.svelte';
	import TransactionDetailModal from '$lib/components/TransactionDetailModal.svelte';
	import type { TokenDisplay, TransactionDisplay } from '$lib/types';

	// Modal states
	let showSendModal = $state(false);
	let showSwapModal = $state(false);
	let showReceiveModal = $state(false);
	let showBuyModal = $state(false);
	let showAddTokenModal = $state(false);
	let showTokenDetailModal = $state(false);
	let showTransactionDetailModal = $state(false);
	
	// Selected items
	let selectedToken = $state<TokenDisplay | null>(null);
	let selectedTransaction = $state<TransactionDisplay | null>(null);
	
	// Initialize state
	let isInitialized = $state(false);
	let initError = $state<string | null>(null);

	// Handle view changes from ViewContainer
	function handleViewChange(view: any) {
		log.info('[Dashboard] View changed', false, { view });
		// Track view changes if needed
	}

	// Handle token selection from TokensView
	function handleTokenSelect(token: TokenDisplay) {
		log.info('[Dashboard] Token selected', false, token);
		selectedToken = token;
		// Could open detail modal or update a detail panel
	}

	// Handle token quick actions
	function handleTokenQuickAction(action: 'send' | 'swap' | 'details', token: TokenDisplay) {
		selectedToken = token;
		switch (action) {
			case 'send':
				showSendModal = true;
				break;
			case 'swap':
				showSwapModal = true;
				break;
			case 'details':
				showTokenDetailModal = true;
				break;
		}
	}

	// Handle transaction selection
	function handleTransactionSelect(tx: TransactionDisplay) {
		log.info('[Dashboard] Transaction selected', false, tx);
		selectedTransaction = tx;
	}

	// Handle transaction view details
	function handleTransactionViewDetails(tx: TransactionDisplay) {
		selectedTransaction = tx;
		showTransactionDetailModal = true;
	}

	// Handle watchlist token actions
	function handleWatchlistTokenSelect(token: TokenDisplay) {
		selectedToken = token;
		showTokenDetailModal = true;
	}

	function handleAddToWatchlist() {
		showAddTokenModal = true;
	}

	function handleRemoveFromWatchlist(token: TokenDisplay) {
		notificationService.show({
			type: 'info',
			title: 'Removed from Watchlist',
			message: `${token.symbol} has been removed from your watchlist`
		});
	}

	// Initialize the view store
	async function initializeViewStore() {
		try {
			isInitialized = false;
			initError = null;
			
			await viewStore.initialize();
			
			// Set default view based on user preference or default to dashboard
			const savedView = localStorage.getItem('yakkl_default_view');
			if (savedView) {
				viewStore.switchView(savedView as any);
			}
			
			isInitialized = true;
			log.info('[Dashboard] View store initialized');
		} catch (error) {
			initError = error instanceof Error ? error.message : 'Failed to initialize dashboard';
			log.error('[Dashboard] Initialization failed', false, error);
		}
	}

	// Lifecycle
	onMount(() => {
		initializeViewStore();
		
		// Set up keyboard shortcuts for quick actions
		const handleKeyboard = (e: KeyboardEvent) => {
			// Cmd/Ctrl + N for new transaction
			if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
				e.preventDefault();
				showSendModal = true;
			}
			// Cmd/Ctrl + W for swap
			if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
				e.preventDefault();
				showSwapModal = true;
			}
			// Cmd/Ctrl + R for receive
			if ((e.metaKey || e.ctrlKey) && e.key === 'r' && !e.shiftKey) {
				e.preventDefault();
				showReceiveModal = true;
			}
		};
		
		window.addEventListener('keydown', handleKeyboard);
		
		return () => {
			window.removeEventListener('keydown', handleKeyboard);
			viewStore.destroy();
		};
	});

	// Quick action handlers for FAB
	function handleQuickSend() {
		showSendModal = true;
	}

	function handleQuickSwap() {
		showSwapModal = true;
	}

	function handleQuickReceive() {
		showReceiveModal = true;
	}

	function handleQuickBuy() {
		showBuyModal = true;
	}
</script>

<div class="dashboard-page h-full flex flex-col">
	{#if initError}
		<!-- Error state -->
		<div class="flex-1 flex items-center justify-center">
			<div class="alert alert-error max-w-md">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<h3 class="font-bold">Dashboard Error</h3>
					<p class="text-sm">{initError}</p>
				</div>
				<button class="btn btn-sm" onclick={() => initializeViewStore()}>
					Retry
				</button>
			</div>
		</div>
	{:else if !isInitialized}
		<!-- Loading state -->
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<div class="loading loading-spinner loading-lg mb-4"></div>
				<p class="text-gray-500 dark:text-gray-400">Initializing dashboard...</p>
			</div>
		</div>
	{:else}
		<!-- Main dashboard content -->
		<ViewContainer 
			defaultView="tokens"
			showHeader={true}
			showTabs={true}
			onViewChange={handleViewChange}
			className="flex-1"
		/>
		
		<!-- Floating View Switcher -->
		<ViewSwitcher
			position="bottom-right"
			showStats={true}
			compact={false}
		/>
		
		<!-- Quick Action FAB (Floating Action Button) -->
		<div class="fixed bottom-20 right-4 z-40">
			<div class="dropdown dropdown-top dropdown-end">
				<button class="btn btn-circle btn-primary shadow-lg" aria-label="Quick actions menu">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</button>
				<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mb-2">
					<li>
						<button onclick={handleQuickSend}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
							</svg>
							Send
						</button>
					</li>
					<li>
						<button onclick={handleQuickSwap}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
							</svg>
							Swap
						</button>
					</li>
					<li>
						<button onclick={handleQuickReceive}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
							</svg>
							Receive
						</button>
					</li>
					<li>
						<button onclick={handleQuickBuy}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							Buy
						</button>
					</li>
					<li>
						<button onclick={() => showAddTokenModal = true}>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Add Token
						</button>
					</li>
				</ul>
			</div>
		</div>
	{/if}
	
	<!-- Modals -->
	{#if showSendModal}
		<SendModal
			bind:show={showSendModal}
			{selectedToken}
		/>
	{/if}
	
	{#if showSwapModal}
		<SwapModal
			bind:show={showSwapModal}
			fromToken={selectedToken}
		/>
	{/if}
	
	{#if showReceiveModal}
		<Receive
			bind:show={showReceiveModal}
		/>
	{/if}
	
	{#if showBuyModal}
		<BuyModal
			bind:show={showBuyModal}
		/>
	{/if}
	
	{#if showAddTokenModal}
		<AddCustomToken
			bind:show={showAddTokenModal}
		/>
	{/if}
	
	{#if showTokenDetailModal && selectedToken}
		<TokenDetailModal
			bind:show={showTokenDetailModal}
			token={selectedToken}
		/>
	{/if}
	
	{#if showTransactionDetailModal && selectedTransaction}
		<TransactionDetailModal
			bind:show={showTransactionDetailModal}
			transaction={selectedTransaction}
			onClose={() => showTransactionDetailModal = false}
		/>
	{/if}
</div>

<style>
	.dashboard-page {
		min-height: 100%;
		overflow: hidden;
	}
</style>