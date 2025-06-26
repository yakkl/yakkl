<script lang="ts">
  const items = [
    { href: '/preview2', icon: '🏠', label: 'Home' },
    { href: '/preview/preferences', icon: '⚙️', label: 'Preferences' },
    { href: '/preview/settings', icon: '🛠️', label: 'Settings' },
    { href: '/preview/contacts', icon: '📇', label: 'Contacts' },
    { href: '/preview/tokens', icon: '💠', label: 'Tokens' }
  ];
</script>

<div class="fixed bottom-4 left-4">
  <div class="relative group w-14">
    <button class="bg-zinc-900 text-white w-14 h-14 rounded-full shadow-lg text-xl flex items-center justify-center">≡</button>
    <div class="absolute bottom-16 left-0 bg-zinc-900 rounded-full shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-14 flex flex-col items-center">
      {#each items as item}
        <a href={item.href} class="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-zinc-800 text-sm mb-1">{item.icon}</a>
      {/each}
    </div>
  </div>
</div>
