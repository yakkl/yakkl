// $lib/shared/types.ts
import type { Browser } from 'webextension-polyfill';

// Define storage item types
export interface StorageSchema {
  userSettings: UserSettings;
  lastAccess: string;
  tokens: Token[];
  // Add other storage items
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  // Other settings
}

export interface Token {
  id: string;
  name: string;
  symbol: string;
  // Other token properties
}

// Enhanced storage service with typed methods
export interface TypedStorageService {
  getUserSettings(): Promise<UserSettings>;
  saveUserSettings(settings: UserSettings): Promise<boolean>;
  getLastAccess(): Promise<string | null>;
  saveLastAccess(timestamp: string): Promise<boolean>;
  getTokens(): Promise<Token[]>;
  saveTokens(tokens: Token[]): Promise<boolean>;
}
