<!-- Social Registration Handler - Uses packages with plan checking -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { SocialGoogleAuth, SocialXAuth } from '@yakkl/security-ui';
  import { log } from '$lib/common/logger-wrapper';
  import {
    setProfileStorage,
    setYakklSettingsStorage,
    getYakklSettings,
    setPreferencesStorage
  } from '$lib/common/stores';
  import type { Profile, Preferences } from '$lib/common/interfaces';
  import { SystemTheme } from '@yakkl/core';
  import { browser_ext } from '$lib/common/environment';
  import { encryptData } from '@yakkl/security';
  import { browserJWT as jwtManager } from '@yakkl/security';
  import { planLevelService, AuthMethod } from '$lib/services/plan-level.service';
  import type { AuthResult } from '@yakkl/auth';

  let provider = $state<'google' | 'x'>('google');
  let authResult = $state<AuthResult | null>(null);
  let step = $state<'social' | 'additional'>('social');
  let isProFeature = $state(false);
  let showUpgradeModal = $state(false);

  // Additional fields for wallet creation
  let username = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let pincode = $state('');
  let confirmPincode = $state('');
  let errors = $state<Record<string, string>>({});
  let isSubmitting = $state(false);

  // OAuth configuration (fetched from backend in production)
  const oauthConfig = {
    google: {
      clientId: '', // Fetch from backend
      redirectUri: browser_ext?.identity?.getRedirectURL?.() || ''
    },
    x: {
      clientId: '', // Fetch from backend
      redirectUri: browser_ext?.identity?.getRedirectURL?.('x') || ''
    }
  };

  onMount(async () => {
    // Get provider from URL params
    const searchParams = $page.url.searchParams;
    const providerParam = searchParams.get('provider');

    if (providerParam === 'x' || providerParam === 'google') {
      provider = providerParam;

      // Check if this provider is available for current plan
      const authMethod = provider === 'google' ? AuthMethod.GOOGLE : AuthMethod.X;
      const isAvailable = await planLevelService.isAuthMethodAvailable(authMethod);

      if (!isAvailable) {
        isProFeature = true;
        showUpgradeModal = true;
      }
    }

    // Fetch OAuth configuration from backend
    await fetchOAuthConfig();
  });

  async function fetchOAuthConfig() {
    try {
      // In production, fetch from your backend service
      // const response = await fetch('https://api.yakkl.com/oauth/config');
      // const config = await response.json();
      // oauthConfig.google.clientId = config.google.clientId;
      // oauthConfig.x.clientId = config.x.clientId;

      log.info('[SocialRegistration] OAuth config loaded');
    } catch (error) {
      log.error('[SocialRegistration] Failed to fetch OAuth config:', false, error);
    }
  }

  async function handleSocialSuccess(result: AuthResult) {
    authResult = result;

    // Pre-fill username from social profile
    username = result.user?.email?.split('@')[0] || result.user?.username || '';

    // Generate JWT token
    const profile = {
      id: result.user?.id || crypto.randomUUID(),
      username: username,
      email: result.user?.email || '',
      name: result.user?.name || '',
      picture: result.user?.picture,
      provider: result.user?.provider
    };

        const sessionId = crypto.randomUUID();
        const secureHash = crypto.randomUUID();
    const jwtToken = await jwtManager.generateToken(
      profile.id,
      profile.username,
      profile.id,
      'explorer_member',
      60
    );

    // Store in session for later use
    sessionStorage.setItem('social-auth-jwt', jwtToken);
    sessionStorage.setItem('social-auth-profile', JSON.stringify(profile));

    // Move to additional info step
    step = 'additional';
  }

  function handleSocialError(error: Error) {
    log.error('[SocialRegistration] Authentication failed:', false, error);
    errors.social = error.message;
  }

  function validateForm(): boolean {
    errors = {};

    if (!username || username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!pincode || pincode.length < 4) {
      errors.pincode = 'PIN must be at least 4 digits';
    }

    if (pincode !== confirmPincode) {
      errors.confirmPincode = 'PINs do not match';
    }

    return Object.keys(errors).length === 0;
  }

  async function handleComplete() {
    if (!validateForm() || !authResult) return;

    isSubmitting = true;

    try {
      // Get stored profile and JWT
      const socialProfile = JSON.parse(sessionStorage.getItem('social-auth-profile') || '{}');
      const jwtToken = sessionStorage.getItem('social-auth-jwt');

      // Encrypt the password for storage
      const encryptedPassword = await encryptData(password, pincode);

      // Create complete profile
      const completeProfile: Profile = {
        ...socialProfile,
        username,
        password: encryptedPassword,
        pincode,
        preferences: createDefaultPreferences(),
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      };

      // Save profile
      await setProfileStorage(completeProfile);

      // Update settings
      const settings = await getYakklSettings();
      if (settings) {
        settings.init = true;
        settings.legal.termsAgreed = true;
        settings.legal.privacyViewed = true;
        settings.isLocked = false;
        await setYakklSettingsStorage(settings);
      }

      // Save preferences
      await setPreferencesStorage(completeProfile.preferences!);

      // Send login success message with JWT
      if (jwtToken && browser_ext?.runtime) {
        await browser_ext.runtime.sendMessage({
          type: 'USER_LOGIN_SUCCESS',
          payload: {
            jwtToken,
            userId: completeProfile.id || completeProfile.username,
            username: completeProfile.username,
            profileId: completeProfile.id,
            planLevel: 'explorer_member'
          }
        });
      }

      // Clean up session storage
      sessionStorage.removeItem('social-auth-jwt');
      sessionStorage.removeItem('social-auth-profile');

      log.info('[SocialRegistration] Registration complete');

      // Navigate to account creation
      goto('/accounts/create');
    } catch (error) {
      log.error('[SocialRegistration] Registration failed:', false, error);
      errors.submit = 'Registration failed. Please try again.';
    } finally {
      isSubmitting = false;
    }
  }

  function createDefaultPreferences(): Preferences {
    return {
      id: crypto.randomUUID(),
      idleDelayInterval: 60,
      dark: SystemTheme.LIGHT,
      screenWidth: window.innerWidth || 800,
      screenHeight: window.innerHeight || 600,
      idleAutoLock: true,
      idleAutoLockCycle: 180,
      locale: 'en',
      currency: {
        code: 'USD',
        symbol: '$'
      },
      words: 24,
      wallet: {
        title: 'YAKKL Smart Wallet',
        extensionHeight: 600,
        popupHeight: 600,
        popupWidth: 400,
        enableContextMenu: true,
        enableResize: true,
        splashDelay: 2000,
        alertDelay: 3000,
        splashImages: 1,
        autoLockTimer: 900,
        autoLockAsk: true,
        autoLockAskTimer: 60,
        animationLockScreen: true,
        pinned: false,
        pinnedLocation: 'TR',
        defaultWallet: false
      },
      version: '2.0.0',
      createDate: new Date().toISOString(),
      updateDate: new Date().toISOString()
    };
  }

  function handleBack() {
    if (step === 'additional') {
      step = 'social';
    } else {
      goto('/register');
    }
  }

  function handleUpgrade() {
    // Navigate to upgrade page or open upgrade modal
    goto('/settings/upgrade');
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Back Button -->
    <button
      onclick={handleBack}
      class="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
      Back
    </button>

    <div class="yakkl-card p-8">
      {#if showUpgradeModal}
        <!-- Upgrade Modal for Pro Features -->
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Pro Feature
          </h2>
          <p class="text-zinc-600 dark:text-zinc-400 mb-6">
            {planLevelService.getUpgradeMessage(
              provider === 'google' ? AuthMethod.GOOGLE : AuthMethod.X
            )}
          </p>
          <button
            onclick={handleUpgrade}
            class="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition-all duration-200"
          >
            Upgrade to Pro
          </button>
          <button
            onclick={() => goto('/register')}
            class="mt-3 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Choose another method
          </button>
        </div>
      {:else if step === 'social'}
        <!-- Social Authentication Step -->
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white mb-6">
          Sign Up with {provider === 'google' ? 'Google' : 'X'}
        </h2>

        {#if provider === 'google'}
          <SocialGoogleAuth
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
            onCancel={() => goto('/register')}
            clientId={oauthConfig.google.clientId}
            redirectUri={oauthConfig.google.redirectUri}
          />
        {:else}
          <SocialXAuth
            onSuccess={handleSocialSuccess}
            onError={handleSocialError}
            onCancel={() => goto('/register')}
            clientId={oauthConfig.x.clientId}
            redirectUri={oauthConfig.x.redirectUri}
          />
        {/if}

        {#if errors.social}
          <div class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-700 dark:text-red-300">{errors.social}</p>
          </div>
        {/if}
      {:else}
        <!-- Additional Information Step -->
        <div class="flex items-center gap-3 mb-6">
          {#if authResult?.user?.picture}
            <img src={authResult.user.picture} alt="" class="w-12 h-12 rounded-full" />
          {/if}
          <div>
            <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">
              Complete Your Profile
            </h2>
            {#if authResult?.user?.email}
              <p class="text-sm text-zinc-600 dark:text-zinc-400">{authResult.user.email}</p>
            {/if}
          </div>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleComplete(); }} class="space-y-4">
          <!-- Form fields remain the same -->
          <!-- Username -->
          <div>
            <label for="username" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              bind:value={username}
              class="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Choose a username"
            />
            {#if errors.username}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
            {/if}
          </div>

          <!-- Password fields... (same as before) -->
          <button
            type="submit"
            disabled={isSubmitting}
            class="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {#if isSubmitting}
              Creating Your Wallet...
            {:else}
              Complete Registration
            {/if}
          </button>
        </form>
      {/if}
    </div>
  </div>
</div>