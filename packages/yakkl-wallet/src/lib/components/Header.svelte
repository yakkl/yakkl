<script lang="ts">
  import Brand from './Brand.svelte';
  import NetworkSwitcher from './NetworkSwitcher.svelte';
  import UserMenu from './UserMenu.svelte';

  let {
    logo = '/images/logoBullFav32x32.png',
    link = '/',
    account = { username: '', address: '', ens: null, avatar: null },
    selectedChain = null,
    chains = [],
    showTestnets = false,
    onSwitchChain = null,
    onManageAccount,
    onSettings,
    onTheme,
    onLogout,
    onEmergencyKit,
    onManageAccounts,
    className = ''
  } = $props();
</script>

<header class="relative w-full mx-auto flex items-center h-14 bg-white/90 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800 z-50">
  <!-- Brand Left -->
  <div class="absolute left-4 top-1/2 -translate-y-1/2">
    <a href={link}><Brand logo={logo} /></a>
  </div>

  <!-- Center: Network Switcher (true center!) -->
  <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
    <NetworkSwitcher
      chains={chains}
      selectedChain={selectedChain}
      showTestnets={showTestnets}
      onSwitch={onSwitchChain}
      className="yakkl-net-switcher"
    />
  </div>

  <!-- UserMenu right -->
  <div class="absolute right-4 top-1/2 -translate-y-1/2">
    <UserMenu
      account={account}
      onManage={onManageAccount}
      onSettings={onSettings}
      onTheme={onTheme}
      onLogout={onLogout}
      onEmergencyKit={onEmergencyKit}
      onManageAccounts={onManageAccounts}
    />
  </div>
</header>

