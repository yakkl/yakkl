// authValidation.ts - Centralized authentication validation
import { log } from '$lib/common/logger-wrapper';
import { getMiscStore, resetStores, setMiscStore, yakklMiscStore } from '$lib/common/stores';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
import { sessionManager } from '$lib/managers/SessionManager';
import { jwtManager } from '$lib/utilities/jwt';
import { getProfile } from '$lib/common/stores';
import type { Profile, ProfileData, Settings } from '$lib/common/interfaces';
import { get } from 'svelte/store';
import { decryptData } from './encryption';
import { isEncryptedData } from './misc';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  profile?: Profile;
  hasValidSession?: boolean;
  hasValidJWT?: boolean;
}

/**
 * Performs comprehensive authentication validation
 * This is the primary security check that prevents unauthorized access
 */
export async function validateAuthentication(): Promise<ValidationResult> {
  try {
    // Step 1: Check if wallet is initialized
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as Settings;
    if (!settings || !settings.init) {
      log.warn('Authentication failed: Wallet not initialized');
      return { isValid: false, reason: 'Wallet not initialized' };
    }

    // Step 2: Check if legal terms are accepted
    if (!settings.legal?.termsAgreed) {
      log.warn('Authentication failed: Legal terms not accepted');
      return { isValid: false, reason: 'Legal terms not accepted' };
    } else {
      log.info('Authentication: Legal terms accepted');
    }

    // Step 3: Validate digest exists and is non-empty
    // Add retry logic for race condition on initial load
    let digest = getMiscStore();
    
    // If digest is not immediately available, retry a few times with short delays
    // This handles the race condition where the digest might still be loading
    if (!digest || digest.length === 0) {
      const maxRetries = 3;
      const retryDelay = 100; // 100ms between retries
      
      for (let i = 0; i < maxRetries; i++) {
        log.debug(`Authentication: Digest not found, retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Try to get the digest again
        digest = getMiscStore();
        
        if (digest && digest.length > 0) {
          log.debug('Authentication: Digest found after retry');
          break;
        }
      }
      
      // After retries, if still no digest, then auth fails
      if (!digest || digest.length === 0) {
        log.warn('Authentication failed: No valid digest found after retries');
        return { isValid: false, reason: 'No authentication digest' };
      }
    }

    // Step 4: Verify digest matches stored value
    // const storedDigest = get(yakklMiscStore);
    // if (digest !== storedDigest) {
    //   log.warn('Authentication failed: Digest mismatch');
    //   return { isValid: false, reason: 'Invalid authentication state' };
    // }

    // Step 5: Retrieve and validate profile
    // Also add retry logic here as profile might be loading
    let profile = await getProfile();
    
    if (!profile) {
      // Try a couple times with short delay for profile to load
      const maxRetries = 2;
      const retryDelay = 100;
      
      for (let i = 0; i < maxRetries; i++) {
        log.debug(`Authentication: Profile not found, retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        profile = await getProfile();
        
        if (profile) {
          log.debug('Authentication: Profile found after retry');
          break;
        }
      }
      
      if (!profile) {
        log.warn('Authentication failed: No profile found after retries');
        return { isValid: false, reason: 'No profile found' };
      }
    }

    // Step 6: Check if profile is locked
    // Profile from getProfile is already decrypted, validate its structure
    if (!profile.data) {
      log.warn('Authentication failed: No profile data');
      return { isValid: false, reason: 'Profile data missing' };
    }

    // Step 7: Validate profile data exists
    // The profile from getProfile() is already decrypted if the digest was valid
    if (isEncryptedData(profile.data)) {
      const profileData = await decryptData(profile.data, digest) as ProfileData;
      if (!profileData) {
        log.warn('Authentication failed: No profile data available');
        return { isValid: false, reason: 'Profile data missing' };
      }
    }

    // Step 8: Check JWT session validity
    let hasValidJWT = false;
    if (sessionManager.isSessionActive()) {
      const jwtToken = sessionManager.getCurrentJWTToken();
      if (jwtToken) {
        try {
          const isValid = await jwtManager.verifyToken(jwtToken);
          if (isValid) {
            hasValidJWT = true;
            log.debug('JWT token validated successfully');
          } else {
            log.warn('JWT token validation failed');
            // Don't fail auth entirely if JWT is invalid - the session manager will handle this
          }
        } catch (error) {
          log.warn('JWT token verification error', false, error);
        }
      }
    }

    // Step 9: Additional security checks
    // Check if profile ID matches expected format
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(profile.id)) {
      log.warn('Authentication failed: Invalid profile ID format');
      return { isValid: false, reason: 'Invalid profile format' };
    }

    // All checks passed
    log.info('Authentication validated successfully-----------------------');
    return {
      isValid: true,
      profile: profile,
      hasValidSession: sessionManager.isSessionActive(),
      hasValidJWT: hasValidJWT
    };

  } catch (error) {
    log.warn('Authentication validation error', false, error);
    return { isValid: false, reason: 'Validation error' };
  }
}

