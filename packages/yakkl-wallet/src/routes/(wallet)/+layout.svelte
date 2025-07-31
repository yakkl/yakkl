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
  import JWTValidationModalProvider from '$lib/components/JWTValidationModalProvider.svelte';
  import EmergencyKit from '$lib/components/EmergencyKit.svelte';
  import ManageAccounts from '$lib/components/ManageAccounts.svelte';
  import NetworkMismatchModal from '$lib/components/NetworkMismatchModal.svelte';
  import ScrollIndicator from '$lib/components/ScrollIndicator.svelte';
  import { accountStore, currentAccount } from '$lib/stores/account.store';
  import { chainStore, currentChain, visibleChains } from '$lib/stores/chain.store';
  import { planStore } from '$lib/stores/plan.store';
  import { canUseFeature } from '$lib/stores/plan.store';
  import { modalStore, isModalOpen } from '$lib/stores/modal.store';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { getYakklAccounts, getProfile, syncStorageToStore, getMiscStore } from '$lib/common/stores';
  import type { ChainDisplay } from '$lib/types';
  import { setupConsoleFilters } from '$lib/utils/console-filter';
  import { validateAndRefreshAuth } from '$lib/common/authValidation';
	import { goto } from '$app/navigation';
	import { decryptData, isEncryptedData, type ProfileData } from '$lib/common';
	import { log } from '$lib/common/logger-wrapper';

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
          log.info('Layout: User authenticated, syncing stores from persistent storage...');
          await syncStorageToStore();
          log.info('Layout: Stores synchronized');

          // Load wallet data in parallel with timeout
          // Only load stores if we're in a browser context with extension APIs available
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
            try {
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
            } catch (error) {
              console.warn('Wallet Layout: Store loading failed or timed out:', error);
              // Don't fail - stores will be populated when needed
            }
          } else {
            console.log('Wallet Layout: Skipping store loading - extension context not ready');
          }

        } else {
          log.info('Layout: User not authenticated, skipping store sync', false, authResult);
        }

        // Initialize session if authenticated
        if (authResult) {
          log.info('Layout: User authenticated, syncing stores from persistent storage', false, authResult);
          const profile = await getProfile();
          const miscStore = getMiscStore();
          if (profile && profile.data) {
            if (isEncryptedData(profile.data)) {
              const profileData = await decryptData(profile.data, miscStore) as ProfileData;

              log.info('Layout: Starting session with JWT', false, profileData);

              // Start session with JWT
              await sessionManager.startSession(
                profile.id,
                profile.username || 'user',
                profile.id,
                profileData.planType || 'explorer_member'
              );

              // Load testnet preference from user profile
              if (profile.preferences?.showTestNetworks) {
                showTestnets = true;
                // Update the chain store to show testnets
                chainStore.setShowTestnets(true);
              }
            }
          }

          // Transaction monitoring is now handled in background context
          // No need to start it here as it runs independently
          log.info('Layout: Transaction monitoring handled by background context');
        }
      } catch (error) {
        log.warn('Layout: Error initializing stores:', error);
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
      log.info('Creating account for network:', false, pendingChain);

      // After account creation, switch to the network
      await chainStore.switchChain(pendingChain.chainId);

      showNetworkMismatch = false;
      pendingChain = null;
    } catch (error) {
      log.warn('Failed to create account:', false, error);
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

      // Clear session marker
      sessionStorage.removeItem('wallet-authenticated');

      console.log('V2: Logout completed successfully');

      // Navigate to logout page using SvelteKit navigation
      await goto('/logout');

    } catch (error) {
      console.error('V2: Logout failed:', error);
      alert('Logout encountered an error. Please try again or refresh the extension.');
    }
  }
  // async function performLogout() {
  //   try {
  //     // Reset v2 specific stores before locking
  //     if (accountStore && typeof accountStore.reset === 'function') {
  //       accountStore.reset();
  //     }
  //     if (chainStore && typeof chainStore.reset === 'function') {
  //       chainStore.reset();
  //     }
  //     if (planStore && typeof planStore.reset === 'function') {
  //       planStore.reset();
  //     }

  //     // End session
  //     await sessionManager.endSession();

  //     // Lock the wallet using centralized function
  //     await lockWallet('user-logout');

  //     log.info('V2: Logout completed successfully');

  //     // Send logout message to background to handle all windows
  //     try {
  //       await messagingService.sendMessage('logout', { reason: 'user-logout' });
  //     } catch (error) {
  //       log.warn('Failed to send logout message to background', error);
  //     }

  //     // Navigate to logout page to handle proper cleanup
  //     await goto('/logout');

  //   } catch (error) {
  //     log.warn('V2: Logout failed:', error);
  //     // Try to navigate to logout page anyway
  //     try {
  //       await goto('/logout');
  //     } catch (navError) {
  //       // As last resort, try window.location
  //       await goto('/login');
  //     }
  //   }
  // }
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

  <!-- JWT Validation Modal -->
  {#if isAuthenticated}
    <JWTValidationModalProvider />
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
  <main class="flex-1 overflow-hidden">
    <ScrollIndicator>
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
    </ScrollIndicator>
  </main>

  <!-- Fixed Footer -->
  <Footer
    {planType}
    trialEnds={trialEnds}
    appName="YAKKL"
    className="flex-shrink-0"
  />

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
