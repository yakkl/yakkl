<script lang="ts">
  import { get } from 'svelte/store';
  import EyeIcon from './icons/EyeIcon.svelte';
  import EyeOffIcon from './icons/EyeOffIcon.svelte';
  import Tooltip from './Tooltip.svelte';
  import PincodeVerify from './PincodeVerify.svelte';
  import { visibilityStore } from '$lib/common/stores/visibilityStore';
  import { notificationService } from '$lib/services/notification.service';

  interface Props {
    className?: string;
    showText?: boolean;
  }

  let { className = '', showText = false }: Props = $props();

  let isVisible = $state(get(visibilityStore));
  let showPincodeModal = $state(false);
  let pendingAction = $state<'show' | 'hide' | null>(null);

  $effect(() => {
    const unsubscribe = visibilityStore.subscribe((value) => {
      isVisible = value;
    });
    return unsubscribe;
  });

  function handleToggleClick() {
    if (isVisible) {
      // Hiding values doesn't require PIN
      visibilityStore.set(false);
      notificationService.show({
        title: 'Values Hidden',
        message: 'Sensitive values are now hidden',
        type: 'info',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    } else {
      // Showing values requires PIN verification
      pendingAction = 'show';
      showPincodeModal = true;
    }
  }

  function handlePinVerified(digestedPin: string) {
    if (pendingAction === 'show') {
      visibilityStore.set(true);
      notificationService.show({
        title: 'Values Visible',
        message: 'Sensitive values are now visible',
        type: 'success',
        duration: 3000 // Auto-dismiss after 3 seconds
      });
    }
    pendingAction = null;
    showPincodeModal = false;
  }

  function handlePinRejected(reason: string) {
    notificationService.show({
      title: 'PIN Verification Failed',
      message: reason || 'Unable to verify PIN',
      type: 'error'
    });
    pendingAction = null;
    showPincodeModal = false;
  }
</script>

<div class={className}>
  {#if showText}
    <button
      onclick={handleToggleClick}
      class="w-full flex items-center justify-center gap-1"
      aria-label={isVisible ? "Hide values" : "Show values"}
    >
      {#if isVisible}
        <EyeIcon size={16} />
        <span>Hide Values</span>
      {:else}
        <EyeOffIcon size={16} />
        <span>Protect View</span>
      {/if}
    </button>
  {:else}
    <Tooltip content={isVisible ? "Hide sensitive values" : "Show sensitive values (PIN required)"}>
      <button
        onclick={handleToggleClick}
        class="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={isVisible ? "Hide values" : "Show values"}
      >
        {#if isVisible}
          <EyeIcon size={18} className="text-gray-600 dark:text-gray-400" />
        {:else}
          <EyeOffIcon size={18} className="text-gray-600 dark:text-gray-400" />
        {/if}
      </button>
    </Tooltip>
  {/if}
</div>

<PincodeVerify
  bind:show={showPincodeModal}
  onVerified={handlePinVerified}
  onRejected={handlePinRejected}
/>
