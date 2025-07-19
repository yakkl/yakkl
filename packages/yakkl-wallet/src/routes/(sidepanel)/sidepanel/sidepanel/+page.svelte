<!-- File: src/routes/sidepanel/+page.svelte -->
<script lang="ts">
	import TokenComponentList from '$lib/components/TokenComponentList.svelte';
	// import RotatingBanner from '$lib/components/RotatingBanner.svelte';
	import { browser_ext, browserSvelte } from '$lib/common/environment';
	import WalletIcon from '$lib/components/icons/WalletIcon.svelte';
	import TokenIcon from '$lib/components/icons/TokenIcon.svelte';
	import NewsIcon from '$lib/components/icons/NewsIcon.svelte';
	import ToolIcon from '$lib/components/icons/ToolIcon.svelte';
	import { onMount } from 'svelte';
	import {
		getSettings,
		setSettingsStorage,
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
	import { ExtensionRSSFeedService } from '$lib/managers/ExtensionRSSFeedService';
	// import LockedSectionCard from '$lib/components/LockedSectionCard.svelte';
	import { isProLevel } from '$lib/common/utils';
	import Upgrade from '$lib/components/Upgrade.svelte';
	// import GenericFooter from '$lib/components/GenericFooter.svelte';
	import UpgradeFooter from '$lib/components/UpgradeFooter.svelte';
	// import Placeholder from '$lib/components/Placeholder.svelte';
	import DynamicRSSNewsFeed from '$lib/components/DynamicRSSNewsFeed.svelte';
	import PlanBadge from '$lib/components/PlanBadge.svelte';
	import { type Sponsor } from '$lib/components/Sponsorship.svelte';
	import ScrollIndicator from '$lib/components/ScrollIndicator.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import ChainSelector from '$lib/components/ChainSelector.svelte';
	import { Network } from 'lucide-svelte';

	let showUpgradeModal = $state(false);
	let showEthConverter = $state(false);
	let showChainSelector = $state(false);
	let showResponsiveMessage = $state(true);
	let showFooter = $state(true);
	let showTokenFiatConverter = $state(false);
	let init = $state(false);
	let locked = $state(true);
	let foundingUser = $state(false);
	let tokensLockedCount = $state(0); // Show all tokens for both Basic and Pro
	let newsfeedsLockedCount = $state(6);
	let maxVisibleTokens = $state(0); // Show all tokens initially
	// let showBanner = $state(true);
	let showNewsfeeds = $state(false);
	let showDynamicNewsfeeds = $state(false);
	let showLegalTerms = $state(false);
	let isAgreed = $state(false);
	let planType = $state('yakkl_pro (Trial)');
	let trialEnds = $state('2025-07-01');

	// List of crypto news RSS feeds
	const cryptoFeeds = [
    'https://www.ft.com/cryptofinance?format=rss/?utm_source=yakkl&utm_medium=extension',
    'https://seekingalpha.com/feeds/cryptocompare/cryptos/?utm_source=yakkl&utm_medium=extension',
    'https://finbold.com/category/cryptocurrency-news/feed/?utm_source=yakkl&utm_medium=extension',
    'https://blog.kraken.com/feed/?utm_source=yakkl&utm_medium=extension',
		'https://cointelegraph.com/rss/?utm_source=yakkl&utm_medium=extension',
		'https://cryptonews.com/news/feed/?utm_source=yakkl&utm_medium=extension',
		'https://decrypt.co/feed/?utm_source=yakkl&utm_medium=extension',
		'https://www.coindesk.com/arc/outboundfeeds/rss/?utm_source=yakkl&utm_medium=extension',
		'https://thedefiant.io/api/feed',
		'https://cryptopotato.com/feed/',
		'https://www.cnbc.com/id/10000664/device/rss/rss.html',
		'https://cryptoslate.com/feed/',
		'https://www.cryptobreaking.com/feed/'
	];

	// WebSocket URL for dynamic feed
	const wsFeedUrl = '';

	function openWallet() {
		if (browserSvelte) {
			try {
				// Use the popout message to open the wallet popup
				browser_ext.runtime.sendMessage({ type: 'popout' })
					.catch((error) => {
						// Silently handle the error - this is expected when extension context is invalid
						console.debug('Extension context not available:', error.message);
					});
			} catch (error) {
				// Handle synchronous errors
				console.debug('Failed to send message:', error);
			}
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
				// Show legal terms first for new users
				showLegalTerms = true;
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
				planType = (await isProLevel()) ? 'yakkl_pro' : 'explorer_member';
				trialEnds = settings.plan.trialEndDate || null;
			}

			// Always load default tokens regardless of init state
			await loadDefaultTokens();
			updateCombinedTokenStore();
			await setYakklCombinedTokenStorage(get(yakklCombinedTokenStore));

			// Clear any cached CoinDesk feeds to prevent preload warnings
			try {
				const rssService = ExtensionRSSFeedService.getInstance();
				await rssService.clearCachedFeed('https://www.coindesk.com/arc/outboundfeeds/rss/?utm_source=yakkl&utm_medium=extension');
				await rssService.clearCachedFeed('https://www.coindesk.com/arc/outboundfeeds/rss/');
				log.info('Cleared CoinDesk cached feeds to prevent preload warnings');
			} catch (error) {
				log.debug('Error clearing CoinDesk cached feeds:', false, error);
			}
		} catch (error) {
			log.warn('Error initializing sidepanel:', false, error);
		}
	});


	function onComplete() {
		showUpgradeModal = true;
	}

	function handleUpgradeComplete() {
		showUpgradeModal = false;
		// Refresh any necessary data
	}

	async function handleLegalAccept() {
		if (!isAgreed) return;

		try {
			const settings = await getSettings();
			if (settings) {
				settings.legal.privacyViewed = true;
				settings.legal.termsAgreed = true;
				settings.isLocked = true;
				await setSettingsStorage(settings);

				// Hide legal terms and show normal sidepanel
				showLegalTerms = false;
				init = true;

				// Update local state instead of reloading
				locked = (await isProLevel()) ? false : true;
				tokensLockedCount = 0; // Show all tokens for both Basic and Pro
				newsfeedsLockedCount = (await isProLevel()) ? 10 : 4;
				planType = (await isProLevel()) ? 'yakkl_pro' : 'explorer_member';
				trialEnds = settings.plan.trialEndDate || null;

				// Load default tokens and update stores
				await loadDefaultTokens();
				updateCombinedTokenStore();
				await setYakklCombinedTokenStorage(get(yakklCombinedTokenStore));
			}
		} catch (error) {
			log.error('Error accepting legal terms:', false, error);
		}
	}
