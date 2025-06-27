<script lang="ts">
  import { onMount } from 'svelte';
  import DockLauncher from './lib/components/DockLauncher.svelte';
  import AIHelpButton from './lib/components/AIHelpButton.svelte';
  import Header from './lib/components/Header.svelte';
  import Footer from './lib/components/Footer.svelte';
  import UpgradeBanner from './lib/components/UpgradeBanner.svelte';
  import Settings from './lib/components/Settings.svelte';
  import Profile from './lib/components/Profile.svelte';
  import ConfirmLogout from './lib/components/ConfirmLogout.svelte';
  import { accountStore, currentAccount } from './lib/stores/account.store';
  import { chainStore, currentChain, visibleChains } from './lib/stores/chain.store';
  import { planStore } from './lib/stores/plan.store';
  import { canUseFeature } from './lib/stores/plan.store';
  import { isModalOpen } from './lib/stores/modal.store';
  
  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // State
  let loading = $state(true);
  let showTestnets = $state(false);
  let showSettings = $state(false);
  let showProfile = $state(false);
  let showLogoutConfirm = $state(false);

  // Computed from stores
  let account = $derived($currentAccount || { address: '', ens: null });
  let selectedChain = $derived($currentChain);
  let chains = $derived($visibleChains);
  let trialEnds = $derived($planStore.plan.trialEndsAt);
  let planType = $derived($planStore.plan.type);
  let modalOpen = $derived($isModalOpen);

  // Initialize stores on mount
  onMount(async () => {
    loading = true;

    try {
      // First check if user is authenticated
      const { getSettings, syncStorageToStore } = await import('$lib/common/stores');
      const settings = await getSettings();

      if (settings && !settings.isLocked && settings.init) {
        // User is authenticated, sync all stores from persistent storage
        console.log('Layout: Syncing stores from persistent storage...');
        await syncStorageToStore();
        console.log('Layout: Stores synchronized');
      }

      // Load preview2 specific data in parallel
      await Promise.all([
        accountStore.loadAccounts(),
        chainStore.loadChains(),
        planStore.loadPlan()
      ]);
    } catch (error) {
      console.error('Layout: Error initializing stores:', error);
    }

    loading = false;
  });

  function handleSwitchChain(chain: any) {
    chainStore.switchChain(chain.chainId);
  }

  function handleManageAccount() {
    showProfile = true;
  }

  function handleSettings() {
    showSettings = true;
  }

  function handleTheme() {
    // Toggle theme
    document.documentElement.classList.toggle('dark');
  }

  async function handleLogout() {
    // Check if user has disabled logout confirmation
    const skipConfirmation = localStorage.getItem('yakkl:skip-logout-confirmation') === 'true';

    if (skipConfirmation) {
      // Skip confirmation and logout directly
      await performLogout();
    } else {
      // Show confirmation dialog
      showLogoutConfirm = true;
    }
  }

  async function handleLogoutConfirm(dontShowAgain: boolean) {
    if (dontShowAgain) {
      // Save the preference to skip confirmation next time
      localStorage.setItem('yakkl:skip-logout-confirmation', 'true');
    }

    await performLogout();
  }

  async function performLogout() {
    try {
      // Import all necessary functions
      const {
        resetStores,
        setMiscStore,
        setYakklTokenDataCustomStorage,
        yakklTokenDataCustomStore
      } = await import('$lib/common/stores');

      const { setBadgeText, setIconLock } = await import('$lib/utilities/utilities');
      const { removeTimers } = await import('$lib/common/timers');
      const { removeListeners } = await import('$lib/common/listeners');
      const { setLocks } = await import('$lib/common/locks');
      const { resetTokenDataStoreValues } = await import('$lib/common/resetTokenDataStoreValues');
      const { stopActivityTracking } = await import('$lib/common/messaging');
      const { log } = await import('$lib/common/logger-wrapper');
      const { get } = await import('svelte/store');

      // Stop activity tracking
      await stopActivityTracking();

      // Set lock icon and clear badge
      await setBadgeText('');
      await setIconLock();

      // Lock the wallet
      await setLocks(true);

      // Clear session-specific state
      removeTimers();
      removeListeners();
      setMiscStore('');
      resetTokenDataStoreValues();

      // Zero out values in custom token storage
      setYakklTokenDataCustomStorage(get(yakklTokenDataCustomStore));

      // Reset all stores
      resetStores();

      // Reset preview2 specific stores
      if (accountStore && typeof accountStore.reset === 'function') {
        accountStore.reset();
      }
      if (chainStore && typeof chainStore.reset === 'function') {
        chainStore.reset();
      }
      if (planStore && typeof planStore.reset === 'function') {
        planStore.reset();
      } else {
        console.warn('planStore.reset is not available, skipping plan store reset');
      }

      // Clear preview2 session marker
      sessionStorage.removeItem('preview2-authenticated');

      console.log('Preview2: Logout completed successfully');

      // Navigate to login page
      window.location.href = '/preview2/login';

    } catch (error) {
      console.error('Preview2: Logout failed:', error);
      alert('Logout encountered an error. Please try again or refresh the extension.');
    }
  }
</script>

<div class="yakkl-body h-screen flex flex-col overflow-hidden">
  <!-- Fixed Header -->
  <Header
    link="/preview2"
    account={account}
    chains={chains}
    selectedChain={selectedChain}
    showTestnets={showTestnets}
    onSwitchChain={handleSwitchChain}
    onManageAccount={handleManageAccount}
    onSettings={handleSettings}
    onTheme={handleTheme}
    onLogout={handleLogout}
    className="flex-shrink-0"
  />

  <!-- Upgrade Banner -->
  <UpgradeBanner
    className="flex-shrink-0"
    position="inline"
    showOnBasic={true}
    showOnTrial={true}
  />

  <!-- Scrollable Content Area -->
  <main class="flex-1 overflow-y-auto overflow-x-hidden">
    {#if loading}
      <div class="min-h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading wallet...</p>
        </div>
      </div>
    {:else}
      <div class="min-h-full pb-16">
        {@render children?.()}
      </div>
    {/if}
  </main>

  <!-- Fixed Footer -->
  <div class="flex-shrink-0">
    <Footer
      {planType}
      trialEnds={trialEnds}
      appName="YAKKL"
      className=""
    />
  </div>

  <!-- Floating Elements above footer - only show if features are available and no modals open -->
  {#if !modalOpen}
    {#if canUseFeature('basic_features')}
      <DockLauncher className="fixed bottom-12 left-4 z-50" />
    {/if}

    {#if canUseFeature('ai_assistant')}
      <AIHelpButton className="fixed bottom-12 right-4 z-50" />
    {/if}
  {/if}

  <!-- Settings Modal -->
  <Settings bind:show={showSettings} />

  <!-- Profile Modal -->
  <Profile bind:show={showProfile} />

  <!-- Logout Confirmation Modal -->
  <ConfirmLogout
    bind:show={showLogoutConfirm}
    onConfirm={handleLogoutConfirm}
    onCancel={() => showLogoutConfirm = false}
  />
</div>

<style>
  :global(body) {
    margin: 0;
    background-color: #f8fafc;
  }
  :global(html.dark body) {
    background-color: #0e0e11;
  }
</style>
