<script lang="ts">
  const props = $props<{
    username?: string;
    url?: string;
    className?: string;
    ariaLabel?: string;
  }>();

  const initial = props.username?.charAt(0)?.toUpperCase() ?? '?';

  // Default styles (can be extended or overridden by props.className)
  const defaultClasses =
    'w-10 h-10 rounded-full ring-2 ring-offset-1 flex items-center justify-center text-sm font-bold uppercase bg-primary-300 text-base-content';
</script>

{#if props.url}
  <img
    src={props.url}
    alt={props.ariaLabel ?? 'User avatar'}
    class={`object-cover ${props.className ?? defaultClasses}`}
    loading="lazy"
  />
{:else}
  <div
    class={props.className ?? defaultClasses}
    aria-label={props.ariaLabel ?? 'User avatar'}
    role="img"
  >
    {initial}
  </div>
{/if}
