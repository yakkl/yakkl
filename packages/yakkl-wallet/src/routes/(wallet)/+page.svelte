<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auditAuthEvent } from '$lib/common/authValidation';
	import { log } from '$lib/common/logger-wrapper';

  onMount(async () => {
    // Authentication is already validated by +layout.ts
    // Just redirect to home page
    await auditAuthEvent('navigation', { from: '/', to: '/home' });
    log.info('User authenticated, redirecting to home...');
    // await goto('/home', { replaceState: true });
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
