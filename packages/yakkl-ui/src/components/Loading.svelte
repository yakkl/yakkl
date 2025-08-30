<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface LoadingProps {
    type?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
    size?: 'xs' | 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
    className?: string;
  }

  const {
    type = 'spinner',
    size = 'md',
    text,
    fullScreen = false,
    className = ''
  }: LoadingProps = $props();

  const typeClasses = {
    spinner: 'loading-spinner',
    dots: 'loading-dots',
    ring: 'loading-ring',
    ball: 'loading-ball',
    bars: 'loading-bars',
    infinity: 'loading-infinity'
  };

  const sizeClasses = {
    xs: 'loading-xs',
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg'
  };

  $: loadingClasses = twMerge(
    'loading',
    typeClasses[type],
    sizeClasses[size]
  );

  $: containerClasses = twMerge(
    'flex flex-col items-center justify-center gap-4',
    fullScreen && 'fixed inset-0 bg-base-100/80 backdrop-blur-sm z-50',
    className
  );
</script>

<div class={containerClasses}>
  <span class={loadingClasses}></span>
  {#if text}
    <p class="text-base-content/70">{text}</p>
  {/if}
</div>