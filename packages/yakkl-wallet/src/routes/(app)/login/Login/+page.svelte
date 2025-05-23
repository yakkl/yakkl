<script lang="ts">
  import { page } from '$app/state';
  import { createForm } from "svelte-forms-lib";
  import { setProfileStorage, yakklDappConnectRequestStore, yakklCurrentlySelectedStore, yakklSettingsStore, yakklPreferencesStore, yakklPrimaryAccountsStore, syncStorageToStore, yakklMiscStore, getMiscStore, yakklCombinedTokenStore } from '$lib/common/stores';
  import { yakklVersionStore, yakklUserNameStore } from '$lib/common/stores';
  import { Popover } from 'flowbite-svelte';
  import { PATH_WELCOME, PATH_REGISTER, DEFAULT_TITLE, PATH_LEGAL } from '$lib/common/constants';
  import { setIconLock, setIconUnlock } from '$lib/utilities/utilities';
  import { decryptData, encryptData } from '$lib/common/encryption';
  import { onMount } from 'svelte';
  import Copyright from '$lib/components/Copyright.svelte';
	import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import { RegistrationType, checkAccountRegistration, isEncryptedData, type Preferences, type PrimaryAccountReturnValues, type ProfileData, type Settings, type YakklCurrentlySelected, type YakklPrimaryAccount } from '$lib/common';
	import { verify } from '$lib/common/security';
	import { deepCopy } from '@ethersproject/properties';
  import { browser_ext, browserSvelte } from '$lib/common/environment';
	import { setLocks } from '$lib/common/locks';
  import { log } from '$plugins/Logger';
	import { createPortfolioAccount } from '$lib/plugins/networks/ethereum/createPortfolioAccount';
	import Import from '$lib/components/Import.svelte';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';

  // Reactive State
  let yakklCurrentlySelected: YakklCurrentlySelected | null = $state(null);
  let yakklMisc: string = $state('');
  let yakklSettings: Settings | null = $state(null);
  let yakklPreferences: Preferences | null = $state(null);
  let yakklPrimaryAccounts: YakklPrimaryAccount[] = $state([]);

  let error = $state(false);
  let errorValue: any = $state('');
  let registeredType: string = $state('');
  let redirect = PATH_WELCOME;
  let requestId = $state('');
  let method: string = '';
  let url: string = '/dapp/popups/approve';
  let pweyeOpen = false;
  let pweyeOpenId: HTMLButtonElement;
  let pweyeClosedId: HTMLButtonElement;

  let showRegistrationOption = $state(false);
  let showRestoreOption = $state(false);

  if (browserSvelte) {
    const urlRequestId = page.url.searchParams.get('requestId') as string ?? '';
    requestId = urlRequestId;
    method = page.url.searchParams.get('method') as string ?? '';
    if (urlRequestId) {
      $yakklDappConnectRequestStore = urlRequestId;
      if (method) {
        switch (method) {
          case 'eth_requestAccounts':
            url = '/dapp/popups/accounts';
            break;
          case 'eth_sendTransaction':
            url = '/dapp/popups/transactions';
            break;
          case 'eth_signTypedData_v4':
          case 'personal_sign':
            url = '/dapp/popups/sign';
            break;
          case 'wallet_requestPermissions':
          case 'wallet_revokePermissions':
          case 'wallet_getPermissions':
            url = '/dapp/popups/permissions';
            break;
          // Unsupported - security risk
          // case 'wallet_addEthereumChain':
          //   url = '/dapp/popups/walletNetworkAdd';
          //   break;
          // case 'wallet_switchEthereumChain':
          //   url = '/dapp/popups/wallet';
          //   break;
          default:
            url = '/dapp/popups/approve';
            break;
        }
      }
      redirect = url + '?requestId=' + urlRequestId + '&source=eip6963:Login&method=' + method;
    } else {
      $yakklDappConnectRequestStore = null;
    }
  }

  $effect(() => { yakklCurrentlySelected = $yakklCurrentlySelectedStore; });
  $effect(() => { yakklMisc = $yakklMiscStore; });
  $effect(() => { yakklSettings = $yakklSettingsStore; });
  $effect(() => { yakklPreferences = $yakklPreferencesStore; });
  $effect(() => { yakklPrimaryAccounts = $yakklPrimaryAccountsStore; });

  onMount(async () => {
    try {
      if (browserSvelte) {
        await browser_ext.runtime.sendMessage({ type: 'clientReady' }); // Safeguard to ensure the client is ready before sending messages

        yakklCombinedTokenStore.set([]); // Reset the token store
        if (!yakklSettings || !yakklSettings.legal.termsAgreed) {
          return await safeNavigate(PATH_LEGAL);
        }
        if (yakklSettings.init === false) {
          return await safeNavigate(PATH_REGISTER);
        }

        registeredType = yakklSettings.registeredType as string;
        // if (!checkUpgrade()) { // The checkUpgrade is not valid until after user is validated
        if (registeredType !== RegistrationType.PRO) {
          registeredType = RegistrationType.STANDARD;
        }

        // PROMO
        // let promoDate = new Date('2026-01-01T00:00:00');
        // let date = new Date();
        // if (date < promoDate) {
          registeredType = RegistrationType.PRO;
        // }
        ////
      }

      pweyeOpenId = document.getElementById("pweye-open") as HTMLButtonElement;
      pweyeClosedId = document.getElementById("pweye-closed") as HTMLButtonElement;
      pweyeOpenId.setAttribute('tabindex', '-1');
      pweyeClosedId.setAttribute('tabindex', '-1');
      pweyeOpenId.setAttribute('hidden', 'hidden');

      let namHelp = document.getElementById("nam-help");
      namHelp?.setAttribute('tabindex', '-1');

      let pwdHelp = document.getElementById("pwd-help");
      pwdHelp?.setAttribute('tabindex', '-1');
    } catch(e: any) {
      log.error(`onMount: Login - ${e}`, e?.stack);
    }
  });

  const { form, errors, handleSubmit } = createForm({
    initialValues: { userName: "", password: "" },
    onSubmit: async data => {
      // Verify password by decrypting data!
      await login(data.userName, data.password);
      $form.userName = "";
      $form.password = "";
      data.password = "";
      data.userName = "";
    }
  });

  async function login(userName: string, password: string): Promise<void> {
    if (browserSvelte) {
      try {
        let profile = await verify(userName.toLowerCase().trim().replace('.nfs.id', '')+'.nfs.id'+password);
        if (!profile) {
          throw `User [ ${userName} ] was not found OR password is not correct OR no primary account was not found. Please try again or register if not already registered`;
        } else {

          yakklMisc = getMiscStore(); // This should be set by the verify function
          if (!yakklMisc) {
            throw `User [ ${userName} ] was not found OR password is not correct. Please try again or register if not already registered`;
          }

          $yakklUserNameStore = userName;

          // Set up idle detection and locks after successful login
          if (!$yakklDappConnectRequestStore && yakklPreferences?.idleAutoLock) {
            browser_ext.idle.setDetectionInterval(yakklPreferences.idleDelayInterval ?? 60);
            await setIconLock();
            setLocks(true);
          }

          if (isEncryptedData(profile.data)) {
            profile.data = await decryptData(profile.data, yakklMisc);
          }
          if ((profile.data as ProfileData).registered?.key) {
            let key = (profile.data as ProfileData).registered.key;
            if (key !== null || key !== '' && (profile.data as ProfileData).registered.type === RegistrationType.PRO) {
              $yakklVersionStore = RegistrationType.PRO; // Add this later... + ' - ' + key;
            } else {
              $yakklVersionStore = RegistrationType.STANDARD;
              (profile.data as ProfileData).registered.key = '';
              (profile.data as ProfileData).registered.type = RegistrationType.STANDARD;
            }
          } else { // Fallback to standard user. If the user was registrered before then this means something happened to the data and we need to reset it. In the future we will have a way to recover this.
            $yakklVersionStore = RegistrationType.STANDARD;
            (profile.data as ProfileData).registered.key = '';
            (profile.data as ProfileData).registered.type = RegistrationType.STANDARD;
          }

          if (yakklPrimaryAccounts.length > 0) {
            if (!isEncryptedData(profile.data) && (profile.data as ProfileData).primaryAccounts.length !== yakklPrimaryAccounts.length) {
              (profile.data as ProfileData).primaryAccounts = deepCopy(yakklPrimaryAccounts);
            }
          }

          if (!isEncryptedData(profile.data)) {
            profile.data = await encryptData(profile.data, yakklMisc);
          }
          await setProfileStorage(profile);

          if (redirect !== PATH_WELCOME) {
            // Must be a dapp - now doing load in +page.ts
            if (requestId) { // Don't want to truely unlock with dapps
              if (yakklSettings && yakklSettings.init === true) {
                await syncStorageToStore();  // This sets up the memory stores from the physical store
              }
            }
          } else {
            await setIconUnlock(); // Set the unlock icon and sync will occur in welcome (next step)
          }

          // Make sure there is at least one Primary or Imported account
          if (await checkAccountRegistration()) {
            // resetTokenDataStoreValues();
            // await updateTokenPrices();

            // await sendNotificationStartLockIconTimer();
            if (redirect.includes('dapp/popups')) {
              safeNavigate(redirect); // This should maintain the current state
            } else {
              safeNavigate(redirect, 0, {replaceState: true, invalidateAll: true});
            }
          } else {
            const primaryAccountValues: PrimaryAccountReturnValues = await createPortfolioAccount(yakklMisc, profile);
            // Create a basic EOA
            // Show the restore option
            //// goto(redirect, {replaceState: true, invalidateAll: true});
            showRestoreOption = true;
          }
        }
      } catch(e: any) {
        log.error(`Login: ${e}`, e?.stack);
        errorValue = e;
        error = true;
      }
    }
  }

  function toggleVisability(id="password", type="text") {
    let x = document.getElementById(id) as HTMLInputElement;
    if (x.type === "password") {
      x.type = type;
    } else {
      x.type = "password";
    }
  }

  function togglePasswordVisability() {
    toggleVisability("password", "text");
    if (pweyeOpen === false) {
      pweyeOpenId.removeAttribute('hidden');
      pweyeClosedId.setAttribute('hidden', 'hidden');
      pweyeOpen = true;
    } else {
      pweyeOpenId.setAttribute('hidden', 'hidden');
      pweyeClosedId.removeAttribute('hidden');
      pweyeOpen = false;
    }
  }

  async function onCancelLogin() {
    showRegistrationOption = false;
    showRestoreOption = false;
    error = false;
    errorValue = '';
    safeLogout(); // Added to handle logout after canceling login
  }

  async function onCompleteRestore(message: string) {
    log.info(message);
    showRestoreOption = false;
    safeNavigate(redirect, 0, {replaceState: true, invalidateAll: true});
  }

  function onCancelRestore() {
    showRestoreOption = false;
    showRegistrationOption = true;
  }

  // Here as a reference for ErrorNoAction

  function handleCustomAction() {
    errorValue = '';
    error = false;
  }
