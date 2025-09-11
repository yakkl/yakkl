<script lang="ts">
  import ConnectionDashboard from './troubleshooting/ConnectionDashboard.svelte';
  import RPCHealthCheck from './troubleshooting/RPCHealthCheck.svelte';
  import NetworkSimulator from './troubleshooting/NetworkSimulator.svelte';
  import CacheCleaner from './troubleshooting/CacheCleaner.svelte';
  import PerformanceProfiler from './troubleshooting/PerformanceProfiler.svelte';
  import { isProUser, planStore } from '$lib/stores/plan.store';
  import { PlanType } from '$lib/common/types';
  import Upgrade from './Upgrade.svelte';
  import Modal from '@yakkl/ui/src/components/Modal.svelte';

  let { show = $bindable(false) } = $props();

  let showUpgradeModal = $state(false);
  let activeTab = $state('connection');
  let planLoaded = $state(false);

  // Ensure plan store is loaded when modal opens
  $effect(() => {
    if (show && !planLoaded) {
      planStore.loadPlan().then(() => {
        planLoaded = true;
        console.log('Plan loaded successfully:', $planStore?.plan?.type);
      }).catch(error => {
        console.error('Failed to load plan:', error);
        planLoaded = true; // Mark as loaded even on error to prevent infinite retries
      });
    }
  });

  // Check if user has Pro access (including Founding Member and Early Adopter)
  let hasProAccess = $derived((() => {
    // Wait for plan to be loaded before checking access
    if (!planLoaded) return false;
    
    const planType = $planStore?.plan?.type;
    const isProLevel = planType === PlanType.YAKKL_PRO || 
                      planType === PlanType.FOUNDING_MEMBER || 
                      planType === PlanType.EARLY_ADOPTER ||
                      planType === PlanType.YAKKL_PRO_PLUS ||
                      planType === PlanType.ENTERPRISE;
    return isProLevel || $isProUser;
  })());

  $effect(() => {
    if (planLoaded) {
      console.log('hasProAccess>>>>>>>>>>>>>>>>>>>>>>', hasProAccess, $isProUser, $planStore?.plan?.type);
    }
  });

  const tabs = [
    { id: 'connection', label: 'Connection Status', icon: '🔌' },
    { id: 'rpc', label: 'RPC Health', icon: '⚡' },
    { id: 'simulator', label: 'Network Test', icon: '🌐' },
    // { id: 'cache', label: 'Clear Cache', icon: '🗑️' },
    { id: 'performance', label: 'Performance', icon: '📊' }
  ];

  function handleClose() {
    show = false;
  }

  function handleUpgradeComplete() {
    showUpgradeModal = false;
    handleClose();
  }
</script>

<Upgrade
  bind:show={showUpgradeModal}
  onComplete={handleUpgradeComplete}
  onCancel={() => {
    showUpgradeModal = false;
    handleClose();
  }}
/>

<Modal bind:show title="Network Diagnostics & Troubleshooting" onClose={handleClose} className="max-w-4xl">
  <div class="flex flex-col h-[85vh]">
    <!-- Tab navigation -->
    <div class="flex gap-1 mb-4 p-1 bg-base-200 dark:bg-gray-700 rounded-lg">
      {#each tabs as tab}
        {#if tab.id !== 'cache'}
          <button
            class="flex-1 px-3 py-2 rounded-lg transition-all duration-200 
                   {activeTab === tab.id 
                     ? 'bg-primary text-primary-content shadow-sm' 
                     : 'text-base-content dark:text-gray-200 hover:bg-base-300 dark:hover:bg-gray-600'}"
            onclick={() => activeTab = tab.id}
          >
            <span class="mr-1">{tab.icon}</span>
            <span class="text-sm font-medium">{tab.label}</span>
          </button>
        {/if}
      {/each}
    </div>

    <!-- Scrollable Content -->
    <div class="flex-1 overflow-y-auto min-h-0 px-1">
      <div class="pb-20"><!-- Added extra padding for footer -->
        {#if !planLoaded}
          <!-- Loading state while plan is being loaded -->
          <div class="flex flex-col items-center justify-center h-full py-12">
            <div class="text-center space-y-4">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p class="text-base-content/70">Loading plan information...</p>
            </div>
          </div>
        {:else if hasProAccess}
          {#if activeTab === 'connection'}
            <ConnectionDashboard />
          {:else if activeTab === 'rpc'}
            <RPCHealthCheck />
          {:else if activeTab === 'simulator'}
            <NetworkSimulator />
          {:else if activeTab === 'cache'}
            <CacheCleaner />
          {:else if activeTab === 'performance'}
            <PerformanceProfiler />
          {/if}
        {:else}
          <!-- Free tier view -->
          <div class="flex flex-col items-center justify-center h-full py-12">
            <div class="text-center space-y-6">
              <div class="text-6xl">🔒</div>
              <h2 class="text-2xl font-bold">Pro Feature</h2>
              <p class="text-base-content/70 max-w-md">
                Advanced network diagnostics and troubleshooting tools are available for Pro users.
              </p>

              <div class="space-y-4">
                <h3 class="font-semibold">What you get with Pro:</h3>
                <ul class="text-left space-y-2 inline-block">
                  <li class="flex items-center gap-2">
                    <span class="text-green-500">✓</span>
                    Real-time network speed testing
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-500">✓</span>
                    RPC health monitoring across multiple providers
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-500">✓</span>
                    Performance profiling and metrics
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-500">✓</span>
                    Network simulation tools
                  </li>
                  <li class="flex items-center gap-2">
                    <span class="text-green-500">✓</span>
                    Connection diagnostics
                  </li>
                </ul>
              </div>

              <button
                class="btn btn-primary"
                onclick={() => showUpgradeModal = true}
              >
                Upgrade to Pro
              </button>

              <!-- Basic status for free users -->
              <div class="divider">Current Status</div>
              <div class="stats shadow">
                <div class="stat">
                  <div class="stat-title">Connection</div>
                  <div class="stat-value text-lg">
                    {#if navigator.onLine}
                      <span class="text-green-500">Online</span>
                    {:else}
                      <span class="text-red-500">Offline</span>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Fixed Footer -->
    <div class="absolute bottom-0 left-0 right-0 bg-base-100 dark:bg-gray-800 border-t border-base-300 dark:border-gray-700 p-4">
      <div class="flex justify-end">
        <button class="btn btn-ghost" onclick={handleClose}>
          Close
        </button>
      </div>
    </div>
  </div>
</Modal>
