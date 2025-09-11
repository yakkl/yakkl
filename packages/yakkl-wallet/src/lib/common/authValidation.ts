// authValidation.ts - Centralized authentication validation
import { log } from '$lib/common/logger-wrapper';
import { getMiscStore, resetStores, setMiscStore } from '$lib/common/stores';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { STORAGE_YAKKL_SETTINGS } from '$lib/common/constants';
// MIGRATION: Move to @yakkl/browser-extension
// import { sessionManager } from '@yakkl/browser-extension/session/BrowserSessionManager';
import { sessionManager } from '$lib/managers/SessionManager';
// MIGRATION: Move to @yakkl/browser-extension
// import { backgroundJWTManager as jwtManager } from '@yakkl/browser-extension/jwt/jwt-background';
import { browserJWT as jwtManager } from '@yakkl/security';
import { getProfile } from '$lib/common/profile';
import type { Profile, ProfileData, YakklSettings } from '$lib/common/interfaces';
// MIGRATION: Move to @yakkl/security
// import { decryptData } from '@yakkl/security/wallet/encryption-utils';
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
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as YakklSettings;
    if (!settings || !settings.init) {
      return { isValid: false, reason: 'Wallet not initialized' };
    }

    // Step 2: Check if legal terms are accepted
    if (!settings.legal?.termsAgreed) {
      return { isValid: false, reason: 'Legal terms not accepted' };
    }

    // Step 3: Check for valid JWT token FIRST (for social login and JWT-based auth)
    let hasValidJWT = false;
    let jwtToken: string | null = null;

    // Check session-based JWT
    if (sessionManager?.isSessionActive()) {
      jwtToken = sessionManager.getCurrentJWTToken();
      if (jwtToken) {
        try {
          const isValid = await jwtManager.validateToken(jwtToken);
          if (isValid) {
            hasValidJWT = true;
            log.debug('Valid JWT token found in session');
          }
        } catch (error) {
          log.warn('JWT token verification error', false, error);
        }
      }
    }

    // If no session JWT, check sessionStorage (for social login)
    if (!hasValidJWT && typeof sessionStorage !== 'undefined') {
      const storedJWT = sessionStorage.getItem('wallet-jwt-token');
      if (storedJWT) {
        try {
          const isValid = await jwtManager.validateToken(storedJWT);
          if (isValid) {
            hasValidJWT = true;
            jwtToken = storedJWT;
            log.debug('Valid JWT token found in sessionStorage');
          }
        } catch (error) {
          log.warn('Stored JWT token verification error', false, error);
        }
      }
    }

    // Step 4: Check digest (password-based auth) OR JWT (social/token-based auth)
    const digest = getMiscStore();

    // For JWT-based auth (social login), we don't require a digest
    if (!digest || digest.length === 0) {
      if (!hasValidJWT) {
        // No digest AND no valid JWT - not authenticated
        return { isValid: false, reason: 'No authentication credentials' };
      }
      // Has valid JWT but no digest - this is OK for social login
      log.debug('JWT-based authentication without digest (social login)');
    }

    // Step 5: Retrieve and validate profile
    const profile = await getProfile();
    if (!profile) {
      return { isValid: false, reason: 'No user profile' };
    }

    // Step 6: Check if profile data exists
    // For social login, profile.data might be minimal
    if (!profile.data && !hasValidJWT) {
      return { isValid: false, reason: 'Profile data missing' };
    }

    // Step 7: Validate profile data if it's encrypted and we have a digest
    if (digest && profile.data && isEncryptedData(profile.data)) {
      try {
        const profileData = await decryptData(profile.data, digest) as ProfileData;
        if (!profileData) {
          return { isValid: false, reason: 'Profile data decryption failed' };
        }
      } catch (error) {
        log.warn('Profile data decryption error', false, error);
        // If we have a valid JWT, allow authentication to proceed
        if (!hasValidJWT) {
          return { isValid: false, reason: 'Profile data validation failed' };
        }
      }
    }

    // Step 8: Additional security checks
    // Check if profile ID matches expected format (UUID or social ID)
    // Allow flexible ID format for social login
    if (!profile.id || profile.id.length < 8) {
      log.warn('Authentication failed: Invalid profile ID');
      return { isValid: false, reason: 'Invalid profile ID' };
    }

    // All checks passed
    return {
      isValid: true,
      profile: profile,
      hasValidSession: sessionManager.isSessionActive() || hasValidJWT,
      hasValidJWT: hasValidJWT
    };

  } catch (error) {
    log.warn('Authentication validation error', false, error);
    return { isValid: false, reason: 'Validation error' };
  }
}

/**
 * Quick validation check for non-critical operations
 * Checks for digest OR JWT token existence
 */
export async function quickAuthCheck(): Promise<boolean> {
  try {
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as YakklSettings;
    const digest = getMiscStore();

    // Check for digest-based auth
    const hasDigestAuth = !!(settings && settings.isLocked === false && digest && digest.length > 0);
    if (hasDigestAuth) {
      return true;
    }

    // Check for JWT-based auth (social login)
    if (settings && settings.isLocked === false) {
      // Check session JWT
      if (sessionManager?.isSessionActive()) {
        const jwtToken = sessionManager.getCurrentJWTToken();
        if (jwtToken) {
          return true;
        }
      }

      // Check sessionStorage JWT
      if (typeof sessionStorage !== 'undefined') {
        const storedJWT = sessionStorage.getItem('wallet-jwt-token');
        if (storedJWT) {
          return true;
        }
      }
    }

    return false;
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
    const settings = await getObjectFromLocalStorage(STORAGE_YAKKL_SETTINGS) as YakklSettings;
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
