<script lang="ts">
  import { onMount } from 'svelte';
  import RecentActivity from "./lib/components/RecentActivity.svelte";
  import SendModal from "./lib/components/SendModal.svelte";
  import Receive from "$lib/components/Receive.svelte";
  import BuyModal from "./lib/components/BuyModal.svelte";
  import TokenPortfolio from "./lib/components/TokenPortfolio.svelte";
  import AIHelpButton from "./lib/components/AIHelpButton.svelte";
  import MigrationBanner from "./migration-banner.svelte";
  import { currentAccount, accounts } from './lib/stores/account.store';
  import { currentChain } from './lib/stores/chain.store';
  import { tokens, totalPortfolioValue, isLoadingTokens, lastTokenUpdate } from './lib/stores/token.store';
  import { canUseFeature } from './lib/stores/plan.store';
  import { Preview2Migration, isMigrationNeeded, enablePreview2 } from './migrate';
  import { uiStore } from './lib/stores/ui.store';

  let showSendModal = $state(false);
  let showSwapModal = $state(false);
  let showReceiveModal = $state(false);
  let showBuyModal = $state(false);
  let showMigrationBanner = $state(false);

  // Reactive values from stores
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let tokenList = $derived($tokens);
  let portfolioValue = $derived($totalPortfolioValue);
  let loading = $derived($isLoadingTokens);
  let lastUpdate = $derived($lastTokenUpdate);

  // Migration functions
  async function handleMigration() {
    const migration = new Preview2Migration({
      dryRun: false,
      verbose: true,
      backupData: true
    });

    const result = await migration.execute();

    if (result.success) {
      // Refresh stores after successful migration
      await refreshAllData();
    } else {
      throw new Error('Migration failed: ' + result.report.details.errors.join(', '));
    }
  }

  async function refreshAllData() {
    // Refresh all store data after migration
    const { accountStore } = await import('./lib/stores/account.store');
    const { chainStore } = await import('./lib/stores/chain.store');
    const { tokenStore } = await import('./lib/stores/token.store');
    const { planStore } = await import('./lib/stores/plan.store');

    await Promise.all([
      accountStore.loadAccounts(),
      chainStore.loadChains(),
      tokenStore.refresh(),
      planStore.loadPlan()
    ]);
  }

  onMount(async () => {
    // Show loading state
    uiStore.setGlobalLoading(true, 'Initializing Preview 2.0...');

    try {
      // Check if migration is needed
      const migrationNeeded = await isMigrationNeeded();
      showMigrationBanner = migrationNeeded;

      // If no migration needed, just enable preview2 for development
      if (!migrationNeeded) {
        await enablePreview2();
      }

      // Load initial data
      await refreshAllData();

      // Welcome message for first-time users
      if (migrationNeeded) {
        uiStore.showInfo(
          'Welcome to Preview 2.0!',
          'Complete migration to access the new wallet experience'
        );
      } else {
        uiStore.showSuccess(
          'Preview 2.0 Ready!',
          'Welcome to the enhanced wallet experience'
        );
      }

    } catch (error) {
      console.error('Preview 2.0 initialization failed:', error);
      uiStore.showError(
        'Initialization Failed',
        'Some features may not work properly. Please refresh the page.'
      );
      await enablePreview2(); // Fallback to enable preview2
    } finally {
      uiStore.setGlobalLoading(false);
    }
  });

  function handleSend(tx: any) {
    showSendModal = false;
    console.log('Transaction sent:', tx);

    // Show success feedback
    uiStore.showTransactionPending(tx.hash);

    // Refresh token data after send
    setTimeout(() => {
      refreshAllData();
    }, 2000);
  }

  function handleSwap(tx: any) {
    showSwapModal = false;
    console.log('Swap requested:', tx);

    // Show swap feedback
    uiStore.showSuccess(
      'Swap Initiated!',
      'Your token swap is being processed'
    );

    // Refresh data after swap
    setTimeout(() => {
      refreshAllData();
    }, 2000);
  }

  function handleReceive() {
    showReceiveModal = true;
  }

  function handleBuySell() {
    // Check if user has access to buy feature
    if (!canUseFeature('buy_crypto')) {
      uiStore.showInfo(
        'Pro Feature Required',
        'Upgrade to Pro to buy crypto with your credit card'
      );
      return;
    }
    showBuyModal = true;
  }

  function handleSwapClick() {
    // Check if user has access to swap feature
    if (!canUseFeature('swap_tokens')) {
      uiStore.showInfo(
        'Pro Feature Required',
        'Upgrade to Pro to swap tokens with better rates'
      );
      return;
    }
    showSwapModal = true;
  }

  function shortAddr(addr: string): string {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function formatTime(date: Date | null): string {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  }
</script>

<!-- Migration Banner -->
<!-- <MigrationBanner
  bind:showBanner={showMigrationBanner}
  onMigrate={handleMigration}
  onDismiss={() => showMigrationBanner = false}
/> -->

<SendModal
  show={showSendModal}
  onClose={() => showSendModal = false}
  onSend={handleSend}
  tokens={tokenList}
  chain={chain}
  mode="send"
/>

{#if canUseFeature('swap_tokens')}
<SendModal
  show={showSwapModal}
  onClose={() => showSwapModal = false}
  onSend={handleSwap}
  tokens={tokenList}
  chain={chain}
  mode="swap"
/>
{/if}

<Receive
  bind:show={showReceiveModal}
/>

<BuyModal
  show={showBuyModal}
  onClose={() => showBuyModal = false}
/>

<div class="max-w-[400px] mx-auto p-5 space-y-5 mt-1 pt-2 relative">
  <!-- Faint watermark (bull logo or 'Y') centered -->
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
    <img src="/images/logoBullFav128x128.png" class="w-44 h-44 opacity-10 dark:opacity-15" alt="logo" />
  </div>

  <!-- Account header -->
  <div class="flex items-center justify-between relative z-10">
    <div>
      <div class="text-xs text-gray-400 dark:text-gray-500">Account</div>
      {#if account}
        <div class="text-lg font-semibold tracking-wide">{account.ens || account.username || ''}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{shortAddr(account.address)}</div>
      {:else}
        <div class="text-lg font-semibold tracking-wide">No account</div>
      {/if}
      <a href="/preview2/accounts" class="text-blue-500 dark:text-blue-400 text-xs hover:underline">Switch Account</a>
    </div>
    <div class="flex flex-col items-end">
      {#if chain}
        <div class="text-sm bg-green-100 dark:bg-green-900 dark:text-green-200 text-green-800 px-2 py-1 rounded font-bold">
          {chain.isTestnet ? 'TESTNET' : 'LIVE'}
        </div>
      {/if}
    </div>
  </div>

  <!-- Portfolio Summary -->
  <div class="rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-700 dark:to-purple-900 shadow-md flex flex-col items-center justify-center p-6 relative z-10 group hover:shadow-lg transition-all duration-300">
    <span class="uppercase text-xs text-gray-500 dark:text-gray-300 tracking-widest mb-1">Total Portfolio</span>
    {#if loading}
      <div class="animate-pulse h-8 w-32 bg-white/20 rounded"></div>
    {:else}
      <span class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white group-hover:scale-105 transition-transform duration-200">{formatCurrency(portfolioValue)}</span>
    {/if}
    <div class="flex items-center gap-2 mt-2">
      <span class="text-xs text-gray-400">Last updated: {formatTime(lastUpdate)}</span>
      {#if !loading}
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          onclick={() => refreshAllData()}
          class="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors p-1 rounded"
          title="Refresh portfolio"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="grid grid-cols-4 gap-3 relative z-10">
    <button
      class="yakkl-btn-primary yakkl-btn-send text-sm"
      onclick={() => showSendModal = true}
      disabled={!account || !canUseFeature('send_tokens')}
    >
      Send
    </button>

    <button
      class="yakkl-btn-primary bg-blue-600 hover:bg-blue-700 text-sm"
      onclick={handleReceive}
      disabled={!account || !canUseFeature('receive_tokens')}
    >
      Receive
    </button>

    <button
      class="yakkl-btn-primary yakkl-swap text-sm {!canUseFeature('swap_tokens') ? 'opacity-75' : ''}"
      onclick={handleSwapClick}
      disabled={!account}
    >
      Swap
    </button>

    <button
      class="yakkl-btn-primary yakkl-btn-buy text-sm {!canUseFeature('buy_crypto') ? 'opacity-75' : ''}"
      onclick={handleBuySell}
      disabled={!account}
    >
      Buy/Sell
    </button>
  </div>

  <!-- Recent Activity -->
  <RecentActivity className="yakkl-card relative z-10" />

  <!-- Token Portfolio -->
  <TokenPortfolio
    tokens={tokenList}
    loading={loading}
    className="yakkl-card relative z-10"
  />

  <!-- Preview 2.0 Badge -->
  <div class="text-center pt-4 pb-2 relative z-10">
    <div class="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Preview 2.0
    </div>
  </div>
</div>

<!-- AI Help Button - Floating Action Button -->
{#if canUseFeature('ai_assistant')}
  <AIHelpButton className="fixed bottom-12 right-4" />
{:else}
  <!-- Show locked AI button for non-Pro users -->
  <div class="fixed bottom-12 right-4 z-50">
    <button
      onclick={() => uiStore.showInfo('Pro Feature Required', 'Upgrade to Pro to access AI assistance')}
      class="bg-gray-400 text-white w-14 h-14 rounded-full shadow-lg text-xl flex items-center justify-center opacity-75 hover:opacity-90 transition-opacity"
      title="AI Assistant (Pro Level Feature)"
    >
      🤖
    </button>
  </div>
{/if}
