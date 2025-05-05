<!-- File: src/lib/components/Podcasts.svelte -->
<script lang="ts">
  let podcasts = [
    { title: 'Crypto Insights', host: 'Blockchain Daily' },
    { title: 'Market Watch', host: 'Crypto Weekly' }
  ];
</script>

<ul class="space-y-2">
  {#each podcasts as podcast}
    <li class="text-sm border-b border-zinc-200 dark:border-zinc-700 pb-1">
      <span class="font-medium">{podcast.title}</span>
      <span class="text-zinc-500"> - {podcast.host}</span>
    </li>
  {/each}
</ul>
