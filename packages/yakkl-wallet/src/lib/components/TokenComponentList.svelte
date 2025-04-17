<!-- File: src/lib/components/TokenList.svelte -->
<script lang="ts">
  let tokens = [
    { name: 'Ethereum', symbol: 'ETH', price: '$3,285' },
    { name: 'Bitcoin', symbol: 'BTC', price: '$64,530' },
    { name: 'Solana', symbol: 'SOL', price: '$156.42' }
  ];
</script>
<ul class="space-y-2">
  {#each tokens as token}
    <li class="flex justify-between text-sm border-b border-zinc-200 dark:border-zinc-700 pb-1">
      <span>{token.name} ({token.symbol})</span>
      <span class="font-medium">{token.price}</span>
    </li>
  {/each}
</ul>
