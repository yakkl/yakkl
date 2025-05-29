<script lang="ts">
  import { page } from '$app/state';
  import { browserSvelte } from '$lib/common/environment';
  import Login from '$lib/components/Login.svelte';
  import {
    syncStorageToStore,
    yakklDappConnectRequestStore,
    yakklUserNameStore
  } from '$lib/common/stores';
  import { safeLogout, safeNavigate } from '$lib/common/safeNavigate';
  import { messagingService, startActivityTracking } from '$lib/common/messaging';
  import { log } from '$lib/common/logger-wrapper';
	import type { Profile } from '$lib/common/interfaces';
	import ErrorNoAction from '$lib/components/ErrorNoAction.svelte';
	import Welcome from '$lib/components/Welcome.svelte';
	import { protectedContexts } from '$lib/common/globals';

  // Get request parameters
  let requestId = $state('');
  let method = $state('');
  let showError = $state(false);
  let errorValue = $state('');
  let approvalUrl = '';

  function getApprovalUrl() {
    if (!method) return '/dapp/popups/approve/';
    switch (method) {
      case 'eth_requestAccounts': return '/dapp/popups/accounts/';
      case 'eth_sendTransaction': return '/dapp/popups/transactions/';
      case 'eth_signTypedData_v4':
      case 'personal_sign':
      case 'eth_signTransaction': return '/dapp/popups/sign/';
      case 'wallet_requestPermissions':
      case 'wallet_revokePermissions':
      case 'wallet_getPermissions': return '/dapp/popups/permissions/';
      case 'wallet_switchEthereumChain': return '/dapp/popups/wallet/';
      default: return '/dapp/popups/approve/';
    }
  }

  function initializeFromUrl() {
    if (!browserSvelte) return;

    const urlRequestId = page.url.searchParams.get('requestId') as string ?? '';
    requestId = urlRequestId;
    method = page.url.searchParams.get('method') as string ?? '';

    approvalUrl = getApprovalUrl();

    console.log('approvalUrl', approvalUrl);
    console.log('requestId', requestId);
    console.log('method', method);
  }

  initializeFromUrl();

  // Determine which approval page to go to based on method
  // Handle successful login in dapp context
  function handleLoginSuccess(profile: Profile, digest: string, isMinimal: boolean) {
    try {
      if (!browserSvelte) return;
      // Set the username in the global store
      $yakklUserNameStore = profile.userName || '';
      // Set the global request ID
      $yakklDappConnectRequestStore = requestId;
      // For dapp context, we just need the minimal sync
      syncStorageToStore();

      // Tell the background script about successful auth
      const contextType = 'popup-dapp'; // This is explicitly the dapp context
      if (protectedContexts.includes(contextType)) {
        log.info(`Starting activity tracking for protected context: ${contextType}`);
        startActivityTracking(contextType);
      } else {
        log.info(`Skipping activity tracking for non-protected context: ${contextType}`);
      }

      // Navigate to the appropriate approval screen with parameters
      const url = `${approvalUrl}?requestId=${requestId}&method=${method}`;
      safeNavigate(url);
    } catch(e: any) {
      log.error('Error during post-login initialization', false, e);
      errorValue = e;
      showError = true;

      // Reject the request on error
      messagingService.sendMessage('rejectRequest', {
        requestId,
        error: 'Authentication failed'
      });
    }
  }

  // Handle login errors
  function handleLoginError(value: string) {
    if (!browserSvelte) return;

    errorValue = value;
    showError = true;

    // Reject the request if login fails
    messagingService.sendMessage('rejectRequest', {
      requestId,
      error: 'Authentication failed'
    });
  }

  // Handle login cancel
  function handleLoginCancel() {
    if (!browserSvelte) return;
    safeLogout();
  }

  // Handle custom action
  function handleCustomAction() {
    if (!browserSvelte) return;
    showError = false;
    errorValue = '';
  }
</script>

<ErrorNoAction bind:show={showError} title="ERROR!" value={errorValue} handle={handleCustomAction} />

<!-- relative bg-gradient-to-b from-indigo-700 to-indigo-500/15 m-1 ml-2 mr-2 dark:bg-gray-900 rounded-t-xl overflow-hidden -->
<div class="relative h-[98vh] text-base-content">
  <main class="px-4 text-center">
    <Welcome />

    <div class="mt-5">
      <Login
        minimumAuth={true}
        requestId={requestId}
        method={method}
        onLoginSuccess={handleLoginSuccess}
        onLoginError={handleLoginError}
        onLoginCancel={handleLoginCancel}
        loginButtonText="Unlock"
        cancelButtonText="Exit/Logout"
      />
    </div>
  </main>
</div>
