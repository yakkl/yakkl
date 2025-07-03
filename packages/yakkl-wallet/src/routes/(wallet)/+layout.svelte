<script lang="ts">
  import { onMount } from 'svelte';
  import '../../app.css';
  import DockLauncher from '$lib/components/DockLauncher.svelte';
  import AIHelpButton from '$lib/components/AIHelpButton.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import Profile from '$lib/components/Profile.svelte';
  import ConfirmLogout from '$lib/components/ConfirmLogout.svelte';
  import SessionWarning from '$lib/components/SessionWarning.svelte';
  import EmergencyKit from '$lib/components/EmergencyKit.svelte';
  import ManageAccounts from '$lib/components/ManageAccounts.svelte';
  import NetworkMismatchModal from '$lib/components/NetworkMismatchModal.svelte';
  import { accountStore, currentAccount } from '$lib/stores/account.store';
  import { chainStore, currentChain, visibleChains } from '$lib/stores/chain.store';
  import { planStore } from '$lib/stores/plan.store';
  import { canUseFeature } from '$lib/stores/plan.store';
  import { isModalOpen } from '$lib/stores/modal.store';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { getYakklAccounts } from '$lib/common/stores';
  import type { ChainDisplay } from '$lib/types';

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
  let showEmergencyKit = $state(false);
  let showManageAccounts = $state(false);
  let showNetworkMismatch = $state(false);
  let pendingChain = $state<ChainDisplay | null>(null);
  let previousChain = $state<ChainDisplay | null>(null);

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

    // Add a small delay to ensure background script is ready
    // This helps prevent "Receiving end does not exist" errors during extension reload
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Perform authentication validation
      const { validateAndRefreshAuth } = await import('$lib/common/authValidation');
      const { syncStorageToStore } = await import('$lib/common/stores');
      
      const isAuthenticated = await validateAndRefreshAuth();
      
      if (isAuthenticated) {
        // User is authenticated, sync all stores from persistent storage
        console.log('Layout: User authenticated, syncing stores from persistent storage...');
        await syncStorageToStore();
        console.log('Layout: Stores synchronized');
      } else {
        console.log('Layout: User not authenticated, skipping store sync');
      }

      // Load wallet data in parallel
      await Promise.all([
        accountStore.loadAccounts(),
        chainStore.loadChains(),
        planStore.loadPlan()
      ]);

      // Initialize session if authenticated
      if (isAuthenticated) {
        const { getProfile } = await import('$lib/common/stores');
        const profile = await getProfile();
        if (profile && profile.data) {
          const profileData = profile.data as any;
          // Start session with JWT
          await sessionManager.startSession(
            profile.id,
            profileData.userName || 'user',
            profile.id,
            profileData.planType || 'basic'
          );
          
          // Load testnet preference from user profile
          if (profile.preferences?.showTestNetworks) {
            showTestnets = true;
            // Update the chain store to show testnets
            chainStore.setShowTestnets(true);
          }
        }
      }
    } catch (error) {
      console.error('Layout: Error initializing stores:', error);
    }

    loading = false;

    // Note: Window close is now handled by SingletonWindowManager
    // The beforeunload event is unreliable for async operations
    // Locking is done in the background script when window is removed
  });

  async function handleSwitchChain(chain: ChainDisplay) {
    // Check if switching to a different chain
    if (selectedChain && selectedChain.chainId !== chain.chainId) {
      // Check if user has an account that supports this specific chain
      const accounts = await getYakklAccounts();
      const hasAccountForChain = accounts?.some(acc => {
        // Check if account explicitly supports this chain
        if (acc.chainIds?.includes(chain.chainId)) {
          return true;
        }
        
        // For Ethereum mainnet and testnets, check if it's an Ethereum account without specific chains
        const isEthereumChain = [1, 5, 11155111].includes(chain.chainId);
        if (isEthereumChain && (!acc.blockchain || acc.blockchain === 'ethereum') && !acc.chainIds) {
          return true;
        }
        
        return false;
      });
      
      if (!hasAccountForChain) {
        // Store the current chain before showing modal
        previousChain = selectedChain;
        pendingChain = chain;
        showNetworkMismatch = true;
        return;
      }
    }
    
    // Proceed with chain switch
    await chainStore.switchChain(chain.chainId);
  }
  
  function getBlockchainType(chainId: number): string {
    // Ethereum and EVM-compatible chains
    if ([1, 5, 11155111, 137, 80001, 56, 97, 43114, 43113, 42161, 421613, 10, 420, 8453, 250].includes(chainId)) {
      return 'ethereum';
    }
    // Solana
    if ([101, 102, 103].includes(chainId)) {
      return 'solana';
    }
    // Add more blockchain types as needed
    return 'unknown';
  }
  
  async function handleCreateAccountForNetwork() {
    if (!pendingChain) return;
    
    try {
      // TODO: Implement account creation for the specific network
      // For now, just close the modal
      console.log('Creating account for network:', pendingChain);
      
      // After account creation, switch to the network
      await chainStore.switchChain(pendingChain.chainId);
      
      showNetworkMismatch = false;
      pendingChain = null;
      previousChain = null;
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  }
  
  function handleCancelNetworkSwitch() {
    // Stay on the current network
    showNetworkMismatch = false;
    pendingChain = null;
    previousChain = null;
  }

  function handleManageAccount() {
    showProfile = true;
  }

  function handleEmergencyKit() {
    showEmergencyKit = true;
  }

  function handleManageAccounts() {
    showManageAccounts = true;
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
      // Import all necessary functions from v1
      const { stopActivityTracking } = await import('$lib/common/messaging');
      const { setBadgeText, setIconLock } = await import('$lib/utilities/utilities');
      const { setLocks } = await import('$lib/common/locks');
      const { removeTimers } = await import('$lib/common/timers');
      const { removeListeners } = await import('$lib/common/listeners');
      const { setMiscStore, resetStores, setYakklTokenDataCustomStorage, yakklTokenDataCustomStore } = await import('$lib/common/stores');
      const { resetTokenDataStoreValues } = await import('$lib/common/resetTokenDataStoreValues');
      const { log } = await import('$lib/common/logger-wrapper');
      const { get } = await import('svelte/store');

      // Follow v1 logout sequence exactly
      await stopActivityTracking();
      
      // Set lock icon and clear badge
      await setBadgeText('');
      await setIconLock();
      
      // CRITICAL: Set isLocked to true in settings
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
      }

      // Clear session marker
      sessionStorage.removeItem('wallet-authenticated');
      
      // End session
      await sessionManager.endSession();

      console.log('V2: Logout completed successfully');

      // Close the popup window
      window.close();

    } catch (error) {
      console.error('V2: Logout failed:', error);
      alert('Logout encountered an error. Please try again or refresh the extension.');
    }
  }
