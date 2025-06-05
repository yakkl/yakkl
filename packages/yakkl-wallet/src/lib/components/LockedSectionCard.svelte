<script lang="ts">
  import SectionCard from './SectionCard.svelte';
  import LockIcon from './icons/LockIcon.svelte';
  import Tooltip from './Tooltip.svelte';
  import { cn } from '$lib/utils';

  let {
    show = $bindable(true),
    locked = false,
    lockMessage = "Upgrade to unlock this feature",
    showButton = true,
    onComplete = () => {},
    title,
    icon,
    isPinned,
    eye,
    eyeTooltip,
    className,
    minHeight,
    maxHeight,
    footer,
    footerProps = {},
    lockedFooter,
    lockedFooterProps = {},
    children
  } = $props<{
    show?: boolean;
    locked?: boolean;
    lockMessage?: string | (() => string);
    showButton?: boolean;
    onComplete?: () => void;
    title: string;
    icon?: any;
    className?: string;
    isPinned?: boolean;
    eye?: boolean;
    eyeTooltip?: string;
    minHeight?: string;
    maxHeight?: string;
    footer?: any;
    footerProps?: Record<string, any>;
    lockedFooter?: any;
    lockedFooterProps?: Record<string, any>;
    children: () => any;
  }>();
</script>

{#if show}
<SectionCard
  bind:show={show}
  {title}
  {icon}
  {isPinned}
  {eye}
  {eyeTooltip}
  {className}
  {minHeight}
  {maxHeight}
  {footer}
  {footerProps}
  {lockedFooter}
  {lockedFooterProps}
  {locked}
>
  <div class="relative">
    <!-- The actual content -->
    <div class={cn("transition-all duration-300", locked && "blur-sm select-none pointer-events-none")}>
      {@render children()}
    </div>

    {#if locked}
      <!-- Overlay with lock icon, message, and optional button -->
      <div class="absolute inset-0 flex flex-col items-center bg-white/80 dark:bg-zinc-900/70 text-center py-4 rounded-xl z-10">
        <div class="sticky top-0 w-full flex flex-col items-center bg-white/80 dark:bg-zinc-900/70 backdrop-blur-sm py-1">
          <LockIcon className="w-6 h-6 text-zinc-500 mb-2" />
          <div class="text-zinc-800 dark:text-zinc-200 text-sm mb-2">
            {typeof lockMessage === 'function' ? lockMessage() : lockMessage}
          </div>
          {#if showButton}
            <button
              class="mt-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition"
              onclick={() => onComplete()}
            >
              Upgrade Now
            </button>
          {/if}
          <Tooltip content="Available with YAKKL Pro">
            <span class="text-xs text-zinc-500 mt-2 cursor-help underline">Why is this locked?</span>
          </Tooltip>
        </div>
      </div>
    {/if}
  </div>
</SectionCard>
{/if}
