<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface ModalProps {
    show?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnBackdrop?: boolean;
    className?: string;
    children?: any;
    actions?: any;
    onClose?: () => void;
  }

  let {
    show = $bindable(false),
    title,
    size = 'md',
    closeOnBackdrop = true,
    className = '',
    children,
    actions,
    onClose
  }: ModalProps = $props();

  const sizeClasses = {
    sm: 'modal-box max-w-sm',
    md: 'modal-box',
    lg: 'modal-box max-w-4xl',
    xl: 'modal-box max-w-6xl',
    full: 'modal-box w-11/12 max-w-7xl'
  };

  function handleBackdropClick() {
    if (closeOnBackdrop) {
      show = false;
      if (onClose) {
        onClose();
      }
    }
  }

  function handleCloseClick() {
    show = false;
    if (onClose) {
      onClose();
    }
  }

  const modalClasses = $derived(twMerge(
    'modal',
    show && 'modal-open',
    className
  ));

  const boxClasses = $derived(sizeClasses[size]);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class={modalClasses} onclick={handleBackdropClick}>
  <div class={boxClasses} onclick={(e) => e.stopPropagation()}>
    {#if title || onClose}
      <div class="flex items-center justify-between mb-4">
        {#if title}
          <h3 class="font-bold text-lg">{title}</h3>
        {/if}
        {#if onClose}
          <button
            class="btn btn-sm btn-circle btn-ghost"
            onclick={handleCloseClick}
            aria-label="Close modal"
          >
            ✕
          </button>
        {/if}
      </div>
    {/if}

    <div class="modal-content">
      {@render children?.()}
    </div>

    {#if actions}
      <div class="modal-action">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>
