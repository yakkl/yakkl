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
export declare function createAuthBridge(): AuthBridge;
//# sourceMappingURL=auth-bridge.d.ts.map