<script lang="ts">
  import SimpleTooltip from "$lib/components/SimpleTooltip.svelte";
  let {
    account = { username: '', address: '', ens: null, avatar: null },
    onManage = null, onTheme = null, onSettings = null, onLogout = null,
    className = ''
  } = $props();

  let menuOpen = $state(false);
  function shortAddr(addr: string | undefined) {
    return `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;
  }
  let username = account.ens || shortAddr(account.address);
</script>

<div class={`relative flex items-center justify-center ${className}`}>
  <button
    class="h-7 w-7 rounded-full bg-indigo-600 hover:ring-2 hover:ring-indigo-400 border border-indigo-200 dark:border-indigo-600 flex items-center justify-center"
    aria-label={`Manage account for ${username}`}
    onclick={() => menuOpen = !menuOpen}
    tabindex="0"
  >
    {#if account.avatar}
      <img src={account.avatar} alt="avatar" class="h-8 w-8 rounded-full object-cover" />
    {:else}
      <span class="text-white text-lg font-bold select-none">
        {account.ens ? account.ens[0].toUpperCase() : (account.address?.[2]?.toUpperCase() ?? "Y")}
      </span>
    {/if}
  </button>
  {#if menuOpen}
    <div class="absolute right-0 top-full mt-2 min-w-[170px] bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-[100] py-2 animate-in fade-in">
      <button class="block w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => {menuOpen = false; onManage && onManage();}}>Manage Account</button>
      <button class="block w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => {menuOpen = false; onSettings && onSettings();}}>Settings</button>
      <button class="block w-full text-left px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => {menuOpen = false; onTheme && onTheme();}}>Theme</button>
      <button class="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onclick={() => {menuOpen = false; onLogout && onLogout();}}>Logout</button>
    </div>
    <button class="fixed inset-0 z-40" style="background:transparent" aria-label="Close" onclick={() => menuOpen = false}></button>
  {/if}
</div>
