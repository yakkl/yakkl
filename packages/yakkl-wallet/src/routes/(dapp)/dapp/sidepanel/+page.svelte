<!-- Unified dapp side panel component -->
<script lang="ts">
  import DappSidePanel from '$lib/components/DappSidePanel.svelte';
</script>

<!-- Sidepanel requires a user action to open. It can't be opened programmatically. -->
<DappSidePanel />

<style>
  /* Ensure the side panel takes full height */
  :global(html, body) {
    height: 100%;
    margin: 0;
    padding: 0;
  }

  /* Custom scrollbar styling */
  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background-color: hsl(var(--p));
    border-radius: 3px;
  }

  /* Smooth transitions */
  :global(.flex-1) {
    transition: all 0.2s ease;
  }
</style>
