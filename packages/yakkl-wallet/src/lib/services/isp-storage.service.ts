/**
 * ISP Contact Storage Service
 * Stores ISP contact information encrypted using getMiscStore for password
 */

import browser from 'webextension-polyfill';
import { encryptData, decryptData } from '@yakkl/sdk';
import { getMiscStore } from '$lib/common/stores';
import { log } from '$lib/common/logger-wrapper';
import type { EncryptedData, SaltedKey } from '$lib/common';

export interface ISPContact {
  // Basic info (always encrypted)
  name: string;
  supportPhone: string;
  supportEmail?: string;
  accountNumber?: string;
  
  // Quick fixes
  commonFixes?: string[];
  modemLocation?: string;
  routerModel?: string;
  
  // Outage tracking
  lastOutage?: string; // ISO date string
  averageResolutionTime?: number; // minutes
  
  // Alternative contacts
  techSupport?: string;
  billing?: string;
  escalationPath?: string;
  
  // Notes
  notes?: string;
}

export interface AlternativeConnection {
  // Mobile hotspot
  mobileHotspot?: {
    enabled: boolean;
    carrier: string;
    phoneNumber?: string;
    dataLimit?: string;
    setupInstructions: string[];
    password?: string; // Encrypted
  };
  
  // Backup networks
  backupNetworks?: Array<{
    name: string;
    ssid: string;
    password?: string; // Encrypted
    location?: string;
    notes?: string;
  }>;
  
  // Emergency locations
  emergencyLocations?: Array<{
    name: string;
    address: string;
    hours: string;
    wifiAvailable: boolean;
    notes?: string;
  }>;
  
  // VPN fallback
  vpnConfig?: {
    provider: string;
    servers: string[];
    username?: string; // Encrypted
    password?: string; // Encrypted
  };
}

class ISPStorageService {
  private static instance: ISPStorageService | null = null;
  private readonly STORAGE_KEY_ISP = 'network_isp_contact';
  private readonly STORAGE_KEY_ALT = 'network_alt_connections';
  
  private constructor() {}
  
  static getInstance(): ISPStorageService {
    if (!ISPStorageService.instance) {
      ISPStorageService.instance = new ISPStorageService();
    }
    return ISPStorageService.instance;
  }
  
  /**
   * Get encryption key from misc store
   * The misc store itself IS the key/password
   */
  private async getEncryptionKey(): Promise<string | null> {
    try {
      const miscStore = getMiscStore();
      if (!miscStore) {
        log.debug('ISPStorage: No misc store available (user not logged in)');
        return null;
      }
      // The misc store itself is the encryption key/password
      if (typeof miscStore === 'string') {
        return miscStore;
      }
      log.error('ISPStorage: Misc store is not a string');
      return null;
    } catch (error) {
      log.error('ISPStorage: Error getting encryption key:', false, error);
      return null;
    }
  }
  
  /**
   * Save ISP contact information (encrypted)
   */
  async saveISPContact(contact: ISPContact): Promise<boolean> {
    try {
      const password = await this.getEncryptionKey();
      if (!password) {
        log.error('ISPStorage: Cannot save without encryption key');
        return false;
      }
      
      // Encrypt the entire contact object
      const encrypted = await encryptData(contact, password);
      if (!encrypted) {
        log.error('ISPStorage: Encryption failed');
        return false;
      }
      
      // Store encrypted data
      await browser.storage.local.set({
        [this.STORAGE_KEY_ISP]: encrypted
      });
      
      log.info('ISPStorage: ISP contact saved successfully');
      return true;
    } catch (error) {
      log.error('ISPStorage: Error saving ISP contact:', false, error);
      return false;
    }
  }
  
