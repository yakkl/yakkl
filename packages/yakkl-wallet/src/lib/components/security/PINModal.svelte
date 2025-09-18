<!-- PIN Modal Component - Secondary verification for state changes -->
<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { getPINGuard, StateAction } from '@yakkl/security';
  import type { PINVerificationResult } from '@yakkl/security';

  interface Props {
    isOpen: boolean;
    action: StateAction;
    message?: string;
    onSuccess: () => void;
    onCancel: () => void;
    onError?: (error: string) => void;
    allowBiometric?: boolean;
  }

  let {
    isOpen = false,
    action,
    message = 'Enter PIN to continue',
    onSuccess,
    onCancel,
    onError,
    allowBiometric = false
  }: Props = $props();

  let pin = $state('');
  let error = $state('');
  let isVerifying = $state(false);
  let attemptsRemaining = $state<number | null>(null);
  let lockoutTime = $state<number | null>(null);
  let pinInput: HTMLInputElement;

  const pinGuard = getPINGuard();

  // Focus input when modal opens
  $effect(() => {
    if (isOpen && pinInput) {
      setTimeout(() => pinInput?.focus(), 100);
    }
  });

  // Reset state when modal opens/closes
  $effect(() => {
    if (isOpen) {
      pin = '';
      error = '';
      attemptsRemaining = null;
      lockoutTime = null;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!pin || pin.length < 4) {
      error = 'PIN must be at least 4 digits';
      return;
    }

    isVerifying = true;
    error = '';

    try {
      const result: PINVerificationResult = await pinGuard.verifyPIN(pin, action);

      if (result.success) {
        // Create session for this action
        await pinGuard.createSession([action]);

        // Clear PIN from memory
        pin = '';

        // Success callback
        onSuccess();
      } else {
        // Handle various failure scenarios
        if (result.lockedUntil) {
          lockoutTime = result.lockedUntil;
          const minutes = Math.ceil((result.lockedUntil - Date.now()) / 60000);
          error = `Too many failed attempts. Locked for ${minutes} minutes.`;
        } else if (result.attemptsRemaining !== undefined) {
          attemptsRemaining = result.attemptsRemaining;
          error = `Invalid PIN. ${result.attemptsRemaining} attempts remaining.`;

          // Clear PIN for retry
          pin = '';
          pinInput?.focus();
        } else if (result.requiresReset) {
          error = 'PIN not set. Please set a PIN in settings.';
        } else {
          error = 'PIN verification failed';
        }

        if (onError) {
          onError(error);
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Verification failed';
      if (onError) {
        onError(error);
      }
    } finally {
      isVerifying = false;
    }
  }

  function handleCancel() {
    pin = '';
    error = '';
    onCancel();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleCancel();
    }
  }

  function getActionDescription(action: StateAction): string {
    const descriptions: Record<StateAction, string> = {
      [StateAction.SEND_TRANSACTION]: 'Send Transaction',
      [StateAction.SIGN_MESSAGE]: 'Sign Message',
      [StateAction.APPROVE_CONTRACT]: 'Approve Contract',
      [StateAction.ADD_ACCOUNT]: 'Add Account',
      [StateAction.REMOVE_ACCOUNT]: 'Remove Account',
      [StateAction.IMPORT_ACCOUNT]: 'Import Account',
      [StateAction.EXPORT_ACCOUNT]: 'Export Account',
      [StateAction.UPDATE_SETTINGS]: 'Update Settings',
      [StateAction.CHANGE_NETWORK]: 'Change Network',
      [StateAction.UPDATE_PREFERENCES]: 'Update Preferences',
      [StateAction.CHANGE_PASSWORD]: 'Change Password',
      [StateAction.CHANGE_PIN]: 'Change PIN',
      [StateAction.ADD_AUTH_METHOD]: 'Add Authentication Method',
      [StateAction.REMOVE_AUTH_METHOD]: 'Remove Authentication Method',
      [StateAction.ROTATE_MASTER_KEY]: 'Rotate Master Key',
      [StateAction.ADD_TOKEN]: 'Add Token',
      [StateAction.REMOVE_TOKEN]: 'Remove Token',
      [StateAction.UPDATE_TOKEN_LIST]: 'Update Token List',
      [StateAction.GRANT_PERMISSION]: 'Grant Permission',
      [StateAction.REVOKE_PERMISSION]: 'Revoke Permission',
      [StateAction.CREATE_BACKUP]: 'Create Backup',
      [StateAction.RESTORE_BACKUP]: 'Restore Backup',
      [StateAction.CREATE_EMERGENCY_KIT]: 'Create Emergency Kit',
      [StateAction.PAIR_DEVICE]: 'Pair Device',
      [StateAction.UNPAIR_DEVICE]: 'Unpair Device',
      [StateAction.SYNC_DEVICES]: 'Sync Devices'
    };

    return descriptions[action] || action;
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
    transition:fade={{ duration: 200 }}
    onclick={handleCancel}
    onkeydown={handleKeyDown}
    role="button"
    tabindex="-1"
  />

  <!-- Modal -->
  <div
    class="fixed inset-0 flex items-center justify-center z-50 p-4"
    transition:scale={{ duration: 200, start: 0.95 }}
  >
    <div
      class="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full p-6"
      onclick={(e) => e.stopPropagation()}
      onkeydown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 class="text-xl font-bold text-zinc-900 dark:text-white">
          PIN Required
        </h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
          {getActionDescription(action)}
        </p>
        {#if message !== 'Enter PIN to continue'}
          <p class="text-sm text-zinc-500 dark:text-zinc-500 mt-1">
            {message}
          </p>
        {/if}
      </div>

      <!-- Form -->
      <form onsubmit={handleSubmit}>
        <div class="mb-4">
          <input
            bind:this={pinInput}
            bind:value={pin}
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Enter PIN"
            class="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isVerifying || lockoutTime !== null}
            maxlength="8"
            autocomplete="off"
          />
        </div>

        {#if error}
          <div class="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-700 dark:text-red-300 text-center">
              {error}
            </p>
          </div>
        {/if}

        {#if attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 2}
          <div class="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <p class="text-sm text-yellow-700 dark:text-yellow-300 text-center">
              Warning: Only {attemptsRemaining} attempts remaining
            </p>
          </div>
        {/if}

        <!-- Buttons -->
        <div class="flex gap-3">
          <button
            type="button"
            onclick={handleCancel}
            class="flex-1 py-3 px-4 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            disabled={isVerifying}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isVerifying || !pin || lockoutTime !== null}
          >
            {#if isVerifying}
              <span class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </span>
            {:else}
              Verify
            {/if}
          </button>
        </div>

        {#if allowBiometric}
          <div class="mt-4 text-center">
            <button
              type="button"
              class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              disabled={isVerifying}
            >
              Use Biometric Instead
            </button>
          </div>
        {/if}
      </form>

      <!-- Help Text -->
      <div class="mt-6 text-center">
        <a
          href="/settings/security"
          class="text-xs text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          Forgot PIN? Reset in Settings
        </a>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Disable number input spinners */
  input[type="password"]::-webkit-inner-spin-button,
  input[type="password"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>