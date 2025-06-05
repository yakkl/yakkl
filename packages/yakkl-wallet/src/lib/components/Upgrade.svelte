<!-- Upgrade.svelte -->
<script lang="ts">
  import { createForm } from 'svelte-forms-lib';
  import * as yup from 'yup';
  import Modal from './Modal.svelte';
  import { getProfile, setProfileStorage, getSettings, setSettingsStorage, yakklMiscStore } from '$lib/common/stores';
  import { encryptData, decryptData } from '$lib/common/encryption';
  import { RegistrationType } from '$lib/common/types';
  import { log } from '$lib/plugins/Logger';
  import { dateString } from '$lib/common/datetime';
  import { isEncryptedData } from '$lib/common/misc';
  import type { ProfileData } from '$lib/common/interfaces';
  import ErrorNoAction from './ErrorNoAction.svelte';
  import { onMount } from 'svelte';
	import Confirmation from './Confirmation.svelte';
	import { safeLogout } from '$lib/common/safeNavigate';
	import Notification from './Notification.svelte';

  interface Props {
    show?: boolean;
    onComplete?: () => void;
    onClose?: () => void;
    onCancel?: () => void;
  }

  let { show = $bindable(false), onComplete = $bindable(() => {}), onClose = $bindable(() => {safeLogout()}), onCancel = $bindable(() => {show = false, showConfirmation = false, showNotification = false, showError = false}) }: Props = $props();

  // Local state
  let showError = $state(false);
  let errorMessage = $state('');
  let pweyeOpen = $state(false);
  let isUpgrading = $state(false);
  let isProUser = $state(false);
  let showConfirmation = $state(false);
  let showNotification = $state(false);
  let formValues = {
    userName: '',
    password: '',
    email: '',
  };

  // Check pro status when modal is shown
  $effect(() => {
    if (show) {
      checkProStatus();
    }
  });

  async function checkProStatus() {
    try {
      const settings = await getSettings();
      if (settings) {
        isProUser = settings.registeredType === RegistrationType.PRO;
        if (isProUser) {
          showError = true;
        }
      }
    } catch (error) {
      log.error('Error checking registration type:', false, error);
    }
  }

  const { form, errors, handleChange, handleSubmit } = createForm({
    initialValues: formValues,
    validationSchema: yup.object().shape({
      userName: yup.string().required('Username is required'),
      password: yup.string().required('Password is required'),
      email: yup.string().email('Must be a valid email.').required('Email is required.'),
    }),
    onSubmit: async (values) => {
      formValues = values;
      showConfirmation = true;
    },
  });

  async function processUpgrade() {
    isUpgrading = true;
    try {
      // Get current profile and settings
      const profile = await getProfile();
      const settings = await getSettings();

      if (!profile || !settings) {
        throw new Error('Profile or settings not found');
      }

      // Prepare analytics data
      const analyticsData = {
        utm_source: 'wallet',
        utm_campaign: 'pro_upgrade',
        user_location: navigator.language,
        upgrade_date: dateString(),
        current_version: settings.version,
        platform: navigator?.platform ?? 'unknown',
        user_agent: navigator?.userAgent ?? 'unknown',
      };

      // TODO: Implement Stripe payment integration
      // TODO: Implement API call to backend
      // const response = await fetch('https://api.yakkl.com/wallet/upgrade', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      // });

      // For now, we'll just update the registration type
      if (isEncryptedData(profile.data)) {
        const decryptedData = await decryptData(profile.data, $yakklMiscStore) as ProfileData;
        decryptedData.registered = {
          ...decryptedData.registered,
          type: RegistrationType.PRO,
          key: 'PRO-' + dateString(), // This would be replaced with actual Stripe customer ID
          updateDate: dateString(),
        };
        profile.data = await encryptData(decryptedData, $yakklMiscStore);
      }

      // Update settings
      settings.registeredType = RegistrationType.PRO;
      settings.upgradeDate = dateString();
      settings.updateDate = dateString();

      // Save changes
      await setProfileStorage(profile);
      await setSettingsStorage(settings);

      show = false;
      showNotification = true;
    } catch (error) {
      log.error('Error in upgrade process:', false, error);
      errorMessage = error instanceof Error ? error.message : 'An error occurred during upgrade';
      showError = true;
    } finally {
      isUpgrading = false;
    }
  }

  function onConfirm() {
    processUpgrade();
  }

  function togglePasswordVisibility() {
    if (!document) return;

    const pwField = document.getElementById("password") as HTMLInputElement;
    const pwEyeOpen = document.getElementById("pweye-open");
    const pwEyeClosed = document.getElementById("pweye-closed");

    if (!pwField || !pwEyeOpen || !pwEyeClosed) return;

    if (pwField.type === "password") {
      pwField.type = "text";
      pwEyeOpen.removeAttribute('hidden');
      pwEyeClosed.setAttribute('hidden', 'hidden');
      pweyeOpen = true;
    } else {
      pwField.type = "password";
      pwEyeOpen.setAttribute('hidden', 'hidden');
      pwEyeClosed.removeAttribute('hidden');
      pweyeOpen = false;
    }
  }

  // Initialize eye icons on component mount
  $effect(() => {
    if (!document) return;
    const pwEyeOpen = document.getElementById("pweye-open");
    const pwEyeClosed = document.getElementById("pweye-closed");

    if (pwEyeOpen && pwEyeClosed) {
      pwEyeOpen.setAttribute('tabindex', '-1');
      pwEyeClosed.setAttribute('tabindex', '-1');
      pwEyeOpen.setAttribute('hidden', 'hidden');
    }
  });
