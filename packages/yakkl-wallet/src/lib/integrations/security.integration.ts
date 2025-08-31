/**
 * Security Integration
 * Connects the wallet with @yakkl/security package
 */

import { 
  securityBridge,
  validateTransaction,
  encryptForDomain,
  decryptForDomain,
  storePrivateKey,
  getPrivateKey,
  checkPermission,
  grantPermission,
  generateMnemonic,
  signMessage
} from './security-bridge';


/**
 * Initialize security components
 */
export async function initializeSecurity(): Promise<void> {
  if (typeof window === "undefined") return;
  
  // The security bridge handles all initialization
  console.log('[Security] Initializing security integration');
  
  // Setup additional wallet-specific security features
  setupWalletSecurity();
  
  console.log('[Security] Security integration initialized');
}

/**
 * Setup wallet-specific security features
 */
function setupWalletSecurity(): void {
  if (typeof window === "undefined") return;
  
  // Listen for extension installation
  if (typeof chrome !== 'undefined' && chrome.runtime && (chrome.runtime as any).onInstalled) {
    (chrome.runtime as any).onInstalled.addListener((details: any) => {
      if (details.reason === 'install') {
        // Generate initial security keys on first install
        handleFirstInstall();
      }
    });
  }
  
  // Monitor for suspicious activity
  setupActivityMonitoring();
}

/**
 * Handle first installation
 */
async function handleFirstInstall(): Promise<void> {
  try {
    // Generate secure mnemonic for new wallet
    const mnemonic = await securityBridge.generateMnemonic(128);
    console.log('[Security] Generated secure mnemonic for new wallet');
    
    // Note: In production, this would be shown to user for backup
    // and then encrypted and stored securely
  } catch (error) {
    console.error('[Security] Failed to handle first install:', error);
  }
}

/**
 * Setup activity monitoring
 */
function setupActivityMonitoring(): void {
  if (typeof window === "undefined") return;
  
  // Monitor for rapid transaction attempts
  let transactionCount = 0;
  let resetTimeout: NodeJS.Timeout;
  
  const monitorTransactions = () => {
    transactionCount++;
    
    if (transactionCount > 5) {
      console.warn('[Security] Rapid transaction attempts detected');
      // Could trigger additional security checks or warnings
    }
    
    clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => {
      transactionCount = 0;
    }, 60000); // Reset count after 1 minute
  };
  
  // Export monitoring function for use in transaction flow
  (window as any).__yakklSecurityMonitor = monitorTransactions;
}

// Re-export security bridge methods for external use
export {
  validateTransaction,
  encryptForDomain,
  decryptForDomain,
  storePrivateKey,
  getPrivateKey,
  checkPermission,
  grantPermission,
  generateMnemonic,
  signMessage
};

// Note: Types are defined locally in security-bridge.ts to avoid import issues

/**
 * Enhanced transaction validation with security checks
 */
export async function validateTransactionSecure(tx: any): Promise<{ valid: boolean; errors?: string[]; warnings?: string[] }> {
  try {
    // Use security bridge for comprehensive validation
    const result = await securityBridge.validateTransaction(tx);
    
    // Log for monitoring
    if (typeof window !== 'undefined' && (window as any).__yakklSecurityMonitor) {
      (window as any).__yakklSecurityMonitor();
    }
    
    return result;
  } catch (error) {
    console.error('[Security] Transaction validation failed:', error);
    return {
      valid: false,
      errors: ['Security validation failed']
    };
  }
}

/**
 * Encrypt sensitive data
 */
export async function encryptData(data: any, password: string): Promise<string> {
  try {
    // Use domain-specific encryption for current origin
    const domain = typeof window !== "undefined" ? window.location.origin : 'yakkl-wallet';
    return await encryptForDomain(domain, data);
  } catch (error) {
    console.error('[Security] Encryption failed:', error);
    throw error;
  }
}

/**
 * Decrypt sensitive data
 */
export async function decryptData(encryptedData: string, password: string): Promise<any> {
  try {
    // Use domain-specific decryption for current origin
    const domain = typeof window !== "undefined" ? window.location.origin : 'yakkl-wallet';
    return await decryptForDomain(domain, encryptedData);
  } catch (error) {
    console.error('[Security] Decryption failed:', error);
    throw error;
  }
}

/**
 * Check permissions for current domain
 */
export async function checkPermissions(permission: string): Promise<boolean> {
  try {
    const domain = typeof window !== "undefined" ? window.location.origin : 'yakkl-wallet';
    return await checkPermission(domain, permission);
  } catch (error) {
    console.error('[Security] Permission check failed:', error);
    return false;
  }
}