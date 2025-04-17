<!-- File: src/lib/components/NewsFeed.svelte -->
<script lang="ts">
  let news = [
    { title: 'Latest Crypto News', source: 'Crypto Daily' },
    { title: 'Market Analysis', source: 'Blockchain Weekly' }
  ];
</script>

<ul class="space-y-2">
  {#each news as item}
    <li class="text-sm border-b border-zinc-200 dark:border-zinc-700 pb-1">
      <span class="font-medium">{item.title}</span>
      <span class="text-zinc-500"> - {item.source}</span>
    </li>
  {/each}
</ul>
