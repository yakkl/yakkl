<script lang="ts">
  let { planType = 'Pro (Trial)', trialEnds = null, className = '' } = $props();

  let label = $state(planType);
  let showTrial = $state(trialEnds ? new Date(trialEnds) > new Date() : false);
  let trialText = $derived(showTrial ? `Trial ends: ${trialEnds}` : '');

  let badgeClass = $state(`inline-flex items-center px-2 py-0.5 rounded-full shadow text-[10px] font-semibold opacity-80 ${className} `);
  if (planType.includes('pro')) {
    badgeClass += 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200';
  } else if (planType.includes('founding')) {
    badgeClass += 'bg-yellow-50 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200';
  } else if (planType.includes('early')) {
    badgeClass += 'bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200';
  } else {
    badgeClass += 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200';
  }

  $effect(() => {
    label = planType;
    showTrial = trialEnds ? new Date(trialEnds) > new Date() : false;
    trialText = showTrial ? `Trial ends: ${trialEnds}` : '';
  });
</script>

{#if showTrial}
  <span class={badgeClass} title={trialText}>
    {label}
      <svg class="ml-1 w-2 h-2 animate-pulse text-red-400" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
  </span>
{/if}
