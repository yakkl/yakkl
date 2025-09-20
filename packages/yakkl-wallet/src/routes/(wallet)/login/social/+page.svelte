<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { log } from '$lib/common/logger-wrapper';
  import { authStore } from '$lib/stores/auth-store';
  import { browserJWT as jwtManager } from '@yakkl/security';
  import { setProfileStorage } from '$lib/common/stores';
  import type { Profile, ProfileData } from '$lib/common/interfaces';
  import browser from '$lib/common/browser-wrapper';

  let processing = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      // Get the OAuth provider and auth data from URL params
      const provider = $page.url.searchParams.get('provider');
      const code = $page.url.searchParams.get('code');
      const state = $page.url.searchParams.get('state');
      const userData = $page.url.searchParams.get('user');

      if (!provider) {
        throw new Error('No provider specified');
      }

      log.info(`[Social Login] Processing ${provider} authentication`, false, {
        hasCode: !!code,
        hasState: !!state,
        hasUserData: !!userData
      });

      // For social login returning users, we need to:
      // 1. Verify the OAuth response
      // 2. Match it to an existing profile
      // 3. Generate a new JWT
      // 4. Complete the login

      let profile: Profile | null = null;

      if (userData) {
        // Parse user data from OAuth response
        const socialUser = JSON.parse(decodeURIComponent(userData));

        // Try to load existing profile by social ID
        const profiles = await browser.storage.local.get('yakkl-profiles');
        if (profiles && profiles['yakkl-profiles']) {
          const allProfiles = profiles['yakkl-profiles'];

          // Find profile matching this social ID
          profile = Object.values(allProfiles).find((p: any) =>
            p.data?.provider === provider &&
            p.data?.socialId === socialUser.id
          ) as Profile | undefined || null;
        }

        if (!profile) {
          // This is a new social user trying to login - redirect to registration
          log.warn('[Social Login] No existing profile found for social user, redirecting to registration');
          await goto(`/register/social?provider=${provider}&user=${encodeURIComponent(userData)}`);
          return;
        }

        // Generate JWT for the returning user
        const planLevel = (profile.data as ProfileData).planLevel || 'explorer_member';
        const sessionId = crypto.randomUUID();
        const secureHash = crypto.randomUUID();
        const jwtToken = await jwtManager.generateToken(
          profile.id,
          profile.username,
          profile.id,
          planLevel,
          sessionId,
          60, // 60 minutes
          secureHash
        );

        // Store JWT in session storage
        sessionStorage.setItem('wallet-jwt-token', jwtToken);

        // Store profile in the standard location for getProfile() to find
        await setProfileStorage(profile);
        log.info('[Social Login] Profile stored in standard location');

        // Send login success message to background
        if (browser.runtime) {
          await browser.runtime.sendMessage({
            type: 'USER_LOGIN_SUCCESS',
            payload: {
              jwtToken,
              userId: profile.id,
              username: profile.username,
              profileId: profile.id,
              planLevel
            }
          });
        }

        // Mark as authenticated
        sessionStorage.setItem('wallet-authenticated', 'true');

        // Update auth store
        await authStore.login(profile.username, ''); // Empty password for social login

        // Navigate to home
        log.info('[Social Login] Login successful, navigating to home');
        await goto('/home');
      } else {
        throw new Error('No user data received from OAuth provider');
      }
    } catch (err) {
      log.error('[Social Login] Error processing social login:', false, err);
      error = err instanceof Error ? err.message : 'Social login failed';
      processing = false;

      // Redirect to login page after a delay
      setTimeout(() => {
        goto('/login');
      }, 3000);
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <div class="yakkl-card backdrop-blur-sm bg-white/90 dark:bg-zinc-800/90 p-8 text-center">
      {#if processing}
        <!-- Processing State -->
        <div class="mb-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
        <h2 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Completing Sign In
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400">
          Please wait while we verify your authentication...
        </p>
      {:else if error}
        <!-- Error State -->
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          Authentication Failed
        </h2>
        <p class="text-zinc-600 dark:text-zinc-400 mb-4">
          {error}
        </p>
        <p class="text-sm text-zinc-500">
          Redirecting to login page...
        </p>
      {/if}
    </div>
  </div>
</div>
