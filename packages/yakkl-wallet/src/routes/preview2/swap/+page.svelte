<script lang="ts">
  let fromToken = 'ETH';
  let toToken = 'USDT';
  let amount = '';
</script>

<div class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Swap Tokens</h1>
  <div>
    <label for="from-token" class="block text-sm mb-1">From</label>
    <select id="from-token" bind:value={fromToken} class="w-full p-2 bg-zinc-800 rounded text-white">
      <option>ETH</option>
      <option>PEPE</option>
      <option>USDT</option>
    </select>
  </div>
  <div>
    <label for="to-token" class="block text-sm mb-1">To</label>
    <select id="to-token" bind:value={toToken} class="w-full p-2 bg-zinc-800 rounded text-white">
      <option>USDT</option>
      <option>USDC</option>
      <option>DAI</option>
    </select>
  </div>
  <div>
    <label for="swap-amount" class="block text-sm mb-1">Amount</label>
    <input id="swap-amount" type="text" bind:value={amount} placeholder="0.00" class="w-full p-2 bg-zinc-800 rounded text-white" />
  </div>
  <button class="w-full bg-purple-600 hover:bg-purple-700 p-3 rounded-xl">Swap</button>
</div>
