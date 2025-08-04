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
      
      const extensionReady = await waitForExtension();
      if (!extensionReady) {
        throw new Error('Extension connection failed');
      }
      
      await setPhase(AppPhase.AUTHENTICATING);
      await checkAuthentication();
      
      await setPhase(AppPhase.LOADING_STORES);
      await loadCriticalStores();
      
      await setPhase(AppPhase.LOADING_CACHE);
      await loadCacheManagers();
      
      await setPhase(AppPhase.READY);
      
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
  
  async function waitForExtension(maxAttempts = 10): Promise<boolean> {
    if (!browser) return false;
    
    for (let i = 0; i < maxAttempts; i++) {
      if (window.yakkl?.isConnected) {
        state.update(s => ({ ...s, extensionConnected: true }));
        return true;
      }
      
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return false;
  }
  
  async function checkAuthentication() {
    const { syncStorageToStore } = await import('$lib/common/stores');
    const authStores = ['profileStore', 'profilesStore', 'addressIndexStore'];
    
    for (const storeName of authStores) {
      await syncStorageToStore(storeName);
    }
    
    state.update(s => ({ ...s, authChecked: true }));
  }
  
  async function loadCriticalStores() {
    const { syncStorageToStore } = await import('$lib/common/stores');
    const criticalStores = [
      'featurePlanStore',
      'settingsStore',
      'networkStore',
      'primaryNetworkStore'
    ];
    
    await Promise.all(
      criticalStores.map(storeName => syncStorageToStore(storeName))
    );
    
    state.update(s => ({ ...s, storesLoaded: true }));
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
  }
  
  function reset() {
    state.set(initialState);
    initPromise = null;
  }
  
  async function waitForReady(): Promise<void> {
    const currentState = get(state);
    if (currentState.phase === AppPhase.READY) return;
    if (currentState.phase === AppPhase.ERROR) {
      throw new Error(currentState.error || 'Initialization failed');
    }
    
    return new Promise((resolve, reject) => {
      const unsubscribe = state.subscribe($state => {
        if ($state.phase === AppPhase.READY) {
          unsubscribe();
          resolve();
        } else if ($state.phase === AppPhase.ERROR) {
          unsubscribe();
          reject(new Error($state.error || 'Initialization failed'));
        }
      });
    });
  }
  
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