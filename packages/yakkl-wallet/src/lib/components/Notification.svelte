<script lang="ts">
  import Modal from './Modal.svelte';
  import { safeLogout } from '$lib/common/safeNavigate';

  interface Props {
    show?: boolean;
    title?: string;
    message?: string;
    onClose?: () => void;
  }

  let {
    show = $bindable(false),
    title = 'Notification',
    message = '',
    onClose = () => safeLogout()
  }: Props = $props();

</script>

<Modal bind:show title={title}>
  <div class="p-6">
    <div class="flex items-center mb-4">
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 text-gray-400" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"></path>
        </svg>
      </div>
      <div class="ml-3">
        <p class="text-sm text-gray-500">{message}</p>
      </div>
    </div>
    <div class="mt-4 flex justify-end">
      <button
        type="button"
        class="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        onclick={onClose}
      >
        Close
      </button>
    </div>
  </div>
</Modal>
