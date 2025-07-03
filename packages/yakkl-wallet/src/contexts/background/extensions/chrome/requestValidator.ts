/**
 * Background script request validator
 * Validates incoming requests for proper authentication and authorization
 */

import { log } from '$lib/managers/Logger';
import { getObjectFromLocalStorage } from '$lib/common/backgroundSecuredStorage';
import { STORAGE_YAKKL_SETTINGS, STORAGE_YAKKL_PROFILE } from '$lib/common/constants';
import type { Settings, Profile } from '$lib/common/interfaces';
import { getPermission } from '$lib/permissions';

export interface RequestValidationResult {
  isValid: boolean;
  reason?: string;
  isAuthenticated: boolean;
  hasRequiredPermissions: boolean;
}

// Methods that require authentication
const PROTECTED_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_addEthereumChain',
  'wallet_switchEthereumChain',
  'wallet_requestPermissions',
  'wallet_getPermissions',
  'wallet_revokePermissions'
]);

// Methods that can be called without authentication
const PUBLIC_METHODS = new Set([
  'eth_chainId',
  'net_version',
  'eth_blockNumber',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getCode',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_call',
  'eth_estimateGas',
  'eth_getLogs'
]);

/**
 * Validates background script requests
 */
export async function validateBackgroundRequest(
  method: string,
  origin: string,
  tabId?: number
): Promise<RequestValidationResult> {
  try {
    // Check if method requires authentication
    const requiresAuth = PROTECTED_METHODS.has(method);
    
    if (!requiresAuth && PUBLIC_METHODS.has(method)) {
      // Public methods don't require authentication
      return {
        isValid: true,
        isAuthenticated: false,
        hasRequiredPermissions: true
      };
    }
    
    // For protected methods, check authentication
    if (requiresAuth) {
      // Check wallet settings
      const settings = await getObjectFromLocalStorage<Settings>(STORAGE_YAKKL_SETTINGS);
      
      if (!settings) {
        return {
          isValid: false,
          reason: 'Wallet not initialized',
          isAuthenticated: false,
          hasRequiredPermissions: false
        };
      }
      
      if (!settings.init) {
        return {
          isValid: false,
          reason: 'Wallet not initialized',
          isAuthenticated: false,
          hasRequiredPermissions: false
        };
      }
      
      if (!settings.legal?.termsAgreed) {
        return {
          isValid: false,
          reason: 'Legal terms not accepted',
          isAuthenticated: false,
          hasRequiredPermissions: false
        };
      }
      
      if (settings.isLocked !== false) {
        return {
          isValid: false,
          reason: 'Wallet is locked',
          isAuthenticated: false,
          hasRequiredPermissions: false
        };
      }
      
      // Check if profile exists (additional validation)
      const profile = await getObjectFromLocalStorage<Profile>(STORAGE_YAKKL_PROFILE);
      
      if (!profile || !profile.data) {
        return {
          isValid: false,
          reason: 'No valid profile found',
          isAuthenticated: false,
          hasRequiredPermissions: false
        };
      }
      
      // Check origin permissions
      const hasPermission = await checkOriginPermission(origin, method);
      
      if (!hasPermission) {
        log.warn('Origin lacks permission for method', false, { origin, method });
        return {
          isValid: false,
          reason: 'Origin not authorized for this method',
          isAuthenticated: true,
          hasRequiredPermissions: false
        };
      }
      
      // All checks passed for protected method
      return {
        isValid: true,
        isAuthenticated: true,
        hasRequiredPermissions: true
      };
    }
    
    // Unknown method
    return {
      isValid: false,
      reason: 'Unknown method',
      isAuthenticated: false,
      hasRequiredPermissions: false
    };
    
  } catch (error) {
    log.error('Error validating background request', false, error);
    return {
      isValid: false,
      reason: 'Validation error',
      isAuthenticated: false,
      hasRequiredPermissions: false
    };
  }
}

/**
 * Check if origin has permission for the requested method
 */
async function checkOriginPermission(origin: string, method: string): Promise<boolean> {
  try {
    // Extract domain from origin
    const domain = extractDomain(origin);
    
    // Get permissions for domain
    const permissions = await getPermission(domain);
    
    if (!permissions) {
      return false;
    }
    
    // Check if permissions exist and haven't expired
    // For now, we'll allow access if permissions exist
    // In the future, we may want to check specific method permissions
    if (method.startsWith('eth_') || method.startsWith('personal_') || method.startsWith('wallet_')) {
      return permissions.accounts && permissions.accounts.length > 0;
    }
    
    return false;
  } catch (error) {
    log.error('Error checking origin permission', false, error);
    return false;
  }
}

/**
 * Extract domain from origin URL
 */
function extractDomain(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return origin;
  }
}

/**
 * Validate request parameters for specific methods
 */
export function validateMethodParams(method: string, params: any[]): { valid: boolean; error?: string } {
  switch (method) {
    case 'eth_sendTransaction':
      if (!params || params.length === 0) {
        return { valid: false, error: 'Transaction parameters required' };
      }
      const tx = params[0];
      if (!tx.from || !tx.to) {
        return { valid: false, error: 'Transaction must have from and to addresses' };
      }
      break;
      
    case 'personal_sign':
    case 'eth_sign':
      if (!params || params.length < 2) {
        return { valid: false, error: 'Message and address required' };
      }
      break;
      
    case 'eth_signTypedData':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      if (!params || params.length < 2) {
        return { valid: false, error: 'Address and typed data required' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Log security event for monitoring
 */
export async function logSecurityEvent(
  event: 'auth_failure' | 'permission_denied' | 'suspicious_activity',
  details: any
): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details
    };
    
    // Store security log
    const securityLog = JSON.parse(localStorage.getItem('securityLog') || '[]');
    securityLog.push(logEntry);
    
    // Keep only last 500 entries
    if (securityLog.length > 500) {
      securityLog.splice(0, securityLog.length - 500);
    }
    
    localStorage.setItem('securityLog', JSON.stringify(securityLog));
    
    log.warn('Security event', false, logEntry);
  } catch (error) {
    log.error('Failed to log security event', false, error);
  }
}