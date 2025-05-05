<!-- File: src/lib/components/icons/TokenIcon.svelte -->
<script lang="ts">
  let { className = '' } = $props<{
    className?: string;
  }>();
</script>

<!-- <svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 2v20" />
  <path d="M2 12h20" />
</svg> -->

<img class={className} src="data:image/png;base64,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" alt="chip--v1">
