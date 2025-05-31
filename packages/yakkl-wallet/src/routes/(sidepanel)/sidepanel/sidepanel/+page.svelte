<!-- File: src/routes/sidepanel/+page.svelte -->
<script lang="ts">
  import TokenListComponentList from '$lib/components/TokenComponentList.svelte';
  import RotatingBanner from '$lib/components/RotatingBanner.svelte';
  import SectionCard from '$lib/components/SectionCard.svelte';
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import WalletIcon from '$lib/components/icons/WalletIcon.svelte';
  import TokenIcon from '$lib/components/icons/TokenIcon.svelte';
  import NewsIcon from '$lib/components/icons/NewsIcon.svelte';
  import ToolIcon from '$lib/components/icons/ToolIcon.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { getSettings, setYakklCombinedTokenStorage, updateCombinedTokenStore, yakklCombinedTokenStore } from '$lib/common/stores';
	import { loadDefaultTokens } from '$lib/plugins/tokens/loadDefaultTokens';
	import { get } from 'svelte/store';
	import ExtensionRSSNewsFeed from '$lib/components/ExtensionRSSNewsFeed.svelte';
	import CalcIcon from '$lib/components/icons/CalcIcon.svelte';
	// import FiatIcon from '$lib/components/icons/FiatIcon.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import EthUnitConverter from '$lib/components/EthUnitConverter.svelte';
	// import TokenFiatConverter from '$lib/components/TokenFiatConverter.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { setBadgeText } from '$lib/utilities/utilities';
	import Copyright from '$lib/components/Copyright.svelte';
	import BookmarkedArticles from '$lib/components/BookmarkedArticles.svelte';

  let showEthConverter = $state(false);
  let showTokenFiatConverter = $state(false);
  let init = $state(false);

  let storageListener: { (changes: any, areaName: any): void; (changes: { [key: string]: chrome.storage.StorageChange; }, areaName: string): void; };

  // List of crypto news RSS feeds
  const cryptoFeeds = [
    'https://cointelegraph.com/rss/?utm_source=yakkl&utm_medium=extension',
    'https://www.coindesk.com/arc/outboundfeeds/rss/?utm_source=yakkl&utm_medium=extension',
    'https://cryptonews.com/news/feed/?utm_source=yakkl&utm_medium=extension'
  ];

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
    // #region example of an ad
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
    // #endregion
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
    try {
      const settings = await getSettings();
      if (!settings.init || !settings.legal.termsAgreed) {
        init = false;
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
        await setBadgeText('');
        await loadDefaultTokens(); // This should have been handled by the background listener but just in case
        updateCombinedTokenStore();
        await setYakklCombinedTokenStorage(get(yakklCombinedTokenStore));

        // Listen for storage changes
        storageListener = (changes: any, areaName: any) => {
          if (changes.init && changes.init.newValue !== undefined) {
            init = changes.init.newValue;
          }
        };
        chrome.storage.onChanged.addListener(storageListener as any);
      } else {
        init = true;
      }
    } catch (error) {
      log.error('Error initializing sidepanel:', false,error);
    }
  });

  onDestroy(() => {
    // Clean up listener
    if (storageListener) {
      chrome.storage.onChanged.removeListener(storageListener);
    }
  });

</script>

<div class="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
  <header class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
    <h1 class="text-lg font-bold">YAKKL Insights</h1>
    <SimpleTooltip content="Click here to unlock your wallet" position="bottom">
      <button onclick={openWallet} class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all {!init ? 'animate-pulse' : ''}">
        <WalletIcon className="w-5 h-5" />
        Open Wallet
      </button>
    </SimpleTooltip>
    {#if !init}
      <span class="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
    {/if}
  </header>

  <RotatingBanner items={bannerItems} autoRotate={false} showControls={false} />

  <main class="flex-1 overflow-y-auto px-4 pb-4">
    <!-- Grid container for cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
      <!-- Token Prices Card -->
       <!-- eye={false} for now but if we want to show the balances, we can set it to true -->
      <SectionCard
        title="Token Prices"
        icon={TokenIcon}
        isPinned={false}
        eye={false}
        eyeTooltip="Toggle visibility of balances"
        minHeight="300px"
        maxHeight="750px"
      >
        <TokenListComponentList maxVisibleTokens={5} />
      </SectionCard>

      <!-- Newsfeeds Card -->
      <SectionCard
        title="Newsfeeds"
        icon={NewsIcon}
        minHeight="350px"
        maxHeight="1000px"
      >
        <ExtensionRSSNewsFeed
          feedUrls={cryptoFeeds}
          maxVisibleItems={10}
          maxItemsPerFeed={10}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-md"
        />
      </SectionCard>

      <!-- Bookmarked Articles Card -->
      <BookmarkedArticles />

      <!-- Utilities Card -->
      <SectionCard
        title="Utilities"
        icon={ToolIcon}
        minHeight="250px"
        maxHeight="800px"
      >
        <!-- Grid container -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 p-2 mt-2">
          <!-- Icon button 1 -->
          <SimpleTooltip content="ETH Unit Converter">
            <button
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              aria-label="Open Conversion Calculator"
              onclick={() => showEthConverter = true}
            >
              <CalcIcon className="w-7 h-7" />
            </button>
          </SimpleTooltip>
          <EthUnitConverter
            bind:show={showEthConverter}
          />

          <!-- Icon button 2 -->

          <!-- <SimpleTooltip content="Token Fiat Converter">
            <button
              class="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              aria-label="Open Token Fiat Converter"
              onclick={() => showTokenFiatConverter = true}
            >
              <FiatIcon className="w-7 h-7" />
            </button>
          </SimpleTooltip>
          <TokenFiatConverter
            bind:show={showTokenFiatConverter}
          /> -->
        </div>

      </SectionCard>

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

  <footer class="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-center font-bold flex flex-col items-center justify-center gap-2">
    <span class="text-zinc-500 mb-4">Smart Wallet Insights</span>
    <Copyright />
  </footer>
</div>
