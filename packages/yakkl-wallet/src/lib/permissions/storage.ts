// src/lib/permissions/storage.ts

import browser from "webextension-polyfill";
import type { PermissionData, EncryptedPermissionStore, SecurityLevel } from "./types";
import { encryptWithDomainKey, decryptWithDomainKey, generateSessionId } from "../utilities/crypto";
import { log } from "$lib/managers/Logger";

// Storage keys
const PERMISSIONS_PREFIX = 'wallet_permission_';
const SECURITY_LEVEL_KEY = 'walletSecurityLevel';
const SESSION_ID_KEY = 'walletSessionId';

// Current session ID (generated once per browser session)
let currentSessionId: string | null = null;

/**
 * Get current session ID, creating one if needed
 */
export async function getCurrentSessionId(): Promise<string> {
  if (currentSessionId) return currentSessionId;

  // Check if we have a session ID in sessionStorage
  try {
    const result = await browser.storage.session.get(SESSION_ID_KEY);
    if (result && result[SESSION_ID_KEY] && typeof result[SESSION_ID_KEY] === 'string') {
      currentSessionId = result[SESSION_ID_KEY] as string;
      return currentSessionId;
    }
  } catch (error) {
    // Session storage not available, generate new ID
    log.debug('Session storage not available, generating new session ID');
  }

  // Generate new session ID
  currentSessionId = generateSessionId();

  // Try to store in session storage if available
  try {
    await browser.storage.session.set({ [SESSION_ID_KEY]: currentSessionId });
  } catch (error) {
    log.warn('Failed to store session ID in session storage', false, error);
  }

  return currentSessionId;
}

/**
 * Get storage key for a domain
 * @param origin Domain origin (e.g., "https://app.uniswap.org")
 */
function getPermissionKey(origin: string): string {
  return `${PERMISSIONS_PREFIX}${btoa(origin)}`;
}

/**
 * Store permission data for a domain
 * @param origin Domain origin (e.g., "https://app.uniswap.org")
 * @param accounts List of account addresses to authorize
 * @param expiryDays Number of days until permission expires (default: 7)
 */
export async function storePermission(
  origin: string,
  accounts: string[],
  expiryDays: number = 7
): Promise<void> {
  try {
    const now = Date.now();

    // Construct permission data
    const permissionData: PermissionData = {
      accounts,
      approvedAt: now,
      expiresAt: now + (expiryDays * 24 * 60 * 60 * 1000),
      lastUsed: now,
      sessionId: await getCurrentSessionId()
    };

    // Encrypt the permission data
    const encryptedStore = await encryptWithDomainKey(permissionData, origin);

    // Store in browser.storage.local
    const key = getPermissionKey(origin);
    await browser.storage.local.set({ [key]: encryptedStore });

    log.debug('Stored permission data for origin', false, { origin, accounts });
  } catch (error) {
    log.error('Failed to store permission data', false, { origin, error });
    throw error;
  }
}

/**
 * Retrieve permission data for a domain
 * @param origin Domain origin (e.g., "https://app.uniswap.org")
 * @returns Permission data or null if not found or expired
 */
export async function getPermission(origin: string): Promise<PermissionData | null> {
  try {
    const key = getPermissionKey(origin);
    const result = await browser.storage.local.get(key);
    const encryptedStore = result[key] as EncryptedPermissionStore;

    if (!encryptedStore) {
      return null;
    }

    // Decrypt the permission data
    const permissionData = await decryptWithDomainKey<PermissionData>(encryptedStore, origin);

    // Check if permission has expired
    if (permissionData.expiresAt < Date.now()) {
      // Permission expired, remove it
      await browser.storage.local.remove(key);
      log.debug('Permission expired and removed', false, { origin });
      return null;
    }

    return permissionData;
  } catch (error) {
    log.error('Failed to retrieve permission data', false, { origin, error });
    return null;
  }
}

/**
 * Remove permission for a domain
 * @param origin Domain origin (e.g., "https://app.uniswap.org")
 */
export async function removePermission(origin: string): Promise<void> {
  try {
    const key = getPermissionKey(origin);
    await browser.storage.local.remove(key);
    log.debug('Removed permission for origin', false, { origin });
  } catch (error) {
    log.error('Failed to remove permission', false, { origin, error });
    throw error;
  }
}

/**
 * Get all stored permissions
 * @returns Map of origins to permission data
 */
export async function getAllPermissions(): Promise<Map<string, PermissionData>> {
  try {
    const result = await browser.storage.local.get(null);
    const permissions = new Map<string, PermissionData>();

    // Process all keys in storage
    for (const [key, value] of Object.entries(result)) {
      if (key.startsWith(PERMISSIONS_PREFIX)) {
        try {
          // Extract origin from key
          const encodedOrigin = key.substring(PERMISSIONS_PREFIX.length);
          const origin = atob(encodedOrigin);

          // Decrypt permission data
          const permissionData = await decryptWithDomainKey<PermissionData>(
            value as EncryptedPermissionStore,
            origin
          );

          // Check if not expired
          if (permissionData.expiresAt >= Date.now()) {
            permissions.set(origin, permissionData);
          } else {
            // Remove expired permission
            await browser.storage.local.remove(key);
            log.debug('Removed expired permission during retrieval', false, { origin });
          }
        } catch (error) {
          log.error('Failed to process permission entry', false, { key, error });
        }
      }
    }

    return permissions;
  } catch (error) {
    log.error('Failed to retrieve all permissions', false, error);
    return new Map();
  }
}

/**
 * Update the last used timestamp for a permission
 * @param origin Domain origin
 */
export async function updatePermissionUsage(origin: string): Promise<void> {
  try {
    const permission = await getPermission(origin);
    if (permission) {
      permission.lastUsed = Date.now();
      const encryptedStore = await encryptWithDomainKey(permission, origin);
      const key = getPermissionKey(origin);
      await browser.storage.local.set({ [key]: encryptedStore });
    }
  } catch (error) {
    log.error('Failed to update permission usage', false, { origin, error });
  }
}
