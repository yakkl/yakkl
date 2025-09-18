// Authentication guard for all wallet routes
// This file only handles route-level authentication and redirection

import { goto } from '$app/navigation';
import { validateAuthentication } from '$lib/common/authValidation';
import { PATH_LOGIN, PATH_REGISTER, PATH_LEGAL_TOS } from '$lib/common/constants';
import { log } from '$lib/common/logger-wrapper';
import { appStateManager } from '$lib/managers/AppStateManager';

export const load = async ({ url }: any) => {
  if (typeof window === 'undefined') return {};

  // Skip auth check for public routes
  // CRITICAL: Do NOT include '/' (home) in public routes - it must be protected!
  const publicRoutes = ['/login', '/register', '/legal', '/legal/tos', '/legal/privacy', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
    return {};
  }

  // CRITICAL SECURITY: Explicitly protect home and dashboard routes
  const protectedRoutes = ['/', '/home', '/dashboard'];
  if (protectedRoutes.includes(currentPath)) {
    log.warn('[(wallet)/+layout.ts] Protected route accessed, enforcing authentication:', false,currentPath);
  }

  try {
    // Initialize app state manager if not already initialized
    try {
      await appStateManager.initialize();
      // Wait for app to be ready before checking authentication (with short timeout)
      await appStateManager.waitForReady(3000);
    } catch (error) {
      // Log but don't fail - continue with auth check
      log.warn('[(wallet)/+layout.ts] AppStateManager initialization warning:', false,error);
    }

    // Validate authentication for protected routes
    const validation = await validateAuthentication();

    if (!validation.isValid) {
      // Determine redirect path based on validation reason
      let redirectPath = PATH_LOGIN;

      switch (validation.reason) {
        case 'Wallet not initialized':
          redirectPath = PATH_REGISTER;
          break;
        case 'Legal terms not accepted':
          redirectPath = PATH_LEGAL_TOS;
          break;
        default:
          redirectPath = PATH_LOGIN;
          break;
      }

      // Redirect to appropriate page
      await goto(redirectPath, { replaceState: true });
      return { authenticated: false };
    }

    // Authentication valid - proceed with route
    return { authenticated: true };

  } catch (error) {
    // Handle redirect errors
    log.warn('[(wallet)/+layout.ts] Authentication check failed:', false, error);
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }

    // For any other error, redirect to login
    await goto(PATH_LOGIN, { replaceState: true });
    return { authenticated: false };
  }
};
