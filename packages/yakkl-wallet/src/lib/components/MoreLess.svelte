<script lang="ts">
  let {
    count = 1,
    text = "more",
    lessText = "less",
    expanded = false,
    className = "",
    onclick = null
  } = $props();
</script>

<button
  class={`flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 underline cursor-pointer select-none px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-zinc-700 transition ${className}`}
  type="button"
  onclick={onclick}
>
  {#if !expanded}
    <svg class="w-4 h-4 mr-1 fill-current text-blue-400 dark:text-blue-300" viewBox="0 0 20 20">
      <path d="M7 5l5 5-5 5" />
    </svg>
    + {count} {text}
  {:else}
    <svg class="w-4 h-4 mr-1 fill-current text-blue-400 dark:text-blue-300 transform -rotate-90" viewBox="0 0 20 20">
      <path d="M7 5l5 5-5 5" />
    </svg>
    {lessText}
  {/if}
</button>
