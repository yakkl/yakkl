<script lang="ts">
  import SimpleTooltip from "$lib/components/SimpleTooltip.svelte";
  import { currentAccount } from '../stores/account.store';
  import { currentPlan } from '../stores/plan.store';
  
  let {
    account = { username: '', address: '', ens: null, avatar: null },
    onManage = null, onTheme = null, onSettings = null, onLogout = null,
    className = ''
  } = $props();
  
  // Use store data if available
  let storeAccount = $derived($currentAccount);
  let plan = $derived($currentPlan);
  
  let effectiveAccount = $derived(() => {
    return storeAccount || account;
  });

  let menuOpen = $state(false);
  function shortAddr(addr: string | undefined) {
    return `${addr?.slice(0, 6)}...${addr?.slice(-4)}`;
  }
  let username = $derived(() => {
    const acc = effectiveAccount;
    return acc.ens || acc.username || shortAddr(acc.address);
  });
  
  let displayName = $derived(() => {
    const acc = effectiveAccount;
    if (acc.ens) return acc.ens;
    if (acc.username) return acc.username;
    return shortAddr(acc.address);
  });
  
  let avatarInitial = $derived(() => {
    const acc = effectiveAccount;
    if (acc.ens) return acc.ens[0].toUpperCase();
    if (acc.username) return acc.username[0].toUpperCase();
    return acc.address?.[2]?.toUpperCase() ?? "Y";
  });
</script>

<div class={`relative flex items-center justify-center ${className}`}>
  <button
    class="h-7 w-7 rounded-full bg-indigo-600 hover:ring-2 hover:ring-indigo-400 border border-indigo-200 dark:border-indigo-600 flex items-center justify-center"
    aria-label={`Manage account for ${username()}`}
    title={`${displayName()} (${plan})`}
    onclick={() => menuOpen = !menuOpen}
    tabindex="0"
  >
    {#if effectiveAccount.avatar}
      <img src={effectiveAccount.avatar} alt="avatar" class="h-8 w-8 rounded-full object-cover" />
    {:else}
      <span class="text-white text-lg font-bold select-none">
        {avatarInitial()}
      </span>
    {/if}
  </button>
  {#if menuOpen}
    <!-- Backdrop overlay for click-outside functionality -->
    <div 
      class="fixed inset-0 z-40 bg-transparent" 
      onclick={() => menuOpen = false}
      onkeydown={(e) => e.key === 'Escape' && (menuOpen = false)}
      role="button"
      tabindex="0"
      aria-label="Close menu"
    ></div>
    
    <!-- Dropdown menu -->
    <div class="absolute right-0 top-full mt-2 min-w-[200px] yakkl-dropdown animate-in fade-in z-50">
      <!-- Account Info Header -->
      <div class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
        <div class="flex items-center gap-3">
          {#if effectiveAccount.avatar}
            <img src={effectiveAccount.avatar} alt="avatar" class="w-8 h-8 rounded-full object-cover" />
          {:else}
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
              {avatarInitial()}
            </div>
          {/if}
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{displayName()}</div>
            <div class="text-xs text-zinc-500 truncate">{shortAddr(effectiveAccount.address)}</div>
            <div class="text-xs text-indigo-600 dark:text-indigo-400 capitalize">{plan} Plan</div>
          </div>
        </div>
      </div>
      
      <!-- Menu Items -->
      <div class="py-1">
        <button class="yakkl-dropdown-item flex items-center gap-2" onclick={() => {menuOpen = false; onManage && onManage();}}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Manage Account
        </button>
        <button class="yakkl-dropdown-item flex items-center gap-2" onclick={() => {menuOpen = false; onSettings && onSettings();}}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        <button class="yakkl-dropdown-item flex items-center gap-2" onclick={() => {menuOpen = false; onTheme && onTheme();}}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          Toggle Theme
        </button>
        <div class="border-t border-zinc-200 dark:border-zinc-700 my-1"></div>
        <button class="yakkl-dropdown-item text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-2" onclick={() => {menuOpen = false; onLogout && onLogout();}}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  {/if}
</div>
