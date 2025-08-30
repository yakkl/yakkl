// Authentication guard for all wallet routes
// This file only handles route-level authentication and redirection

import { goto } from '$app/navigation';
import { validateAuthentication } from '$lib/common/authValidation';
import { PATH_LOGIN, PATH_REGISTER, PATH_LEGAL_TOS } from '$lib/common/constants';
import { appStateManager } from '$lib/managers/AppStateManager';

export const load = async ({ url }: any) => {
  if (typeof window === 'undefined') return {};

  // Skip auth check for public routes
  const publicRoutes = ['/', '/login', '/register', '/legal', '/legal/tos', '/legal/privacy', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
    console.log('[(wallet)/+layout.ts] Public route, skipping authentication check');
    return {};
  }

  try {
    // Wait for app to be ready before checking authentication
    await appStateManager.waitForReady();

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

      console.log('[(wallet)/+layout.ts] Redirecting to', redirectPath);

      // Redirect to appropriate page
      await goto(redirectPath, { replaceState: true });
      return { authenticated: false };
    }

    // Authentication valid - proceed with route
    console.log('[(wallet)/+layout.ts] Authentication valid, proceeding with route');
    return { authenticated: true };

  } catch (error) {
    // Handle redirect errors
    console.error('[(wallet)/+layout.ts] Authentication check failed:', error);
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }

    // For any other error, redirect to login
    console.error('[(wallet)/+layout.ts] Authentication check failed, redirecting to', PATH_LOGIN);
    await goto(PATH_LOGIN, { replaceState: true });
    return { authenticated: false };
  }
};