</script>

<div class="yakkl-body h-screen flex flex-col overflow-hidden">
  <!-- Fixed Header -->
  <Header
    link="/"
    account={account}
    chains={chains}
    selectedChain={selectedChain}
    showTestnets={showTestnets}
    onSwitchChain={handleSwitchChain}
    onManageAccount={handleManageAccount}
    onSettings={handleSettings}
    onTheme={handleTheme}
    onLogout={handleLogout}
    onEmergencyKit={handleEmergencyKit}
    onManageAccounts={handleManageAccounts}
    className="flex-shrink-0"
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

  <!-- Emergency Kit Modal -->
  {#if showEmergencyKit}
    <EmergencyKit onClose={() => showEmergencyKit = false} />
  {/if}

  <!-- Manage Accounts Modal -->
  {#if showManageAccounts}
    <ManageAccounts onClose={() => showManageAccounts = false} />
  {/if}

  <!-- Logout Confirmation Modal -->
  <ConfirmLogout
    bind:show={showLogoutConfirm}
    onConfirm={handleLogoutConfirm}
    onCancel={() => showLogoutConfirm = false}
  />
  
  <!-- Session Warning Component -->
  <SessionWarning />
  
  <!-- Network Mismatch Modal -->
  {#if pendingChain}
    <NetworkMismatchModal
      bind:show={showNetworkMismatch}
      chain={pendingChain}
      onCreateAccount={handleCreateAccountForNetwork}
      onCancel={handleCancelNetworkSwitch}
    />
  {/if}
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
