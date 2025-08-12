// Authentication guard for all wallet routes
// This file only handles route-level authentication and redirection

import { goto } from '$app/navigation';
import { validateAuthentication } from '$lib/common/authValidation';
import { PATH_LOGIN, PATH_REGISTER, PATH_LEGAL } from '$lib/common/constants';
import { appStateManager } from '$lib/managers/AppStateManager';

export const load = async ({ url }: any) => {
  if (typeof window === 'undefined') return {};

  // Skip auth check for public routes
  const publicRoutes = ['/', '/login', '/register', '/legal', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
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
          redirectPath = PATH_LEGAL;
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
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }
    
    // For any other error, redirect to login
    console.error('Authentication check failed:', error);
    await goto(PATH_LOGIN, { replaceState: true });
    return { authenticated: false };
  }
};
