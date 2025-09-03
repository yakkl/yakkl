<!-- ExportPrivateKey.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { yakklCurrentlySelectedStore } from '$lib/common/stores';
  import { get } from 'svelte/store';
  import PincodeVerify from './PincodeVerify.svelte';
  import Modal from '@yakkl/ui/src/components/Modal.svelte';
  import Copy from './Copy.svelte';
  import { AlertTriangle, Key } from 'lucide-svelte';
  import { sendToBackground } from '$lib/services/message.service';

  interface Props {
    show?: boolean;
    className?: string;
    onVerify?: () => void;
  }

  let { show = $bindable(false), className = 'z-[999]', onVerify = () => {} }: Props = $props();

  let privateKey = $state('');
  let address: string = $state('');
  let showPincodeModal = $state(false);
  let showPrivateKeyModal = $state(false);
  let currentlySelected = $state(null);

  onMount(async () => {
    const cs = get(yakklCurrentlySelectedStore);
    if (cs) {
      currentlySelected = cs;
      address = cs.shortcuts.address;
    }
  });

  async function verifyPincode(pincode: string) {
    try {
      if (!address) return;

      // Use background handler to get private key securely
      const response = await sendToBackground({
        type: 'yakkl_getPrivateKey',
        payload: { address }
      });

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to retrieve private key';
        throw new Error(errorMessage);
      }

      privateKey = response.data.privateKey;
      showPincodeModal = false;
      showPrivateKeyModal = true;
      show = false;

      onVerify();
    } catch (e) {
      console.error('Error verifying pincode:', e);
    }
  }

  function closeModal() {
    show = false;
  }
</script>

<div class="relative {className}">
  <PincodeVerify bind:show={showPincodeModal} onVerified={verifyPincode} />

  <Modal
    bind:show={showPrivateKeyModal}
    title="Private Key"
    onClose={() => (showPrivateKeyModal = false)}
  >
    <div class="p-6">
      <div class="flex items-start gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <p class="text-sm text-red-800 dark:text-red-200">
          <strong>Critical Security Warning:</strong> Your PRIVATE KEY provides complete access to your wallet.
          Never share it with anyone. Anyone with this key can steal all your funds.
          Only copy if you need to import this account elsewhere.
        </p>
      </div>

      <div class="mb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Address</label>
        <div class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <input
            type="text"
            class="flex-1 bg-transparent text-sm font-mono text-gray-700 dark:text-gray-300 outline-none"
            value={address}
            readonly
          />
          <Copy
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            target={{
              value: address,
              timeout: 2000
            }}
          />
        </div>
      </div>

      <div class="mb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Private Key</label>
        <div class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
          <Key class="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            type="password"
            class="flex-1 bg-transparent text-sm font-mono text-gray-700 dark:text-gray-300 outline-none"
            value={privateKey}
            readonly
          />
          <Copy
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            target={{
              value: privateKey,
              timeout: 20000,
              redactText: 'PRIVATE-KEY-REDACTED'
            }}
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          onclick={() => {
            showPrivateKeyModal = false;
            privateKey = '';
          }}
        >
          Close
        </button>
      </div>
    </div>
  </Modal>

  <Modal bind:show title="Export Private Key" onClose={closeModal}>
    <div class="p-6">
      <div class="flex items-center justify-center mb-4">
        <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
          <Key class="w-8 h-8 text-purple-600 dark:text-purple-400" />
        </div>
      </div>

      <p class="text-center text-gray-700 dark:text-gray-200 mb-6">
        To export the private key of your account, please verify your PIN code first.
      </p>

      <div class="flex gap-3 justify-end">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          onclick={closeModal}
        >
          Cancel
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          onclick={() => {
            show = false;
            showPincodeModal = true;
          }}
        >
          Continue
        </button>
      </div>
    </div>
  </Modal>
</div>
