/**
 * Examples of using PopupSecurityManager with JWT token invalidation
 */

import { popupSecurityManager } from './PopupSecurityManager';
import { backgroundJWTManager } from '$lib/utilities/jwt-background';

// Example 1: Invalidate current token during security breach
async function handleSecurityBreach() {
  console.log('Security breach detected - invalidating current token');
  
  // Invalidate the current token
  const success = await popupSecurityManager.invalidateJWTToken();
  console.log('Token invalidation result:', success);
  
  // This will force the user to re-authenticate
}

// Example 2: Invalidate specific token
async function handleSuspiciousToken(suspiciousToken: string) {
  console.log('Suspicious token detected - invalidating specific token');
  
  // Invalidate the specific token
  const success = await popupSecurityManager.invalidateJWTToken(suspiciousToken);
  console.log('Specific token invalidation result:', success);
}

// Example 3: Multiple session management
async function handleMultipleSessionsSecurityEvent() {
  console.log('Handling multiple sessions security event');
  
  // Get all active tokens (this would require additional implementation)
  // For demonstration, let's say we have multiple tokens
  const session1Token = 'eyJhbGciOiJIUzI1NiI...'; // Example token 1
  const session2Token = 'eyJhbGciOiJIUzI1NiI...'; // Example token 2
  
  // Invalidate all known tokens
  await popupSecurityManager.invalidateJWTToken(session1Token);
  await popupSecurityManager.invalidateJWTToken(session2Token);
  
  // Also invalidate the current token
  await popupSecurityManager.invalidateJWTToken();
  
  console.log('All sessions invalidated');
}

// Example 4: Lock wallet with specific token invalidation
async function handleUserLockRequest(userToken?: string) {
  console.log('User requested wallet lock');
  
  // If we have a specific token to invalidate, use it
  if (userToken) {
    await popupSecurityManager.invalidateJWTToken(userToken);
  } else {
    // Otherwise, invalidate the current token
    await popupSecurityManager.invalidateJWTToken();
  }
  
  // The popup security manager will handle the rest of the lock flow
  await popupSecurityManager.handlePopupRequest('login.html', '0', 'internal');
}

// Example 5: Session timeout with token invalidation
async function handleSessionTimeout() {
  console.log('Session timed out - invalidating token and redirecting to login');
  
  // Get current session info
  const sessionInfo = await popupSecurityManager.getSessionInfo();
  console.log('Current session:', sessionInfo);
  
  // Invalidate the current token
  await popupSecurityManager.invalidateJWTToken();
  
  // Handle popup request to show login
  await popupSecurityManager.handlePopupRequest('login.html', '0', 'internal');
}

// Example 6: Validate token before sensitive operations
async function performSensitiveOperation() {
  console.log('Performing sensitive operation - validating token first');
  
  // Validate current token
  const isValid = await popupSecurityManager.validateJWTToken();
  
  if (!isValid) {
    console.log('Token is invalid - invalidating and requiring re-authentication');
    await popupSecurityManager.invalidateJWTToken();
    await popupSecurityManager.handlePopupRequest('login.html', '0', 'internal');
    return false;
  }
  
  console.log('Token is valid - proceeding with sensitive operation');
  // Perform the sensitive operation here
  return true;
}

// Example 7: Clean up on extension uninstall/disable
async function handleExtensionCleanup() {
  console.log('Extension cleanup - invalidating all tokens');
  
  try {
    // Invalidate current token
    await popupSecurityManager.invalidateJWTToken();
    
    // Clear the entire blacklist (use with caution)
    await backgroundJWTManager.clearBlacklist();
    
    console.log('All tokens and blacklist cleared');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Export examples for testing
export {
  handleSecurityBreach,
  handleSuspiciousToken,
  handleMultipleSessionsSecurityEvent,
  handleUserLockRequest,
  handleSessionTimeout,
  performSensitiveOperation,
  handleExtensionCleanup
};