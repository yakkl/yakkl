<script lang="ts">
  let accounts = [
    { address: '0xabc1234567890abcdef', ens: null },
    { address: '0xdef4567890abcdefabc', ens: 'bob.eth' }
  ];

  let currentAccount = accounts[0];

  function useAccount(account: any) {
    currentAccount = account;
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
</script>

<div class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Select Account</h1>
  <div class="space-y-2">
    {#each accounts as acct}
      <div class="bg-zinc-800 p-3 rounded flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold">{acct.ens || shortAddr(acct.address)}</div>
          <div class="text-xs text-gray-400">{acct.address}</div>
        </div>
        {#if acct === currentAccount}
          <span class="text-green-500 text-sm">✓ Current</span>
        {:else}
          <button onclick={() => useAccount(acct)} class="text-blue-400 text-sm hover:underline">Use</button>
        {/if}
      </div>
    {/each}
  </div>
</div>
