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
  
  // Mod metadata
  tier: ModTier;
  category: ModCategory;
  tags: string[];
  
  // Capabilities
  capabilities: ModCapabilities;
  
  // Requirements
  permissions: ModPermission[];
  minimumWalletVersion: string;
  supportedPlatforms: Platform[];
  
  // Discovery and enhancement
  discoverable: boolean;
  enhances: string[];        // Other mods this enhances
  conflicts: string[];       // Mods that conflict with this
  
  // Resources
  iconUrl: string;
  screenshotUrls: string[];
  website?: string;
  repository?: string;
  documentation?: string;
}

export type ModTier = 
  | 'community'     // Free, open source
  | 'verified'      // Verified by YAKKL team
  | 'pro'           // Requires pro subscription
  | 'private'       // Requires private subscription
  | 'enterprise';   // Enterprise only

export type ModCategory = 
  | 'portfolio'     // Portfolio management
  | 'trading'       // Trading tools
  | 'defi'          // DeFi protocols
  | 'nft'           // NFT tools
  | 'security'      // Security features
  | 'analytics'     // Analytics and insights
  | 'integration'   // External integrations
  | 'utility'       // Utility tools
  | 'social'        // Social features
  | 'gaming';       // Gaming and metaverse

export type ModPermission = 
  | 'accounts:read'         // Read account information
  | 'accounts:write'        // Create/modify accounts
  | 'transactions:read'     // Read transaction history
  | 'transactions:sign'     // Sign transactions
  | 'networks:read'         // Read network information
  | 'networks:write'        // Add/modify networks
  | 'storage:read'          // Read local storage
  | 'storage:write'         // Write local storage
  | 'notifications'         // Show notifications
  | 'external:http'         // Make HTTP requests
  | 'external:websocket'    // WebSocket connections
  | 'background'            // Run background scripts
  | 'hardware'              // Access hardware wallets
  | 'camera'                // Access camera (QR codes)
  | 'clipboard';            // Access clipboard

export type Platform = 
  | 'extension'     // Browser extension
  | 'desktop'       // Desktop app
  | 'mobile'        // Mobile app
  | 'embedded'      // Embedded wallet
  | 'web';          // Web interface

export interface ModCapabilities {
  ui?: ModUI;
  background?: ModBackground;
  apis?: ModAPI[];
  hooks?: ModHooks;
  storage?: ModStorage;
}

export interface ModUI {
  // Primary UI components
  components: ModComponent[];
  
  // Integration points
  routes?: ModRoute[];
  modals?: ModModal[];
  widgets?: ModWidget[];
  
  // Styling
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

export type ComponentType = 
  | 'page'          // Full page component
  | 'widget'        // Dashboard widget
  | 'modal'         // Modal dialog
  | 'panel'         // Side panel
  | 'inline'        // Inline component
  | 'overlay';      // Overlay component

export type MountPoint = 
  | 'dashboard'     // Main dashboard
  | 'portfolio'     // Portfolio page
  | 'send'          // Send transaction
  | 'receive'       // Receive tokens
  | 'swap'          // Token swap
  | 'settings'      // Settings page
  | 'account'       // Account details
  | 'transaction'   // Transaction details
  | 'header'        // Header area
  | 'footer'        // Footer area
  | 'sidebar';      // Sidebar

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

export type ModalTrigger = 
  | 'button'        // Triggered by button
  | 'event'         // Triggered by wallet event
  | 'condition'     // Triggered by condition
  | 'schedule';     // Triggered by schedule

export interface ModWidget {
  id: string;
  name: string;
  component: string;
  size: WidgetSize;
  position: WidgetPosition;
  refreshInterval?: number;
}

export type WidgetSize = 
  | 'small'         // 1x1
  | 'medium'        // 2x1
  | 'large'         // 2x2
  | 'wide'          // 3x1
  | 'tall';         // 1x3

export type WidgetPosition = 
  | 'top'
  | 'middle'
  | 'bottom'
  | 'auto';

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

export type CronExpression = string; // Standard cron format

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
  period: number; // seconds
}

export interface ModHooks {
  // Wallet lifecycle hooks
  onWalletInitialized?: string;
  onWalletDestroyed?: string;
  
  // Account hooks
  onAccountCreated?: string;
  onAccountSelected?: string;
  
  // Transaction hooks
  onTransactionSigned?: string;
  onTransactionSent?: string;
  onTransactionConfirmed?: string;
  
  // Network hooks
  onNetworkChanged?: string;
  
  // Custom hooks
  custom?: Record<string, string>;
}

export interface ModStorage {
  encrypted: boolean;
  shared: boolean;
  maxSize: number; // bytes
  ttl?: number;    // seconds
}

export interface Mod {
  manifest: ModManifest;
  
  // Lifecycle
  initialize(engine: WalletEngine): Promise<void>;
  destroy(): Promise<void>;
  
  // State
  isLoaded(): boolean;
  isActive(): boolean;
  
  // UI
  getComponent(id: string): any;
  getWidget(id: string): any;
  
  // Background
  getBackgroundScript(id: string): BackgroundScript | null;
  
  // API
  handleAPICall(endpoint: string, data: any): Promise<any>;
  
  // Events
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  
  // Discovery
  enhance(otherMod: Mod): Promise<boolean>;
  getEnhancements(): Enhancement[];

  // Allow dynamic property access for validation
  [key: string]: any;
}

export interface Enhancement {
  sourceMod: string;
  targetMod: string;
  type: EnhancementType;
  description: string;
  active: boolean;
}

export type EnhancementType = 
  | 'ui'            // UI enhancement
  | 'data'          // Data enhancement
  | 'feature'       // Feature enhancement
  | 'integration';  // Integration enhancement

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

export type DiscoverySource = 
  | 'registry'      // Official YAKKL registry
  | 'local'         // Local mod
  | 'environment'   // Environment scan
  | 'peer'          // Peer discovery
  | 'marketplace';  // Third-party marketplace