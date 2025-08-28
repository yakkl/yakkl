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
  } from '$lib/common/stores';
  import type { ChainDisplay } from '$lib/types';
  import { goto } from '$app/navigation';
  import { decryptData, isEncryptedData, type ProfileData } from '$lib/common';
  import { log } from '$lib/common/logger-wrapper';
  import { lockWallet } from '$lib/common/lockWallet';
  import { appStateManager, AppPhase } from '$lib/managers/AppStateManager';
  import IdleCountdownModalEnhanced from '$lib/components/IdleCountdownModalEnhanced.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // --- State ---
  let appState = $state($appStateManager);
  let initializing = $state(true);
  let isAuthenticating = $state(true);  // Show loader while authenticating
  let showTestnets = $state(false);
  let showSettings = $state(false);
  let showProfile = $state(false);
  let showLogoutConfirm = $state(false);
  let showEmergencyKit = $state(false);
  let showManageAccounts = $state(false);
  let showNetworkMismatch = $state(false);
  let isAuthenticated = $state(false);
  let pendingChain = $state<ChainDisplay | null>(null);
  let isLoggingOut = $state(false);
  let logoutMessage = $state('');

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

    // setupConsoleFilters();

    // Subscribe to app state changes
    const unsubscribe = appStateManager.subscribe(state => {
      appState = state;
      initializing = state.phase !== AppPhase.READY && state.phase !== AppPhase.ERROR;
      console.log('[(wallet)/+Layout.svelte] appStateManager >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {appState, initializing, phase: state.phase});
    });

    // Run async initialization
    (async () => {
      try {
        // Wait for app to be ready (extension connected, stores loaded, cache initialized)
        console.log('[(wallet)/+Layout.svelte] appStateManager >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {appStateManager});
        await appStateManager.waitForReady();

        // Authentication has already been validated in +layout.ts
        // We can assume we're authenticated if we reach this component
        isAuthenticated = true;
        isAuthenticating = false;  // Hide loader once authenticated

        console.log('[(wallet)/+Layout.svelte] isAuthenticated >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', isAuthenticated);

        // Load remaining stores that aren't critical for initialization
        await Promise.all([
          accountStore.loadAccounts(),
          chainStore.loadChains(),
          planStore.loadPlan()
        ]);

        console.log('[(wallet)/+Layout.svelte] accountStore >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {accountStore});
        console.log('[(wallet)/+Layout.svelte] chainStore >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {chainStore});
        console.log('[(wallet)/+Layout.svelte] planStore >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {planStore});

        // Setup session and user preferences
        const profile = await getProfile();
        console.log('[(wallet)/+Layout.svelte] profile >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {profile});
        const miscStore = getMiscStore();
        if (profile && profile.data && miscStore) {
          if (isEncryptedData(profile.data)) {
            const profileData = await decryptData(profile.data, miscStore) as ProfileData;
            log.info('Layout: Starting session with JWT', false, profileData);
            console.log('[(wallet)/+Layout.svelte] profileData >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', profileData);
            const session = await sessionManager.startSession(
              profile.id,
              profile.username || 'user',
              profile.id,
              profileData.planType || 'explorer_member'
            );
            console.log('[(wallet)/+Layout.svelte] session >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>', {session});
            if (profile.preferences?.showTestNetworks) {
              showTestnets = true;
              chainStore.setShowTestnets(true);
            }
          }
        }
        console.log('[(wallet)/+Layout.svelte] Transaction monitoring handled by background context');
      } catch (error) {
        console.error('[(wallet)/+Layout.svelte] Error during initialization:', error);
        // Show error state to user
        if (appState.phase === AppPhase.ERROR) {
          console.error('[(wallet)/+Layout.svelte] App initialization error:', appState.error);
        }
      } finally {
        initializing = false;
        isAuthenticating = false;  // Ensure loader is hidden
      }
    })();

    // Add keyboard shortcuts
    function handleKeyboardShortcuts(e: KeyboardEvent) {
      // Ctrl+Shift+L for Logout (Cmd+Shift+L on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        handleLogout();
      }
      // Ctrl+Shift+X for Exit (Cmd+Shift+X on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        handleExit();
      }
    }

    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Cleanup on unmount
    return () => {
      unsubscribe();
      document.removeEventListener('keydown', handleKeyboardShortcuts);
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
      console.log('[(wallet)/+Layout.svelte] Creating account for network:', pendingChain);
      await chainStore.switchChain(pendingChain.chainId);
      showNetworkMismatch = false;
      pendingChain = null;
    } catch (error) {
      console.error('[(wallet)/+Layout.svelte] Failed to create account:', error);
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

  // Service cleanup function
  async function stopAllClientServices() {
    console.log('[(wallet)/+Layout.svelte] stopAllClientServices: Quick service cleanup...');

    // Stop TokenService (fire-and-forget)
    import('$lib/services/token.service').then(({ TokenService }) => {
      const tokenService = TokenService.getInstance();
      if (tokenService && typeof tokenService.stop === 'function') {
        tokenService.stop().catch(() => {});
      }
    }).catch(() => {});

    // Stop all timers (fire-and-forget)
    import('$lib/managers/TimerManager').then(({ TimerManager }) => {
      const timerManager = TimerManager.getInstance();
      if (timerManager && typeof timerManager.stopAll === 'function') {
        timerManager.stopAll();
      }
    }).catch(() => {});

    // Clear all intervals/timeouts
    if (typeof window !== 'undefined') {
      const highestId = setTimeout(() => {}, 0) as unknown as number;
      for (let i = 0; i < highestId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      console.log('[(wallet)/+Layout.svelte] stopAllClientServices: ✓ All intervals/timeouts cleared');
    }
  }

  async function handleLogout() {
    const skipConfirmation = localStorage.getItem('yakkl:skip-logout-confirmation') === 'true';
    if (skipConfirmation) {
      performLogout('logout'); // Don't await - let it run
    } else {
      showLogoutConfirm = true;
    }
  }

  async function handleExit() {
    isLoggingOut = true;
    logoutMessage = 'Closing wallet...';

    // Start cleanup (fire-and-forget)
    stopAllClientServices();

    // Perform exit (fire-and-forget)
    performLogout('exit');

    // Close window immediately
    if (typeof window !== 'undefined' && window.close) {
      setTimeout(() => window.close(), 100); // Small delay to ensure cleanup starts
    }
  }

  async function handleLogoutConfirm(dontShowAgain: boolean) {
    if (dontShowAgain) {
      localStorage.setItem('yakkl:skip-logout-confirmation', 'true');
    }
    await performLogout('logout');
  }

  async function performLogout(mode: 'logout' | 'exit' = 'logout') {
    console.log(`[(wallet)/+Layout.svelte] performLogout: FAST ${mode.toUpperCase()} STARTED`);
    const startTime = Date.now();

    // Show loading overlay for logout
    if (mode === 'logout') {
      isLoggingOut = true;
      logoutMessage = 'Logging out...';
    }

    try {
      // Start service cleanup (fire-and-forget)
      stopAllClientServices();

      // Call lockWallet - now optimized to be < 1 second
      console.log('[(wallet)/+Layout.svelte] performLogout: Calling fast lockWallet...');
      await lockWallet(mode === 'exit' ? 'user-exit' : 'user-logout');

      // Clear session storage (synchronous, instant)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      const elapsed = Date.now() - startTime;
      console.log(`[(wallet)/+Layout.svelte] performLogout: ✓ FAST ${mode.toUpperCase()} completed in ${elapsed}ms`);

      // Navigate to login page for logout only
      if (mode === 'logout') {
        await goto('/login', { replaceState: true });
      }

    } catch (error) {
      console.error(`[(wallet)/+Layout.svelte] performLogout: ${mode} error:`, error?.message);

      // Even on error, navigate to login for logout
      if (mode === 'logout') {
        try {
          await goto('/login', { replaceState: true });
        } catch (navError) {
          // Ignore navigation errors
        }
      }
    } finally {
      isLoggingOut = false;
    }
  }
</script>

<!-- Loading overlay for logout/exit -->
{#if isAuthenticating}
  <!-- <AuthenticationLoader /> -->
{/if}

{#if isLoggingOut}
  <div class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center">
    <div class="bg-white dark:bg-zinc-800 rounded-lg p-6 shadow-2xl">
      <div class="flex items-center gap-3">
        <div class="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
        <span class="text-lg font-medium">{logoutMessage}</span>
      </div>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Please wait...</p>
    </div>
  </div>
{/if}

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
  <IdleCountdownModalEnhanced />
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
  onExit={handleExit}
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