</script>

<ErrorNoAction bind:show={showError} value="You are already using the PRO plan" title="Congratulations!" onClose={onCancel} />
<Confirmation bind:show={showConfirmation} title="Upgrading to Pro!" message="Are you sure you want to upgrade to Pro?" onConfirm={onConfirm} />
<Notification bind:show={showNotification} title="Upgraded to Pro!" message="You are now using the PRO plan. You can now access all the features of the PRO plan." onClose={onClose} />

<Modal bind:show title="Upgrade to Pro">
  <div class="space-y-6 p-6">
    <div class="text-center">
      <h3 class="text-lg font-medium text-gray-900">YAKKL Smart Wallet Pro</h3>
      <p class="mt-2 text-sm text-gray-500">
        Unlock advanced features and enhanced security for your crypto assets
      </p>
    </div>

    <div class="bg-gray-50 p-4 rounded-lg">
      <h4 class="font-medium text-gray-900">Pro Features</h4>
      <ul class="mt-2 space-y-2 text-sm text-gray-600">
        <li class="flex items-center">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Reduced swap fees for DeFi platforms
        </li>
        <li class="flex items-center">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Advanced market analytics and charting
        </li>
        <li class="flex items-center">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Emergency Kit for wallet recovery
        </li>
        <li class="flex items-center">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Unlimited EOA accounts
        </li>
        <li class="flex items-center">
          <svg class="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Biometric authentication
        </li>
      </ul>
    </div>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="mt-5 flex flex-row justify-center">
        <div class="form-control w-full">
          <div class="join">
            <input
              id="userName"
              type="text"
              class="input input-bordered input-primary w-full join-item"
              placeholder="Username"
              autocomplete="off"
              bind:value={$form.userName}
              required
            />
            <span class="label-text bg-slate-900 join-item w-[60px]">
              <div class="mt-[.9rem]">.nfs.id</div>
            </span>
          </div>
          {#if $errors.userName}
            <p class="mt-2 text-sm text-red-600">{$errors.userName}</p>
          {/if}
        </div>
      </div>

      <div class="mt-5 flex flex-row justify-center">
        <div class="form-control w-full">
          <input
            id="password"
            type="password"
            class="input input-bordered input-primary w-full mt-2"
            placeholder="Password"
            autocomplete="off"
            bind:value={$form.password}
            required
          />
          {#if $errors.password}
            <p class="mt-2 text-sm text-red-600">{$errors.password}</p>
          {/if}

          <!-- Password visibility toggle icons -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <svg
            id="pweye-closed"
            onclick={togglePasswordVisibility}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer"
          >
            <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
            <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
            <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
          </svg>

          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <svg
            id="pweye-open"
            onclick={togglePasswordVisibility}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer"
          >
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          id="email"
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          bind:value={$form.email}
          onchange={handleChange}
          placeholder="Enter your email"
        />
        {#if $errors.email}
          <p class="mt-2 text-sm text-red-600">{$errors.email}</p>
        {/if}
      </div>

      <div class="pt-5">
        <div class="flex justify-end space-x-4">
          <button
            type="button"
            class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onclick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={isUpgrading}
          >
            {isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}
          </button>
        </div>
      </div>
    </form>

    {#if showError}
      <div class="error-message mt-3 text-red-500">
        {errorMessage}
      </div>
    {/if}
  </div>
</Modal>
