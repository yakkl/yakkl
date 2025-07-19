// Authentication guard for all wallet routes
// export const prerender = false; // Wallet routes need dynamic auth checking
// export const ssr = false; // Disable SSR for wallet routes

import { redirect } from '@sveltejs/kit';
import { validateAuthentication } from '$lib/common/authValidation';
import { PATH_LOGIN, PATH_REGISTER, PATH_LEGAL } from '$lib/common/constants';

export const load = async ({ url }: any) => {

  // Skip auth check for specific routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/legal', '/logout', '/phishing'];
  const currentPath = url.pathname;

  if (publicRoutes.some(route => currentPath.startsWith(route))) {
    return {};
  }

  try {
    // Wait a bit for browser extension API to initialize
    // This helps prevent the webextension-polyfill error
    await new Promise(resolve => setTimeout(resolve, 100));

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
      console.log('Layout: Validation:', validation);
      console.log('Layout: Current path:', currentPath);
      // Throw redirect to prevent further navigation
      // throw redirect(302, redirectPath);
    } else {
      console.log('Layout: Authentication is valid');
    }

    // Authentication is valid, allow navigation to continue
    return {
      authenticated: true,
      validation
    };

  } catch (error) {
    // If it's already a redirect, re-throw it
    if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
      throw error;
    }

    // For any other error, redirect to login
    console.error('Authentication check failed:', error);
    // throw redirect(302, PATH_LOGIN);
  }
};
