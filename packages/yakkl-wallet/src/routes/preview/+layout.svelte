<script lang="ts">
  import ThemeToggle from './components/ThemeToggle.svelte';
  import DockLauncher from './components/DockLauncher.svelte';
  import AIHelpButton from './components/AIHelpButton.svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<main class="min-h-screen bg-zinc-900 text-white relative overflow-hidden">
  <div class="h-full overflow-y-auto pb-20">
    {@render children?.()}
  </div>

  <DockLauncher />
  <AIHelpButton />
</main>

<style>
  :global(body) {
    margin: 0;
    background-color: #0e0e11;
  }
</style>
