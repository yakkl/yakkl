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
    getMiscStore,
  } from '$lib/common/stores';
  import { getProfile } from '$lib/common/profile';
  import type { ChainDisplay } from '$lib/types';
  import { goto } from '$app/navigation';
  import { decryptData, isEncryptedData, type ProfileData } from '$lib/common';
  import { log } from '$lib/common/logger-wrapper';
  import { lockWallet } from '$lib/common/lockWallet';
  import { appStateManager, AppPhase } from '$lib/managers/AppStateManager';
  import IdleCountdownModalEnhanced from '$lib/components/IdleCountdownModalEnhanced.svelte';
  import { authStore } from '$lib/stores/auth-store';
  import { storageSyncService } from '$lib/services/storage-sync.service';
  import { clientStorageLoader } from '$lib/services/client-storage-loader.service';

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  // --- State ---
  let appState = $state($appStateManager);
  let initializing = $state(false);  // Default to false since we check app state separately
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

    // 🔒 CRITICAL SECURITY: ALWAYS LOCK FIRST - NO EXCEPTIONS
    // This ensures the wallet is ALWAYS in a secure locked state on startup
    // regardless of any stored data, sessions, or previous state
    (async () => {
      try {
        // Set loading states immediately to prevent flash of content
        isAuthenticating = true;
        initializing = true;

        log.info('[(wallet)/+Layout.svelte] 🔒 SECURITY: Locking wallet immediately on startup');
        await lockWallet();
        log.info('[(wallet)/+Layout.svelte] 🔒 Wallet locked successfully');

        // Clear any existing authentication state
        isAuthenticated = false;

        // Immediately redirect to login page
        await goto('/login', { replaceState: true });
      } catch (error) {
        // Even if lock fails, still redirect to login for safety
        await goto('/login', { replaceState: true });
      }
    })();

    // Subscribe to app state changes
    const unsubscribe = appStateManager.subscribe(state => {
      appState = state;
      // Only show initializing for actual initialization phases
      initializing = state.phase === AppPhase.BOOTSTRAPPING ||
                   state.phase === AppPhase.LOADING_STORES ||
                   state.phase === AppPhase.LOADING_CACHE;
    });

    // Run async initialization (AFTER locking)
    (async () => {
      try {
        await storageSyncService.start();

        // 🔒 CRITICAL SECURITY: DO NOT RE-AUTHENTICATE ON INITIAL MOUNT
        // The wallet has been locked and user redirected to login.
        // ANY authentication must come from the login page, not from stored credentials.
        // This prevents bypass of the security lock.

        // Check if we're opening from sidepanel by looking for a valid session
        // If there's a valid session, don't logout as this will close the popup
        const hasValidSession = await authStore.checkSession();
        if (!hasValidSession) {
          // Only logout if there's no valid session
          // This prevents closing the popup when opened from sidepanel
          authStore.logout().catch(err =>
            log.debug('[(wallet)/+Layout.svelte] Auth logout during security lock (non-blocking):', false, err)
          );
        } else {
          log.info('[(wallet)/+Layout.svelte] Valid session detected, skipping auto-logout');
        }

        // Try to wait for app ready, but don't block on timeout
        try {
          await appStateManager.waitForReady(5000); // Reduced timeout to 5 seconds
        } catch (error) {
          log.warn('[(wallet)/+Layout.svelte] AppStateManager timeout, continuing anyway:', false, error);
          // Continue initialization even if AppStateManager times out
        }

        // DO NOT CHECK FOR EXISTING AUTHENTICATION HERE
        // User MUST authenticate through the login page
        isAuthenticated = false;  // Always false on initial mount
        isAuthenticating = false;  // Hide loader

        // Use client storage loader for cache-first loading
        // This provides fast initial load from cache while background updates happen
        const [accountsResult, settingsResult] = await Promise.all([
          clientStorageLoader.loadAccounts(),
          clientStorageLoader.loadSettings()
        ]);

        // Update stores with loaded data
        if (accountsResult.data) {
          // Update account store with loaded accounts
          await accountStore.setAccounts(accountsResult.data);
          if (accountsResult.fromCache) {
            log.info('[(wallet)/+layout.svelte] Accounts loaded from cache');
          }
        } else {
          // Fallback to regular loading if cache miss
          await accountStore.loadAccounts();
        }

        // Load remaining stores
        await Promise.all([
          chainStore.loadChains(),
          planStore.loadPlan()
        ]);

        // Also initialize/refresh token store to ensure data is loaded
        const { tokenStore } = await import('$lib/stores/token.store');
        await tokenStore.refresh().catch(err =>
          log.warn('[(wallet)/+layout.svelte] Token store refresh failed:', false, err));

        // Setup session and user preferences
        const profile = await getProfile();
        const miscStore = getMiscStore();
        if (profile && profile.data && miscStore) {
          if (isEncryptedData(profile.data)) {
            const profileData = await decryptData(profile.data, miscStore) as ProfileData;
            const jwtToken = await sessionManager.startSession(
              profile.id,
              profile.username || 'user',
              profile.id,
              profileData.planType || 'explorer_member'
            );

            // Get the session state after starting session
            const sessionState = sessionManager.getSessionState();

            // Update auth store with session state using the new method
            if (sessionState) {
              authStore.updateSessionState(sessionState, sessionState.jwtToken || jwtToken);
            }

            if (profile.preferences?.showTestNetworks) {
              showTestnets = true;
              chainStore.setShowTestnets(true);
            }
          }
        }
      } catch (error) {
        // Show error state to user
        if (appState.phase === AppPhase.ERROR) {
          log.error('[(wallet)/+Layout.svelte] App initialization error:', false, appState.error);
        } else {
          log.error('[(wallet)/+Layout.svelte] App initialization error:', false, error);
        }
      } finally {
        // Ensure authentication loader is hidden
        isAuthenticating = false;

        // App state manager will handle the initializing state through the subscription
        // No need to manually set it here
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
      // Stop storage sync service
      storageSyncService.stop();
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
      await chainStore.switchChain(pendingChain.chainId);
      showNetworkMismatch = false;
      pendingChain = null;
    } catch (error) {
      log.warn('[(wallet)/+Layout.svelte] Failed to create account:', false, error);
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
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark');
    }
  }

  // Service cleanup function
  async function stopAllClientServices() {
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
    // Show loading overlay for logout
    if (mode === 'logout') {
      isLoggingOut = true;
      logoutMessage = 'Logging out...';
    }

    try {
      // Start service cleanup (fire-and-forget)
      stopAllClientServices();

      // Call lockWallet - now optimized to be < 1 second
      await lockWallet(mode === 'exit' ? 'user-exit' : 'user-logout');

      // Clear session storage (synchronous, instant)
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // Navigate to login page for logout only
      if (mode === 'logout') {
        await goto('/login', { replaceState: true });
      }

    } catch (error) {
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

<!-- 🔒 CRITICAL SECURITY: Show loading screen while authenticating -->
{#if isAuthenticating || !isAuthenticated}
  <div class="fixed inset-0 z-[70] bg-base-100 flex items-center justify-center">
    <div class="flex flex-col items-center gap-4">
      <div class="animate-spin h-8 w-8 border-3 border-primary border-t-transparent rounded-full"></div>
      <span class="text-lg font-medium">Securing wallet...</span>
    </div>
  </div>
{:else}
  <!-- Only render wallet UI if authenticated -->

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

  <SessionWarning />
  <JWTValidationModalProvider />
  <IdleCountdownModalEnhanced />

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

{/if} <!-- End of authentication check -->

