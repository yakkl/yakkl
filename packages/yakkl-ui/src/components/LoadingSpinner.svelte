<!-- LoadingSpinner.svelte -->
<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface Props {
    show?: boolean;
    message?: string;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    variant?: 'spinner' | 'dots' | 'pulse' | 'ring';
    color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  }

  let {
    show = true,
    message = '',
    className = '',
    size = 'md',
    variant = 'spinner',
    color = 'primary'
  }: Props = $props();

  const sizeClasses = $derived({
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }[size]);

  const colorClasses = $derived({
    primary: 'border-primary border-t-primary/30',
    secondary: 'border-secondary border-t-secondary/30',
    accent: 'border-accent border-t-accent/30',
    neutral: 'border-neutral border-t-neutral/30',
    info: 'border-info border-t-info/30',
    success: 'border-success border-t-success/30',
    warning: 'border-warning border-t-warning/30',
    error: 'border-error border-t-error/30'
  }[color]);

  const dotColorClasses = $derived({
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    accent: 'bg-accent',
    neutral: 'bg-neutral',
    info: 'bg-info',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error'
  }[color]);

  const containerClasses = $derived(
    twMerge('flex flex-col items-center justify-center gap-2', className)
  );
</script>

{#if show}
  <div class={containerClasses}>
    {#if variant === 'spinner'}
      <div class="animate-spin rounded-full border-2 {colorClasses} {sizeClasses}"></div>
    {:else if variant === 'dots'}
      <div class="flex space-x-1">
        {#each [0, 0.1, 0.2] as delay}
          <div
            class="w-2 h-2 rounded-full animate-bounce {dotColorClasses}"
            style="animation-delay: {delay}s"
          ></div>
        {/each}
      </div>
    {:else if variant === 'pulse'}
      <div class="rounded-full animate-pulse {dotColorClasses} {sizeClasses}"></div>
    {:else if variant === 'ring'}
      <div class="relative {sizeClasses}">
        <div class="absolute inset-0 rounded-full border-2 {colorClasses} animate-spin"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent border-r-current {colorClasses} animate-spin" style="animation-duration: 1.5s"></div>
      </div>
    {/if}

    {#if message}
      <span class="text-sm text-base-content/70">{message}</span>
    {/if}
  </div>
{/if}