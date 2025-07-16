<script lang="ts">
  import { canUseFeature } from '$lib/utils/features';

  let { className = '' } = $props();

  const items = [
    { href: '/home', icon: '🏠', label: 'Home', requiresFeature: null },
    { href: '/send', icon: '📤', label: 'Send', requiresFeature: 'send_tokens' },
    { href: '/swap', icon: '🔄', label: 'Swap', requiresFeature: 'swap_tokens' },
    { href: '/accounts', icon: '👤', label: 'Accounts', requiresFeature: null },
    { href: '/tokens', icon: '💠', label: 'Tokens', requiresFeature: null },
    { href: '/contacts', icon: '📇', label: 'Contacts', requiresFeature: null },
    { href: '/settings', icon: '⚙️', label: 'Settings', requiresFeature: null }
  ];

  // Filter items based on feature availability
  let visibleItems = $derived(items.filter(item =>
    !item.requiresFeature || canUseFeature(item.requiresFeature)
  ));
</script>

<div class={`${className}`}>
  <div class={`relative group w-14`}>
    <button class="yakkl-circle-button text-lg font-bold">☰</button>
    <div class="absolute bottom-12 left-0 bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-700 rounded-t-full py-2 z-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 w-14 flex flex-col items-center">
      {#each visibleItems as item}
        <a
          href={item.href}
          class="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm mb-1 transition-colors"
          title={item.label}
        >
          {item.icon}
        </a>
      {/each}
    </div>
  </div>
</div>
