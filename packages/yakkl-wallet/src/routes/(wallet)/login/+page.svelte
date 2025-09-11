<script lang="ts">
  import LoginFlow from '@yakkl/security-ui/LoginFlow.svelte';
  import { yakklUserNameStore, getContextTypeStore, getMiscStore } from '$lib/common/stores';
  import { safeLogout } from '$lib/common/safeNavigate';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, ProfileData, YakklSettings } from '$lib/common/interfaces';
  import { getNormalizedSettings, PATH_LEGAL_TOS, simpleLockWallet, VERSION } from '$lib/common';
  import { setLocks } from '$lib/common/locks';
  import { verify } from '$lib/common/security';
  import { authStore } from '$lib/stores/auth-store';
  import { browserJWT as jwtManager } from '@yakkl/security';
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import browser from '$lib/common/browser-wrapper';

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let yakklSettings: YakklSettings | null = $state(null);
  let isInitializing = $state(false);
  let userPlanLevel = $state('explorer_member');

  // Handle social authentication callback
  async function handleSocialAuth(provider: 'google' | 'x', authResult: any) {
    try {
      log.info(`[Login] Social auth callback from ${provider}`, false, { hasUser: !!authResult.user });

      // Extract profile from social auth result
      const socialProfile = authResult.user;
      if (!socialProfile) {
        throw new Error(`No user profile received from ${provider}`);
      }

      // Create a profile compatible with our system
      const profile: Profile = {
        id: socialProfile.id || socialProfile.uid || crypto.randomUUID(),
        username: socialProfile.email || socialProfile.displayName || `${provider}_user`,
        preferences: {} as any,
        data: {
          provider,
          socialId: socialProfile.id,
          email: socialProfile.email,
          displayName: socialProfile.displayName,
          photoURL: socialProfile.photoURL
        } as ProfileData,
        version: VERSION,
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      };

      // Generate JWT token for social login
      const sessionId = crypto.randomUUID();
      const secureHash = crypto.randomUUID();
      const jwtToken = authResult.token || await jwtManager.generateToken(
        profile.id,
        profile.username,
        profile.id,
        userPlanLevel || 'explorer_member',
        sessionId,
        60, // 60 minutes expiration
        secureHash
      );

      // Use empty digest for social auth (no password)
      await onSuccess(profile, '', false, jwtToken);
    } catch (error) {
      log.error(`[Login] Social auth error for ${provider}:`, false, error);
      errorValue = `${provider} authentication failed. Please try again.`;
      showError = true;
    }
  }

  onMount(async () => {
    // Show login form IMMEDIATELY - no spinner, no delay
    isInitializing = false;

    await simpleLockWallet(); // Force lock wallet immediately - only sets badge and icon lock state plus settings

    // Load settings in background (non-blocking)
    getNormalizedSettings().then(async (settings) => {
      if (settings) {
        yakklSettings = settings;
        userPlanLevel = settings?.plan?.type || 'explorer_member';

        // Check legal agreement (but don't block login form)
        if (!settings.init || !settings.legal?.termsAgreed) {
          await goto(PATH_LEGAL_TOS);
        }
      }
    }).catch(error => {
      log.warn('[Login] Settings load failed (non-critical):', false, error);
    });
  });

  // Handle successful login - FAST PATH
  async function onSuccess(profile: Profile, _digest: string, _isMinimal: boolean, jwtToken?: string) {
    try {
      // Set the username in the global store
      $yakklUserNameStore = profile.username || '';

      // Store JWT token in session storage for background to pick up
      if (jwtToken) {
        sessionStorage.setItem('wallet-jwt-token', jwtToken);
        // Send USER_LOGIN_SUCCESS message to background with JWT
        if (browser.runtime) {
          browser.runtime.sendMessage({
            type: 'USER_LOGIN_SUCCESS',
            payload: {
              jwtToken,
              userId: profile.id || profile.username,
              username: profile.username,
              profileId: profile.id,
              planLevel: yakklSettings?.plan?.type || 'explorer_member'
            }
          }).then(() => {
            // log.info('[LOGIN] USER_LOGIN_SUCCESS message sent to background with JWT');
          }).catch(err => {
            // log.warn('[LOGIN] Failed to send USER_LOGIN_SUCCESS to background:', false, err);
          });
        }
      }

      // Mark as authenticated for instant navigation
      sessionStorage.setItem('wallet-authenticated', 'true');

      // Notify IdleManager that login is verified (fire-and-forget)
      if (browser.runtime) {
        browser.runtime.sendMessage({
          type: 'SET_IDLE_LOGIN_VERIFIED',
          payload: { verified: true }
        }).catch(err => {
          log.warn('[LOGIN] Failed to notify IdleManager of login verification:', false, err);
        });
      }

      // Minimal background work only
      setTimeout(async () => {
        try {
          // Just unlock - skip heavy operations
          await setLocks(false);
        } catch (e) {
          log.warn('[LOGIN onSuccess] Background unlock error:', false, e);
        }
      }, 10);

      // Navigate IMMEDIATELY - no waiting
      await goto('/home');
    } catch (error) {
      log.error('[LOGIN onSuccess] Error during login:', false, error);
      showError = true;
      errorValue = error instanceof Error ? error.message : 'Login failed';
    }
  }

  // Handle login errors
  function onError(error: any) {
    log.error('[LOGIN onError] Login error:', false, error);
    showError = true;
    errorValue = error instanceof Error ? error.message : String(error);
  }

  // Handle login cancel
  function onCancel() {
    // In extension popup context, close the window instead of navigating
    if (typeof window !== 'undefined' && window.close) {
      window.close();
    } else {
      // Fallback to logout for other contexts
      safeLogout();
    }
  }

  // Handle close
  function onClose() {
    showError = false;
    errorValue = '';
  }
</script>

<ErrorNoAction bind:show={showError} title="ERROR!" value={errorValue} {onClose} />

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="max-w-sm w-full">
    <div class="yakkl-card text-center p-6">
      <!-- Logo -->
      <div class="mb-6">
        <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-20 h-20 mx-auto" />
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mt-4">YAKKL Smart Wallet</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Version: {VERSION}</p>
      </div>

        <!-- Login flow with social options - shown immediately -->
        <LoginFlow
          {onSuccess}
          {onError}
          {onCancel}
          onSocialAuth={handleSocialAuth}
          deps={{
            verify,
            getContextTypeStore,
            getMiscStore,
            log,
            authStore,
            jwtManager,
            getNormalizedSettings
          }}
          config={{
            loginButtonText: "Unlock",
            cancelButtonText: "Exit/Logout",
            minimumAuth: false,
            useAuthStore: false,
            generateJWT: true,
            inputTextClass: "text-zinc-900 dark:text-white",
            inputBgClass: "bg-white dark:bg-zinc-800",
            // Social auth configuration
            googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            xClientId: import.meta.env.VITE_X_CLIENT_ID || import.meta.env.VITE_TWITTER_CLIENT_ID || ''
          }}
          showSocialOptions={true}
          planLevel={userPlanLevel}
        />
    </div>
  </div>
</div>
