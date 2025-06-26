/**
 * Lean constants for preview2 - only export what's actually used
 */

// Re-export organized constants
export * from './chains';
export * from './plans';

// App-specific constants
export const APP_NAME = 'YAKKL' as const;
export const APP_VERSION = '2.0.0-preview' as const;

// API constants
export const API_TIMEOUT_MS = 10000;
export const MAX_RETRIES = 3;

// UI constants
export const ANIMATION_DURATION_MS = 200;
export const TOAST_DURATION_MS = 3000;

// Storage keys (prefixed for clarity)
export const STORAGE_KEYS = {
  SETTINGS: 'yakkl_settings',
  ACCOUNTS: 'yakkl_accounts', 
  CHAINS: 'yakkl_chains',
  TOKENS: 'yakkl_tokens',
  PLAN: 'yakkl_plan'
} as const;

// Route paths
export const ROUTES = {
  HOME: '/preview2',
  LOGIN: '/preview2/login',
  REGISTER: '/preview2/register',
  LEGAL: '/preview2/legal',
  SETTINGS: '/preview2/settings',
  ACCOUNTS: '/preview2/accounts'
} as const;