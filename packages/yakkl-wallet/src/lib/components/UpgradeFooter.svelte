<!-- File: src/lib/components/UpgradeFooter.svelte -->
<script lang="ts">
  let { onUpgrade, text = 'Unlock the rest of the world\'s insightful information by', buttonText = 'Upgrading today!' } = $props<{
    onUpgrade: () => void;
    text?: string;
    buttonText?: string;
  }>();
</script>

<div class="text-sm text-zinc-600 dark:text-zinc-400">
  {text}
  <button
    class="text-blue-600 dark:text-blue-400 hover:underline"
    onclick={onUpgrade}
  >
    {buttonText}
  </button>
</div>
