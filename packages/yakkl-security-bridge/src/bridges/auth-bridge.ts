/**
 * Auth Bridge (stub)
 *
 * Provides an abstraction layer for authentication-related operations
 * used by security components without creating tight coupling.
 */

export interface AuthBridge {
  isAuthenticated(): boolean;
  getUser<T = unknown>(): T | null;
  onAuthChange(cb: (authed: boolean) => void): () => void;
}

export function createAuthBridge(): AuthBridge {
  let authed = false;
  const listeners = new Set<(authed: boolean) => void>();

  return {
    isAuthenticated: () => authed,
    getUser: () => null,
    onAuthChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }
  };
}

