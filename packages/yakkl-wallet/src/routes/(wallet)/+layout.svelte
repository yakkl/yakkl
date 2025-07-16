<script lang="ts">
  import { onMount } from 'svelte';
  // Note: Using window.location instead of goto to avoid HMR conflicts in browser extensions
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
  import { modalStore, isModalOpen } from '$lib/stores/modal.store';
  import { transactionStore } from '$lib/stores/transaction.store';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { getYakklAccounts, getProfile, syncStorageToStore } from '$lib/common/stores';
  import type { ChainDisplay } from '$lib/types';
  import { setupConsoleFilters } from '$lib/utils/console-filter';
  import { lockWallet } from '$lib/common/lockWallet';
  import { validateAndRefreshAuth } from '$lib/common/authValidation';
  import { messagingService } from '$lib/common/messaging';

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // State
  let initializing = $state(true);
  let showTestnets = $state(false);
  let showSettings = $state(false);
  let showProfile = $state(false);
  let showLogoutConfirm = $state(false);
  let showEmergencyKit = $state(false);
  let showManageAccounts = $state(false);
  let showNetworkMismatch = $state(false);
  let isAuthenticated = $state(false);
  let pendingChain = $state<ChainDisplay | null>(null);

  // Computed from stores
  let account = $derived($currentAccount || { address: '', ens: null });
  let selectedChain = $derived($currentChain);
  let chains = $derived($visibleChains);
  let trialEnds = $derived($planStore.plan.trialEndsAt);
  let planType = $derived($planStore.plan.type);
  let modalOpen = $derived($isModalOpen);

  // Initialize stores on mount


  onMount(async () => {
    // Don't block UI - let components handle their own loading
    initializing = true;

    // Added: Setup console filters to suppress known warnings
    setupConsoleFilters();

    // Run initialization without blocking the UI
    (async () => {
      try {
        // Add a small delay to ensure background script is ready
        // This helps prevent "Receiving end does not exist" errors during extension reload
        await new Promise(resolve => setTimeout(resolve, 100));

        // Perform authentication validation
        const authResult = await validateAndRefreshAuth();
        isAuthenticated = authResult;

        if (authResult) {
          // User is authenticated, sync all stores from persistent storage
          console.log('Layout: User authenticated, syncing stores from persistent storage...');
          await syncStorageToStore();
          console.log('Layout: Stores synchronized');
        } else {
          console.log('Layout: User not authenticated, skipping store sync');
        }

        // Load wallet data in parallel with timeout
        await Promise.race([
          Promise.all([
            accountStore.loadAccounts(),
            chainStore.loadChains(),
            planStore.loadPlan()
          ]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Store loading timeout')), 3000)
          )
        ]);

        // Initialize session if authenticated
        if (authResult) {
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
          
          // Transaction monitoring is now handled in background context
          // No need to start it here as it runs independently
          console.log('Layout: Transaction monitoring handled by background context');
        }
      } catch (error) {
        console.error('Layout: Error initializing stores:', error);
      } finally {
        initializing = false;
      }
    })();

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
        pendingChain = chain;
        showNetworkMismatch = true;
        return;
      }
    }

    // Proceed with chain switch
    await chainStore.switchChain(chain.chainId);
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
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  }

  function handleCancelNetworkSwitch() {
    // Stay on the current network
    showNetworkMismatch = false;
    pendingChain = null;
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
      // Reset v2 specific stores before locking
      if (accountStore && typeof accountStore.reset === 'function') {
        accountStore.reset();
      }
      if (chainStore && typeof chainStore.reset === 'function') {
        chainStore.reset();
      }
      if (planStore && typeof planStore.reset === 'function') {
        planStore.reset();
      }

      // End session
      await sessionManager.endSession();

      // Lock the wallet using centralized function
      await lockWallet('user-logout');

      console.log('V2: Logout completed successfully');

      // Send logout message to background to handle all windows
      try {
        await messagingService.sendMessage('logout', { reason: 'user-logout' });
      } catch (error) {
        console.error('Failed to send logout message to background', error);
      }

      // Navigate to logout page to handle proper cleanup
      window.location.href = '/logout';

    } catch (error) {
      console.error('V2: Logout failed:', error);
      // Try to navigate to logout page anyway
      try {
        window.location.href = '/logout';
      } catch (navError) {
        // As last resort, try window.location
        window.location.href = '/logout';
      }
    }
  }
</script>

<div class="yakkl-body h-screen flex flex-col overflow-hidden">
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
  {#if isAuthenticated}
    <SessionWarning />
  {/if}

  <!-- Network Mismatch Modal -->
  {#if pendingChain}
    <NetworkMismatchModal
      bind:show={showNetworkMismatch}
      chain={pendingChain}
      onCreateAccount={handleCreateAccountForNetwork}
      onCancel={handleCancelNetworkSwitch}
    />
  {/if}

  <!-- Fixed Header -->
  <Header
    link="/home"
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
    <!-- Changed: Always render content, let components handle their own loading -->
    <div class="min-h-full">
      {@render children?.()}
    </div>

    <!-- Show initializing indicator only if taking too long -->
    {#if initializing}
      <div class="fixed bottom-20 right-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg shadow-lg text-sm z-40">
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
          <span>Initializing wallet...</span>
        </div>
      </div>
    {/if}
  </main>

  <!-- Fixed Footer -->
  <Footer
    {planType}
    trialEnds={trialEnds}
    appName="YAKKL"
    className="flex-shrink-0"
  />

  <!-- ScrollIndicator as overlay -->
  <!-- <ScrollIndicator /> -->

  <!-- Floating Elements above footer - only show if features are available and no modals open -->
  {#if !modalOpen}
    <!-- {#if canUseFeature('basic_features')} -->
      <DockLauncher className="fixed bottom-12 left-4 z-40" />
    <!-- {/if} -->

    {#if canUseFeature('ai_assistant')}
      <AIHelpButton className="fixed bottom-12 right-4 z-40" />
    {:else}
      <!-- Show locked AI button for non-Pro users -->
      <div class="fixed bottom-12 right-4 z-40">
        <button
          onclick={() => modalStore.openModal('upgrade')}
          class="yakkl-circle-button text-xl opacity-60 hover:opacity-80 transition-opacity"
          title="AI Assistant (Pro Feature - Upgrade Required)"
        >
          🤖
        </button>
      </div>
    {/if}
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
