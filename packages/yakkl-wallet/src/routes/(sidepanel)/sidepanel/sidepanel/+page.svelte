<!-- File: src/routes/sidepanel/+page.svelte -->
<script lang="ts">
	import TokenComponentList from '$lib/components/TokenComponentList.svelte';
	import RotatingBanner from '$lib/components/RotatingBanner.svelte';
	import SectionCard from '$lib/components/SectionCard.svelte';
	import { browser_ext, browserSvelte } from '$lib/common/environment';
	import WalletIcon from '$lib/components/icons/WalletIcon.svelte';
	import TokenIcon from '$lib/components/icons/TokenIcon.svelte';
	import NewsIcon from '$lib/components/icons/NewsIcon.svelte';
	import ToolIcon from '$lib/components/icons/ToolIcon.svelte';
	import { onDestroy, onMount } from 'svelte';
	import {
		getSettings,
		setYakklCombinedTokenStorage,
		updateCombinedTokenStore,
		yakklCombinedTokenStore
	} from '$lib/common/stores';
	import { loadDefaultTokens } from '$lib/managers/tokens/loadDefaultTokens';
	import { get } from 'svelte/store';
	import ExtensionRSSNewsFeed from '$lib/components/ExtensionRSSNewsFeed.svelte';
	import CalcIcon from '$lib/components/icons/CalcIcon.svelte';
	// import FiatIcon from '$lib/components/icons/FiatIcon.svelte';
	import EthUnitConverter from '$lib/components/EthUnitConverter.svelte';
	// import TokenFiatConverter from '$lib/components/TokenFiatConverter.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { setBadgeText } from '$lib/utilities/utilities';
	import Copyright from '$lib/components/Copyright.svelte';
	import BookmarkedArticles from '$lib/components/BookmarkedArticles.svelte';
	// import LockedSectionCard from '$lib/components/LockedSectionCard.svelte';
	import { isProLevel } from '$lib/common/utils';
	import Upgrade from '$lib/components/Upgrade.svelte';
	import GenericFooter from '$lib/components/GenericFooter.svelte';
	import UpgradeFooter from '$lib/components/UpgradeFooter.svelte';
	import Placeholder from '$lib/components/Placeholder.svelte';
	import DynamicRSSNewsFeed from '$lib/components/DynamicRSSNewsFeed.svelte';
	import PlanBadge from '$lib/components/PlanBadge.svelte';
	import Sponsorship, { type Sponsor } from '$lib/components/Sponsorship.svelte';
	import SponsorIcon from '$lib/components/icons/SponsorIcon.svelte';
	import ScrollIndicator from '$lib/components/ScrollIndicator.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import { goto } from '$app/navigation';

	let showUpgradeModal = $state(false);
	let showEthConverter = $state(false);
	let showTokenFiatConverter = $state(false);
	let init = $state(false);
	let locked = $state(true);
	let foundingUser = $state(false);
	let tokensLockedCount = $state(0); // Show all tokens for both Basic and Pro
	let newsfeedsLockedCount = $state(6);
	let maxVisibleTokens = $state(0); // Show all tokens initially
	let showBanner = $state(true);
	let showNewsfeeds = $state(false);
	let showDynamicNewsfeeds = $state(false);

	let storageListener: {
		(changes: any, areaName: any): void;
		(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string): void;
	};

	// List of crypto news RSS feeds
	const cryptoFeeds = [
		'https://cointelegraph.com/rss/?utm_source=yakkl&utm_medium=extension',
		'https://www.coindesk.com/arc/outboundfeeds/rss/?utm_source=yakkl&utm_medium=extension',
		'https://cryptonews.com/news/feed/?utm_source=yakkl&utm_medium=extension'
	];

	// WebSocket URL for dynamic feed
	const wsFeedUrl = 'wss://your-websocket-server.com/feed';

	function openWallet() {
		if (browserSvelte) {
			browser_ext.runtime.sendMessage({ type: 'popout' });
		}
	}

	// DO NOT REMOVE THESE BANNER ITEMS NOR COMMENTS
	const bannerItems = [
		{
			type: 'banner' as const,
			title: 'Welcome to YAKKL',
			message: 'Your secure crypto wallet'
			// ctaText: 'UPGRADE',
			// onCallToAction: (index: number) => {
			//   console.log('Upgrade clicked for item at index:', index);
			// }
		}
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

	const content = `
    <div class="w-full h-full flex flex-col rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow duration-300">
    <!-- Image Section -->
    <div class="flex-grow aspect-[1/1] relative">
      <img
        src="/images/sponsors/logoCryptoGrampsTrimmed.png"
        alt="CryptoGramps Sponsorship Ad"
        class="w-full h-full object-contain p-4"
      />
    </div>

    <!-- Content Section -->
    <div class="p-4 text-center flex flex-col justify-center">
      <h3 class="text-base md:text-lg font-semibold text-gray-800 mb-1">Sponsored by CryptoGramps</h3>
      <p class="text-sm md:text-base text-gray-600 mb-2">Bridging AI & Blockchain wisdom.</p>
      <a
        href="https://CryptoGramps.ai"
        class="inline-block px-4 py-2 bg-blue-600 text-white text-sm md:text-base rounded-lg hover:bg-blue-700 transition"
        target="_blank"
        rel="noopener noreferrer"
      >
        CryptoGramps.ai
      </a>
    </div>
    </div>
  `;

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

	// This is for the sponsors section that lives in the sidepanel and not the banner which is above.
	const sponsors = [
		{
			id: 'cryptogramps',
			name: 'Cryptogramps.ai',
			url: 'https://cryptogramps.ai',
			content: content, //'<img src="/images/sponsors/logoCryptoGrampsTrimmed.png" alt="cryptogramps.ai" class="w-full h-auto aspect-1/1" />',
			weight: 1,
			duration: 5000,
			category: 'premium'
		}
		// Add more sponsors...
	];

	function handleSponsorClick(sponsor: Sponsor) {
		console.log('Sponsor clicked:', sponsor.name);
	}

	function handleSponsorImpression(sponsor: Sponsor) {
		console.log('Sponsor impression:', sponsor.name);
	}

	onMount(async () => {
		try {
			if (!browserSvelte) return;

			const settings = await getSettings();
			if (!settings.init || !settings.legal.termsAgreed) {
				init = false;
				document.documentElement.classList.remove('dark');
				localStorage.theme = 'light';
				await setBadgeText('');
				return;
			} else {
				init = true;
				locked = (await isProLevel()) ? false : true;
				tokensLockedCount = 0; // Show all tokens for both Basic and Pro
				newsfeedsLockedCount = (await isProLevel()) ? 10 : 4;
			}

			// Always load default tokens regardless of init state
			await loadDefaultTokens();
			updateCombinedTokenStore();
			await setYakklCombinedTokenStorage(get(yakklCombinedTokenStore));
		} catch (error) {
			log.warn('Error initializing sidepanel:', false, error);
		}
	});

	onDestroy(() => {
		if (!browserSvelte) return;

		// Clean up listener
		if (storageListener) {
			browser_ext.storage.onChanged.removeListener(storageListener);
		}
	});

	function onComplete() {
		showUpgradeModal = true;
	}

	function handleUpgradeComplete() {
		showUpgradeModal = false;
		// Refresh any necessary data
	}

	function handleUpgradeClose() {
		showUpgradeModal = false;
		// Handle any cleanup
	}
</script>

<Upgrade
	bind:show={showUpgradeModal}
	{openWallet}
	onComplete={handleUpgradeComplete}
	onClose={handleUpgradeClose}
	onCancel={() => (showUpgradeModal = false)}
/>

<div class="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
	<header
		class="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center"
	>
		<h1 class="text-lg font-bold">YAKKL Insights</h1>
		<!-- Preview2 Integration -->
    <div class="flex items-center gap-2">
			<SimpleTooltip content="Try the new wallet experience" position="bottom">
				<button
					onclick={() => goto('/preview2')}
					class="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-2 rounded-lg shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all text-sm group"
				>
					<svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
					Preview 2.0
				</button>
			</SimpleTooltip>

			<SimpleTooltip content="Click here to unlock your wallet" position="bottom">
				<button
					onclick={openWallet}
					class="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-md hover:from-green-600 hover:to-emerald-700 transition-all {!init
						? 'animate-pulse'
						: ''}"
				>
					<WalletIcon className="w-5 h-5" />
					Open Smart Wallet
				</button>
			</SimpleTooltip>
		</div>
		{#if !init}
			<span class="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 animate-ping"
			></span>
		{/if}
	</header>

	<RotatingBanner
		bind:show={showBanner}
		items={bannerItems}
		autoRotate={false}
		showControls={false}
	/>

	<div class="flex justify-end px-4 py-2">
		<PlanBadge />
	</div>

	<ScrollIndicator>
		<main class="flex-1 overflow-y-auto px-4 pb-4">
			<!-- Grid container for cards -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 pt-0">
				<!-- <SectionCard title="Sponsors" icon={SponsorIcon}>
          <Sponsorship
            {sponsors}
            onSponsorClick={handleSponsorClick}
            onSponsorImpression={handleSponsorImpression}
            className="min-h-[200px]"
          />
        </SectionCard> -->

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
					{locked}
					lockedFooter={GenericFooter}
					lockedFooterProps={{
						text: 'Unlock visibility of all tokens by',
						buttonText: 'Upgrading today!',
						onAction: () => (showUpgradeModal = true),
						variant: 'info'
					}}
				>
					<TokenComponentList {maxVisibleTokens} maxTokens={tokensLockedCount} {locked} />
				</SectionCard>

				<!-- Newsfeeds Card -->
				<SectionCard
					title="Newsfeeds"
					icon={NewsIcon}
					minHeight="350px"
					maxHeight="1000px"
					locked={false}
					lockedFooter={UpgradeFooter}
					lockedFooterProps={{
						onUpgrade: () => (showUpgradeModal = true),
						text: 'Unlock visibility of all newsfeeds with faster refresh times by',
						buttonText: 'Upgrade Now'
					}}
				>
					<!-- Use DynamicRSSNewsFeed for WebSocket feed -->
					{#if showDynamicNewsfeeds}
						<DynamicRSSNewsFeed
							bind:show={showDynamicNewsfeeds}
							wsUrl={wsFeedUrl}
							title="Live Crypto News"
							maxVisibleItems={newsfeedsLockedCount}
							maxItemsPerFeed={newsfeedsLockedCount}
							className="bg-white dark:bg-gray-900 rounded-lg shadow-md"
							{locked}
						/>
					{:else}
						<!-- Fallback to regular RSS feed if WebSocket is not available -->
						<ExtensionRSSNewsFeed
							feedUrls={cryptoFeeds}
							maxVisibleItems={newsfeedsLockedCount}
							maxItemsPerFeed={newsfeedsLockedCount}
							className="bg-white dark:bg-gray-900 rounded-lg shadow-md"
							locked={false}
						/>
					{/if}
				</SectionCard>

				<!-- Bookmarked Articles Card -->
				<!-- Example of how to use the GenericFooter component
          footer={GenericFooter}
          footerProps={{
            text: 'Manage your bookmarked articles',
            buttonText: 'View All',
            onAction: () => console.log('View all bookmarks'),
            variant: 'info'
          }}
        -->
				<BookmarkedArticles
					{onComplete}
					show={true}
					{locked}
					lockedFooter={UpgradeFooter}
					lockedFooterProps={{
						onUpgrade: () => (showUpgradeModal = true),
						text: 'Unlock bookmarking features by',
						buttonText: 'Upgrading today!'
					}}
				/>

				<!-- Utilities Card -->
				<SectionCard title="Utilities" icon={ToolIcon} minHeight="250px" maxHeight="800px">
					<!-- Grid container -->
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 p-2 mt-2">
						<!-- Icon button 1 -->
						<SimpleTooltip content="ETH Unit Converter">
							<button
								class="p-2 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
								aria-label="Open Conversion Calculator"
								onclick={() => (showEthConverter = true)}
							>
								<CalcIcon className="w-7 h-7" />
							</button>
						</SimpleTooltip>
						<EthUnitConverter bind:show={showEthConverter} />

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
						{locked}
						lockedFooter={GenericFooter}
						lockedFooterProps={{
							text: 'Unlock visibility of the market overview by',
							buttonText: 'Upgrading today!',
							onAction: () => (showUpgradeModal = true),
							variant: 'info'
						}}
					>
						<!-- Chart component will go here -->
						<!-- Could use !border-none to remove all borders if desired or use showBorderTop={false}-->
						<Placeholder
							text="Chart coming soon..."
							className="flex items-center justify-center text-zinc-500 !border-t-0"
							anchorTop={true}
							centerHorizontal={true}
							centerVertical={true}
							showBorderTop={false}
						/>
						<!-- <div class="h-[300px] flex items-center justify-center text-zinc-500">
              Chart coming soon...
            </div> -->
					</SectionCard>
				</div>
			</div>
		</main>
	</ScrollIndicator>

	<!-- Responsive message for narrow viewports -->
	<Placeholder
		text="👈 💡 Drag the edge of this panel to make it wider and discover more features!"
		className="md:hidden"
	/>

	<footer
		class="px-4 py-2 border-t border-zinc-200 dark:border-zinc-700 text-xs text-center font-bold flex flex-col items-center justify-center gap-2"
	>
		<span class="text-zinc-500 mb-4">Smart Wallet Insights</span>
		<Copyright />
	</footer>
</div>
