<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface CardProps {
    title?: string;
    subtitle?: string;
    bordered?: boolean;
    compact?: boolean;
    className?: string;
    bodyClassName?: string;
    children?: any;
    actions?: any;
  }

  const {
    title,
    subtitle,
    bordered = false,
    compact = false,
    className = '',
    bodyClassName = '',
    children,
    actions
  }: CardProps = $props();

  $: cardClasses = twMerge(
    'card bg-base-100',
    bordered && 'card-bordered',
    compact && 'card-compact',
    className
  );

  $: bodyClasses = twMerge(
    'card-body',
    bodyClassName
  );
</script>

<div class={cardClasses}>
  <div class={bodyClasses}>
    {#if title || subtitle}
      <div class="card-title flex-col items-start">
        {#if title}
          <h2 class="text-xl font-bold">{title}</h2>
        {/if}
        {#if subtitle}
          <p class="text-sm text-base-content/70">{subtitle}</p>
        {/if}
      </div>
    {/if}
    
    {@render children?.()}
    
    {#if actions}
      <div class="card-actions justify-end mt-4">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>