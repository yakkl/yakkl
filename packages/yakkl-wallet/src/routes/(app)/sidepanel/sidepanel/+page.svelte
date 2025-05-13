<!-- File: src/routes/sidepanel/+page.svelte -->
<script lang="ts">
  import TokenListComponentList from '$lib/components/TokenComponentList.svelte';
  import RotatingBanner from '$lib/components/RotatingBanner.svelte';
  import NewsFeed from '$lib/components/NewsFeed.svelte';
  import Podcasts from '$lib/components/Podcasts.svelte';
  import SectionCard from '$lib/components/SectionCard.svelte';
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import WalletIcon from '$lib/components/icons/WalletIcon.svelte';
  import TokenIcon from '$lib/components/icons/TokenIcon.svelte';
  import NewsIcon from '$lib/components/icons/NewsIcon.svelte';
  import PodcastIcon from '$lib/components/icons/PodcastIcon.svelte';
	import TokenNewsTradingView from '$lib/components/TokenNewsTradingView.svelte';
	import { onMount } from 'svelte';
	import { getSettings, setYakklCombinedTokenStorage, updateCombinedTokenStore, yakklCombinedTokenStore } from '$lib/common/stores';
	import { loadDefaultTokens } from '$lib/plugins/tokens/loadDefaultTokens';
	import { get } from 'svelte/store';

  function openWallet() {
    if (browserSvelte) {
      browser_ext.runtime.sendMessage({type: 'popout'});
    }
  }

  // DO NOT REMOVE THESE BANNER ITEMS NOR COMMENTS
  const bannerItems = [
    {
      type: 'banner' as const,
      title: 'Welcome to YAKKL',
      message: 'Your secure crypto wallet',
      // ctaText: 'UPGRADE',
      // onCallToAction: (index: number) => {
      //   console.log('Upgrade clicked for item at index:', index);
      // }
    },
    // {
    //   type: 'ad' as const,
    //   useGoogleAd: false,
    //   customContent: (index: number) => `
    //     <div class="card w-full glass">
    //       <figure class="mt-1"><img src="/images/logoBull32x32.png" alt="token"/></figure>
    //       <div class="card-body">
    //         <h2 class="card-title">PROMOTION</h2>
    //         <p>Upgrade to Pro plan and never see an AD again!</p>
    //         <div class="card-actions justify-end">
    //           <button
    //             class="btn btn-primary yakkl-upgrade-btn"
    //             data-index="${index}"
    //           >
    //             UPGRADE
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   `,
    //   onCallToAction: (index: number) => {
    //     console.log('Ad upgrade clicked for item at index:', index);
    //     // Handle ad upgrade
    //   }
    // }
  ];

  // Example of how to handle onCallToAction in a single function
  // Define a single handler function
  // function handleCallToAction(index: number) {
  //   console.log('Upgrade clicked for item at index:', index);
  //   // Handle all upgrade actions in one place
  //   // You can use the index to determine which item was clicked
  //   // and take appropriate action
  // }

  // const bannerItems = [
  //   {
  //     type: 'banner' as const,
  //     title: 'Welcome to YAKKL',
  //     message: 'Your secure crypto wallet',
  //     ctaText: 'UPGRADE',
  //     onCallToAction: handleCallToAction  // Reference the same function
  //   },
  //   {
  //     type: 'ad' as const,
  //     useGoogleAd: false,
  //     customContent: (index: number) => `...`,
  //     onCallToAction: handleCallToAction  // Reference the same function
  //   }
  // ];

  // Add event listener for the custom event. This method passes the CSP test.
  // if (browserSvelte) {
  //   document.addEventListener('click', (event) => {
  //     const target = event.target as HTMLElement;
  //     if (target.classList.contains('yakkl-upgrade-btn')) {
  //       const index = parseInt(target.getAttribute('data-index') || '0', 10);
  //       console.log('Upgrade button clicked with index:', index);
  //       if (bannerItems[index]?.onCallToAction) {
  //         bannerItems[index].onCallToAction(index);
  //       }
  //     }
  //   });
  // }

  onMount(async() => {
    const settings = await getSettings();
    if (!settings.init || !settings.legal.termsAgreed) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      await loadDefaultTokens(); // This should have been handled by the background listener but just in case
      updateCombinedTokenStore();
      await setYakklCombinedTokenStorage(get(yakklCombinedTokenStore));
    }
  });
</script>

<div class="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
  <header class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
    <h1 class="text-lg font-bold">YAKKL Dashboard</h1>
    <button onclick={openWallet} class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all">
      <WalletIcon className="w-5 h-5" />
      Open Wallet
    </button>
  </header>

  <RotatingBanner items={bannerItems} autoRotate={false} showControls={false} />

  <main class="flex-1 overflow-y-auto px-4 pb-4">
    <!-- Grid container for cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
      <!-- Token Prices Card -->
      <SectionCard
        title="Token Prices"
        icon={TokenIcon}
        isPinned={false}
        eye={true}
        eyeTooltip="Toggle visibility of balances"
        minHeight="250px"
        maxHeight="500px"
      >
        <TokenListComponentList maxVisibleTokens={3} />
      </SectionCard>

      <!-- News Card -->
      <SectionCard
        title="Latest News"
        icon={NewsIcon}
        minHeight="250px"
        maxHeight="500px"
      >
        <!-- <NewsFeed maxVisibleItems={3} /> -->
        <TokenNewsTradingView />
      </SectionCard>

      <!-- Podcasts Card -->
      <SectionCard
        title="Podcasts"
        icon={PodcastIcon}
        minHeight="250px"
        maxHeight="500px"
      >
        <Podcasts maxVisibleItems={3} />
      </SectionCard>
    </div>

    <!-- Chart Section (for expanded view) -->
    <div class="hidden md:block mt-4">
      <SectionCard
        title="Market Overview"
        minHeight="300px"
        maxHeight="600px"
      >
        <!-- Chart component will go here -->
        <div class="h-[300px] flex items-center justify-center text-zinc-500">
          Chart coming soon...
        </div>
      </SectionCard>
    </div>
  </main>

  <footer class="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-center font-bold">
    YAKKL • <span class="text-zinc-500">Smart Wallet Insights</span>
  </footer>
</div>
