// src/lib/permissions/handlers.ts

import { type PermissionResponse, SecurityLevel } from "./types";
import { getPermission, getCurrentSessionId } from "./storage";
import { getSecurityLevel } from "./security";
import { log } from "$lib/plugins/Logger";

// NOTE: This is currently not used, but it is a good starting point for the permission handling

/**
 * Check if a permission is valid based on security level
 * @param origin Domain origin
 * @returns Whether permission is valid
 */
export async function isPermissionValid(origin: string): Promise<boolean> {
  try {
    const permission = await getPermission(origin);
    if (!permission) return false;

    const securityLevel = await getSecurityLevel();

    switch (securityLevel) {
      case SecurityLevel.HIGH:
        // In high security, only allow in same session
        const currentSessionId = await getCurrentSessionId();
        return permission.sessionId === currentSessionId;

      case SecurityLevel.MEDIUM:
      case SecurityLevel.STANDARD:
        // Allow if permission exists and is not expired
        return permission.expiresAt > Date.now();

      default:
        return false;
    }
  } catch (error) {
    log.error('Error checking permission validity', false, { origin, error });
    return false;
  }
}

/**
 * Handle eth_accounts and eth_requestAccounts methods
 * @param method RPC method name
 * @param origin Origin domain
 * @returns List of authorized accounts or empty array
 */
// export async function handleAccountsRequest(
//   method: string,
//   origin: string
// ): Promise<string[]> {
//   try {
//     // Check if we already have valid permission
//     const hasValidPermission = await isPermissionValid(origin);
//     const securityLevel = await getSecurityLevel();

//     if (method === 'eth_accounts') {
//       // For eth_accounts, just return accounts if we have permission
//       if (hasValidPermission) {
//         const permission = await getPermission(origin);
//         if (permission) {
//           // Update last used timestamp
//           await updatePermissionUsage(origin);
//           return permission.accounts;
//         }
//       }
//       // Standard wallet behavior: return empty array if no permission
//       return [];
//     }

//     // For eth_requestAccounts
//     if (method === 'eth_requestAccounts') {
//       if (hasValidPermission && securityLevel !== SecurityLevel.HIGH) {
//         // If we have valid permission and not in high security mode,
//         // return accounts without prompting
//         const permission = await getPermission(origin);
//         if (permission) {
//           // Update last used timestamp
//           await updatePermissionUsage(origin);
//           return permission.accounts;
//         }
//       }

//       // Show the permission prompt
//       const response = await showPermissionPrompt(origin);
//       if (response.approved && response.accounts.length > 0) {
//         // Get expiry based on security level
//         const expiryDays = getExpiryDays(securityLevel);

//         // Store permission with domain-based encryption
//         await storePermission(origin, response.accounts, expiryDays);
//         return response.accounts;
//       } else {
//         throw new ProviderRpcError(4001, 'User rejected the request');
//       }
//     }

//     throw new ProviderRpcError(4200, `Method ${method} not supported`);
//   } catch (error) {
//     if (error instanceof ProviderRpcError) {
//       throw error;
//     }
//     log.error('Error handling accounts request', false, { method, origin, error });
//     throw new ProviderRpcError(4100, 'Unauthorized');
//   }
// }

/**
 * Show permission approval popup and get user response
 * @param origin Domain origin
 * @returns Promise resolving to user's response
 */
// src/lib/permissions/handlers.ts

// Update the showPermissionPrompt function with proper type handling
// export function showPermissionPrompt(origin: string): Promise<PermissionResponse> {
//   return new Promise<PermissionResponse>((resolve, reject) => {
//     try {
//       // Generate unique request ID
//       const requestId = `permission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//       // Store callback functions in our module-level map
//       permissionCallbacks[requestId] = { resolve, reject };

//       // Also store in window object if in browser context (for popup to access)
//       if (typeof window !== 'undefined') {
//         window.permissionCallbacks = window.permissionCallbacks || {};
//         window.permissionCallbacks[requestId] = { resolve, reject };
//       }

//       log.info('Showing permission popup', false, { origin, requestId });
//       // Show the approval popup
//       const popupUrl = `/dapp/popups/approve.html?requestId=${requestId}&origin=${encodeURIComponent(origin)}`;
//       log.debug('Opening permission popup', false, { origin, popupUrl });

//       showDappPopup(popupUrl);

//       // Set timeout to handle case where popup is closed without response
//       setTimeout(() => {
//         if (permissionCallbacks[requestId]) {
//           delete permissionCallbacks[requestId];

//           // Also clean up window object if in browser context
//           if (typeof window !== 'undefined' && window.permissionCallbacks?.[requestId]) {
//             delete window.permissionCallbacks[requestId];
//           }

//           reject(new ProviderRpcError(4001, 'Request timeout or user rejected'));
//         }
//       }, 60000); // 1 minute timeout
//     } catch (error) {
//       log.error('Error showing permission prompt', false, error);
//       reject(new ProviderRpcError(4001, 'Unable to show permission prompt'));
//     }
//   });
// }

/**
 * Resolve a permission request (called from popup)
 * @param requestId The request ID to resolve
 * @param response The user's response (approved accounts)
 */
export function resolvePermissionRequest(requestId: string, response: PermissionResponse): boolean {
  // Check module-level callbacks first
  if (permissionCallbacks[requestId]) {
    permissionCallbacks[requestId].resolve(response);
    delete permissionCallbacks[requestId];
    return true;
  }

  // No callback found
  log.warn('No permission callback found for request', false, { requestId });
  return false;
}

/**
 * Reject a permission request (called from popup)
 * @param requestId The request ID to reject
 * @param error The error reason
 */
export function rejectPermissionRequest(requestId: string, error: string): boolean {
  // Check module-level callbacks first
  if (permissionCallbacks[requestId]) {
    permissionCallbacks[requestId].reject(new Error(error || 'User rejected the request'));
    delete permissionCallbacks[requestId];
    return true;
  }

  // No callback found
  log.warn('No permission callback found for request', false, { requestId });
  return false;
}

// Create a module-level variable to store callbacks instead of using global
// This avoids the TypeScript issues with the global object
const permissionCallbacks: {
  [requestId: string]: {
    resolve: (value: PermissionResponse) => void;
    reject: (reason?: any) => void;
  }
} = {};

// Add this for the global context case
declare global {
  namespace NodeJS {
    interface Global {
      permissionCallbacks?: {
        [requestId: string]: {
          resolve: (value: PermissionResponse) => void;
          reject: (reason?: any) => void;
        }
      }
    }
  }

  interface Window {
    permissionCallbacks?: {
      [requestId: string]: {
        resolve: (value: PermissionResponse) => void;
        reject: (reason?: any) => void;
      }
    }
  }
}
