/**
 * Mod System Types - Plugin architecture for YAKKL
 *
 * Mods are the plugin system that makes YAKKL extensible.
 * They can provide UI components, background services, APIs, and more.
 */
import type { WalletEngine } from '../engine/WalletEngine';
export interface ModManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    tier: ModTier;
    category: ModCategory;
    tags: string[];
    capabilities: ModCapabilities;
    permissions: ModPermission[];
    minimumWalletVersion: string;
    supportedPlatforms: Platform[];
    discoverable: boolean;
    enhances: string[];
    conflicts: string[];
    iconUrl: string;
    screenshotUrls: string[];
    website?: string;
    repository?: string;
    documentation?: string;
}
export type ModTier = 'community' | 'verified' | 'pro' | 'private' | 'enterprise';
export type ModCategory = 'portfolio' | 'trading' | 'defi' | 'nft' | 'security' | 'analytics' | 'integration' | 'utility' | 'social' | 'gaming';
export type ModPermission = 'accounts:read' | 'accounts:write' | 'transactions:read' | 'transactions:sign' | 'networks:read' | 'networks:write' | 'storage:read' | 'storage:write' | 'notifications' | 'external:http' | 'external:websocket' | 'background' | 'hardware' | 'camera' | 'clipboard';
export type Platform = 'extension' | 'desktop' | 'mobile' | 'embedded' | 'web';
export interface ModCapabilities {
    ui?: ModUI;
    background?: ModBackground;
    apis?: ModAPI[];
    hooks?: ModHooks;
    storage?: ModStorage;
}
export interface ModUI {
    components: ModComponent[];
    routes?: ModRoute[];
    modals?: ModModal[];
    widgets?: ModWidget[];
    theme?: ModTheme;
    customCSS?: string;
}
export interface ModComponent {
    id: string;
    name: string;
    type: ComponentType;
    mountPoint: MountPoint;
    props?: Record<string, any>;
    conditions?: ComponentCondition[];
}
export type ComponentType = 'page' | 'widget' | 'modal' | 'panel' | 'inline' | 'overlay';
export type MountPoint = 'dashboard' | 'portfolio' | 'send' | 'receive' | 'swap' | 'settings' | 'account' | 'transaction' | 'header' | 'footer' | 'sidebar';
export interface ComponentCondition {
    type: 'account' | 'network' | 'balance' | 'feature';
    value: any;
    operator: '==' | '!=' | '>' | '<' | 'includes' | 'excludes';
}
export interface ModRoute {
    path: string;
    component: string;
    name: string;
    meta?: Record<string, any>;
}
export interface ModModal {
    id: string;
    component: string;
    trigger: ModalTrigger;
    size: 'small' | 'medium' | 'large' | 'fullscreen';
}
export type ModalTrigger = 'button' | 'event' | 'condition' | 'schedule';
export interface ModWidget {
    id: string;
    name: string;
    component: string;
    size: WidgetSize;
    position: WidgetPosition;
    refreshInterval?: number;
}
export type WidgetSize = 'small' | 'medium' | 'large' | 'wide' | 'tall';
export type WidgetPosition = 'top' | 'middle' | 'bottom' | 'auto';
export interface ModTheme {
    colors: Record<string, string>;
    fonts: Record<string, string>;
    spacing: Record<string, string>;
    borderRadius: Record<string, string>;
}
export interface ModBackground {
    scripts: BackgroundScript[];
    workers?: ServiceWorker[];
    scheduledTasks?: ScheduledTask[];
}
export interface BackgroundScript {
    id: string;
    script: string;
    persistent: boolean;
    permissions: ModPermission[];
}
export interface ScheduledTask {
    id: string;
    script: string;
    schedule: CronExpression;
    permissions: ModPermission[];
}
export type CronExpression = string;
export interface ModAPI {
    name: string;
    version: string;
    endpoints: APIEndpoint[];
    authentication?: APIAuthentication;
}
export interface APIEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    handler: string;
    permissions: ModPermission[];
    rateLimit?: RateLimit;
}
export interface APIAuthentication {
    type: 'none' | 'signature' | 'token' | 'oauth';
    config: Record<string, any>;
}
export interface RateLimit {
    requests: number;
    period: number;
}
export interface ModHooks {
    onWalletInitialized?: string;
    onWalletDestroyed?: string;
    onAccountCreated?: string;
    onAccountSelected?: string;
    onTransactionSigned?: string;
    onTransactionSent?: string;
    onTransactionConfirmed?: string;
    onNetworkChanged?: string;
    custom?: Record<string, string>;
}
export interface ModStorage {
    encrypted: boolean;
    shared: boolean;
    maxSize: number;
    ttl?: number;
}
export interface Mod {
    manifest: ModManifest;
    initialize(engine: WalletEngine): Promise<void>;
    destroy(): Promise<void>;
    isLoaded(): boolean;
    isActive(): boolean;
    getComponent(id: string): any;
    getWidget(id: string): any;
    getBackgroundScript(id: string): BackgroundScript | null;
    handleAPICall(endpoint: string, data: any): Promise<any>;
    emit(event: string, data: any): void;
    on(event: string, handler: (data: any) => void): void;
    off(event: string, handler: (data: any) => void): void;
    enhance(otherMod: Mod): Promise<boolean>;
    getEnhancements(): Enhancement[];
    [key: string]: any;
}
export interface Enhancement {
    sourceMod: string;
    targetMod: string;
    type: EnhancementType;
    description: string;
    active: boolean;
}
export type EnhancementType = 'ui' | 'data' | 'feature' | 'integration';
export interface ModContext {
    engine: WalletEngine;
    mod: Mod;
    permissions: ModPermission[];
    storage: ModStorageAPI;
    logger: ModLogger;
}
export interface ModStorageAPI {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
}
export interface ModLogger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error): void;
}
export interface DiscoveredMod {
    source: DiscoverySource;
    manifest: ModManifest;
    verified: boolean;
    available: boolean;
    installUrl?: string;
}
export type DiscoverySource = 'registry' | 'local' | 'environment' | 'peer' | 'marketplace';
//# sourceMappingURL=types.d.ts.map