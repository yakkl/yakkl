<script lang="ts">
  import ThemeToggle from './components/ThemeToggle.svelte';

  let tokens = [
    { symbol: 'ETH', value: 40.28, icon: '🦊' },
    { symbol: 'PEPE', value: 432.37, icon: '🐸' },
    { symbol: 'USDT', value: 297.92, icon: '💵' },
    { symbol: 'USDC', value: 280.83, icon: '💰' },
    { symbol: 'DAI', value: 123.45, icon: '🪙' },
    { symbol: 'LINK', value: 56.78, icon: '🔗' },
  ];

  let accounts: any = [
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
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <div class="text-xs text-gray-400">Account</div>
      <div class="text-lg font-semibold">YAKKL</div>
      <div class="text-xs text-gray-500">{currentAccount.ens || shortAddr(currentAccount.address)}</div>
      <a href="/preview/accounts" class="text-blue-400 text-xs hover:underline">Switch Account</a>
    </div>
    <div class="flex items-center space-x-2">
      <div class="w-8 h-8"><ThemeToggle className="w-8 h-8" /></div>
      <div class="text-sm bg-red-700 text-white px-2 py-1 rounded">LIVE-MAINNET</div>
    </div>
  </div>

  <!-- Portfolio Summary -->
  <div class="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-xl shadow-md animate-pulse hover:animate-none transition">
    <div class="text-sm">Total Portfolio</div>
    <div class="text-2xl font-bold">$1,189.64</div>
    <div class="text-xs text-gray-100 mt-1">Last updated: 3:58 PM</div>
  </div>

  <!-- Action Buttons -->
  <div class="grid grid-cols-3 gap-3">
    <a href="/preview/send" class="bg-green-600 hover:bg-green-700 p-3 rounded-xl shadow text-center transition-transform hover:scale-105">Send</a>
    <a href="/preview/swap" class="bg-purple-600 hover:bg-purple-700 p-3 rounded-xl shadow text-center transition-transform hover:scale-105">Swap</a>
    <button class="bg-blue-600 hover:bg-blue-700 p-3 rounded-xl shadow transition-transform hover:scale-105">Buy</button>
  </div>

  <!-- Token Portfolio -->
  <div class="bg-zinc-800 p-4 rounded-xl shadow">
    <div class="text-sm font-medium mb-2">Token Portfolio</div>
    <div class="grid grid-cols-2 gap-4">
      {#each tokens.slice(0, 4) as token}
        <div class="bg-zinc-700 p-3 rounded-xl flex items-center space-x-2 hover:bg-zinc-600 transition">
          <div class="text-xl">{token.icon}</div>
          <div>
            <div class="font-semibold">{token.symbol}</div>
            <div class="text-sm text-gray-300">${token.value.toFixed(2)}</div>
          </div>
        </div>
      {/each}
    </div>
    {#if tokens.length > 4}
      <details class="mt-3">
        <summary class="text-sm text-blue-400 cursor-pointer">+ {tokens.length - 4} more</summary>
        <div class="grid grid-cols-2 gap-4 mt-2">
          {#each tokens.slice(4) as token}
            <div class="bg-zinc-700 p-3 rounded-xl flex items-center space-x-2 hover:bg-zinc-600 transition">
              <div class="text-xl">{token.icon}</div>
              <div>
                <div class="font-semibold">{token.symbol}</div>
                <div class="text-sm text-gray-300">${token.value.toFixed(2)}</div>
              </div>
            </div>
          {/each}
        </div>
      </details>
    {/if}
  </div>
</div>
