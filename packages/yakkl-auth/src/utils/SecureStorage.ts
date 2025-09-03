/**
 * Secure storage with encryption
 */

import type { AuthStorage } from '../types';

export class SecureStorage implements AuthStorage {
  private store: Map<string, any> = new Map();
  private encryptionKey?: CryptoKey;

  constructor(private prefix: string = 'yakkl_auth_') {}

  async initialize(password?: string): Promise<void> {
    if (password && typeof crypto !== 'undefined') {
      // Generate encryption key from password
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('yakkl_salt'),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }
  }

  async get(key: string): Promise<any> {
    const fullKey = `${this.prefix}${key}`;
    
    if (typeof localStorage !== 'undefined') {
      const encrypted = localStorage.getItem(fullKey);
      if (encrypted && this.encryptionKey) {
        return this.decrypt(encrypted);
      }
      return encrypted ? JSON.parse(encrypted) : null;
    }
    
    return this.store.get(fullKey);
  }

  async set(key: string, value: any): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    const data = JSON.stringify(value);
    
    if (typeof localStorage !== 'undefined') {
      const toStore = this.encryptionKey ? await this.encrypt(data) : data;
      localStorage.setItem(fullKey, toStore);
    } else {
      this.store.set(fullKey, value);
    }
  }

  async remove(key: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(fullKey);
    } else {
      this.store.delete(fullKey);
    }
  }

  async clear(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } else {
      this.store.clear();
    }
  }

  private async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) return data;
    
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encoder.encode(data)
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  }

  private async decrypt(encrypted: string): Promise<any> {
    if (!this.encryptionKey) return JSON.parse(encrypted);
    
    // Convert from base64
    const combined = new Uint8Array(
      atob(encrypted).split('').map(c => c.charCodeAt(0))
    );
    
    // Extract IV and data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
}