  /**
   * Load ISP contact information (decrypt)
   */
  async loadISPContact(): Promise<ISPContact | null> {
    try {
      const password = await this.getEncryptionKey();
      if (!password) {
        log.debug('ISPStorage: No encryption key available');
        return null;
      }
      
      const result = await browser.storage.local.get(this.STORAGE_KEY_ISP);
      const encrypted = result[this.STORAGE_KEY_ISP] as EncryptedData;
      
      if (!encrypted) {
        log.debug('ISPStorage: No ISP contact found');
        return null;
      }
      
      // Decrypt the data
      const decrypted = await decryptData<ISPContact>(encrypted, password);
      return decrypted;
    } catch (error) {
      log.error('ISPStorage: Error loading ISP contact:', false, error);
      return null;
    }
  }
  
  /**
   * Delete ISP contact
   */
  async deleteISPContact(): Promise<boolean> {
    try {
      await browser.storage.local.remove(this.STORAGE_KEY_ISP);
      log.info('ISPStorage: ISP contact deleted');
      return true;
    } catch (error) {
      log.error('ISPStorage: Error deleting ISP contact:', false, error);
      return false;
    }
  }
  
  /**
   * Save alternative connection information
   */
  async saveAlternativeConnections(connections: AlternativeConnection): Promise<boolean> {
    try {
      const password = await this.getEncryptionKey();
      if (!password) {
        log.error('ISPStorage: Cannot save without encryption key');
        return false;
      }
      
      // Encrypt the entire connections object
      const encrypted = await encryptData(connections, password);
      if (!encrypted) {
        log.error('ISPStorage: Encryption failed');
        return false;
      }
      
      // Store encrypted data
      await browser.storage.local.set({
        [this.STORAGE_KEY_ALT]: encrypted
      });
      
      log.info('ISPStorage: Alternative connections saved successfully');
      return true;
    } catch (error) {
      log.error('ISPStorage: Error saving alternative connections:', false, error);
      return false;
    }
  }
  
  /**
   * Load alternative connection information
   */
  async loadAlternativeConnections(): Promise<AlternativeConnection | null> {
    try {
      const password = await this.getEncryptionKey();
      if (!password) {
        log.debug('ISPStorage: No encryption key available');
        return null;
      }
      
      const result = await browser.storage.local.get(this.STORAGE_KEY_ALT);
      const encrypted = result[this.STORAGE_KEY_ALT] as EncryptedData;
      
      if (!encrypted) {
        log.debug('ISPStorage: No alternative connections found');
        return null;
      }
      
      // Decrypt the data
      const decrypted = await decryptData<AlternativeConnection>(encrypted, password);
      return decrypted;
    } catch (error) {
      log.error('ISPStorage: Error loading alternative connections:', false, error);
      return null;
    }
  }
  
  /**
   * Quick action: Get ISP support phone
   */
  async getISPSupportPhone(): Promise<string | null> {
    const contact = await this.loadISPContact();
    return contact?.supportPhone || null;
  }
  
  /**
   * Quick action: Get common fixes
   */
  async getCommonFixes(): Promise<string[]> {
    const contact = await this.loadISPContact();
    return contact?.commonFixes || [
      'Power cycle modem for 30 seconds',
      'Check all cable connections',
      'Reset router to factory settings',
      'Contact ISP if lights are red/amber'
    ];
  }
  
  /**
   * Quick action: Get hotspot instructions
   */
  async getHotspotInstructions(): Promise<string[] | null> {
    const connections = await this.loadAlternativeConnections();
    return connections?.mobileHotspot?.setupInstructions || null;
  }
  
  /**
   * Record an outage for tracking
   */
  async recordOutage(): Promise<void> {
    try {
      const contact = await this.loadISPContact();
      if (contact) {
        contact.lastOutage = new Date().toISOString();
        await this.saveISPContact(contact);
        log.info('ISPStorage: Outage recorded');
      }
    } catch (error) {
      log.error('ISPStorage: Error recording outage:', false, error);
    }
  }
  
  /**
   * Check if data exists
   */
  async hasISPData(): Promise<boolean> {
    const result = await browser.storage.local.get([
      this.STORAGE_KEY_ISP,
      this.STORAGE_KEY_ALT
    ]);
    return !!(result[this.STORAGE_KEY_ISP] || result[this.STORAGE_KEY_ALT]);
  }
}

export const ispStorage = ISPStorageService.getInstance();
