<!--
  Example Component: Plugin System Usage

  This component demonstrates how to use the new plugin architecture
  in place of the old direct manager imports.

  Key features:
  - Graceful handling of UpgradeRequiredError
  - Automatic upgrade prompts
  - Plan-aware feature availability
  - Error boundary patterns
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pluginRegistry, UpgradeRequiredError } from '$lib/plugins';
  import type { BasicChartData, Account, NewsItem } from '$lib/plugins';
  import LockedSectionCard from '$lib/components/LockedSectionCard.svelte';
	import { getSettings } from '$lib/common/stores';
	import { PlanType } from '$lib/common/types';

  // Component state
  let chartData: BasicChartData | null = null;
  let accounts: Account[] = [];
  let newsItems: NewsItem[] = [];
  let loading = false;
  let error: string | null = null;
  let showUpgradeModal = false;

  // Plugin features availability
  let features = pluginRegistry.getFeatures();
  let isInitialized = false;

  onMount(async () => {
    await initializePlugins();
    await loadData();
  });

  /**
   * Initialize the plugin system with user's current plan
   */
  async function initializePlugins() {
    try {
      const settings = await getSettings();
      const planType = settings.plan?.type || PlanType.STANDARD;

      const result = await pluginRegistry.initialize(planType);

      if (result.success) {
        features = result.features;
        isInitialized = true;
        console.log('Plugin system initialized with plan:', result.planType);
      } else {
        console.warn('Plugin initialization failed:', result.errors);
        error = 'Failed to initialize plugin system';
      }
    } catch (err) {
      console.error('Plugin initialization error:', err);
      error = 'Plugin system initialization error';
    }
  }

  /**
   * Load data from all plugin managers
   */
  async function loadData() {
    if (!isInitialized) return;

    loading = true;
    error = null;

    try {
      // Load data from different plugin managers
      await Promise.all([
        loadTradingData(),
        loadAccountData(),
        loadNewsData()
      ]);
    } catch (err) {
      handleError(err);
    } finally {
      loading = false;
    }
  }

  /**
   * Load trading data (basic charts are available to all users)
   */
  async function loadTradingData() {
    try {
      chartData = await pluginRegistry.trading.getBasicChartData('ETH');
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        // This shouldn't happen for basic chart data, but handle gracefully
        console.warn('Basic chart data requires upgrade:', err.message);
      } else {
        throw err;
      }
    }
  }

  /**
   * Load account data
   */
  async function loadAccountData() {
    try {
      accounts = await pluginRegistry.accounts.getAccounts();
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        console.log('Advanced account features require upgrade');
        // Fallback to basic account display
      } else {
        throw err;
      }
    }
  }

  /**
   * Load news data
   */
  async function loadNewsData() {
    try {
      newsItems = await pluginRegistry.news.getNews(undefined, 5);
    } catch (err) {
      if (err instanceof UpgradeRequiredError) {
        console.log('Advanced news features require upgrade');
      } else {
        throw err;
      }
    }
  }

  /**
   * Try to access a Pro feature (will show upgrade prompt if needed)
   */
  async function tryAdvancedFeature() {
    try {
      // This will throw UpgradeRequiredError for standard users
      const advancedData = await pluginRegistry.trading.getAdvancedChartData('ETH');
      console.log('Advanced chart data:', advancedData);
    } catch (err) {
      handleError(err);
    }
  }

  /**
   * Handle errors with special treatment for upgrade requirements
   */
  function handleError(err: unknown) {
    if (err instanceof UpgradeRequiredError) {
      // Show upgrade modal
      showUpgradeModal = true;
      error = err.getUserMessage();
    } else {
      error = err instanceof Error ? err.message : 'An unknown error occurred';
    }
  }

  /**
   * Handle successful upgrade (would be called from upgrade modal)
   */
  async function onUpgradeComplete() {
    showUpgradeModal = false;
    // Reinitialize with new plan
    await initializePlugins();
    await loadData();
  }

  onDestroy(async () => {
    // Clean up plugin system if needed
    // Note: In practice, you might not dispose on every component unmount
    // as the plugin registry is shared across the app
  });
