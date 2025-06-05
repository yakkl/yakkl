<script lang="ts">
  import SectionCard from './SectionCard.svelte';
  import LockIcon from './icons/LockIcon.svelte';
  import Tooltip from './Tooltip.svelte';
  import { cn } from '$lib/utils';

  let {
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
    children
  } = $props<{
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
    children: () => any;
  }>();
</script>

<SectionCard
  {title}
  {icon}
  {isPinned}
  {eye}
  {eyeTooltip}
  {className}
  {minHeight}
  {maxHeight}
>
  <div class="relative">
    <!-- The actual content -->
    <div class={cn("transition-all duration-300", locked && "blur-sm select-none pointer-events-none")}>
      {@render children()}
    </div>

    {#if locked}
      <!-- Overlay with lock icon, message, and optional button -->
      <div class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-900/70 text-center p-4 rounded-xl z-10">
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
    {/if}
  </div>
</SectionCard>
