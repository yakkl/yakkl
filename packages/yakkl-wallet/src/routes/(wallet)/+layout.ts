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
  const publicRoutes = ['/', '/login', '/register', '/legal', '/legal/tos', '/legal/privacy', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
    return {};
  }

  try {
    // Initialize app state manager if not already initialized
    try {
      await appStateManager.initialize();
      // Wait for app to be ready before checking authentication (with short timeout)
      await appStateManager.waitForReady(3000);
    } catch (error) {
      // Log but don't fail - continue with auth check
      console.warn('[(wallet)/+layout.ts] AppStateManager initialization warning:', error);
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

      console.error('[(wallet)/+layout.ts] Authentication invalid - redirecting to', redirectPath, validation);

      // Redirect to appropriate page
      await goto(redirectPath, { replaceState: true });
      return { authenticated: false };
    }

    console.log('[(wallet)/+layout.ts] Authentication valid - proceeding with route', validation);

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
