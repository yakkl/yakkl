<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { validateAuthentication } from '$lib/common/authValidation';
  import { simpleLockWallet } from '$lib/common/lockWallet';
  import { browser_ext } from '$lib/common/environment';
  import { log } from '$lib/common/logger-wrapper';

  onMount(async () => {
    // SECURITY: For popup contexts, always lock first to ensure login
    // Detect popup by checking if opened via browser action (not sidepanel or tab)
    const urlParams = new URLSearchParams(window.location.search);
    const isPopup = urlParams.get('popup') === 'true' ||
                   (window.location.hash === '' &&
                    window.opener === null &&
                    !window.location.pathname.includes('sidepanel') &&
                    !window.location.pathname.includes('tab'));

    // Also check if we're in extension popup context via browser API
    let inExtensionPopup = false;
    try {
      // Extension popups have specific window type
      const views = await browser_ext.extension.getViews({ type: 'popup' });
      inExtensionPopup = views.length > 0 && views.includes(window);
    } catch (e) {
      // Fallback to URL-based detection
    }

    if (isPopup || inExtensionPopup) {
      log.info('[Root Route] Popup context detected, enforcing login');

      // For popups, ALWAYS lock and require fresh login
      // This ensures security when opening from extension icon
      await simpleLockWallet();
      await goto('/login', { replaceState: true });
      return;
    }

    // Normal validation for sidepanel/tab contexts
    const validation = await validateAuthentication();
    if (validation.isValid) {
      await goto('/home', { replaceState: true });
    } else {
      await goto('/login', { replaceState: true });
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
