<script lang="ts">
  let { plan = 'Pro (Trial)', trialEnds = '2024-07-20', appName = 'YAKKL', className = '' } = $props();
</script>

<footer class={`yakkl-footer ${className}`}>
  <span class="inline-flex items-center px-2 py-0.5 rounded-full shadow text-[10px] font-semibold opacity-80
    bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
    {plan}{plan.includes('Trial') ? ` (ends: ${trialEnds})` : ''}
  </span>
  <span class="text-[10px] opacity-70 text-gray-400 dark:text-gray-500 select-none">
    © 2024 {appName}
  </span>
</footer>