</script>

<svelte:head>
	<title>{DEFAULT_TITLE}</title>
</svelte:head>

<ErrorNoAction bind:show={error} title="ERROR!" value={errorValue} handle={handleCustomAction} />
<Import bind:show={showRestoreOption} onComplete={onCompleteRestore} onCancel={onCancelRestore} />

<Popover class="text-sm z-10" triggeredBy="#nam-help" placement="left">
  <h3 class="font-semibold">Username</h3>
  <div class="grid grid-cols-4 gap-2">
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
  </div>
  <p class="py-2">Enter your username.</p>
</Popover>

<Popover class="text-sm z-10" triggeredBy="#pwd-help" placement="left">
  <h3 class="font-semibold">Password</h3>
  <div class="grid grid-cols-4 gap-2">
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
      <div class="h-1 bg-orange-300 dark:bg-orange-400"></div>
  </div>
  <p class="py-2">Enter your password.</p>
</Popover>

<!-- relative bg-gradient-to-b from-indigo-700 to-indigo-500/15 m-1 ml-2 mr-2 dark:bg-gray-900 rounded-t-xl overflow-hidden -->
<div class="relative h-[98vh] text-base-content">
  <main class="px-4 text-center">
    <Welcome />

    <div class="mt-5">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <!-- <div id="register" role="button" on:click={() => goto("/register/Register")} class="text-md uppercase underline font-bold">Click if NOT registered</div> -->

      <form onsubmit={(e) => {
        e.preventDefault();
        handleSubmit(e);
      }}>

        <div class="mt-5 flex flex-row justify-center">
          <div class="form-control w-[22rem]">
            <div class="join">
              <input id="userName"
                type="text"
                class="input input-bordered input-primary w-full join-item"
                placeholder="Username" autocomplete="off" bind:value="{$form.userName}" required />
              <span class="label-text bg-slate-900 join-item w-[60px]"><div class="mt-[.9rem]">.nfs.id</div></span>
            </div>
          </div>
          <svg id="nam-help" tabindex="-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="w-6 h-6 ml-1 mt-2 fill-gray-300">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>

        </div>

        <div class="mt-5 flex flex-row justify-center">
          <div class="form-control w-[22rem]">
            <input id="password" type="password"
              class="input input-bordered input-primary w-full mt-2"
              placeholder="Password" autocomplete="off" bind:value="{$form.password}" required />
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <svg id="pweye-closed" onclick={togglePasswordVisability} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer">
              <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577a11.217 11.217 0 014.242-.827c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113z" />
              <path d="M15.75 12c0 .18-.013.357-.037.53l-4.244-4.243A3.75 3.75 0 0115.75 12zM12.53 15.713l-4.243-4.244a3.75 3.75 0 004.243 4.243z" />
              <path d="M6.75 12c0-.619.107-1.213.304-1.764l-3.1-3.1a11.25 11.25 0 00-2.63 4.31c-.12.362-.12.752 0 1.114 1.489 4.467 5.704 7.69 10.675 7.69 1.5 0 2.933-.294 4.242-.827l-2.477-2.477A5.25 5.25 0 016.75 12z" />
            </svg>
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <svg id="pweye-open" onclick={togglePasswordVisability} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 ml-1 fill-gray-200 absolute right-12 z-10 mt-5 cursor-pointer">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clip-rule="evenodd" />
            </svg>

          </div>
          <svg id="pwd-help" tabindex="-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="w-6 h-6 ml-1 mt-4 fill-gray-300">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" />
          </svg>
        </div>

        <div class="inline-block text-center">
          <!-- btn btn-primary w-64 rounded-full mt-3 -->
          <button type="submit"
            class="bg-emerald-400 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-full mt-3 w-64">
            <div class="inline-flex items-center align-middle">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2 ml-2" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              <span>Unlock</span>
            </div>
          </button>
          <!-- btn btn-secondary -->
          <button type="button" onclick={onCancelLogin}
            class="bg-slate-400 hover:bg-slate-500 w-64 rounded-full py-2 px-4 mt-3 font-bold text-white">
            <div class="inline-flex items-center align-middle">
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" stroke="currentColor" class="w-6 h-6 mx-2">
                <path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd" />
              </svg>
              <span>Exit/Logout</span>
            </div>
          </button>
        </div>

      </form>

    </div>

    {#if !requestId}
    <!-- {#if registeredType !== 'Pro'}
    <div id="upgrade" class="w-full mt-10">
      <div class="card bg-base-100 shadow-xl image-full animate-pulse">
        <figure><img src="/images/logoBullFav128x128.png" alt="upgrade" /></figure>
        <div class="card-body">
          <h2 class="card-title self-center">UPGRADE TO PRO!</h2>
          <p>It appears you have not upgraded to the Pro version. Do it today to unlock advanced features. Click the UPGRADE button after you login. This will enable a number of features including our unique Emergency Kit, AI Chat, and enhanced security.</p>
        </div>
      </div>
    </div>
    {:else} -->
    <div id="upgrade" class="w-full mt-14">
      <div class="card bg-base-100 shadow-xl image-full animate-pulse">
        <figure><img src="/images/logoBullFav128x128.png" alt="upgrade" /></figure>
        <div class="card-body">
          <h2 class="card-title self-center">PRO!</h2>
          <p>Welcome to our Pro version. We have a lot of additional features waiting on you. We're also working hard on advanced features to make your digital asset experience a dream! We also need your suggestions! Enjoy!</p>
        </div>
      </div>
    </div>
    <!-- {/if} -->
     {/if}

    <Copyright registeredType={registeredType} />
  </main>
</div>


