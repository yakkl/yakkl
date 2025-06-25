<script lang="ts">
  export const prerender = false;

  let fromToken = 'ETH';
  let toToken = 'USDT';
  let amount = '';
</script>

<div class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Swap Tokens</h1>
  <div>
    <label class="block text-sm mb-1">From</label>
    <select bind:value={fromToken} class="w-full p-2 bg-zinc-800 rounded text-white">
      <option>ETH</option>
      <option>PEPE</option>
      <option>USDT</option>
    </select>
  </div>
  <div>
    <label class="block text-sm mb-1">To</label>
    <select bind:value={toToken} class="w-full p-2 bg-zinc-800 rounded text-white">
      <option>USDT</option>
      <option>USDC</option>
      <option>DAI</option>
    </select>
  </div>
  <div>
    <label class="block text-sm mb-1">Amount</label>
    <input type="text" bind:value={amount} placeholder="0.00" class="w-full p-2 bg-zinc-800 rounded text-white" />
  </div>
  <button class="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-xl">Swap</button>
</div>
