<script lang="ts">
	import Copyright from "./Copyright.svelte";

  let { planType = 'Pro (Trial)', trialEnds = '2025-07-20', appName = 'YAKKL', className = '' } = $props();
</script>

<footer class={`yakkl-footer py-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 ${className}`}>
  <Copyright {planType} />
</footer>
