/**
 * Wallet context interface
 *
 * Defines the contract that wallet implementations must provide
 * to security components. This allows security-ui components to
 * interact with wallet features without directly depending on
 * the wallet package.
 */
export interface WalletContext {
    navigateTo: (path: string) => Promise<void>;
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        remove: (key: string) => Promise<void>;
    };
    preferences: {
        getTheme: () => string;
        getLocale: () => string;
        getSessionTimeout: () => number;
    };
    wallet: {
        isLocked: () => boolean;
        lock: () => Promise<void>;
        unlock: (password: string) => Promise<boolean>;
        getCurrentAccount: () => Promise<string | null>;
        getNetworkId: () => Promise<string>;
    };
    events: {
        emit: (event: string, data?: any) => void;
        on: (event: string, handler: (data?: any) => void) => void;
        off: (event: string, handler: (data?: any) => void) => void;
    };
}
/**
 * Provider props for security components
 */
export interface SecurityProviderProps {
    walletContext: WalletContext;
    children?: any;
}
/**
 * Configuration for security bridge initialization
 */
export interface SecurityBridgeConfig {
    walletContext: WalletContext;
    authEndpoint?: string;
    sessionTimeout?: number;
    enableBiometrics?: boolean;
    enableEmergencyKit?: boolean;
}
//# sourceMappingURL=wallet-context.d.ts.map