</script>

<div class="p-6 space-y-6">
  <h1 class="text-2xl font-bold">Plugin System Example</h1>

  {#if loading}
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2">Loading...</span>
    </div>
  {/if}

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">{error}</p>
      {#if showUpgradeModal}
        <button
          onclick={() => showUpgradeModal = true}
          class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Upgrade Now
        </button>
      {/if}
    </div>
  {/if}

  <!-- Feature Availability Display -->
  <div class="bg-gray-50 rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-2">Available Features</h2>
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div class="flex items-center">
        <span class="w-3 h-3 rounded-full mr-2 {features.advancedTrading ? 'bg-green-500' : 'bg-gray-300'}"></span>
        Advanced Trading
      </div>
      <div class="flex items-center">
        <span class="w-3 h-3 rounded-full mr-2 {features.unlimitedAccounts ? 'bg-green-500' : 'bg-gray-300'}"></span>
        Unlimited Accounts
      </div>
      <div class="flex items-center">
        <span class="w-3 h-3 rounded-full mr-2 {features.portfolioAnalytics ? 'bg-green-500' : 'bg-gray-300'}"></span>
        Portfolio Analytics
      </div>
      <div class="flex items-center">
        <span class="w-3 h-3 rounded-full mr-2 {features.realTimeNews ? 'bg-green-500' : 'bg-gray-300'}"></span>
        Real-time News
      </div>
    </div>
  </div>

  <!-- Trading Data Section -->
  <div class="bg-white border rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-2">Trading Data</h2>
    {#if chartData}
      <div class="space-y-2">
        <p><strong>Symbol:</strong> {chartData.symbol}</p>
        <p><strong>Price:</strong> ${chartData.price.toFixed(2)}</p>
        <p><strong>24h Change:</strong> {chartData.change24h > 0 ? '+' : ''}{chartData.change24h.toFixed(2)}%</p>
      </div>

      <!-- Pro Feature Button -->
      <LockedSectionCard
        title="Advanced Charts"
        locked={!features.advancedTrading}
        onComplete={() => showUpgradeModal = true}
      >
        <button
          onclick={tryAdvancedFeature}
          class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={!features.advancedTrading}
        >
          View Advanced Charts
        </button>
      </LockedSectionCard>
    {/if}
  </div>

  <!-- Account Data Section -->
  <div class="bg-white border rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-2">Accounts ({accounts.length})</h2>
    {#each accounts as account}
      <div class="border-b py-2 last:border-b-0">
        <p class="font-medium">{account.name}</p>
        <p class="text-sm text-gray-600">{account.address}</p>
        <p class="text-sm">Balance: {account.balance} ETH</p>
      </div>
    {:else}
      <p class="text-gray-500">No accounts available</p>
    {/each}
  </div>

  <!-- News Data Section -->
  <div class="bg-white border rounded-lg p-4">
    <h2 class="text-lg font-semibold mb-2">Latest News</h2>
    {#each newsItems as item}
      <div class="border-b py-2 last:border-b-0">
        <h3 class="font-medium">{item.title}</h3>
        <p class="text-sm text-gray-600">{item.summary}</p>
        <p class="text-xs text-gray-500">{item.source} • {new Date(item.publishedAt).toLocaleDateString()}</p>
      </div>
    {:else}
      <p class="text-gray-500">No news available</p>
    {/each}
  </div>

  <!-- Upgrade Modal Placeholder -->
  {#if showUpgradeModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md">
        <h2 class="text-xl font-bold mb-4">Upgrade Required</h2>
        <p class="mb-4">This feature requires a PRO plan. Upgrade now to unlock advanced functionality.</p>
        <div class="flex space-x-4">
          <button
            onclick={onUpgradeComplete}
            class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Upgrade Now
          </button>
          <button
            onclick={() => showUpgradeModal = false}
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Component-specific styles */
</style>
