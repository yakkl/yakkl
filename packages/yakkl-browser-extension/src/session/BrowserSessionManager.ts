/**
 * Browser Extension Session Manager
 * 
 * Extension-specific implementation of SessionManagerBase
 * Handles browser storage, runtime messaging, and DOM activity tracking
 */

import type { 
  SessionManagerBase, 
  SessionState, 
  SessionStorage, 
  JWTManager, 
  SessionLogger 
} from '@yakkl/auth';

// Browser API types (will be properly typed when webextension-polyfill is available)
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
export class BrowserSessionStorage implements SessionStorage {
  private browserAPI: BrowserAPI;
  private storageKey = 'yakklSession';

  constructor(browserAPI: BrowserAPI) {
    this.browserAPI = browserAPI;
  }

  async save(state: SessionState): Promise<void> {
    if (this.browserAPI.storage) {
      await this.browserAPI.storage.local.set({
        [this.storageKey]: state
      });
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    }
  }

  async load(): Promise<SessionState | null> {
    if (this.browserAPI.storage) {
      const result = await this.browserAPI.storage.local.get([this.storageKey]);
      return result[this.storageKey] || null;
    } else if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  }

  async clear(): Promise<void> {
    if (this.browserAPI.storage) {
      await this.browserAPI.storage.local.remove([this.storageKey]);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
  }
}

/**
 * Browser Extension Session Manager
 */
export class BrowserSessionManager {
  private base: SessionManagerBase;
  private browserAPI: BrowserAPI;
  private activityListenersAdded = false;
  private static instance: BrowserSessionManager | null = null;

  private constructor(
    BaseClass: typeof SessionManagerBase,
    browserAPI: BrowserAPI,
    jwtManager: JWTManager,
    logger: SessionLogger = console
  ) {
    this.browserAPI = browserAPI;
    
    // Create storage implementation
    const storage = new BrowserSessionStorage(browserAPI);
    
    // Create extended class with browser-specific implementations
    class BrowserSessionManagerImpl extends BaseClass {
      private browserAPI: BrowserAPI;
      private activityListenersAdded = false;
      
      constructor(
        storage: SessionStorage,
        jwtManager: JWTManager,
        logger: SessionLogger,
        browserAPI: BrowserAPI
      ) {
        super(storage, jwtManager, logger);
        this.browserAPI = browserAPI;
      }

      protected startActivityTracking(): void {
        if (typeof document === 'undefined' || this.activityListenersAdded) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        const handleActivity = () => (this as any).updateActivity();

        events.forEach((event) => {
          document.addEventListener(event, handleActivity, { passive: true });
        });

        this.activityListenersAdded = true;
        (this as any).logger.debug('Activity tracking started');
      }

      protected stopActivityTracking(): void {
        if (typeof document === 'undefined' || !this.activityListenersAdded) return;

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        const handleActivity = () => (this as any).updateActivity();

        events.forEach((event) => {
          document.removeEventListener(event, handleActivity);
        });

        this.activityListenersAdded = false;
        (this as any).logger.debug('Activity tracking stopped');
      }

      protected async onSessionStarted(state: SessionState): Promise<void> {
        // Notify background script
        if (this.browserAPI.runtime) {
          try {
            await this.browserAPI.runtime.sendMessage({
              type: 'SESSION_STARTED',
              data: {
                sessionId: state.sessionId,
                expiresAt: state.expiresAt
              }
            });

            // Also notify about login success with JWT
            await this.browserAPI.runtime.sendMessage({
              type: 'USER_LOGIN_SUCCESS',
              sessionId: state.sessionId,
              hasJWT: !!state.jwtToken,
              jwtToken: state.jwtToken,
              userId: state.userId,
              username: state.username,
              profileId: state.profileId,
              planLevel: state.planLevel
            });

            (this as any).logger.debug('Background notified about session start');
          } catch (error) {
            (this as any).logger.debug('Background notification failed (non-critical):', error);
          }
        }
      }

      protected async onSessionExtendedInternal(state: SessionState): Promise<void> {
        // Notify background script
        if (this.browserAPI.runtime) {
          try {
            await this.browserAPI.runtime.sendMessage({
              type: 'SESSION_EXTENDED',
              data: {
                sessionId: state.sessionId,
                expiresAt: state.expiresAt
              }
            });
            (this as any).logger.debug('Background notified about session extension');
          } catch (error) {
            (this as any).logger.debug('Background notification failed (non-critical):', error);
          }
        }
      }

      protected async onSessionEnded(state: SessionState): Promise<void> {
        // Notify background script
        if (this.browserAPI.runtime) {
          try {
            await this.browserAPI.runtime.sendMessage({
              type: 'SESSION_ENDED',
              data: {
                sessionId: state.sessionId
              }
            });
            (this as any).logger.debug('Background notified about session end');
          } catch (error) {
            (this as any).logger.debug('Background notification failed (non-critical):', error);
          }
        }
      }
    }

    // Create instance
    this.base = new BrowserSessionManagerImpl(storage, jwtManager, logger, browserAPI);
  }

  /**
   * Get singleton instance
   */
  static getInstance(
    BaseClass: typeof SessionManagerBase,
    browserAPI: BrowserAPI,
    jwtManager: JWTManager,
    logger?: SessionLogger
  ): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager(
        BaseClass,
        browserAPI,
        jwtManager,
        logger
      );
    }
    return BrowserSessionManager.instance;
  }

  // Delegate all public methods to base
  async startSession(
    userId: string,
    username: string,
    profileId: string,
    planLevel: string = 'explorer_member'
  ): Promise<string> {
    // Check if we're in browser context
    if (!this.browserAPI.runtime?.id) {
      return '';
    }
    return this.base.startSession(userId, username, profileId, planLevel);
  }

  async extendSession(additionalMinutes: number = 30): Promise<void> {
    if (!this.browserAPI.runtime?.id) {
      return;
    }
    return this.base.extendSession(additionalMinutes);
  }

  async endSession(): Promise<void> {
    return this.base.endSession();
  }

  getSessionState(): SessionState | null {
    return this.base.getSessionState();
  }

  getCurrentJWTToken(): string | null {
    return this.base.getCurrentJWTToken();
  }

  isSessionActive(): boolean {
    return this.base.isSessionActive();
  }

  updateActivity(): void {
    return this.base.updateActivity();
  }

  setCallbacks(callbacks: {
    onWarning?: (timeRemaining: number) => void;
    onExpired?: () => void;
    onExtended?: () => void;
  }): void {
    return this.base.setCallbacks(callbacks);
  }

  updateConfig(newConfig: any): void {
    return this.base.updateConfig(newConfig);
  }
}

/**
 * Factory function to create a browser session manager
 */
export function createBrowserSessionManager(
  BaseClass: typeof SessionManagerBase,
  browserAPI: BrowserAPI,
  jwtManager: JWTManager,
  logger?: SessionLogger
): BrowserSessionManager {
  return BrowserSessionManager.getInstance(BaseClass, browserAPI, jwtManager, logger);
}