import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export enum AppPhase {
  UNINITIALIZED = 'UNINITIALIZED',
  BOOTSTRAPPING = 'BOOTSTRAPPING',
  AUTHENTICATING = 'AUTHENTICATING',
  LOADING_STORES = 'LOADING_STORES',
  LOADING_CACHE = 'LOADING_CACHE',
  READY = 'READY',
  ERROR = 'ERROR'
}

interface AppState {
  phase: AppPhase;
  isInitialized: boolean;
  error: string | null;
  extensionConnected: boolean;
  storesLoaded: boolean;
  cacheLoaded: boolean;
  authChecked: boolean;
}

const initialState: AppState = {
  phase: AppPhase.UNINITIALIZED,
  isInitialized: false,
  error: null,
  extensionConnected: false,
  storesLoaded: false,
  cacheLoaded: false,
  authChecked: false
};

function createAppStateManager() {
  const state = writable<AppState>(initialState);

  const isReady = derived(state, $state => $state.phase === AppPhase.READY);
  const isLoading = derived(state, $state =>
    $state.phase !== AppPhase.READY && $state.phase !== AppPhase.ERROR
  );

  let initPromise: Promise<void> | null = null;

  async function initialize() {
    if (initPromise) return initPromise;
    if (!browser) return;

    initPromise = performInitialization();
    return initPromise;
  }

  async function performInitialization() {
    try {
      await setPhase(AppPhase.BOOTSTRAPPING);

      // Skip extension wait for extension context (popup/sidepanel)
      const isExtensionContext = typeof window !== 'undefined' &&
        (window.location.protocol === 'chrome-extension:' ||
         window.location.protocol === 'moz-extension:');

      if (!isExtensionContext) {
        const extensionReady = await waitForExtension();
        if (!extensionReady) {
          throw new Error('Extension connection failed');
        }
      } else {
        console.log('[AppStateManager] Skipping extension wait - already in extension context');
        state.update(s => ({ ...s, extensionConnected: true }));
      }

      await setPhase(AppPhase.AUTHENTICATING);
      await checkAuthentication();

      await setPhase(AppPhase.LOADING_STORES);
      await loadCriticalStores();

      await setPhase(AppPhase.LOADING_CACHE);
      await loadCacheManagers();

      await setPhase(AppPhase.READY);

      console.log('[AppStateManager] App initialization completed', {state});
    } catch (error) {
      console.error('App initialization failed:', error);
      state.update(s => ({
        ...s,
        phase: AppPhase.ERROR,
        error: error instanceof Error ? error.message : 'Unknown error',
        isInitialized: false
      }));
      throw error;
    }
  }

  async function waitForExtension(maxAttempts = 10): Promise<boolean> {  // Reduced from 30 to 10 for faster timeout
    if (!browser) return false;

    console.log('[AppStateManager] Waiting for extension connection...');

    // Check immediately if already connected OR if we're in the extension context
    // In extension popup/sidepanel, we don't need to wait for injection
    const isExtensionContext = window.location.protocol === 'chrome-extension:' ||
                              window.location.protocol === 'moz-extension:';

    if (isExtensionContext || window.yakkl?.isConnected) {
      console.log('[AppStateManager] Extension context or already connected');
      state.update(s => ({ ...s, extensionConnected: true }));
      return true;
    }

    // Wait with shorter delays for faster detection
    let delay = 50; // Start with 50ms (was 100ms)

    for (let i = 0; i < maxAttempts; i++) {
      // Check connection status
      if (window.yakkl?.isConnected) {
        console.log(`[AppStateManager] Extension connected after ${i + 1} attempts`);
        state.update(s => ({ ...s, extensionConnected: true }));
        return true;
      }

      // Log progress every 5 attempts
      if ((i + 1) % 5 === 0) {
        console.log(`[AppStateManager] Still waiting for extension... (${i + 1}/${maxAttempts})`);
      }

      // Wait before next attempt (except on last iteration)
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay but cap at 500ms for faster detection
        delay = Math.min(delay * 1.5, 500);  // Reduced cap from 1000ms to 500ms
      }
    }

    console.error(`[AppStateManager] Extension connection timeout after ${maxAttempts} attempts`);
    return false;
  }

  async function checkAuthentication() {
    const { syncStorageToStore } = await import('$lib/common/stores');
    const authStores = ['profileStore', 'profilesStore', 'addressIndexStore'];

    for (const storeName of authStores) {
      await syncStorageToStore(storeName);
    }

    state.update(s => ({ ...s, authChecked: true }));

    console.log('[AppStateManager] checkAuthentication: Authentication checked', {state});
  }

  async function loadCriticalStores() {
    const { syncStorageToStore } = await import('$lib/common/stores');
    const criticalStores = [
      'featurePlanStore',
      'yakklSettingsStore',
      'networkStore',
      'primaryNetworkStore',
      'yakklAccounts',
      'yakklCurrentlySelected'
    ];

    await Promise.all(
      criticalStores.map(storeName => syncStorageToStore(storeName))
    );

    state.update(s => ({ ...s, storesLoaded: true }));

    console.log('[AppStateManager] loadCriticalStores: Critical stores loaded', {criticalStores, state});
  }

  async function loadCacheManagers() {
    const { initializeCacheManagers } = await import('$lib/common/cacheManagers');
    await initializeCacheManagers();

    state.update(s => ({ ...s, cacheLoaded: true }));
  }

  async function setPhase(phase: AppPhase) {
    state.update(s => ({
      ...s,
      phase,
      isInitialized: phase === AppPhase.READY
    }));

    await new Promise(resolve => setTimeout(resolve, 0));

    console.log('[AppStateManager] setPhase: Phase set to', phase, {state});
  }

  function reset() {
    state.set(initialState);
    initPromise = null;

    console.log('[AppStateManager] reset: Reset state', {state});
  }

  async function waitForReady(timeoutMs: number = 30000): Promise<void> {
    const currentState = get(state);
    console.log('[AppStateManager] waitForReady: Current state', {state, currentState});

    if (currentState.phase === AppPhase.READY) return;
    
    if (currentState.phase === AppPhase.ERROR) {
      throw new Error(currentState.error || 'Initialization failed');
    }

    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;

      const unsubscribe = state.subscribe($state => {
        if ($state.phase === AppPhase.READY) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve();
        } else if ($state.phase === AppPhase.ERROR) {
          clearTimeout(timeoutId);
          unsubscribe();
          reject(new Error($state.error || 'Initialization failed'));
        }
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`AppStateManager initialization timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      console.log('[AppStateManager] waitForReady: Waiting for ready state', {state});
    });
  }

  console.log('[AppStateManager] createAppStateManager: AppStateManager created', {state});

  return {
    subscribe: state.subscribe,
    isReady,
    isLoading,
    initialize,
    waitForReady,
    reset,
    getPhase: () => get(state).phase,
    isInitialized: () => get(state).isInitialized
  };
}

export const appStateManager = createAppStateManager();
