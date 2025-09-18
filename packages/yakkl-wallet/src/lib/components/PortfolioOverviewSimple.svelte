<script lang="ts">
  import { browser } from '$app/environment';
  import { yakklCache, portfolioPlaceholder, isUpdating, formatPortfolioTotal } from '$lib/stores/yakklCache.store';
  import { currentAccount } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  import { currentPlan } from '$lib/stores/plan.store';
  import ProtectedValue from './ProtectedValue.svelte';
  import { visibilityStore } from '$lib/common/stores/visibilityStore';
  import { getPlanBadgeText, getPlanBadgeColor } from '$lib/utils/features';
  import { PlanType } from '$lib/common';

  // Props
  let {
    onRefresh = () => {},
    loading = false,
    className = '',
    lastUpdate = null
  } = $props<{
    onRefresh?: () => void;
    loading?: boolean;
    className?: string;
    lastUpdate?: Date | null;
  }>();

  // Simple reactive values using yakklCache
  const displayValue = $derived($portfolioPlaceholder);
  const isVisible = $derived($visibilityStore);
  const account = $derived($currentAccount);
  const chain = $derived($currentChain);
  const plan = $derived($currentPlan || PlanType.EXPLORER_MEMBER);
  const updating = $derived($isUpdating);

  $effect(() => {
    if (browser) {
      console.log('PortfolioOverviewSimple - plan:', plan);
    }
  });

  // Format value for display
  const formattedValue = $derived.by(() => {
    // During SSR, return placeholder
    if (!browser) {
      return '$--...';
    }

    // Use cached value or placeholder
    if (displayValue.value) {
      return formatPortfolioTotal(displayValue.value);
    }

    return displayValue.placeholder || '$--...';
  });

  // Get responsive font size based on value
  function getResponsiveFontSize(value: string | null): string {
    try {
      // During SSR, return default size
      if (!browser) {
        return 'text-4xl';
      }

      if (!value) return 'text-4xl';

      // Parse value in cents and convert to dollars
      const cents = parseInt(value, 10);
      if (isNaN(cents)) return 'text-4xl';

      const dollars = cents / 100;
      if (dollars >= 1000000) return 'text-2xl';
      if (dollars >= 100000) return 'text-3xl';
      if (dollars >= 10000) return 'text-4xl';
      return 'text-4xl';
    } catch {
      return 'text-4xl'; // Default size on error
    }
  }

  // Handle refresh with simple throttling
  let lastRefreshTime = 0;
  async function handleRefresh() {
    const now = Date.now();
    if (now - lastRefreshTime < 2000) {
      return; // Throttle to max once per 2 seconds
    }
    lastRefreshTime = now;
    loading = true;
    await onRefresh();
    loading = false;
  }

  // Get view description for current account/network
  function getViewDescription(): string {
    const accountName = account?.name || account?.ens || 'Current Account';
    const chainName = chain?.name || 'Current Network';
    return `${accountName} on ${chainName}`;
  }
</script>

<!-- Main container with shadow and hover effect like original -->
<div class="{className} rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300"
     style="background-color: {getPlanBadgeColor(plan)}20">
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
            style="background-color: {getPlanBadgeColor(plan)}"
          >
            {getPlanBadgeText(plan)}
          </span>
        </div>
        <span class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
          {getViewDescription()}
        </span>
      </h3>

      <!-- Refresh button -->
      <button
        onclick={handleRefresh}
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
        aria-label="Refresh"
        disabled={loading}
      >
        {#if loading}
          <svg class="animate-spin h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        {:else}
          <svg class="h-4 w-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        {/if}
      </button>
    </div>

    <!-- Portfolio Value Display with shimmer effect -->
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <div class="{getResponsiveFontSize(displayValue.value)} font-bold text-gray-900 dark:text-white relative">
          <div class="{displayValue.shimmer ? 'shimmer-effect' : ''}">
            <ProtectedValue value={formattedValue} placeholder="*******" />
          </div>
          {#if displayValue.shimmer}
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-2 absolute -bottom-5 left-0">
              Updating totals...
            </span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Last updated time -->
    {#if lastUpdate}
      <div class="text-[10px] text-gray-400 dark:text-gray-500">
        Last updated: {lastUpdate instanceof Date ? lastUpdate.toLocaleTimeString() : new Date(lastUpdate).toLocaleTimeString()}
      </div>
    {/if}
  </div>

  <!-- Pro Upgrade Banner (optional) -->
  {#if plan === PlanType.EXPLORER_MEMBER}
    <div class="mt-4 p-3 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg">
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-700 dark:text-gray-300">
          🚀 Unlock multi-chain portfolio views
        </p>
        <button
          class="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-full hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
          onclick={() => console.log('Upgrade clicked')}
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .shimmer-effect {
    background: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0.05) 20%,
      rgba(0, 0, 0, 0.1) 50%,
      rgba(0, 0, 0, 0.05) 80%,
      rgba(0, 0, 0, 0) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  :global(.dark) .shimmer-effect {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.05) 20%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 80%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
</style>
