<script lang="ts">
  let { className = '' } = $props();

  const items = [
    { href: '/preview2', icon: '🏠', label: 'Home' },
    { href: '/preview2/preferences', icon: '⚙️', label: 'Preferences' },
    { href: '/preview2/settings', icon: '🛠️', label: 'Settings' },
    { href: '/preview2/contacts', icon: '📇', label: 'Contacts' },
    { href: '/preview2/tokens', icon: '💠', label: 'Tokens' }
  ];
</script>

<div class={`${className}`}>
  <div class={`relative group w-14`}>
    <button class="yakkl-circle-button text-lg font-bold">☰</button>
    <div class="absolute bottom-16 left-0 yakkl-dropdown rounded-full py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-14 flex flex-col items-center">
      {#each items as item}
        <a href={item.href} class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm mb-1 transition-colors">{item.icon}</a>
      {/each}
    </div>
  </div>
</div>
