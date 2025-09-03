<!-- Toast.svelte -->
<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';

  interface Props {
    show?: boolean;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    className?: string;
    onClose?: () => void;
    autoClose?: boolean;
    closable?: boolean;
  }

  let {
    show = $bindable(true),
    message,
    type = 'info',
    duration = 3000,
    position = 'top-right',
    className = '',
    onClose = () => {},
    autoClose = true,
    closable = true
  }: Props = $props();

  let timeoutId: ReturnType<typeof setTimeout>;

  const typeClasses = $derived({
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-error'
  }[type]);

  const positionClasses = $derived({
    'top': 'toast-top toast-center',
    'bottom': 'toast-bottom toast-center',
    'top-left': 'toast-top toast-start',
    'top-right': 'toast-top toast-end',
    'bottom-left': 'toast-bottom toast-start',
    'bottom-right': 'toast-bottom toast-end',
    'center': 'toast-center'
  }[position]);

  const alertClasses = $derived(
    twMerge('alert', typeClasses, className)
  );

  const icons = $derived({
    info: '9',
    success: '',
    warning: ' ',
    error: 'L'
  });

  function handleClose() {
    show = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    onClose();
  }

  $effect(() => {
    if (show && autoClose) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });

  onMount(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  });
</script>

{#if show}
  <div class="toast {positionClasses} z-50">
    <div
      class={alertClasses}
      in:fly={{ y: position.includes('top') ? -50 : 50, duration: 300 }}
      out:fade={{ duration: 200 }}
    >
      <span class="text-lg">{icons[type]}</span>
      <span>{message}</span>
      {#if closable}
        <button
          class="btn btn-ghost btn-xs"
          on:click={handleClose}
          aria-label="Close notification"
        >
          
        </button>
      {/if}
    </div>
  </div>
{/if}