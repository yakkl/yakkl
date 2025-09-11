/**
 * Authentication Store
 * 
 * Framework-neutral auth state management that can be used
 * across different UI frameworks.
 */

import { writable, derived } from '../store';
import type { Writable, Readable } from '../types';

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  isRegistered: boolean;
  userId: string | null;
  username: string | null;
  email: string | null;
  lastActivity: number;
  sessionTimeout: number; // in minutes
  isInitializing: boolean;
  error: string | null;
}

/**
 * Session state interface
 */
export interface SessionState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number;
  isValid: boolean;
  userId: string | null;
  scope: string[];
}

/**
 * Session warning state
 */
export interface SessionWarningState {
  showWarning: boolean;
  timeRemaining: number; // seconds
  canExtend: boolean;
}

/**
 * Default auth state
 */
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isRegistered: false,
  userId: null,
  username: null,
  email: null,
  lastActivity: Date.now(),
  sessionTimeout: 30,
  isInitializing: false,
  error: null
};

/**
 * Default session state
 */
const defaultSessionState: SessionState = {
  token: null,
  refreshToken: null,
  expiresAt: 0,
  isValid: false,
  userId: null,
  scope: []
};

/**
 * Default session warning state
 */
const defaultWarningState: SessionWarningState = {
  showWarning: false,
  timeRemaining: 0,
  canExtend: true
};

/**
 * Create auth stores
 */
export function createAuthStores() {
  // Main auth store
  const authStore: Writable<AuthState> = writable(defaultAuthState);
  
  // Session store
  const sessionStore: Writable<SessionState> = writable(defaultSessionState);
  
  // Session warning store
  const sessionWarningStore: Writable<SessionWarningState> = writable(defaultWarningState);
  
  // Derived store for auth status
  const isAuthenticated: Readable<boolean> = derived(
    authStore,
    ($auth) => $auth.isAuthenticated
  );
  
  // Derived store for session validity
  const isSessionValid: Readable<boolean> = derived(
    sessionStore,
    ($session) => $session.isValid && $session.expiresAt > Date.now()
  );
  
  // Derived store for user info
  const currentUser: Readable<{ id: string | null; username: string | null; email: string | null }> = derived(
    authStore,
    ($auth) => ({
      id: $auth.userId,
      username: $auth.username,
      email: $auth.email
    })
  );
  
  return {
    authStore,
    sessionStore,
    sessionWarningStore,
    isAuthenticated,
    isSessionValid,
    currentUser,
    
    // Helper methods
    updateAuth: (updates: Partial<AuthState>) => {
      authStore.update(state => ({ ...state, ...updates }));
    },
    
    updateSession: (updates: Partial<SessionState>) => {
      sessionStore.update(state => ({ ...state, ...updates }));
    },
    
    updateWarning: (updates: Partial<SessionWarningState>) => {
      sessionWarningStore.update(state => ({ ...state, ...updates }));
    },
    
    resetAuth: () => {
      authStore.set(defaultAuthState);
      sessionStore.set(defaultSessionState);
      sessionWarningStore.set(defaultWarningState);
    },
    
    setAuthenticated: (userId: string, username: string, email?: string) => {
      authStore.update(state => ({
        ...state,
        isAuthenticated: true,
        isRegistered: true,
        userId,
        username,
        email: email || null,
        lastActivity: Date.now(),
        error: null
      }));
    },
    
    setUnauthenticated: () => {
      authStore.update(state => ({
        ...state,
        isAuthenticated: false,
        userId: null,
        username: null,
        email: null,
        error: null
      }));
      sessionStore.set(defaultSessionState);
    },
    
    setSession: (token: string, expiresIn: number, userId: string, scope: string[] = []) => {
      sessionStore.set({
        token,
        refreshToken: null,
        expiresAt: Date.now() + expiresIn * 1000,
        isValid: true,
        userId,
        scope
      });
    },
    
    clearSession: () => {
      sessionStore.set(defaultSessionState);
    },
    
    showSessionWarning: (timeRemaining: number) => {
      sessionWarningStore.set({
        showWarning: true,
        timeRemaining,
        canExtend: true
      });
    },
    
    hideSessionWarning: () => {
      sessionWarningStore.update(state => ({
        ...state,
        showWarning: false
      }));
    },
    
    updateActivity: () => {
      authStore.update(state => ({
        ...state,
        lastActivity: Date.now()
      }));
    }
  };
}

/**
 * Global auth store instances (singleton)
 * These can be imported and used across the application
 */
export const globalAuthStores = createAuthStores();

// Export individual stores for convenience
export const authStore = globalAuthStores.authStore;
export const sessionStore = globalAuthStores.sessionStore;
export const sessionWarningStore = globalAuthStores.sessionWarningStore;
export const isAuthenticated = globalAuthStores.isAuthenticated;
export const isSessionValid = globalAuthStores.isSessionValid;
export const currentUser = globalAuthStores.currentUser;