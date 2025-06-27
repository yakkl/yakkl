<script lang="ts">
	import Copyright from "./Copyright.svelte";

  let { planType = 'Pro (Trial)', trialEnds = '2024-07-20', appName = 'YAKKL', className = '' } = $props();
</script>

<footer class={`yakkl-footer ${className}`}>
  <Copyright {planType} />
</footer>
