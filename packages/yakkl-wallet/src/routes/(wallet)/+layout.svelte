<script lang="ts">
  import { onMount } from 'svelte';
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
  import TroubleshootingFAB from '$lib/components/TroubleshootingFAB.svelte';
  import { accountStore, currentAccount } from '$lib/stores/account.store';
  import { chainStore, currentChain, visibleChains } from '$lib/stores/chain.store';
  import { planStore } from '$lib/stores/plan.store';
  import { canUseFeature } from '$lib/stores/plan.store';
  import { modalStore, isModalOpen } from '$lib/stores/modal.store';
  import { sessionManager } from '$lib/managers/SessionManager';
  import {
    getYakklAccounts,
    getProfile,
    getMiscStore,
    resetStores,
    setMiscStore,
  } from '$lib/common/stores';
  import type { ChainDisplay } from '$lib/types';
  import { setupConsoleFilters } from '$lib/utils/console-filter';
  import { validateAndRefreshAuth } from '$lib/common/authValidation';
  import { goto } from '$app/navigation';
  import { decryptData, isEncryptedData, type ProfileData } from '$lib/common';
  import { log } from '$lib/common/logger-wrapper';
  import { setBadgeText, setIconLock } from '$lib/utilities/utilities';
  import { removeTimers } from '$lib/common/timers';
  import { removeListeners } from '$lib/common/listeners';
  import { setLocks } from '$lib/common/locks';
  import { resetTokenDataStoreValues } from '$lib/common/resetTokenDataStoreValues';
  import { stopActivityTracking } from '$lib/common/messaging';
	import { lockWallet } from '$lib/common/lockWallet';
  import { appStateManager, AppPhase } from '$lib/managers/AppStateManager';

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // --- State ---
  let appState = $state($appStateManager);
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

  // --- Derived values ---
  let account = $derived($currentAccount || { address: '', ens: null });
  let selectedChain = $derived($currentChain);
  let chains = $derived($visibleChains);
  let trialEnds = $derived($planStore.plan.trialEndsAt);
  let planType = $derived($planStore.plan.type);
  let modalOpen = $derived($isModalOpen);

  // --- Initialization ---
  onMount(() => {
    if (typeof window === 'undefined') return;

    setupConsoleFilters();

    // Subscribe to app state changes
    const unsubscribe = appStateManager.subscribe(state => {
      appState = state;
      initializing = state.phase !== AppPhase.READY && state.phase !== AppPhase.ERROR;
    });

    // Run async initialization
    (async () => {
      try {
        // Wait for app to be ready (extension connected, stores loaded, cache initialized)
        await appStateManager.waitForReady();
        
        // Now perform authentication validation
        const authResult = await validateAndRefreshAuth();
        isAuthenticated = authResult;

        if (authResult) {
          // Load remaining stores that aren't critical for initialization
          await Promise.all([
            accountStore.loadAccounts(),
            chainStore.loadChains(),
            planStore.loadPlan()
          ]);

          const profile = await getProfile();
          const miscStore = getMiscStore();
          if (profile && profile.data && miscStore) {
            if (isEncryptedData(profile.data)) {
              const profileData = await decryptData(profile.data, miscStore) as ProfileData;
              log.info('Layout: Starting session with JWT', false, profileData);
              await sessionManager.startSession(
                profile.id,
                profile.username || 'user',
                profile.id,
                profileData.planType || 'explorer_member'
              );
              if (profile.preferences?.showTestNetworks) {
                showTestnets = true;
                chainStore.setShowTestnets(true);
              }
            }
          }
          console.log('Layout: Transaction monitoring handled by background context');
        } else {
          console.log('Layout: User not authenticated, skipping store sync', authResult);
        }
      } catch (error) {
        console.error('Layout: Error during initialization:', error);
        // Show error state to user
        if (appState.phase === AppPhase.ERROR) {
          console.error('App initialization error:', appState.error);
        }
      } finally {
        initializing = false;
      }
    })();

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  });

  // --- Handlers for Header, NetworkMismatchModal, ConfirmLogout, etc. ---
  async function handleSwitchChain(chain: ChainDisplay) {
    if (selectedChain && selectedChain.chainId !== chain.chainId) {
      const accounts = await getYakklAccounts();
      const hasAccountForChain = accounts?.some(acc => {
        if (acc.chainIds?.includes(chain.chainId)) return true;
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
    await chainStore.switchChain(chain.chainId);
  }

  async function handleCreateAccountForNetwork() {
    if (!pendingChain) return;
    try {
      console.log('Creating account for network:', pendingChain);
      await chainStore.switchChain(pendingChain.chainId);
      showNetworkMismatch = false;
      pendingChain = null;
    } catch (error) {
      console.error('Failed to create account:', error);
    }
  }

  function handleCancelNetworkSwitch() {
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
    document.documentElement.classList.toggle('dark');
  }

  async function handleLogout() {
    const skipConfirmation = localStorage.getItem('yakkl:skip-logout-confirmation') === 'true';
    if (skipConfirmation) {
      await performLogout();
    } else {
      showLogoutConfirm = true;
    }
  }

  async function handleLogoutConfirm(dontShowAgain: boolean) {
    if (dontShowAgain) {
      localStorage.setItem('yakkl:skip-logout-confirmation', 'true');
    }
    await performLogout();
  }

  async function performLogout() {
    try {
      console.log('Layout: Starting logout process');

      // Send logout message to background
      try {
        const { getBrowserExtFromGlobal } = await import('$lib/common/environment');
        const browserApi = await getBrowserExtFromGlobal();
        if (browserApi && browserApi.runtime) {
          await browserApi.runtime.sendMessage({ type: 'logout', reason: 'user-logout' });
          console.log('Layout: Sent logout message to background');
        } else {
          console.error('Layout: Could not send logout message to background: browserApi is undefined');
        }
      } catch (error) {
        console.error('Layout: Could not send logout message to background:', error);
      }

      // Perform local cleanup
      await stopActivityTracking();
      await setBadgeText('');
      await setIconLock();
      await setLocks(true);
      removeTimers();
      removeListeners();
      setMiscStore('');
      resetTokenDataStoreValues();
      // setYakklTokenDataCustomStorage(get(yakklTokenDataCustomStore));
      resetStores();

      if (accountStore && typeof accountStore.reset === 'function') accountStore.reset();
      if (chainStore && typeof chainStore.reset === 'function') chainStore.reset();
      if (planStore && typeof planStore.reset === 'function') planStore.reset();

      sessionStorage.removeItem('wallet-authenticated');
      console.log('Logout completed successfully');

      // Navigate to logout page - wrap in try/catch to prevent errors
      try {
        // await goto('/logout');
        await lockWallet('user-logout');
        window.close();
      } catch (navError) {
        console.error('Layout: Navigation to logout page failed:', navError);
        // If navigation fails, try to close the window
        try {
          window.close();
        } catch (closeError) {
          console.error('Layout: Could not close window:', closeError);
        }
      }
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Logout encountered an error. Please try again.');
    }
  }
</script>

<!-- Wallet-specific overlays & modals -->
<Settings bind:show={showSettings} />
<Profile bind:show={showProfile} />
{#if showEmergencyKit}
  <EmergencyKit onClose={() => showEmergencyKit = false} />
{/if}
{#if showManageAccounts}
  <ManageAccounts onClose={() => showManageAccounts = false} />
{/if}
<ConfirmLogout
  bind:show={showLogoutConfirm}
  onConfirm={handleLogoutConfirm}
  onCancel={() => showLogoutConfirm = false}
/>
{#if isAuthenticated}
  <SessionWarning />
  <JWTValidationModalProvider />
{/if}
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
  className="flex-shrink-0 fixed z-[40] top-0"
/>

<!-- Scrollable Content Area -->
<main class="flex-1 overflow-hidden mt-4">
  <ScrollIndicator>
    <div class="min-h-full">
      {@render children?.()}
    </div>
    {#if initializing}
      <div class="fixed bottom-20 right-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg shadow-lg text-sm z-40">
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600"></div>
          <span>
            {#if appState.phase === AppPhase.BOOTSTRAPPING}
              Connecting to extension...
            {:else if appState.phase === AppPhase.AUTHENTICATING}
              Checking authentication...
            {:else if appState.phase === AppPhase.LOADING_STORES}
              Loading wallet data...
            {:else if appState.phase === AppPhase.LOADING_CACHE}
              Initializing cache...
            {:else}
              Initializing wallet...
            {/if}
          </span>
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
  className="flex-shrink-0 bottom-0 fixed z-[40]"
/>

<!-- Floating Elements above footer -->
{#if !modalOpen}
  <DockLauncher className="fixed bottom-12 left-4 z-40" />
  {#if canUseFeature('ai_assistant')}
    <AIHelpButton className="fixed bottom-12 right-4 z-40" />
  {:else}
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

<TroubleshootingFAB />

<style>
  /* Add any wallet-specific styles here */
</style>
