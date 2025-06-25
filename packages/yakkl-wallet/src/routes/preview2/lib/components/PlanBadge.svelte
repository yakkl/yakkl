<script lang="ts">
  let { plan = 'Pro (Trial)', trialEnds = '2024-07-20', className = '' } = $props();

  let label = $state(plan);
  let showTrial = $state(plan.toLowerCase().includes('trial'));
  let trialText = $derived(showTrial ? `Trial ends: ${trialEnds}` : '');

  let badgeClass = $state(`inline-flex items-center px-2 py-0.5 rounded-full shadow text-[10px] font-semibold opacity-80 ${className} `);
  if (plan.includes('Pro')) {
    badgeClass += 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200';
  } else if (plan.includes('Founding')) {
    badgeClass += 'bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200';
  } else if (plan.includes('Early')) {
    badgeClass += 'bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200';
  } else {
    badgeClass += 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200';
  }

  $effect(() => {
    label = plan;
    showTrial = plan.toLowerCase().includes('trial');
    trialText = showTrial ? `Trial ends: ${trialEnds}` : '';
  });
</script>

<span class={badgeClass} title={trialText}>
  {label}
  {#if showTrial}
    <svg class="ml-1 w-2 h-2 animate-pulse text-red-400" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
  {/if}
</span>
