<script lang="ts">
  export const prerender = false;

  let recipient = '';
  let amount = '';
</script>

<div class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Send Tokens</h1>
  <div>
    <label class="block text-sm mb-1">Recipient Address</label>
    <input type="text" bind:value={recipient} placeholder="0x..." class="w-full p-2 bg-zinc-800 rounded text-white" />
  </div>
  <div>
    <label class="block text-sm mb-1">Amount</label>
    <input type="text" bind:value={amount} placeholder="0.00" class="w-full p-2 bg-zinc-800 rounded text-white" />
  </div>
  <button class="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl">Send</button>
</div>
