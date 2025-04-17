<!-- File: src/routes/sidepanel/+page.svelte -->
<script lang="ts">
  import TokenList from '$lib/components/TokenComponentList.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import NewsFeed from '$lib/components/NewsFeed.svelte';
  import Podcasts from '$lib/components/Podcasts.svelte';
  import { browser_ext, browserSvelte } from '$lib/common/environment';

  function openWallet() {
    if (browserSvelte) {
      browser_ext.runtime.sendMessage({type: 'popout'});
    }
  }
</script>

<div class="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
  <header class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
    <h1 class="text-lg font-bold">YAKKL Dashboard</h1>
    <button class="text-sm text-blue-600 dark:text-blue-400 underline" onclick={openWallet}>
      Open Wallet
    </button>
  </header>

  <Banner />

  <main class="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
    <section>
      <h2 class="text-md font-semibold mb-2">Token Prices</h2>
      <TokenList />
    </section>

    <section>
      <h2 class="text-md font-semibold mb-2">Latest News</h2>
      <NewsFeed />
    </section>

    <section class="hidden md:block">
      <h2 class="text-md font-semibold mb-2">Podcasts</h2>
      <Podcasts />
    </section>
    <div class="block md:hidden text-sm text-zinc-500 italic">
      More content available in expanded view.
    </div>
  </main>

  <footer class="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-center font-bold">
    YAKKL • <span class="text-zinc-500">Smart Wallet Insights</span>
  </footer>
</div>