</script>

<Upgrade
	bind:show={showUpgradeModal}
	onComplete={handleUpgradeComplete}
	onCancel={() => (showUpgradeModal = false)}
/>

{#if showLegalTerms}
<!-- Legal Terms View -->
<div class="flex flex-col h-screen bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100">
	<div class="min-h-screen flex items-center justify-center p-4">
		<div class="max-w-3xl w-full">
			<div class="yakkl-card p-8">
				<!-- Header -->
				<div class="text-center mb-6">
					<img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-16 h-16 mx-auto mb-4" />
					<h1 class="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
						Welcome to YAKKL Insights
					</h1>
					<p class="text-zinc-600 dark:text-zinc-400">
						Please review and accept our terms of service to continue
					</p>
				</div>

				<!-- Terms Content -->
				<div class="bg-zinc-100 dark:bg-zinc-800 rounded-xl p-6 mb-6 h-[400px] overflow-y-auto border border-zinc-200 dark:border-zinc-700">
					<div class="prose dark:prose-invert max-w-none text-sm">
						<h2>Terms of Service</h2>
						<p>By using YAKKL Smart Wallet, you agree to these terms...</p>
						<h3>1. Acceptance of Terms</h3>
						<p>By accessing or using YAKKL Smart Wallet, you agree to be bound by these Terms of Service.</p>
						<h3>2. Privacy Policy</h3>
						<p>Your use of our service is also governed by our Privacy Policy.</p>
						<h3>3. Wallet Security</h3>
						<p>You are responsible for maintaining the security of your wallet credentials.</p>
						<p>For complete terms and conditions, please visit <a href="https://yakkl.com/terms" target="_blank" rel="noopener">yakkl.com/terms</a></p>
					</div>
				</div>

				<!-- Agreement Checkbox -->
				<div class="mb-6">
					<label class="flex items-start gap-3 cursor-pointer group">
						<input
							type="checkbox"
							bind:checked={isAgreed}
							class="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-zinc-700"
						/>
						<div class="flex-1">
							<span class="text-zinc-900 dark:text-white font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
								I have read and agree to the terms of service
							</span>
							<p class="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
								By checking this box, you agree to our Terms of Service and Privacy Policy.
							</p>
						</div>
					</label>
				</div>

				<!-- Actions -->
				<div class="flex justify-center">
					<button
						onclick={handleLegalAccept}
						disabled={!isAgreed}
						class="yakkl-btn-primary"
					>
						Accept and Continue
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
{:else}
<!-- Normal Sidepanel View -->
<!-- Fixed centered logo watermark -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0">
	<img src="/images/logoBullFav128x128.png" class="w-44 h-44 opacity-10 dark:opacity-15" alt="logo" />
</div>

<div class="flex flex-col h-screen yakkl-body text-zinc-800 dark:text-zinc-100 relative">
	<header
		class="yakkl-header fixed-top backdrop-blur-sm flex justify-between items-center relative z-10"
	>
		<div class="flex items-center gap-3">
			<img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-8 h-8" />
			<h1 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        YAKKL Insights
      </h1>
		</div>
		<!-- Wallet Integration -->
		<SimpleTooltip content="Click here to unlock your wallet" position="bottom">
			<button
				onclick={openWallet}
				class="yakkl-btn-primary flex items-center gap-2 transition-all duration-300 group hover:shadow-lg {!init
					? 'animate-pulse'
					: ''}"
			>
				<WalletIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
				<span class="font-semibold">Open Smart Wallet</span>
			</button>
		</SimpleTooltip>
		{#if !init}
			<span class="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 animate-ping"
			></span>
		{/if}
	</header>

	<!-- <RotatingBanner
		bind:show={showBanner}
		items={bannerItems}
		autoRotate={false}
		showControls={false}
	/> -->

	<div class="flex justify-end px-4 py-2">
		<PlanBadge planType={planType} trialEnds={trialEnds} />
	</div>

	<ScrollIndicator>
		<main class="flex-1 overflow-y-auto px-5 pb-4 relative z-10">
			<!-- Grid container for cards -->
			<div class="max-w-[400px] mx-auto space-y-5 mt-1 pt-2 relative md:max-w-none md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-5 md:space-y-0">
				<!-- <SectionCard title="Sponsors" icon={SponsorIcon}>
          <Sponsorship
            {sponsors}
            onSponsorClick={handleSponsorClick}
            onSponsorImpression={handleSponsorImpression}
            className="min-h-[200px]"
          />
        </SectionCard> -->

				<!-- Token Prices Card -->
				<div class="yakkl-card relative z-10 hover:shadow-lg transition-all duration-300">
					<div class="yakkl-card-title flex items-center gap-2 mb-4">
						<TokenIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						<span>Token Prices</span>
					</div>
					<TokenComponentList {maxVisibleTokens} maxTokens={tokensLockedCount} {locked} />
					{#if locked}
						<div class="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
							<div class="text-center">
								<p class="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
									Unlock visibility of all tokens by
								</p>
								<button
									onclick={() => (showUpgradeModal = true)}
									class="yakkl-btn-primary text-xs"
								>
									Upgrading today!
								</button>
							</div>
						</div>
					{/if}
				</div>

				<!-- Newsfeeds Card -->
				<div class="yakkl-card relative z-10 hover:shadow-lg transition-all duration-300">
					<div class="yakkl-card-title flex items-center gap-2 mb-4">
						<NewsIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						<span>Crypto News</span>
					</div>
					<!-- Use DynamicRSSNewsFeed for WebSocket feed -->
					{#if showDynamicNewsfeeds}
						<DynamicRSSNewsFeed
							bind:show={showDynamicNewsfeeds}
							wsUrl={wsFeedUrl}
							title="Live Crypto News"
							maxVisibleItems={newsfeedsLockedCount}
							maxItemsPerFeed={newsfeedsLockedCount}
							className="bg-transparent"
							{locked}
						/>
					{:else}
						<!-- Fallback to regular RSS feed if WebSocket is not available -->
						<ExtensionRSSNewsFeed
							feedUrls={cryptoFeeds}
							maxVisibleItems={newsfeedsLockedCount}
							maxItemsPerFeed={newsfeedsLockedCount}
							className="bg-transparent"
							locked={false}
							title=""
						/>
					{/if}
				</div>

				<!-- Bookmarked Articles Card -->
				<div class="yakkl-card relative z-10 hover:shadow-lg transition-all duration-300">
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
				</div>

				<!-- Utilities Card -->
				<div class="yakkl-card relative z-10 hover:shadow-lg transition-all duration-300">
					<div class="yakkl-card-title flex items-center gap-2 mb-4">
						<ToolIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						<span>Utilities</span>
					</div>
					<!-- Grid container -->
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
						<!-- ETH Unit Converter -->
						<SimpleTooltip content="ETH Unit Converter">
							<button
								class="yakkl-btn-secondary p-3 flex flex-col items-center gap-2 aspect-square text-xs"
								aria-label="Open Conversion Calculator"
								onclick={() => (showEthConverter = true)}
							>
								<CalcIcon className="w-6 h-6" />
								<span>ETH Converter</span>
							</button>
						</SimpleTooltip>
						<EthUnitConverter bind:show={showEthConverter} />

						<!-- Chain Selector -->
						<SimpleTooltip content="Chain Selector">
							<button
								class="yakkl-btn-secondary p-3 flex flex-col items-center gap-2 aspect-square text-xs"
								aria-label="Open Conversion Calculator"
								onclick={() => {
									showChainSelector = true;
									showResponsiveMessage = false;
								}}
							>
								<Network class="w-6 h-6" />
								<span>Chain Selector</span>
							</button>
						</SimpleTooltip>
						<ChainSelector bind:show={showChainSelector} onClose={() => {
							showResponsiveMessage = true;
						}} />

            <!-- Placeholder for more utilities -->
						<div class="yakkl-btn-secondary p-3 flex flex-col items-center gap-2 aspect-square text-xs opacity-50 cursor-not-allowed">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
							</svg>
							<span>More Soon</span>
						</div>
					</div>
				</div>

				<!-- Market Overview Section (for expanded view) -->
				<div class="hidden md:block yakkl-card relative z-10 hover:shadow-lg transition-all duration-300 border-2 border-dashed border-gray-300 dark:border-gray-600">
					<div class="yakkl-card-title flex items-center gap-2 mb-4">
						<svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
						<span>Market Overview</span>
						<div class="flex-1"></div>
						<div class="text-xs text-zinc-400 dark:text-zinc-500">Pro Feature</div>
					</div>
					<div class="text-center py-12">
						<div class="text-gray-400 dark:text-gray-500 mb-3">
							<svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							<h3 class="text-lg font-medium mb-2">Market Analytics</h3>
							<p class="text-sm mb-4">Get comprehensive market insights, charts, and performance metrics.</p>
							<button
								onclick={() => (showUpgradeModal = true)}
								class="yakkl-btn-primary"
							>
								Upgrade to Pro
							</button>
						</div>
					</div>
				</div>
			</div>
		</main>
	</ScrollIndicator>

	<!-- Responsive message for narrow viewports -->
   {#if showResponsiveMessage}
	<div class="md:hidden yakkl-card relative z-10 mx-5 mt-2 mb-4 text-center">
		<div class="text-sm text-zinc-600 dark:text-zinc-400">
			👈 💡 Drag the edge of this panel to make it wider and discover more features!
		</div>
	</div>
	{/if}

  {#if showFooter}
  <footer
		class="yakkl-footer fixed-bottom h-[6rem] backdrop-blur-sm text-xs text-center flex flex-col items-center justify-center gap-1 relative z-10"
	>
		<div class="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
			</svg>
			YAKKL Insights
		</div>
		<Copyright />
	</footer>
	{/if}
</div>
{/if}
