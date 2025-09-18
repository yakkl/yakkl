/**
 * Browser Extension Session Manager
 *
 * Extension-specific implementation of SessionManagerBase
 * Handles browser storage, runtime messaging, and DOM activity tracking
 */
import type { SessionManagerBase, SessionState, SessionStorage, JWTManager, SessionLogger } from '@yakkl/auth';
interface BrowserAPI {
    runtime?: {
        sendMessage: (message: any) => Promise<any>;
        id?: string;
    };
    storage?: {
        local: {
            get: (keys: string[]) => Promise<any>;
            set: (items: any) => Promise<void>;
            remove: (keys: string[]) => Promise<void>;
        };
    };
}
/**
 * Browser-specific session storage implementation
 */
export declare class BrowserSessionStorage implements SessionStorage {
    private browserAPI;
    private storageKey;
    constructor(browserAPI: BrowserAPI);
    save(state: SessionState): Promise<void>;
    load(): Promise<SessionState | null>;
    clear(): Promise<void>;
}
/**
 * Browser Extension Session Manager
 */
export declare class BrowserSessionManager {
    private base;
    private browserAPI;
    private activityListenersAdded;
    private static instance;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(BaseClass: typeof SessionManagerBase, browserAPI: BrowserAPI, jwtManager: JWTManager, logger?: SessionLogger): BrowserSessionManager;
    startSession(userId: string, username: string, profileId: string, planLevel?: string): Promise<string>;
    extendSession(additionalMinutes?: number): Promise<void>;
    endSession(): Promise<void>;
    getSessionState(): SessionState | null;
    getCurrentJWTToken(): string | null;
    isSessionActive(): boolean;
    updateActivity(): void;
    setCallbacks(callbacks: {
        onWarning?: (timeRemaining: number) => void;
        onExpired?: () => void;
        onExtended?: () => void;
    }): void;
    updateConfig(newConfig: any): void;
}
/**
 * Factory function to create a browser session manager
 */
export declare function createBrowserSessionManager(BaseClass: typeof SessionManagerBase, browserAPI: BrowserAPI, jwtManager: JWTManager, logger?: SessionLogger): BrowserSessionManager;
export {};
