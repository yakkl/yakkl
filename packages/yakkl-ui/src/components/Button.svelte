<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface ButtonProps extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link' | 'error' | 'warning' | 'success';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    outline?: boolean;
    className?: string;
  }

  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    outline = false,
    className = '',
    children,
    onclick,
    ...restProps
  }: ButtonProps = $props();

  const baseClasses = 'btn transition-all duration-200';
  
  const variantClasses = {
    primary: outline ? 'btn-outline btn-primary' : 'btn-primary',
    secondary: outline ? 'btn-outline btn-secondary' : 'btn-secondary',
    accent: outline ? 'btn-outline btn-accent' : 'btn-accent',
    ghost: 'btn-ghost',
    link: 'btn-link',
    error: outline ? 'btn-outline btn-error' : 'btn-error',
    warning: outline ? 'btn-outline btn-warning' : 'btn-warning',
    success: outline ? 'btn-outline btn-success' : 'btn-success'
  };

  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  };

  $: computedClasses = twMerge(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    loading && 'loading',
    className
  );
</script>

<button
  class={computedClasses}
  {disabled}
  {onclick}
  {...restProps}
>
  {#if loading}
    <span class="loading loading-spinner"></span>
  {/if}
  {@render children?.()}
</button>