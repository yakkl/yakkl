<script lang="ts">
  import { goto } from '$app/navigation';
  import { PATH_ACCOUNTS_CREATE } from '$lib/common/constants';
  import { log } from '$lib/common/logger-wrapper'; // Now using @yakkl/core under the hood
  import ErrorNoAction from '$lib/components/ErrorNoAction.svelte'; // Wrapper around @yakkl/ui ErrorDialog
  import Register from '@yakkl/security-ui/Register.svelte';
  import RegisterProgressive from '@yakkl/security-ui/RegisterProgressive.svelte';
  import type { Profile } from '@yakkl/security'; // Use from security package
  import {
    getYakklSettings,
    setYakklSettingsStorage,
    setProfileStorage,
    setPreferencesStorage,
    yakklUserNameStore
  } from '$lib/common/stores'; // Wallet-specific stores remain internal
  import { SystemTheme } from '@yakkl/core'; // Use from core package
  import { browser_ext } from '$lib/common/environment'; // Wallet-specific, remains internal
  import type { Preferences } from '$lib/common/interfaces'; // TODO: Move to @yakkl/core
  import { digestMessage, encryptData } from '@yakkl/security';
  import { browserJWT as jwtManager } from '@yakkl/security'; // Remains internal as discussed

  // State
  let showError = $state(false);
  let errorValue = $state('');
  let useProgressiveFlow = $state(true); // Feature flag for progressive flow - now enabled!

  // Handle successful registration
  async function handleSuccess(profile: Profile, digest: string, accountName: string, jwtToken?: string) {
    try {
      // Generate JWT token if not provided (for registration flow)
      if (!jwtToken) {
        try {
          log.info('[Register] Generating JWT token for new registration');
        const sessionId = crypto.randomUUID();
        const secureHash = crypto.randomUUID();
          jwtToken = await jwtManager.generateToken(
            profile.id || profile.username,
            profile.username,
            profile.id,
            'explorer_member', // Default plan level for new registrations
            60 // Expiration in minutes (1 hour)
          );
          log.info('[Register] JWT token generated successfully');
        } catch (jwtError) {
          log.error('[Register] Failed to generate JWT token:', false, jwtError);
          // Continue without JWT - not critical for registration
        }
      }

      // Create preferences if not provided
      if (!profile.preferences || Object.keys(profile.preferences).length === 0) {
        const preferences: Preferences = {
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
        profile.preferences = preferences;
        await setPreferencesStorage(preferences);
      }

      // Save profile (ensure preferences is set for type compatibility)
      const profileWithPreferences = {
        ...profile,
        preferences: profile.preferences || {}
      };
      await setProfileStorage(profileWithPreferences as any);

      // Update settings
      const settings = await getYakklSettings();
      if (settings) {
        settings.init = true;
        settings.legal.termsAgreed = true;
        settings.legal.privacyViewed = true;
        settings.isLocked = false;
        await setYakklSettingsStorage(settings);
      }

      // Set username in store
      $yakklUserNameStore = profile.username;

      // Send login success message with JWT to background
      if (jwtToken && browser_ext?.runtime) {
        try {
          // Plan level is passed from the registration component
          // Default to explorer_member if not provided
          const planLevel = 'explorer_member';
          
          await browser_ext.runtime.sendMessage({
            type: 'USER_LOGIN_SUCCESS',
            userId: profile.id,
            username: profile.username,
            profileId: profile.id,
            jwtToken,
            planLevel,
            timestamp: Date.now()
          });
          log.info('[Register] USER_LOGIN_SUCCESS message sent to background with JWT');
        } catch (error) {
          log.warn('[Register] Failed to send USER_LOGIN_SUCCESS to background:', false, error);
        }
      } else if (!jwtToken) {
        log.warn('[Register] No JWT token provided to send to background');
      }

      // Store temporary data for account creation
      sessionStorage.setItem('registration', JSON.stringify({
        username: profile.username,
        accountName,
        digest,
        jwtToken
      }));

      // Navigate to account creation
      await goto(PATH_ACCOUNTS_CREATE);
    } catch (error) {
      log.error('[Register Page] Error during navigation:', false, error);
      errorValue = 'Failed to proceed with account creation. Please try again.';
      showError = true;
    }
  }

  // Handle registration errors
  function handleError(error: any) {
    log.error('[Register Page] Registration error:', false, error);
    errorValue = typeof error === 'string' ? error : 'Registration failed. Please try again.';
    showError = true;
  }

  // Handle cancel/back
  function handleCancel() {
    history.back();
  }

  // Handle error dialog close
  function onClose() {
    showError = false;
    errorValue = '';
  }

</script>

<ErrorNoAction bind:show={showError} title="Registration Error" value={errorValue} {onClose} />

{#if useProgressiveFlow}
  <!-- Progressive Registration Flow -->
  <RegisterProgressive
    onSuccess={handleSuccess}
    onError={handleError}
    onCancel={handleCancel}
    {digestMessage}
    {encryptData}
    {jwtManager}
  />
{:else}
  <!-- Original Registration Flow -->
  <div class="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <div class="yakkl-card backdrop-blur-sm bg-white/90 dark:bg-zinc-800/90 p-8">
        <!-- Header -->
        <div class="text-center mb-6">
          <img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-16 h-16 mx-auto mb-4" />
          <h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
            Create Your Wallet
          </h1>
          <p class="text-zinc-600 dark:text-zinc-400">
            Set up your secure YAKKL wallet account
          </p>
        </div>

        <!-- Registration Form Component -->
        <Register
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={handleCancel}
          submitButtonText="Create Wallet"
          cancelButtonText="Back"
          showAccountName={true}
          generateJWT={true}
        />
      </div>
    </div>
  </div>
{/if}
