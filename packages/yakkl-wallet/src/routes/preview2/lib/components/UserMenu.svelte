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
    <div class="absolute right-0 top-full mt-2 min-w-[170px] yakkl-dropdown animate-in fade-in">
      <button class="yakkl-dropdown-item" onclick={() => {menuOpen = false; onManage && onManage();}}>Manage Account</button>
      <button class="yakkl-dropdown-item" onclick={() => {menuOpen = false; onSettings && onSettings();}}>Settings</button>
      <button class="yakkl-dropdown-item" onclick={() => {menuOpen = false; onTheme && onTheme();}}>Theme</button>
      <button class="yakkl-dropdown-item text-red-500 dark:text-red-400" onclick={() => {menuOpen = false; onLogout && onLogout();}}>Logout</button>
    </div>
    <button class="fixed inset-0 z-40" style="background:transparent" aria-label="Close" onclick={() => menuOpen = false}></button>
  {/if}
</div>
