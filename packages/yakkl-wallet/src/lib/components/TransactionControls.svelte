<script lang="ts">
  import { transactionStore, txSortOrder, isMonitoringTx } from '$lib/stores/transaction.store';

  interface Props {
    className?: string;
  }

  let { className = '' }: Props = $props();

  let sortOrder = $derived($txSortOrder);
  let isMonitoring = $derived($isMonitoringTx);
  let showSettings = $state(false);
  let pollingInterval = $state(30); // seconds
  let notificationsEnabled = $state(true);

  function toggleSort() {
    transactionStore.toggleSortOrder();
  }

  async function toggleMonitoring() {
    if (isMonitoring) {
      transactionStore.stopMonitoring();
    } else {
      await transactionStore.startMonitoring(pollingInterval * 1000);
    }
  }

  function updateMonitoringSettings() {
    transactionStore.configureMonitoring({
      pollingInterval: pollingInterval * 1000,
      notificationEnabled: notificationsEnabled
    });
    showSettings = false;
  }

  async function clearCache() {
    if (confirm('Clear transaction cache? This will reload all transactions from the blockchain.')) {
      await transactionStore.clearCache();
    }
  }
</script>

<div class={`flex items-center gap-2 ${className}`}>
  <!-- Sort Toggle -->
  <button
    onclick={toggleSort}
    class="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
    title="Sort transactions"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {#if sortOrder === 'newest'}
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9M3 12h5M17 12l4-4m0 0l-4-4m4 4v12" />
      {:else}
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9M3 12h5M17 12l4 4m0 0l-4 4m4-4V4" />
      {/if}
    </svg>
    <span class="text-zinc-600 dark:text-zinc-400">
      {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
    </span>
  </button>

  <!-- Monitor Toggle -->
  <button
    onclick={toggleMonitoring}
    class="flex items-center gap-1 px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
    title={isMonitoring ? 'Stop monitoring' : 'Start monitoring'}
  >
    {#if isMonitoring}
      <div class="relative">
        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <div class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      </div>
    {:else}
      <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    {/if}
    <span class="text-zinc-600 dark:text-zinc-400">
      {isMonitoring ? 'Monitoring' : 'Monitor'}
    </span>
  </button>

  <!-- Settings Button -->
  <div class="relative">
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      onclick={() => showSettings = !showSettings}
      class="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
      title="Transaction settings"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>

    <!-- Settings Dropdown -->
    {#if showSettings}
      <div class="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
        <div class="p-4 space-y-4">
          <h3 class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Transaction Settings</h3>

          <!-- Polling Interval -->
          <div>
            <label for="polling-interval" class="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
              Polling Interval (seconds)
            </label>
            <input
              id="polling-interval"
              type="number"
              bind:value={pollingInterval}
              min="15"
              max="300"
              step="15"
              class="w-full px-3 py-1.5 bg-gray-50 dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span class="text-xs text-zinc-500 dark:text-zinc-500">Min: 15s, Max: 5min</span>
          </div>

          <!-- Notifications Toggle -->
          <div class="flex items-center justify-between">
            <label for="notifications" class="text-sm text-zinc-600 dark:text-zinc-400">
              Browser Notifications
            </label>
            <input
              id="notifications"
              type="checkbox"
              bind:checked={notificationsEnabled}
              class="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-zinc-700 border-gray-300 dark:border-zinc-600 rounded focus:ring-blue-500"
            />
          </div>

          <!-- Clear Cache Button -->
          <button
            onclick={clearCache}
            class="w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Clear Transaction Cache
          </button>

          <!-- Actions -->
          <div class="flex gap-2 pt-2 border-t border-gray-200 dark:border-zinc-700">
            <button
              onclick={() => showSettings = false}
              class="flex-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 rounded hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onclick={updateMonitoringSettings}
              class="flex-1 px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<!-- Click outside to close settings -->
{#if showSettings}
  <div class="fixed inset-0 z-40" onclick={() => showSettings = false}></div>
{/if}
