<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getYakklSettings,
    setYakklSettingsStorage,
    setProfileStorage,
    setPreferencesStorage,
    yakklUserNameStore
  } from '$lib/common/stores';
  import {
    digestMessage
  } from '$lib/common';
  import { log } from '$lib/common/logger-wrapper';
  import type { Profile, Preferences, ProfileData, Name } from '$lib/common/interfaces';
  import { SystemTheme } from '$lib/common/types';
  import { encryptData } from '$lib/common/encryption';
  import { browserJWT as jwtManager } from '@yakkl/security';
  import { getNormalizedSettings } from '$lib/common';
  import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
  import { browser_ext } from '$lib/common/environment';

  // Props using runes syntax
  interface Props {
    onSuccess: (profile: Profile, digest: string, accountName: string, jwtToken?: string) => void;
    onError: (error: any) => void;
    onCancel: () => void;
    submitButtonText?: string;
    cancelButtonText?: string;
    showAccountName?: boolean;
    defaultAccountName?: string;
    generateJWT?: boolean;
  }

  let {
    onSuccess,
    onError,
    onCancel,
    submitButtonText = 'Create Wallet',
    cancelButtonText = 'Back',
    showAccountName = true,
    defaultAccountName = 'Primary Portfolio Account',
    generateJWT = true
  }: Props = $props();

  // State
  let username = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let pin = $state('');
  let email = $state('');
  let accountName = $state(defaultAccountName);
  let showPassword = $state(false);
  let showPin = $state(false);
  let passwordStrength = $state(0);
  let isSubmitting = $state(false);

  // Validation states
  let usernameError = $state('');
  let passwordError = $state('');
  let confirmPasswordError = $state('');
  let pinError = $state('');
  let emailError = $state('');

  // Reactive validation
  $effect(() => {
    validateUsername();
  });

  $effect(() => {
    validatePassword();
    checkPasswordStrength();
  });

  $effect(() => {
    validateConfirmPassword();
  });

  $effect(() => {
    validatePin();
  });

  $effect(() => {
    validateEmail();
  });

  function validateUsername() {
    if (!username) {
      usernameError = '';
      return;
    }
    if (username.length < 6) {
      usernameError = 'Username must be at least 6 characters';
    } else if (!/^[a-z0-9]+$/.test(username)) {
      usernameError = 'Username must be lowercase alphanumeric only';
    } else {
      usernameError = '';
    }
  }

  function validatePassword() {
    if (!password) {
      passwordError = '';
      return;
    }
    if (password.length < 8) {
      passwordError = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      passwordError = 'Password must contain uppercase, lowercase, number, and special character';
    } else {
      passwordError = '';
    }
  }

  function validateConfirmPassword() {
    if (!confirmPassword) {
      confirmPasswordError = '';
      return;
    }
    if (password !== confirmPassword) {
      confirmPasswordError = 'Passwords do not match';
    } else {
      confirmPasswordError = '';
    }
  }

  function validatePin() {
    if (!pin) {
      pinError = '';
      return;
    }
    if (!/^\d{8}$/.test(pin)) {
      pinError = 'PIN must be exactly 8 digits';
    } else {
      pinError = '';
    }
  }

  function validateEmail() {
    if (!email) {
      emailError = '';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailError = 'Please enter a valid email address';
    } else {
      emailError = '';
    }
  }

  function checkPasswordStrength() {
    if (!password) {
      passwordStrength = 0;
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;

    passwordStrength = Math.min(strength, 4);
  }

  function getPasswordStrengthColor() {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  }

  function getPasswordStrengthText() {
    switch (passwordStrength) {
      case 0:
        return '';
      case 1:
        return 'Weak';
      case 2:
        return 'Fair';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return '';
    }
  }

  async function handleSubmit() {
    // Validate all fields
    validateUsername();
    validatePassword();
    validateConfirmPassword();
    validatePin();
    validateEmail();

    // Check for errors
    if (usernameError || passwordError || confirmPasswordError || pinError || emailError) {
      return;
    }

    // Check required fields
    if (!username || !password || !confirmPassword || !pin || !email) {
      onError('Please fill in all required fields');
      return;
    }

    isSubmitting = true;

    try {
      // Create digest for encryption
      const fullUsername = `${username.toLowerCase()}.nfs.id`;
      const digest = await digestMessage(`${fullUsername}:${password}`);

      // Create Name object
      const name: Name = {
        id: crypto.randomUUID(),
        first: username, // Using username as first name for now
        last: ''
      };

      // Create ProfileData
      const profileData = {
        id: crypto.randomUUID(),
        name,
        email,
        digest,
        pincode: pin, // Note: This should be encrypted before storage
        registered: {
          key: '',
          plan: {
            type: 'explorer_member' as any, // Default plan type
            source: 'web' as any,
            promo: 'none' as any,
            trialEndDate: '',
            upgradeDate: ''
          },
          version: '2.0.0',
          createDate: new Date().toISOString(),
          updateDate: new Date().toISOString()
        },
        value: 0,
        accountIndex: 0,
        primaryAccounts: [],
        importedAccounts: [],
        watchList: []
      } as ProfileData;

      // Encrypt the profile data
      const encryptedData = await encryptData(profileData, digest);

      // Create profile
      const profile: Profile = {
        id: profileData.id!,
        username: fullUsername,
        preferences: {} as Preferences, // Will be set separately
        data: encryptedData,
        version: '2.0.0',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString()
      };

      // Create preferences
      const preferences: Preferences = {
        id: crypto.randomUUID(),
        idleDelayInterval: 60, // 1 minute in seconds
        dark: SystemTheme.LIGHT,
        screenWidth: window.innerWidth || 800,
        screenHeight: window.innerHeight || 600,
        idleAutoLock: true,
        idleAutoLockCycle: 180, // 3 minutes in seconds
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
          autoLockTimer: 900, // 15 minutes
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

      // Get current settings and update
      const settings = await getYakklSettings();
      if (settings) {
        settings.init = true;
        settings.legal.termsAgreed = true;
        settings.legal.privacyViewed = true;
        settings.isLocked = false;

        // Save all data
        await setProfileStorage(profile);
        await setPreferencesStorage(preferences);
        await setYakklSettingsStorage(settings);

        // Set username in store
        $yakklUserNameStore = fullUsername;

        // Generate JWT token if requested
        let jwtToken: string | undefined;
        if (generateJWT) {
          const normalizedSettings = await getNormalizedSettings();
          const planLevel = normalizedSettings?.plan?.type || 'explorer_member';
          
        const sessionId = crypto.randomUUID();
        const secureHash = crypto.randomUUID();
          jwtToken = await jwtManager.generateToken(
            profile.id,
            fullUsername,
            profile.id,
            planLevel,
            sessionId,
            60, // 60 minutes
            secureHash
          );
          
          log.info('[Register] JWT token generated successfully');
          
          // Send USER_LOGIN_SUCCESS message to background service
          // This prevents the JWT validation popup from appearing immediately
          if (browser_ext?.runtime) {
            try {
              await browser_ext.runtime.sendMessage({
                type: 'USER_LOGIN_SUCCESS',
                userId: profile.id,
                username: fullUsername,
                profileId: profile.id,
                jwtToken,
                timestamp: Date.now()
              });
              log.info('[Register] USER_LOGIN_SUCCESS message sent to background');
            } catch (error) {
              log.warn('[Register] Failed to send USER_LOGIN_SUCCESS to background:', false, error);
              // Continue even if message fails - registration is still successful
            }
          }
        }

        // Call success handler with profile, digest, account name, and optional JWT
        onSuccess(profile, digest, accountName, jwtToken);
      }
    } catch (error) {
      log.error('Registration error:', false, error);
      onError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }

  onMount(() => {
    // Focus on username field
    const usernameInput = document.getElementById('username');
    if (usernameInput) {
      usernameInput.focus();
    }
  });
</script>

<div class="w-full">
  <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
    <!-- Username -->
    <div>
      <label for="username" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Username <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          id="username"
          type="text"
          bind:value={username}
          placeholder="johndoe"
          class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          autocomplete="username"
          required
        />
        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">.nfs.id</span>
      </div>
      {#if usernameError}
        <p class="mt-1 text-xs text-red-500">{usernameError}</p>
      {/if}
    </div>

    <!-- Password -->
    <div>
      <label for="password" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Password <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <input
          id="password"
          type={showPassword ? 'text' : 'password'}
          bind:value={password}
          placeholder="Enter password"
          class="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          autocomplete="new-password"
          required
        />
        <button
          type="button"
          onclick={() => showPassword = !showPassword}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {#if showPassword}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          {/if}
        </button>
      </div>
      {#if passwordError}
        <p class="mt-1 text-xs text-red-500">{passwordError}</p>
      {/if}

      <!-- Password Strength Indicator -->
      {#if password}
        <div class="mt-2">
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                class={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style="width: {passwordStrength * 25}%"
              ></div>
            </div>
            <span class="text-xs text-zinc-600 dark:text-zinc-400">{getPasswordStrengthText()}</span>
          </div>
        </div>
      {/if}
    </div>

    <!-- Confirm Password -->
    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Confirm Password <span class="text-red-500">*</span>
      </label>
      <input
        id="confirmPassword"
        type="password"
        bind:value={confirmPassword}
        placeholder="Confirm password"
        class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        autocomplete="new-password"
        required
      />
      {#if confirmPasswordError}
        <p class="mt-1 text-xs text-red-500">{confirmPasswordError}</p>
      {/if}
    </div>

    <!-- PIN -->
    <div>
      <label for="pin" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        PIN Code <span class="text-red-500">*</span>
        <SimpleTooltip content="8-digit PIN for additional security">
          <svg class="inline w-4 h-4 ml-1 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </SimpleTooltip>
      </label>
      <div class="relative">
        <input
          id="pin"
          type={showPin ? 'text' : 'password'}
          bind:value={pin}
          placeholder="Enter 8-digit PIN"
          maxlength="8"
          pattern="\d{8}"
          class="w-full px-3 py-2 pr-10 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          autocomplete="off"
          required
        />
        <button
          type="button"
          onclick={() => showPin = !showPin}
          class="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {#if showPin}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          {/if}
        </button>
      </div>
      {#if pinError}
        <p class="mt-1 text-xs text-red-500">{pinError}</p>
      {/if}
    </div>

    <!-- Email -->
    <div>
      <label for="email" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        Email <span class="text-red-500">*</span>
      </label>
      <input
        id="email"
        type="email"
        bind:value={email}
        placeholder="john@example.com"
        class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        autocomplete="email"
        required
      />
      {#if emailError}
        <p class="mt-1 text-xs text-red-500">{emailError}</p>
      {/if}
    </div>

    <!-- Account Name (Optional) -->
    {#if showAccountName}
      <div>
        <label for="accountName" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Account Name <span class="text-zinc-500">(Optional)</span>
        </label>
        <input
          id="accountName"
          type="text"
          bind:value={accountName}
          placeholder="Primary Portfolio Account"
          class="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    {/if}

    <!-- Security Notice -->
    <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="text-sm text-amber-800 dark:text-amber-200">
          <p class="font-semibold mb-1">Important Security Information</p>
          <ul class="space-y-1">
            <li>• Keep your password and PIN secure</li>
            <li>• Never share your credentials with anyone</li>
            <li>• You'll receive an Emergency Kit after setup</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-4">
      <button
        type="button"
        onclick={onCancel}
        class="yakkl-btn-secondary flex-1"
        disabled={isSubmitting}
      >
        {cancelButtonText}
      </button>
      <button
        type="submit"
        class="yakkl-btn-primary flex-1"
        disabled={isSubmitting || !!usernameError || !!passwordError || !!confirmPasswordError || !!pinError || !!emailError}
      >
        {#if isSubmitting}
          <span class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating...
          </span>
        {:else}
          {submitButtonText}
        {/if}
      </button>
    </div>
  </form>
</div>