/**
 * Quick validation check for non-critical operations
 * Only checks isLocked and digest existence
 */
export async function quickAuthCheck(): Promise<boolean> {
  try {
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as Settings;
    const digest = getMiscStore();

    return !!(settings && settings.isLocked === false && digest && digest.length > 0);
  } catch {
    return false;
  }
}

/**
 * Clears authentication state on validation failure
 */
export async function clearAuthenticationState(): Promise<void> {
  try {
    // Lock the wallet
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as Settings;
    if (settings) {
      settings.isLocked = true;
      await setObjectInLocalStorage(STORAGE_YAKKL_SETTINGS, settings);
    }

    // Clear sensitive data
    setMiscStore('');

    // Clear session if active
    try {
      if (sessionManager.isSessionActive()) {
        await sessionManager.endSession();
      }
    } catch (error) {
      log.warn('Error ending session during auth clear', false, error);
    }

    // Reset stores
    resetStores();

    log.info('Authentication state cleared');
  } catch (error) {
    log.warn('Error clearing authentication state', false, error);
  }
}

/**
 * Validates and refreshes authentication state
 * Used by layout components to ensure continued authentication
 */
export async function validateAndRefreshAuth(): Promise<boolean> {
  try {
    const validation = await validateAuthentication();

    if (!validation.isValid) {
      await clearAuthenticationState();
      return false;
    }

    // Refresh session if active
    if (sessionManager.isSessionActive()) {
      try {
        await sessionManager.extendSession();
      } catch (error) {
        log.warn('Failed to extend session during auth refresh', false, error);
      }
    }

    return true;
  } catch (error) {
    log.warn('Error validating and refreshing auth', false, error);
    return false;
  }
}

/**
 * Audit authentication events for security monitoring
 */
export async function auditAuthEvent(event: string, details: any = {}): Promise<void> {
  try {
    log.info(`Auth Event: ${event}`, false, details);

    // Store audit event if needed
    const auditEntry = {
      event,
      timestamp: new Date().toISOString(),
      details,
      profileId: 'unknown' // Profile ID not available in this context
    };

    // Could store in local storage or send to backend
    // For now, just log it
    if (event === 'validation_failed' || event === 'unauthorized_access') {
      log.warn('Security audit event', false, auditEntry);
    } else {
      log.debug('Security audit event........................', false, auditEntry);
    }
  } catch (error) {
    log.warn('Error auditing auth event', false, error);
  }
}

// Rate limiting for authentication attempts
const authRateLimitMap = new Map<string, { attempts: number; lastAttempt: number }>();
const MAX_AUTH_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Check if authentication attempt is rate limited
 */
export function checkAuthRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = authRateLimitMap.get(identifier);

  if (!record) {
    authRateLimitMap.set(identifier, { attempts: 1, lastAttempt: now });
    return true;
  }

  // Reset if outside time window
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
    authRateLimitMap.set(identifier, { attempts: 1, lastAttempt: now });
    return true;
  }

  // Check if exceeded attempts
  if (record.attempts >= MAX_AUTH_ATTEMPTS) {
    log.warn('Authentication rate limit exceeded', false, { identifier });
    return false;
  }

  // Increment attempts
  record.attempts++;
  record.lastAttempt = now;
  return true;
}

/**
 * Clear rate limit for successful authentication
 */
export function clearAuthRateLimit(identifier: string): void {
  authRateLimitMap.delete(identifier);
}
