<!-- Card.svelte -->
<script lang="ts">
  import { twMerge } from 'tailwind-merge';
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    className?: string;
    bordered?: boolean;
    compact?: boolean;
    side?: boolean;
    glass?: boolean;
    image?: string;
    imageAlt?: string;
    imageFull?: boolean;
    bodyClassName?: string;
    children?: Snippet;
    actions?: Snippet;
    figure?: Snippet;
  }

  let {
    title = '',
    className = '',
    bordered = false,
    compact = false,
    side = false,
    glass = false,
    image = '',
    imageAlt = '',
    imageFull = false,
    bodyClassName = '',
    children,
    actions,
    figure
  }: Props = $props();

  const cardClasses = $derived(
    twMerge(
      'card bg-base-100',
      bordered && 'card-bordered',
      compact && 'card-compact',
      side && 'card-side',
      glass && 'glass',
      className
    )
  );

  const bodyClasses = $derived(
    twMerge('card-body', bodyClassName)
  );

  const imageClasses = $derived(
    imageFull ? 'w-full' : ''
  );
</script>

<div class={cardClasses}>
  {#if figure}
    <figure>
      {@render figure()}
    </figure>
  {:else if image}
    <figure class={imageFull ? '' : 'px-10 pt-10'}>
      <img src={image} alt={imageAlt} class={imageClasses} />
    </figure>
  {/if}
  
  <div class={bodyClasses}>
    {#if title}
      <h2 class="card-title">{title}</h2>
    {/if}
    
    {#if children}
      {@render children()}
    {/if}
    
    {#if actions}
      <div class="card-actions justify-end">
        {@render actions()}
      </div>
    {/if}
  </div>
</div>