<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { derived, get } from 'svelte/store';
  import { currentAccount, accountStore } from '$lib/stores/account.store';
  import { currentChain, chainStore } from '$lib/stores/chain.store';
  import { 
    currentPortfolioValue,
    walletCacheStore
  } from '$lib/stores/wallet-cache.store';
  import { tokenStore } from '$lib/stores/token.store';
  import ProtectedValue from './ProtectedValue.svelte';
  import { canUseFeature, getPlanBadgeText, getPlanBadgeColor, getCurrentPlan } from '$lib/utils/features';
  import { planStore } from '$lib/stores/plan.store';
  import { PlanType, type YakklCurrentlySelected } from '$lib/common';
  import { modalStore } from '$lib/stores/modal.store';
  import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
  import type { BigNumberish } from '$lib/common/bignumber';
  import { log } from '$lib/common/logger-wrapper';
  import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
  import { uiStore } from '$lib/stores/ui.store';
  import { visibilityStore } from '$lib/common/stores/visibilityStore';


  // Props - simplified, no view mode
  let {
    onRefresh = () => {},
    loading = false,
    lastUpdate = null as Date | null,
    className = '',
    currentlySelected = null as YakklCurrentlySelected | null
  } = $props<{
    onRefresh?: () => void;
    loading?: boolean;
    lastUpdate?: Date | null;
    className?: string;
    currentlySelected?: YakklCurrentlySelected | null;
  }>();

  // Create debounced refresh function with rate limiting
  let refreshAttempts = 0;
  let lastRefreshTime = 0;

  const debouncedRefresh = UnifiedTimerManager.createDebounce(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;

    // Reset attempts counter after 6 seconds
    if (timeSinceLastRefresh > 6000) {
      refreshAttempts = 0;
    }

    // Check rate limiting
    if (timeSinceLastRefresh < 2000) {
      refreshAttempts++;

      if (refreshAttempts >= 3) {
        uiStore.showError('Rate Limited', 'Too many refresh attempts. Please wait 6 seconds.');
        return;
      } else {
        uiStore.showWarning('Please Wait', 'Refresh in progress, please wait...');
        return;
      }
    }

    // Execute refresh
    lastRefreshTime = now;
    isUserInitiatedRefresh = true;
    await onRefresh();

    // Reset flag after a delay
    setTimeout(() => {
      isUserInitiatedRefresh = false;
    }, 3000);
  }, 2000); // 2 second debounce delay

  // Type for view modes
  type ViewMode = 'current_account' | 'single_network' | 'all_networks' | 'watch_list' | 'hierarchy';
  
  // Type for network values
  interface NetworkValue {
    chainId: number;
    chainName: string;
    value: bigint;
    percentage: number;
    icon?: string;
    color: string;
  }
  
  // State
  let isExpanded = $state(false);
  let isMultiChain = $state(false);
  let chain = $state(null as any);
  let viewMode = $state<ViewMode>('current_account');
  let accounts = $state<any[]>([]);
  let isFirstLoad = $state(false);
  let everLoaded = $state(false);
  let isUserInitiatedRefresh = $state(false); // Track if refresh was user-initiated
  let planLoaded = $state(false);
  let hasProAccess = $state(false);

  // Use the current portfolio value directly from the store
  let stablePortfolioValue = $state(0n);
  let lastKnownLayoutMode = $state<'large' | 'normal'>('normal');

  // Log component mount immediately
  log.info('[PortfolioOverview] Component mounting', false);

  // onMount: Component is purely reactive - no direct cache manipulation
  onMount(() => {
    log.info('[PortfolioOverview] Component mounted - subscribing to reactive stores', false);

    // Initialize stable value from current portfolio (reactive)
    const currentValue = $currentPortfolioValue;
    if (currentValue && currentValue > 0n) {
      stablePortfolioValue = currentValue;
      lastKnownLayoutMode = currentValue >= 10000n ? 'large' : 'normal';
    }

    log.info('[PortfolioOverview] Initial values from stores', false, {
      stableValue: stablePortfolioValue.toString(),
      layoutMode: lastKnownLayoutMode
    });
  });

  // Update portfolio value when it changes
  $effect(() => {
    const currentValue = $currentPortfolioValue;
    if (currentValue !== undefined && currentValue !== null) {
      // Only update if the value actually changed and is valid
      if (currentValue > 0n) {
        stablePortfolioValue = currentValue;
        lastKnownLayoutMode = currentValue >= 10000n ? 'large' : 'normal';
        log.info('[PortfolioOverview] Portfolio value updated', false, {
          value: currentValue.toString()
        });
      }
    }
  });

  // Cleanup on component destroy
  onDestroy(() => {
    // Component cleanup if needed
  });

  // Update reactive values from stores
  $effect(() => {
    chain = $currentChain;
    accounts = $accountStore?.accounts || [];
    // Simple multi-chain detection based on view mode
    isMultiChain = viewMode === 'all_networks';
  });

  // Track current plan type for badge display
  let currentPlanType = $state<PlanType>(PlanType.EXPLORER_MEMBER);
  
  // Update Pro access check reactively when plan changes - but don't block on it
  $effect(() => {
    const plan = $planStore;
    if (plan) {
      // Don't wait for loading to complete - use defaults if still loading
      if (!plan.loading) {
        planLoaded = true;
        hasProAccess = canUseFeature('advanced_analytics');
        currentPlanType = plan.plan?.type || PlanType.EXPLORER_MEMBER;
        log.info('[PortfolioOverview] Plan loaded:', false, { 
          hasProAccess, 
          planType: plan.plan?.type,
          currentPlanType 
        });
      } else {
        // Use defaults while loading
        log.info('[PortfolioOverview] Plan still loading, using defaults', false);
        hasProAccess = false; // Default to false while loading
      }
    }
  });
  
  // Load plan on mount to ensure it's available
  onMount(async () => {
    await planStore.loadPlan();
  });

  // Log state changes for debugging
  $effect(() => {
    log.debug('[PortfolioOverview] State update:', false, {
      hasProAccess,
      planLoaded,
      isFirstLoad,
      everLoaded,
      viewMode
    });
  });

  // Get total portfolio value based on view mode using rollup stores
  // Simplified portfolio total - just use currentPortfolioValue for now
  const portfolioTotal = currentPortfolioValue;

  // Calculate network values from the new cache architecture
  const networkValues = derived(
    [walletCacheStore, chainStore, currentAccount, currentChain, accountStore],
    ([$cache, $chainStore, $account, $currentChain, $accountStore]) => {
      if (!$chainStore || !$account || !$currentChain) return [];

      const chains = $chainStore.chains;
      const allAccounts = $accountStore?.accounts || [];
      const chainMap = new Map(chains.map(c => [c.chainId, c]));
      const isCurrentChainTestnet = $currentChain?.isTestnet || false;

      // Group by chain and sum values
      const networkTotals = new Map<number, bigint>();
      let grandTotal = 0n;

      Object.entries($cache.chainAccountCache).forEach(([chainId, chainData]) => {
        const chainIdNum = Number(chainId);
        const chainConfig = chainMap.get(chainIdNum);
        const isChainTestnet = chainConfig?.isTestnet || false;

        // Only show chains of the same type
        if (isCurrentChainTestnet !== isChainTestnet) return;

        let chainTotal = 0n;

        Object.entries(chainData).forEach(([address, cache]) => {
          // Filter based on view mode
          let includeAccount = false;

          switch (viewMode) {
            case 'single_network':
              // All accounts on current chain
              includeAccount = allAccounts.some(a => a.address.toLowerCase() === address) &&
                             chainIdNum === $currentChain.chainId;
              break;

            case 'all_networks':
              // All accounts across all networks
              includeAccount = allAccounts.some(a => a.address.toLowerCase() === address);
              break;
            case 'current_account':
            default:
              // Only current account on current chain
              includeAccount = address === $account.address.toLowerCase() && chainIdNum === $currentChain.chainId;
              break;
          }

          if (includeAccount) {
            chainTotal = BigNumberishUtils.add(chainTotal, cache.portfolio.totalValue || 0n);
          }
        });

        if (chainTotal > 0n) {
          networkTotals.set(chainIdNum, chainTotal);
          grandTotal = BigNumberishUtils.add(grandTotal, chainTotal);
        }
      });

      // Convert to array with metadata
      const values: NetworkValue[] = Array.from(networkTotals.entries())
        .map(([chainId, value]) => {
          const chain = chainMap.get(chainId);
          const numValue = value;
          const numGrandTotal = grandTotal;
          return {
            chainId,
            chainName: chain?.name || `Chain ${chainId}`,
            value: value,
            percentage: numGrandTotal > 0n ? Number((numValue * 100n) / numGrandTotal) : 0,
            icon: chain?.icon,
            color: getChainColor(chainId)
          };
        })
        .filter(n =>n.value > 0n)
        .sort((a, b) => {
          // Both values are bigints, so we can compare them directly
          if (b.value > a.value) return 1;
          if (b.value < a.value) return -1;
          return 0;
        });

      return values;
    }
  );

  // Debug output
  $effect(() => {
    try {
      // Ensure portfolioTotal is ready before logging
      const totalValue = $portfolioTotal;
      if (totalValue === undefined || totalValue === null) {
        return; // Skip logging if not ready
      }

      // Safely convert to string
      let portfolioTotalStr = '0';
      try {
        portfolioTotalStr = BigNumberishUtils.toString(totalValue);
      } catch (e) {
        // Fallback if conversion fails
        portfolioTotalStr = String(totalValue);
      }

      log.debug('[PortfolioOverview] View state:', false, {
        viewMode,
        isMultiChain,
        portfolioTotal: portfolioTotalStr,
        networkValues: $networkValues?.map(nv => {
          let valueStr = '0';
          try {
            valueStr = nv.value ? BigNumberishUtils.toString(nv.value) : '0';
          } catch (e) {
            valueStr = String(nv.value || 0);
          }
          return { ...nv, value: valueStr };
        }) || [],
        chain: chain?.name,
        currentAccount: $currentAccount?.address
      });
    } catch (error) {
      // Silently skip logging errors to avoid console spam
      // The error is likely due to initial undefined values
    }
  });

  // Removed auto-expand logic - layout is now controlled only by user interaction

  // Get responsive font size based on value
  function getResponsiveFontSize(value: BigNumberish): string {
    try {
      let numValue = BigNumberishUtils.toBigInt(value);

      // Responsive sizing based on value magnitude
      if (BigNumberishUtils.toBigInt(numValue) >= 1000000000n) return 'text-lg';      // Over $1B
      if (BigNumberishUtils.toBigInt(numValue) >= 1000000n) return 'text-xl';         // Over $1M
      if (BigNumberishUtils.toBigInt(numValue) >= 100000n) return 'text-2xl';         // Over $100K
      if (BigNumberishUtils.toBigInt(numValue) >= 10000n) return 'text-3xl';          // Over $10K
      return 'text-4xl';                                  // Under $10K
    } catch (error) {
      log.warn('Error getting responsive font size:', false, error);
      return 'text-4xl';
    }
  }

  // Format currency helper
  function formatCurrency(value: BigNumberish): string {
    try {
      // Value is stored as cents (bigint), convert to dollars for display
      const valueInCents = BigNumberishUtils.toBigInt(value);
      const valueInDollars = Number(valueInCents) / 100;

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(valueInDollars);
    } catch (error) {
      log.warn('Error formatting currency:', false, error);
      return '$0.00';
    }
  }

  // Get chain color based on chainId
  function getChainColor(chainId: number): string {
    const colors: Record<number, string> = {
      1: '#627EEA',      // Ethereum - Blue
      56: '#F3BA2F',     // BSC - Yellow
      137: '#8247E5',    // Polygon - Purple
      42161: '#12AAFF',  // Arbitrum - Light Blue
      10: '#FF0420',     // Optimism - Red
      43114: '#E84142',  // Avalanche - Red
      250: '#1969FF',    // Fantom - Blue
      25: '#002D74',     // Cronos - Dark Blue
      // Testnets
      5: '#94A3B8',      // Goerli - Gray
      11155111: '#64748B', // Sepolia - Gray
      80001: '#9333EA',  // Mumbai - Purple
      97: '#FBBF24',     // BSC Testnet - Yellow
    };

    // Default colors for unknown chains
    const defaultColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
    ];

    return colors[chainId] || defaultColors[chainId % defaultColors.length];
  }

  function formatTime(date: Date | string | null): string {
    if (!date) return 'Never';

    // Convert to Date object if it's a string
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Never';

    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function handleNetworkClick(chainId: number) {
    // Switch to the selected network
    chainStore.switchChain(chainId);
  }

  function cycleViewMode() {
    // Cycle through view modes - for now only support the two main modes
    const modes: ViewMode[] = ['current_account', 'all_networks'];
    const currentIndex = modes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    viewMode = modes[nextIndex];

    // Update multi-chain view state based on view mode
    isMultiChain = viewMode === 'all_networks';
  }

  function getViewModeLabel(): string {
    switch (viewMode) {
      case 'single_network':
        return 'Single Network';
      case 'all_networks':
        return 'All Networks';
      case 'watch_list':
        return 'Watch List';
      case 'hierarchy':
        return 'Account Hierarchy';
      case 'current_account':
      default:
        return 'Current Account';
    }
  }

  function getViewModeDescription(): string {
    switch (viewMode) {
      case 'single_network':
        return chain ? `All accounts on ${chain.name}` : '';
      case 'all_networks':
        return `All accounts across ${$networkValues.length} networks`;
      case 'watch_list':
        const watchCount = $walletCacheStore?.accountMetadata?.watchListAccounts?.length || 0;
        return `${watchCount} watched account${watchCount !== 1 ? 's' : ''}`;
      case 'hierarchy':
        return 'Account hierarchy';
      case 'current_account':
      default:
        return chain ? `on ${chain.name}` : '';
    }
  }

  // Get button color classes based on current plan
  function getButtonColorClasses(): string {
    const plan = getCurrentPlan();
    console.log('plan', plan);
    switch (plan) {
      case PlanType.FOUNDING_MEMBER:
        return 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700';
      case PlanType.EARLY_ADOPTER:
        return 'bg-green-600 text-white border-green-600 hover:bg-green-700';
      case PlanType.YAKKL_PRO:
        return 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700';
      case PlanType.ENTERPRISE:
        return 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700';
      case PlanType.EXPLORER_MEMBER:
      default:
        return 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700';
    }
  }

  // Handle refresh with timeout
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleRefresh() {
    // Clear existing timeout
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    // Mark this as a user-initiated refresh
    isUserInitiatedRefresh = true;

    try {
      // Only set loading for user-initiated refreshes
      loading = true;

      // Trigger a force recalculation of all token values
      await walletCacheStore.recalculateAllTokenValues();
      
      // Also refresh if we have tokenStore available
      if (typeof tokenStore !== 'undefined' && tokenStore?.refresh) {
        await tokenStore.refresh(true);
      }

      // Set timeout for refresh (10 seconds)
      refreshTimeout = setTimeout(() => {
        loading = false;
        isUserInitiatedRefresh = false;
        log.info('[PortfolioOverview] Refresh completed', false);
      }, 10000);

    } catch (error) {
      log.error('[PortfolioOverview] Failed to refresh:', false, error);
      loading = false;
      isUserInitiatedRefresh = false;
    }
  }

  // Listen for store updates (purely reactive)
  $effect(() => {
    // React to wallet cache updates
    const cacheState = $walletCacheStore;
    if (cacheState && cacheState.lastSync) {
      // Update last update time when cache syncs
      if (isUserInitiatedRefresh) {
        // Clear timeout and loading state
        if (refreshTimeout) {
          clearTimeout(refreshTimeout);
          refreshTimeout = null;
        }
        loading = false;
        isUserInitiatedRefresh = false;
      }
      lastUpdate = new Date(cacheState.lastSync);
      log.debug('[PortfolioOverview] Store data updated', false);
    }

    // Cleanup
    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  });

  function showUpgrade() {
    modalStore.openModal('upgrade');
  }
</script>

{#if !planLoaded}
  <!-- Loading State while plan data loads -->
  <div class="{className} rounded-2xl p-6 shadow-md">
    <div class="animate-pulse space-y-3">
      <div class="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      <div class="text-xs text-gray-500 dark:text-gray-400">
        Loading portfolio data...
      </div>
    </div>
  </div>
{:else if !hasProAccess}
  <!-- Basic User View -->
  <div class="{className} rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300" style="background-color: {getPlanBadgeColor(currentPlanType)}20">
    <div class="space-y-3">
      <!-- Header with badge -->
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div class="flex items-center gap-2">
            <span class="truncate max-w-[200px]">
              Portfolio View
            </span>
            <span
              class="px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap"
              style="background-color: {getPlanBadgeColor(currentPlanType)}"
            >
              {getPlanBadgeText(currentPlanType)}
            </span>
          </div>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
            {getViewModeDescription()}
          </span>
        </h3>

        <!-- Refresh button -->
        <button
          onclick={handleRefresh}
          class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
          aria-label="Refresh"
          disabled={loading}
        >
          <svg class="w-4 h-4 text-gray-500 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Value and toggle -->
      {#if isExpanded}
        <!-- Large value layout - value on its own line -->
        <div class="space-y-3">
          {#if loading || isFirstLoad}
            <div class="space-y-2">
              <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              {#if !everLoaded}
                <div class="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                  🔄 First time loading your portfolio data...
                </div>
              {/if}
            </div>
          {:else}
            <div class="{getResponsiveFontSize($portfolioTotal || 0n)} font-bold text-gray-900 dark:text-white">
              <ProtectedValue value={formatCurrency($portfolioTotal || 0n)} placeholder="*******" />
            </div>
          {/if}

          <div class="flex justify-end gap-2">
            <button
              onclick={cycleViewMode}
              class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[120px] text-center bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700"
              title="Click to cycle through view modes"
            >
              {getViewModeLabel()}
            </button>

            <button
              onclick={() => isExpanded = !isExpanded}
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
              aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
            >
              <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      {:else}
        <!-- Normal value layout - everything on same line -->
        <div class="flex justify-between items-end">
          {#if loading || isFirstLoad}
            <div class="space-y-2">
              <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              {#if !everLoaded}
                <div class="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                  🔄 First time loading your portfolio data...
                </div>
              {/if}
            </div>
          {:else}
            <div class="{getResponsiveFontSize($portfolioTotal || 0n)} font-bold text-gray-900 dark:text-white">
              <ProtectedValue value={formatCurrency($portfolioTotal || 0n)} placeholder="*******" />
            </div>
          {/if}

          <!-- View Mode Toggle and Expand -->
          <div class="flex items-center gap-2">
            <button
              onclick={cycleViewMode}
              class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[120px] text-center bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-zinc-700"
              title="Click to cycle through view modes"
            >
              {getViewModeLabel()}
            </button>

            <button
              onclick={() => isExpanded = !isExpanded}
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
              aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
            >
              <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <div class="text-xs text-gray-500 mt-1">
        Updated {formatTime(lastUpdate)}
      </div>
    </div>

    <!-- Pro Upgrade Prompt -->
    <div class="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-900 dark:text-white">Unlock Network Breakdown</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">See your portfolio distribution across all networks</p>
        </div>
        <button
          onclick={showUpgrade}
          class="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  </div>
{:else}
{console.log('hasProAccess 2', hasProAccess)}
  <!-- Pro User View -->
  <div class="{className} rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="rounded-2xl bg-white dark:bg-zinc-900 p-6">
      <!-- Header -->
      <div class="space-y-3 mb-4">
        <!-- Title and Pro Badge -->
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <div class="flex items-center gap-2">
              <span class="truncate max-w-[200px]">
                Portfolio View
              </span>
              <span
                class="px-2 py-0.5 text-white text-[10px] font-bold rounded-full whitespace-nowrap"
                style="background-color: {getPlanBadgeColor(currentPlanType)}"
              >
                {getPlanBadgeText(currentPlanType)}
              </span>
            </div>
            <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
              {getViewModeDescription()}
            </span>
          </h3>

          <!-- Refresh button aligned to the right -->
          <button
            onclick={debouncedRefresh}
            class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
            title="Refresh"
            aria-label="Refresh portfolio data"
            disabled={loading}
          >
            <svg class="w-4 h-4 text-gray-500 {loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <!-- Value and Controls -->
        {#if isExpanded}
          <!-- Large value layout - value on its own line -->
          <div class="space-y-3">
            {#if loading || isFirstLoad}
              <div class="space-y-2">
                <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                {#if !everLoaded}
                  <div class="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                    🔄 First time loading your portfolio data...
                  </div>
                {/if}
              </div>
            {:else}
              <div class="{getResponsiveFontSize($portfolioTotal)} font-bold text-gray-900 dark:text-white">
                <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
              </div>
            {/if}

            <!-- Network Toggle and Expand -->
            <div class="flex justify-end gap-2">
              <button
                onclick={cycleViewMode}
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[120px] text-center {getButtonColorClasses()}"
                title="Click to cycle through view modes"
              >
                {getViewModeLabel()}
              </button>

              <button
                onclick={() => isExpanded = !isExpanded}
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
              >
                <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        {:else}
          <!-- Normal value layout - everything on same line -->
          <div class="flex justify-between items-end">
            {#if loading || isFirstLoad}
              <div class="space-y-2">
                <div class="animate-pulse h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                {#if !everLoaded}
                  <div class="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                    🔄 First time loading your portfolio data...
                  </div>
                {/if}
              </div>
            {:else}
              <div class="{getResponsiveFontSize($portfolioTotal)} font-bold text-gray-900 dark:text-white">
                <ProtectedValue value={formatCurrency($portfolioTotal)} placeholder="*******" />
              </div>
            {/if}

            <!-- Network Toggle and Expand -->
            <div class="flex items-center gap-2">
              <button
                onclick={cycleViewMode}
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 min-w-[120px] text-center {getButtonColorClasses()}"
                title="Click to cycle through view modes"
              >
                {getViewModeLabel()}
              </button>

              <button
                onclick={() => isExpanded = !isExpanded}
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={isExpanded ? "Collapse" : "Expand"}
                aria-label={isExpanded ? "Collapse portfolio details" : "Expand portfolio details"}
              >
                <svg class="w-4 h-4 text-gray-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Network Distribution Bar -->
      {#if $networkValues.length > 0 && !loading}
        <div class="mb-4">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Network Distribution</p>
          <div class="h-8 rounded-full overflow-hidden flex bg-gray-100 dark:bg-zinc-800 shadow-inner relative">
            {#each $networkValues as network}
              <div
                class="relative group hover:opacity-90 transition-all duration-200 cursor-pointer"
                style="width: {network.percentage}%; background-color: {network.color};"
                title="{network.chainName}: {formatCurrency(network.value)} ({network.percentage.toFixed(1)}%)"
              >
                <span class="sr-only">{network.chainName}</span>
              </div>
            {/each}
            {#if $networkValues.length === 1}
              <!-- Show network name and percentage when only one network -->
              <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span class="text-xs font-medium text-white drop-shadow-md">
                  {$networkValues[0].chainName} 100%
                </span>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Expanded Network Details -->
      {#if isExpanded}
        <div class="mt-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
          {#if $networkValues.length === 0}
            <p class="text-center text-gray-500 dark:text-gray-400 py-4">
              No tokens found across any network
            </p>
          {:else}
            <!-- Scrollable container for 3+ networks -->
            <div class="{$networkValues.length > 3 ? 'max-h-[280px] overflow-y-auto pr-2' : ''} space-y-2" style="scrollbar-width: thin;">
              {#each $networkValues as network}
                <button
                  class="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left group"
                  onclick={() => handleNetworkClick(network.chainId)}
                  aria-label="Switch to {network.chainName}"
                >
                  <div class="flex items-center gap-3">
                    <!-- Network Icon/Color -->
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0"
                      style="background-color: {network.color};"
                    >
                      {network.chainName.substring(0, 2).toUpperCase()}
                    </div>

                    <!-- Network Info -->
                    <div class="min-w-0">
                      <h4 class="font-medium text-gray-900 dark:text-white truncate">
                        {network.chainName}
                      </h4>
                      <p class="text-sm text-gray-500 dark:text-gray-400">
                        {network.percentage.toFixed(1)}% of portfolio
                      </p>
                    </div>
                  </div>

                  <!-- Value and Action -->
                  <div class="flex items-center gap-3 flex-shrink-0">
                    <div class="text-right">
                      <p class="font-semibold text-gray-900 dark:text-white">
                        <ProtectedValue value={formatCurrency(network.value)} placeholder="****" />
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {network.chainId === 1 ? 'Mainnet' : `Chain ${network.chainId}`}
                      </p>
                    </div>
                    <svg class="w-5 h-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              {/each}
            </div>

            {#if $networkValues.length > 3}
              <div class="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                Scroll to see all {$networkValues.length} networks
              </div>
            {/if}
          {/if}
        </div>
      {/if}

      <!-- Footer -->
      <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-zinc-700">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {$networkValues.length} active {$networkValues.length === 1 ? 'network' : 'networks'}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {getViewModeDescription()} • Updated {formatTime(lastUpdate)}
        </span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Add smooth transitions for the distribution bar */
  div {
    transition: all 0.2s ease;
  }
</style>
