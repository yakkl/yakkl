// Authentication guard for all wallet routes

import { goto } from '$app/navigation';
import { validateAuthentication } from '$lib/common/authValidation';
import { PATH_LOGIN, PATH_REGISTER, PATH_LEGAL, PATH_HOME } from '$lib/common/constants';
import { log } from '$lib/common/logger-wrapper';
import { appStateManager } from '$lib/managers/AppStateManager';

export const load = async ({ url }: any) => {

  if (typeof window === 'undefined') return {};

  // Skip auth check for specific routes that don't require authentication
  const publicRoutes = ['/','/login', '/register', '/legal', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
    return {};
  }

  try {
    // Wait for app to be ready instead of arbitrary timeout
    await appStateManager.waitForReady();

    // Perform authentication validation
    const validation = await validateAuthentication();
    if (!validation.isValid) {
      // Determine where to redirect based on validation reason
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

      console.log('Layout: Redirecting to:', redirectPath);
      console.log('Layout: Validation:>>>>>>>>>>>>>>>>>>>', validation);
      console.log('Layout: Current path:', currentPath);

      await goto(redirectPath, { replaceState: true });

      // Return early to prevent further processing
      return {
        authenticated: false,
        redirectPath,
        validation
      };
    } else {
      console.log('Layout: Authentication is valid');
    }

    // Authentication is valid, allow navigation to continue
    return {
      authenticated: true,
      redirectPath: PATH_HOME,
      validation
    };

  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }

    // For any other error, redirect to login
    console.error('Authentication check failed:', error);
  }
};
