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
    <button class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white w-14 h-14 rounded-full shadow-lg text-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 hover:ring-1 hover:ring-indigo-400 transition">≡</button>
    <div class="absolute bottom-16 left-0 bg-zinc-100 dark:bg-zinc-800 rounded-full shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-14 flex flex-col items-center border border-zinc-200 dark:border-zinc-700">
      {#each items as item}
        <a href={item.href} class="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm mb-1">{item.icon}</a>
      {/each}
    </div>
  </div>
</div>
