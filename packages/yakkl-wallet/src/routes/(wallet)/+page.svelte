<script lang="ts">
  import { onMount } from 'svelte';
  import RecentActivity from "$lib/components/RecentActivity.svelte";
  import SendModal from "$lib/components/SendModal.svelte";
  import Receive from "$lib/components/Receive.svelte";
  import BuyModal from "$lib/components/BuyModal.svelte";
  import TokenPortfolio from "$lib/components/TokenPortfolio.svelte";
  import AddCustomToken from "$lib/components/AddCustomToken.svelte";
  import AIHelpButton from "$lib/components/AIHelpButton.svelte";
  import AdvancedAnalytics from "$lib/components/pro/AdvancedAnalytics.svelte";
  import SecureRecovery from "$lib/components/private/SecureRecovery.svelte";
  import ExtensionDashboard from "$lib/components/extensions/ExtensionDashboard.svelte";
  import ExtensionRenderer from "$lib/components/extensions/ExtensionRenderer.svelte";
  import Upgrade from "$lib/components/Upgrade.svelte";
  import { modalStore, isModalOpen } from "$lib/stores/modal.store";
  import { initializeCore } from "$lib/core/integration";
  // import MigrationBanner from "$lib/migration-banner.svelte";
  import { currentAccount, accounts } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { tokens, totalPortfolioValue, isLoadingTokens, lastTokenUpdate, isMultiChainView, multiChainPortfolioValue, displayTokens, tokenStore } from '$lib/stores/token.store';
  import { canUseFeature } from '$lib/utils/features';
  // import { Preview2Migration, isMigrationNeeded, enablePreview2 } from './migrate';
  import { uiStore } from '$lib/stores/ui.store';

  let showSendModal = $state(false);
  let showSwapModal = $state(false);
  let showReceiveModal = $state(false);
  let showBuyModal = $state(false);
  let showAddTokenModal = $state(false);
  // let showMigrationBanner = $state(false);
  let showUpgradeModal = $state(false);
  let modalOpen = $derived($isModalOpen);
  let selectedToken = $state(null);

  // Track modal state
  $effect(() => {
    if (showUpgradeModal) {
      modalStore.openModal('upgrade');
    } else {
      modalStore.closeModal();
    }
  });

  // Reactive values from stores
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let tokenList = $derived($displayTokens);
  let isMultiChain = $derived($isMultiChainView);
  let portfolioValue = $derived(isMultiChain ? $multiChainPortfolioValue : $totalPortfolioValue);
  let loading = $derived($isLoadingTokens);
  let lastUpdate = $derived($lastTokenUpdate);

  // Migration functions
  // async function handleMigration() {
  //   const migration = new Preview2Migration({
  //     dryRun: false,
  //     verbose: true,
  //     backupData: true
  //   });

  //   const result = await migration.execute();

  //   if (result.success) {
  //     // Refresh stores after successful migration
  //     await refreshAllData();
  //   } else {
  //     throw new Error('Migration failed: ' + result.report.details.errors.join(', '));
  //   }
  // }

  async function refreshAllData() {
    // Refresh all store data after migration
    const { accountStore } = await import('$lib/stores/account.store');
    const { chainStore } = await import('$lib/stores/chain.store');
    // tokenStore is already imported at the top
    const { planStore } = await import('$lib/stores/plan.store');

    await Promise.all([
      accountStore.loadAccounts(),
      chainStore.loadChains(),
      tokenStore.refresh(),
      planStore.loadPlan()
    ]);

    // Ensure combined token store is updated
    const { updateCombinedTokenStore } = await import('$lib/common/stores');
    updateCombinedTokenStore();
  }

  onMount(async () => {
    // Show loading state
    uiStore.setGlobalLoading(true, 'Initializing...');

    try {
      // Perform comprehensive authentication validation
      const { validateAuthentication, auditAuthEvent } = await import('$lib/common/authValidation');
      const { syncStorageToStore } = await import('$lib/common/stores');
      const { PATH_REGISTER, PATH_LEGAL, PATH_LOGIN } = await import('$lib/common/constants');

      const validation = await validateAuthentication();

      console.log('/+page.svelte: auth validation result:', {
        isValid: validation.isValid,
        reason: validation.reason,
        hasValidSession: validation.hasValidSession,
        hasValidJWT: validation.hasValidJWT
      });

      // Handle validation failures with specific redirects
      if (!validation.isValid) {
        const { goto } = await import('$app/navigation');

        switch (validation.reason) {
          case 'Wallet not initialized':
            await auditAuthEvent('validation_failed', { reason: 'not_initialized' });
            console.log('Redirecting to register...');
            return await goto(PATH_REGISTER);

          case 'Legal terms not accepted':
            await auditAuthEvent('validation_failed', { reason: 'legal_terms' });
            console.log('Redirecting to legal terms...');
            return await goto(PATH_LEGAL);

          case 'Wallet is locked':
          case 'No valid security digest found':
          case 'Profile not found':
          case 'Failed to decrypt profile - invalid digest':
          case 'Profile decryption failed':
          case 'Session expired due to inactivity':
            await auditAuthEvent('validation_failed', { reason: validation.reason });
            console.log('Redirecting to login...', validation.reason);
            return await goto(PATH_LOGIN);

          default:
            await auditAuthEvent('validation_failed', { reason: validation.reason || 'unknown' });
            console.error('Authentication validation failed:', validation.reason);
            return await goto(PATH_LOGIN);
        }
      }

      // Authentication is valid
      sessionStorage.setItem('authenticated', 'true');
      await auditAuthEvent('login', {
        hasValidSession: validation.hasValidSession,
        hasValidJWT: validation.hasValidJWT
      });

      console.log('User authenticated, ensuring stores are synchronized...');

      // Ensure all stores are loaded from persistent storage
      await syncStorageToStore();
      console.log('/+page.svelte: Stores synchronized from persistent storage');

      // Load default tokens if not already loaded
      const { yakklTokenDataStore } = await import('$lib/common/stores');
      const { get: getStore } = await import('svelte/store');
      const tokenData = getStore(yakklTokenDataStore);
      if (!tokenData || tokenData.length === 0) {
        console.log('/+page.svelte: Loading default tokens...');
        const { loadDefaultTokens } = await import('$lib/managers/tokens/loadDefaultTokens');
        await loadDefaultTokens();
        console.log('/+page.svelte: Default tokens loaded');

        // Update combined token store
        const { updateCombinedTokenStore } = await import('$lib/common/stores');
        updateCombinedTokenStore();
        console.log('/+page.svelte: Combined token store updated');
      }

      // Check if migration is needed
      // const migrationNeeded = await isMigrationNeeded();
      // showMigrationBanner = migrationNeeded;

      // If no migration needed, just enable preview2 for development
      // if (!migrationNeeded) {
      //   await enablePreview2();
      // }

      // Initialize YAKKL Core (non-blocking)
      initializeCore().catch(err => {
        console.warn('YAKKL Core initialization failed:', err);
      });

      // Load initial data
      await refreshAllData();

      // Trigger token balance and price updates for current account
      if ($currentAccount) {
        console.log('/+page.svelte: Updating token balances for', $currentAccount.address);
        const { updateTokenBalances } = await import('$lib/common/tokens');
        const { updateTokenPrices } = await import('$lib/common/tokenPriceManager');
        const { getInstances } = await import('$lib/common');
        const instances = await getInstances();
        console.log('/+page.svelte: Instances:', instances);
        if (instances && instances[1]) {
          const provider = instances[1].getProvider();
          console.log('/+page.svelte: Provider:', provider);

          // Update balances first
          await updateTokenBalances($currentAccount.address, provider);
          console.log('/+page.svelte: Token balances updated');

          // Then update prices
          await updateTokenPrices();
          console.log('/+page.svelte: Token prices updated');

          // Refresh the token store to trigger UI update
          await tokenStore.refresh();
        } else {
          console.log('/+page.svelte: No provider instance available');
        }
      } else {
        console.log('/+page.svelte: No current account to load tokens for');
      }

      // Welcome message for first-time users
      // if (migrationNeeded) {
      //   uiStore.showInfo(
      //     'Welcome to Preview 2.0!',
      //     'Complete migration to access the new wallet experience'
      //   );
      // } else {
      //   uiStore.showSuccess(
      //     'Preview 2.0 Ready!',
      //     'Welcome to the enhanced wallet experience'
      //   );
      // }

    } catch (error) {
      console.error('Preview 2.0 initialization failed:', error);
      uiStore.showError(
        'Initialization Failed',
        'Some features may not work properly. Please refresh the page.'
      );
      // await enablePreview2(); // Fallback to enable preview2
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

  function showUpgradePrompt(feature: string, requiredPlan: string) {
    const featureNames = {
      'swap_tokens': 'Token Swapping',
      'buy_crypto': 'Buy/Sell Crypto',
      'ai_assistant': 'AI Assistant',
      'advanced_analytics': 'Advanced Analytics'
    };

    const featureName = featureNames[feature as keyof typeof featureNames] || feature;
    showUpgradeModal = true;
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

<!-- Fixed centered logo watermark -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0">
  <img src="/images/logoBullFav128x128.png" class="w-44 h-44 opacity-10 dark:opacity-15" alt="logo" />
</div>

<div class="max-w-[400px] mx-auto p-5 space-y-5 mt-1 pt-2 relative">

  <!-- Account header -->
  <div class="flex items-center justify-between relative z-10">
    <div>
      <div class="text-xs text-gray-400 dark:text-gray-500">Account</div>
      {#if account}
        <div class="text-lg font-semibold tracking-wide">{account.ens || account.username || 'Wallet'}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{shortAddr(account.address)}</div>
        <div class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
          Balance: {formatCurrency(Number(account.balance) || 0)}
        </div>
      {:else}
        <div class="text-lg font-semibold tracking-wide">No account</div>
      {/if}
      <a href="/accounts" class="text-blue-500 dark:text-blue-400 text-xs hover:underline">Switch Account</a>
    </div>
    <div class="flex flex-col items-end">
      {#if chain}
        <div class="text-sm bg-green-100 dark:bg-green-900 dark:text-green-200 text-green-800 px-2 py-1 rounded font-bold">
          {chain.isTestnet ? 'TESTNET' : 'LIVE'}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Chain Total: {formatCurrency(portfolioValue)}
        </div>
      {/if}
    </div>
  </div>

  <!-- Portfolio Summary -->
  <div class="rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-700 dark:to-purple-900 shadow-md flex flex-col items-center justify-center p-6 relative z-10 group hover:shadow-lg transition-all duration-300">
    <span class="uppercase text-xs text-gray-500 dark:text-gray-300 tracking-widest mb-1">
      {isMultiChain ? 'Multi-Chain Portfolio' : 'Total Portfolio'}
    </span>
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
      onclick={canUseFeature('swap_tokens') ? handleSwapClick : () => showUpgradePrompt('swap_tokens', 'Pro')}
      disabled={!account}
      title={!canUseFeature('swap_tokens') ? 'Upgrade to Pro to unlock token swapping' : 'Swap tokens'}
    >
      {canUseFeature('swap_tokens') ? 'Swap' : '🔒 Swap'}
    </button>

    <button
      class="yakkl-btn-primary yakkl-btn-buy text-sm {!canUseFeature('buy_crypto') ? 'opacity-75' : ''}"
      onclick={canUseFeature('buy_crypto') ? handleBuySell : () => showUpgradePrompt('buy_crypto', 'Pro')}
      disabled={!account}
      title={!canUseFeature('buy_crypto') ? 'Upgrade to Pro to unlock buy/sell features' : 'Buy and sell crypto'}
    >
      {canUseFeature('buy_crypto') ? 'Buy/Sell' : '🔒 Buy/Sell'}
    </button>
  </div>

  <!-- Recent Activity -->
  <RecentActivity className="yakkl-card relative z-10" />

  <!-- Token Portfolio -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onclick={(e) => {
    // Open add token modal with the selected token for editing
    selectedToken = e.detail.token;
    showAddTokenModal = true;
  }}>
    <TokenPortfolio
      tokens={tokenList}
      loading={loading}
      className="yakkl-card relative z-10"
    />
  </div>

  <!-- Pro Feature: Advanced Analytics -->
  {#if canUseFeature('advanced_analytics')}
    <AdvancedAnalytics className="relative z-10" />
  {:else}
    <div class="yakkl-card relative z-10 p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div class="text-gray-400 dark:text-gray-500 mb-3">
        <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-medium mb-2">Advanced Analytics</h3>
        <p class="text-sm mb-4">Get detailed portfolio insights, performance metrics, and market analysis.</p>
        <button
          onclick={() => showUpgradeModal = true}
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  {/if}

  <!-- Secure Full Recovery - Basic Feature -->
  {#if canUseFeature('secure_recovery')}
    <SecureRecovery className="relative z-10" />
  {/if}

  <!-- Extension System -->
  <ExtensionDashboard className="yakkl-card relative z-10" />

  <!-- Version Badge -->
  <div class="text-center pt-4 pb-2 relative z-10">
    <div class="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      YAKKL v2
    </div>
  </div>
</div>

<!-- AI Help Button - Floating Action Button (hidden during modals) -->
{#if !modalOpen}
  {#if canUseFeature('ai_assistant')}
    <AIHelpButton className="fixed bottom-12 right-4" />
  {:else}
    <!-- Show locked AI button for non-Pro users -->
    <div class="fixed bottom-12 right-4 z-50">
      <button
        onclick={() => showUpgradeModal = true}
        class="yakkl-circle-button text-xl opacity-60 hover:opacity-80 transition-opacity"
        title="AI Assistant (Pro Feature - Upgrade Required)"
      >
        🤖
      </button>
    </div>
  {/if}
{/if}

<!-- Upgrade Modal -->
<Upgrade
  bind:show={showUpgradeModal}
  onComplete={() => {
    showUpgradeModal = false;
    // Refresh all data after upgrade
    refreshAllData();
  }}
  onCancel={() => showUpgradeModal = false}
/>

<!-- Add Token Modal -->
{#if showAddTokenModal}
  <AddCustomToken
    token={selectedToken}
    onClose={() => {
      showAddTokenModal = false;
      selectedToken = null;
    }}
    onSuccess={() => {
      showAddTokenModal = false;
      selectedToken = null;
      tokenStore.refresh();
    }}
  />
{/if}
