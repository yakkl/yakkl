/**
 * SDK Types
 */
export interface EmbeddedWalletConfig {
    branding?: {
        name?: string;
        logo?: string;
        theme?: {
            colors?: Record<string, string>;
            fonts?: Record<string, string>;
        };
    };
    restrictions?: string[];
    enableMods?: boolean;
    customNetworks?: any[];
}
export interface ModConfig {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license?: string;
    tier?: 'community' | 'verified' | 'pro' | 'private' | 'enterprise';
    category?: string;
    tags?: string[];
}
export interface WhiteLabelConfig {
    apiKey: string;
    appName: string;
    appVersion: string;
    branding: BrandingConfig;
    features?: {
        enableSwap?: boolean;
        enableBuy?: boolean;
        enableStaking?: boolean;
        enableNFTs?: boolean;
        enableDeFi?: boolean;
        customNetworks?: boolean;
    };
    restrictions?: {
        allowedNetworks?: string[];
        blockedTokens?: string[];
        maxTransactionAmount?: string;
        requireKYC?: boolean;
    };
    callbacks?: {
        onTransactionSigned?: (txHash: string) => void;
        onUserAction?: (action: string, data: any) => void;
        onError?: (error: Error) => void;
    };
}
export interface BrandingConfig {
    name: string;
    logo: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        surface: string;
        text: string;
    };
    fonts?: {
        primary: string;
        secondary: string;
    };
    theme?: 'light' | 'dark' | 'auto';
}
export interface IntegrationConfig {
    apiKey?: string;
    endpoint?: string;
    timeout?: number;
}
export interface WalletInfo {
    name: string;
    icon: string;
    description: string;
    installed: boolean;
    provider?: any;
}
export interface YakklProviderConfig {
    apiKey?: string;
    network?: string;
    autoConnect?: boolean;
    enableMods?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
export interface EthereumRequest {
    method: string;
    params?: any[];
}
export interface BridgeMessage {
    id: string;
    type: string;
    source: string;
    target: string;
    data: any;
    timestamp: number;
}
