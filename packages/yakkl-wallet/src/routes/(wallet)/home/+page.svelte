<script lang="ts">
  import { onMount } from 'svelte';
  import RecentActivity from "$lib/components/RecentActivity.svelte";
  import SendModal from "$lib/components/SendModalEnhanced.svelte";
  import SwapModal from "$lib/components/SwapModalV2.svelte";
  import Receive from "$lib/components/Receive.svelte";
  import BuyModal from "$lib/components/BuyModal.svelte";
  import TokenPortfolio from "$lib/components/TokenPortfolio.svelte";
  import AddCustomToken from "$lib/components/AddCustomToken.svelte";
  import AIHelpButton from "$lib/components/AIHelpButton.svelte";
  import AdvancedAnalytics from "$lib/components/pro/AdvancedAnalytics.svelte";
  import SecureRecovery from "$lib/components/private/SecureRecovery.svelte";
  import ExtensionDashboard from "$lib/components/extensions/ExtensionDashboard.svelte";
  import Upgrade from "$lib/components/Upgrade.svelte";
  import TokenDetailModal from "$lib/components/TokenDetailModal.svelte";
  import PortfolioDetailsModal from "$lib/components/PortfolioDetailsModal.svelte";
  import PortfolioOverview from '$lib/components/PortfolioOverview.svelte';
  import { isModalOpen, modalStore } from "$lib/stores/modal.store";
  import { initializeCore } from "$lib/core/integration";
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { totalPortfolioValue, isLoadingTokens, lastTokenUpdate, isMultiChainView, multiChainPortfolioValue, displayTokens, tokenStore, grandTotalPortfolioValue } from '$lib/stores/token.store';
  import { canUseFeature } from '$lib/utils/features';
  import { uiStore } from '$lib/stores/ui.store';
	import { notificationService } from '$lib/services/notification.service';
	import { visibilityStore } from '$lib/common/stores/visibilityStore';
	import { get } from 'svelte/store';
	import PincodeVerify from '$lib/components/PincodeVerify.svelte';
	import ProtectedValue from '$lib/components/ProtectedValue.svelte';
	import { updateTokenBalances } from '$lib/common/tokens';
	import { updateTokenPrices } from '$lib/common/tokenPriceManager';
	import { getInstances } from '$lib/common';

  let showSendModal = $state(false);
  let showSwapModal = $state(false);
  let showReceiveModal = $state(false);
  let showBuyModal = $state(false);
  let showAddTokenModal = $state(false);
  let showTokenDetailModal = $state(false);
  let showPortfolioDetailsModal = $state(false);
  let showUpgradeModal = $state(false);
  let modalOpen = $derived($isModalOpen);
  let selectedToken = $state(null);
  let showPincodeModal = $state(false);
  let isVisible = $state(get(visibilityStore));
  let pendingAction = $state<'show' | 'hide' | null>(null);
  let previousNativePrice = $state<number | null>(null);
  let nativePriceDirection = $state<'up' | 'down' | null>(null);

  // Track if we've done initial load
  let hasInitialLoad = $state(false);
  
  // Refresh data when account changes or becomes available
  $effect(() => {
    if (account?.address && !hasInitialLoad) {
      console.log('Account available, triggering initial data load:', account.address);
      hasInitialLoad = true;
      // The token store will automatically load cached data and refresh
      // We don't need to force a refresh here as it's handled by the store
    }
  });
  
  // Debug portfolio values
  $effect(() => {
    console.log('[Home] Portfolio debug:', {
      portfolioValue,
      tokenCount: tokenList.length,
      isMultiChain,
      grandTotal,
      singleChainTotal: $totalPortfolioValue,
      account: account?.address,
      chain: chain?.name,
      firstToken: tokenList[0]
    });
  });

   $effect(() => {
    const unsubscribe = visibilityStore.subscribe((value) => {
      isVisible = value;
    });
    return unsubscribe;
  });

  // Reactive values from stores
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let tokenList = $derived($displayTokens);
  let isMultiChain = $derived($isMultiChainView);
  let grandTotal = $derived($grandTotalPortfolioValue); // Total across ALL addresses and ALL chains
  let portfolioValue = $derived.by(() => {
    // Calculate portfolio value directly from tokenList
    if (tokenList.length > 0) {
      const total = tokenList.reduce((sum, token) => {
        const value = typeof token.value === 'number' ? token.value : parseFloat(token.value || '0');
        return sum + value;
      }, 0);
      return total;
    }
    // Fallback to store values
    return isMultiChain ? grandTotal : $totalPortfolioValue;
  });
  let loading = $derived($isLoadingTokens);
  let lastUpdate = $derived($lastTokenUpdate);

  // Find native token and its price
  let nativeToken = $derived(
    tokenList.find(t =>
      t.symbol === chain?.nativeCurrency?.symbol ||
      t.symbol === 'ETH' ||
      t.symbol === 'MATIC' ||
      t.symbol === 'BNB'
    )
  );

  let nativePrice = $derived(nativeToken?.price || 0);

  // Calculate native token value for account display
  let accountNativeValue = $derived.by(() => {
    if (!account || !chain) return 0;
    const balance = parseFloat(account.balance || '0');
    return balance * nativePrice;
  });

  // Track native price changes and update direction indicator
  $effect(() => {
    if (nativePrice > 0 && previousNativePrice !== null && previousNativePrice > 0) {
      if (nativePrice > previousNativePrice) {
        nativePriceDirection = 'up';
      } else if (nativePrice < previousNativePrice) {
        nativePriceDirection = 'down';
      }
      // Don't clear - keep the indicator visible
    }
    if (nativePrice > 0) {
      previousNativePrice = nativePrice;
    }
  });

  // Update direction from price service
  $effect(() => {
    if (nativeToken?.symbol) {
      // DISABLED: Price direction from simulated service
      // const direction = priceUpdateService.getPriceDirection(nativeToken.symbol);
      // if (direction) {
      //   nativePriceDirection = direction;
      // }
      // TODO: Implement price direction tracking with real prices
    }
  });

  // Track upgrade modal state
  $effect(() => {
    if (showUpgradeModal) {
      modalStore.openModal('upgrade');
    } else if ($isModalOpen && modalStore.isModalOpen()) {
      // Only close if we opened it
      modalStore.closeModal();
    }
  });

  async function refreshAllData(forceRefresh = false) {
    console.log('refreshAllData: Starting data refresh...', { forceRefresh });

    try {
      // Always refresh to get latest prices
      await tokenStore.refresh(forceRefresh);
      console.log('refreshAllData: Token store refreshed');
      
      // Force reload of cached data after refresh
      if (forceRefresh) {
        const instances = await getInstances();
        if (instances && instances[1] && $currentAccount) {
          const provider = instances[1].getProvider();
          await Promise.all([
            updateTokenBalances($currentAccount.address, provider),
            updateTokenPrices()
          ]);
          
          // Reload token store to pick up updated cache
          await tokenStore.refresh();
        }
      }
    } catch (error) {
      console.error('refreshAllData: Error refreshing data:', error);
    }
  }

  onMount(() => {
    // DISABLED: Simulated price updates - using real prices from tokenPriceManager instead
    // priceUpdateService.startPriceUpdates(30000); // 30 seconds

    // Run async initialization without blocking UI
    (async () => {
      // Don't show global loading - let individual components handle their state
      // Added: Add timeout to prevent infinite initialization
      const initTimeout = setTimeout(() => {
        console.warn('Home page initialization timeout reached');
      }, 5000);

      try {
        // Initialize YAKKL Core (non-blocking)
        initializeCore().catch(err => {
          console.warn('YAKKL Core initialization failed:', err);
        });

        // The token store automatically loads cached data on initialization
        // and sets up auto-refresh, so we don't need to force a refresh here
        console.log('Home: Token store will handle data loading automatically');

        // Update token balances and prices in the background after a delay
        if ($currentAccount) {
          // Wait a bit to avoid conflicting with the initial load
          setTimeout(() => {
            console.log('/home/+page.svelte: Background token update for', $currentAccount.address);

            // Load these in background without blocking
            (async () => {
              const instances = await getInstances();
              if (instances && instances[1]) {
                const provider = instances[1].getProvider();

                // Update in background
                Promise.all([
                  updateTokenBalances($currentAccount.address, provider),
                  updateTokenPrices()
                ]).then(() => {
                  // Only refresh if we need to force update
                  if ($displayTokens.length === 0) {
                    tokenStore.refresh();
                    console.log('/home/+page.svelte: Token data force updated');
                  }
                }).catch(err => {
                  console.warn('Token update failed:', err);
                });
              }
            })().catch(err => {
              console.warn('Failed to load token modules:', err);
            });
          }, 2000); // Wait 2 seconds before background update
        }

      } catch (error) {
        console.error('Preview 2.0 initialization failed:', error);
      } finally {
        clearTimeout(initTimeout);
      }
    })();

    // Listen for token click events
    const handleEvent = (event: Event) => {
      handleTokenClick(event as CustomEvent);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('tokenclick', handleEvent);

      return () => {
        document.removeEventListener('tokenclick', handleEvent);
      };
    }

    // Cleanup on unmount
    return () => {
      // DISABLED: No longer using simulated price updates
      // priceUpdateService.stopPriceUpdates();
    };
  });

  function handleTokenSend(token: any) {
    selectedToken = token;
    showTokenDetailModal = false;
    showSendModal = true;
  }

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
    // Buy crypto is available to all users
    showBuyModal = true;
  }

  function handleSwapClick() {
    // Swap is available to all users
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


  function handleTokenClick(event: CustomEvent) {
    selectedToken = event.detail.token;
    showTokenDetailModal = true;
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);

      // Show success notification
      uiStore.showSuccess('Address Copied', 'Address has been copied to clipboard');

      // For public addresses, we don't need to clear the clipboard
      // as mentioned in the requirement
    } catch (error) {
      console.error('Failed to copy address:', error);
      uiStore.showError('Copy Failed', 'Failed to copy address to clipboard');
    }
  }

  function handleToggleClick() {
    if (isVisible) {
      // Hiding values doesn't require PIN
      visibilityStore.set(false);
      notificationService.show({
        title: 'Values Hidden',
        message: 'Sensitive values are now hidden',
        type: 'info',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    } else {
      // Showing values requires PIN verification
      pendingAction = 'show';
      showPincodeModal = true;
    }
  }

  function handlePinVerified(_digestedPin: string) {
    if (pendingAction === 'show') {
      visibilityStore.set(true);
      notificationService.show({
        title: 'Values Visible',
        message: 'Sensitive values are now visible',
        type: 'success',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    }
    pendingAction = null;
    showPincodeModal = false;
  }

  function handlePinRejected(reason: string) {
    notificationService.show({
      title: 'PIN Verification Failed',
      message: reason || 'Unable to verify PIN',
      type: 'error'
    });
    pendingAction = null;
    showPincodeModal = false;
  }
</script>

<PincodeVerify
  bind:show={showPincodeModal}
  onVerified={handlePinVerified}
  onRejected={handlePinRejected}
/>

<SendModal
  show={showSendModal}
  onClose={() => {
    showSendModal = false;
    selectedToken = null;
  }}
  onSend={handleSend}
  tokens={tokenList}
  chain={chain}
  mode="send"
/>

<SwapModal
  show={showSwapModal}
  onClose={() => showSwapModal = false}
  onSwap={handleSwap}
/>

<Receive
  bind:show={showReceiveModal}
/>

<BuyModal
  show={showBuyModal}
  onClose={() => showBuyModal = false}
/>

<TokenDetailModal
  show={showTokenDetailModal}
  token={selectedToken}
  onClose={() => {
    showTokenDetailModal = false;
    selectedToken = null;
  }}
  onSend={handleTokenSend}
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
        <div class="flex items-center gap-1">
          <div class="text-xs text-gray-500 dark:text-gray-400">{shortAddr(account.address)}</div>
          <!-- svelte-ignore a11y_consider_explicit_label -->
          <button
            onclick={() => copyAddress(account.address)}
            class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1 rounded transition-colors"
            title="Copy address"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <div class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1 group/value cursor-help relative">
          <span class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            Value: <ProtectedValue value={formatCurrency(portfolioValue || 0)} placeholder="*******" />
          </span>

          <!-- Token Breakdown Hover Card -->
          <div class="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 opacity-0 invisible group-hover/value:opacity-100 group-hover/value:visible transition-all duration-200 z-50">
            <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Token Breakdown</div>
            <div class="space-y-1 max-h-48 overflow-y-auto">
              {#if tokenList.length > 0}
                {#each tokenList.slice(0, 5) as token}
                  <div class="flex justify-between items-center text-xs">
                    <div class="flex items-center gap-1">
                      {#if token.icon}
                        {@const isImagePath = token.icon && (token.icon.startsWith('/') || token.icon.startsWith('http') || token.icon.includes('.svg') || token.icon.includes('.png') || token.icon.includes('.jpg') || token.icon.includes('.jpeg') || token.icon.includes('.gif') || token.icon.includes('.webp'))}
                        {#if isImagePath}
                          <img src={token.icon} alt={token.symbol} class="w-4 h-4 rounded-full" />
                        {:else}
                          <div class="w-4 h-4 rounded-full flex items-center justify-center bg-gray-400 text-white text-[10px] font-bold">
                            {token.icon || token.symbol?.[0] || '?'}
                          </div>
                        {/if}
                      {:else}
                        <div class="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      {/if}
                      <span class="font-medium">{token.symbol}</span>
                    </div>
                    <ProtectedValue
                      value={formatCurrency(Number(token?.value) || 0)}
                      placeholder="*****"
                    />
                  </div>
                {/each}
                {#if tokenList.length > 5}
                  <div class="text-xs text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    +{tokenList.length - 5} more tokens
                  </div>
                {/if}
              {:else}
                <div class="text-xs text-gray-500 dark:text-gray-400">No tokens found</div>
              {/if}
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span class="text-xs font-medium">Native Balance:</span>
              <span class="text-xs">
                <ProtectedValue
                  value={`${parseFloat(account.balance || '0').toFixed(4)} ${chain?.nativeCurrency?.symbol || 'ETH'} (${formatCurrency(accountNativeValue)})`}
                  placeholder="**** *** (*****)"
                />
              </span>
            </div>
          </div>
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
        {#if chain && nativeToken}
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
            <span>{chain.nativeCurrency?.symbol || 'ETH'}:</span>
            <ProtectedValue value={formatCurrency(nativePrice)} placeholder="****" />
            {#if nativePriceDirection}
              <span class="inline-flex items-center">
                {#if nativePriceDirection === 'up'}
                  <svg class="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4l8 12H4z" />
                  </svg>
                {:else}
                  <svg class="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 20l8-12H4z" />
                  </svg>
                {/if}
              </span>
            {/if}
          </div>
        {/if}
        
        <!-- Hide Values Button -->
        <button
          onclick={handleToggleClick}
          class="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20 mt-1"
          aria-label={isVisible ? "Hide values" : "Show values"}
        >
          {#if isVisible}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Hide</span>
          {:else}
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span>Show</span>
          {/if}
        </button>
      {/if}
    </div>
  </div>


  <!-- Portfolio Overview -->
  <PortfolioOverview 
    onRefresh={() => refreshAllData(true)}
    {loading}
    {lastUpdate}
    className="mb-4"
  />

  <!-- Action Buttons -->
  <div class="grid grid-cols-4 gap-3 relative z-10">
    <button
      class="yakkl-btn-primary yakkl-btn-send text-sm"
      onclick={() => showSendModal = true}
      disabled={!account}
      title={'Send/Transfer tokens'}
    >
      Send
    </button>

    <button
      class="yakkl-btn-primary bg-blue-600 hover:bg-blue-700 text-sm"
      onclick={handleReceive}
      disabled={!account}
      title={'QR code to receive tokens'}
    >
      Receive
    </button>

    <button
      class="yakkl-btn-primary yakkl-swap text-sm}"
      onclick={handleSwapClick}
      disabled={!account}
      title={'Swap tokens'}
    >
      Swap
    </button>

    <button
      class="yakkl-btn-primary yakkl-btn-buy text-sm"
      onclick={handleBuySell}
      disabled={!account}
      title={'Buy and sell crypto'}
    >
      Buy/Sell
    </button>
  </div>

  <!-- Recent Activity -->
  <!-- Added: Show all transactions (not limited to 5) -->
  <RecentActivity 
    className="yakkl-card relative z-10" 
    showAll={true} 
    onRefresh={async () => await refreshAllData(true)}
  />

  <!-- Token Portfolio -->
  <TokenPortfolio
    tokens={tokenList}
    loading={loading}
    className="yakkl-card relative z-10"
  />

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
  {#if !canUseFeature('ai_assistant')}
    <AIHelpButton className="fixed bottom-12 right-4" />
  {:else}
    <!-- Show locked AI button for non-Pro users -->
    <div class="fixed bottom-12 right-4 z-40">
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
    onCancel={() => {
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

<!-- Portfolio Details Modal -->
<PortfolioDetailsModal
  bind:show={showPortfolioDetailsModal}
  onClose={() => showPortfolioDetailsModal = false}
/>
