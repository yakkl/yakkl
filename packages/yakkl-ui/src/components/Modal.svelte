<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface ModalProps {
    open?: boolean;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnBackdrop?: boolean;
    className?: string;
    children?: any;
    actions?: any;
    onclose?: () => void;
  }

  const {
    open = false,
    title,
    size = 'md',
    closeOnBackdrop = true,
    className = '',
    children,
    actions,
    onclose
  }: ModalProps = $props();

  const sizeClasses = {
    sm: 'modal-box max-w-sm',
    md: 'modal-box',
    lg: 'modal-box max-w-4xl',
    xl: 'modal-box max-w-6xl',
    full: 'modal-box w-11/12 max-w-7xl'
  };

  function handleBackdropClick() {
    if (closeOnBackdrop && onclose) {
      onclose();
    }
  }

  function handleCloseClick() {
    if (onclose) {
      onclose();
    }
  }

  const modalClasses = $derived(twMerge(
    'modal',
    open && 'modal-open',
    className
  ));

  const boxClasses = $derived(sizeClasses[size]);
</script>

<div class={modalClasses} onclick={handleBackdropClick}>
  <div class={boxClasses} onclick={(e) => e.stopPropagation()}>
    {#if title || onclose}
      <div class="flex items-center justify-between mb-4">
        {#if title}
          <h3 class="font-bold text-lg">{title}</h3>
        {/if}
        {#if onclose}
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