<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { uiStore } from '$lib/stores/ui.store';
  import { validateAuthentication, auditAuthEvent } from '$lib/common/authValidation';
  import { PATH_REGISTER, PATH_LEGAL, PATH_LOGIN } from '$lib/common/constants';

  onMount(async () => {
    // Show loading state
    uiStore.setGlobalLoading(true, 'Checking authentication...');

    try {
      // Perform comprehensive authentication validation
      const validation = await validateAuthentication();

      console.log('/(wallet)/+page.svelte: auth validation result:', {
        isValid: validation.isValid,
        reason: validation.reason,
        hasValidSession: validation.hasValidSession,
        hasValidJWT: validation.hasValidJWT
      });

      // Handle validation failures with specific redirects
      if (!validation.isValid) {
        switch (validation.reason) {
          case 'Wallet not initialized':
            await auditAuthEvent('validation_failed', { reason: 'not_initialized' });
            console.log('Redirecting to register...');
            return await goto(PATH_REGISTER);

          case 'Legal terms not accepted':
            await auditAuthEvent('validation_failed', { reason: 'legal_terms' });
            console.log('Redirecting to legal terms...');
            return await goto(PATH_LEGAL);

          case 'Wallet is locked':
          case 'No valid security digest found':
          case 'Profile not found':
          case 'Failed to decrypt profile - invalid digest':
          case 'Profile decryption failed':
          case 'Session expired due to inactivity':
            await auditAuthEvent('validation_failed', { reason: validation.reason });
            console.log('Redirecting to login...', validation.reason);
            return await goto(PATH_LOGIN);

          default:
            await auditAuthEvent('validation_failed', { reason: validation.reason || 'unknown' });
            console.error('Authentication validation failed:', validation.reason);
            return await goto(PATH_LOGIN);
        }
      }

      // Authentication is valid - redirect to home page
      await auditAuthEvent('navigation', { from: '/', to: '/home' });
      console.log('User authenticated, redirecting to home...');

      // Check if we're in an extension popup context
      // We can detect this by checking if we're running in an extension URL
      let isPopupContext = false;
      if (typeof window !== 'undefined' && window.location.href.includes('chrome-extension://')) {
        isPopupContext = true;
      }

      await goto('/home', { replaceState: true });

    } catch (error) {
      console.error('Authentication check failed:', error);
      uiStore.showError(
        'Authentication Error',
        'Unable to verify authentication status. Please try again.'
      );
      // Default to login on error
      await goto(PATH_LOGIN);
    } finally {
      uiStore.setGlobalLoading(false);
    }
  });
</script>

<!-- This page serves only as an authentication router -->
<!-- All wallet UI has been moved to /home/+page.svelte -->
<div class="min-h-screen flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
    <p class="mt-4 text-gray-600 dark:text-gray-400">Verifying authentication...</p>
  </div>
</div>
