<script lang="ts">
	import Copyright from "./Copyright.svelte";
	import HealthMonitor from "./HealthMonitor.svelte";

  let { planType = 'Pro (Trial)', trialEnds = '2025-07-20', appName = 'YAKKL', className = '' } = $props();
</script>

<footer class={`yakkl-footer py-4 bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 ${className}`}>
  <div class="flex items-center justify-between px-4">
    <!-- Copyright on the left/center -->
    <div class="flex-1">
      <Copyright {planType} />
    </div>
    
    <!-- Health Monitor on the right -->
    <HealthMonitor className="ml-4" />
  </div>
</footer>
