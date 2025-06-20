<!-- SessionProvider.svelte -->
<script lang="ts">
  import { authStore, showSessionWarning, sessionTimeRemaining } from '$lib/stores/auth-store';
  import SessionWarning from './SessionWarning.svelte';
  import { log } from '$lib/common/logger-wrapper';

  interface Props {
    children: any;
  }

  let { children }: Props = $props();

  // Handle session extension
  async function handleExtendSession() {
    try {
      await authStore.extendSession(30); // Extend by 30 minutes
      log.debug('Session extended via session provider', false);
    } catch (error) {
      log.error('Failed to extend session:', false, error);
    }
  }

  // Handle logout
  async function handleLogoutNow() {
    try {
      await authStore.logout();
      log.debug('User logged out via session provider', false);
    } catch (error) {
      log.error('Failed to logout:', false, error);
    }
  }
</script>

<!-- Render children -->
{@render children()}

<!-- Global session warning modal -->
<SessionWarning 
  bind:show={$showSessionWarning}
  timeRemaining={$sessionTimeRemaining}
  onExtendSession={handleExtendSession}
  onLogoutNow={handleLogoutNow}
  autoLogoutEnabled={true}
/>