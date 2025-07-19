<!-- src/lib/components/ExtensionRSSNewsFeed.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ExtensionRSSFeedService,
		type RSSItem,
		type RSSFeed
	} from '$lib/managers/ExtensionRSSFeedService';
	import NewsFeed from './NewsFeed.svelte';
	import { log } from '$lib/managers/Logger';
	import RefreshIcon from './icons/RefreshIcon.svelte';
	import { browser_ext } from '$lib/common/environment';
	import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
	import { rssStore } from '$lib/stores/rss.store';

	const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
	const THIRTY_MINUTES = 30 * 60 * 1000; // 30 minutes in milliseconds

	interface Props {
		show?: boolean;
		feedUrls: string[];
		maxItemsPerFeed?: number;
		maxVisibleItems?: number;
		className?: string;
		locked?: boolean;
		title?: string;
		interval?: number;
	}

	let {
		show = $bindable(true),
		feedUrls,
		maxVisibleItems = 3,
		className = '',
		locked = true,
		maxItemsPerFeed = locked ? 3 : 0,
		title = 'Crypto News',
		interval = FIVE_MINUTES
	}: Props = $props();

	// Override interval if locked
	const effectiveInterval = locked ? THIRTY_MINUTES : interval;

	// Subscribe to store values
	let newsItems = $state<RSSItem[]>([]);
	let isLoading = $state(true);
	let isUpdating = $state(false);
	let lastUpdateTime = $state<Date | null>(null);
	let error = $state<string | null>(null);
	let isFirstLoad = $state(true);

	const rssService = ExtensionRSSFeedService.getInstance();
	const timerManager = UnifiedTimerManager.getInstance();
	const timerId = 'rss-feed-refresh';

	// Store unsubscribe functions
	let unsubscribeStore: (() => void) | null = null;
	let unsubscribeLoading: (() => void) | null = null;
	let unsubscribeUpdating: (() => void) | null = null;
	let unsubscribeLastUpdate: (() => void) | null = null;

	// Store message listener reference for cleanup
	let messageListener: ((message: any, sender: any, sendResponse: any) => boolean) | null = null;

	onMount(async () => {
		// Subscribe to store changes
		unsubscribeStore = rssStore.subscribe(items => {
			newsItems = items;
			// Only set isFirstLoad to false if we have items
			if (items.length > 0) {
				isFirstLoad = false;
			}
		});

		unsubscribeLoading = rssStore.isLoading.subscribe(loading => {
			// Only show loading spinner on first load when we have no items
			if (newsItems.length === 0) {
				isLoading = loading;
			}
		});

		unsubscribeUpdating = rssStore.isUpdating.subscribe(updating => {
			isUpdating = updating;
		});

		unsubscribeLastUpdate = rssStore.lastUpdateTime.subscribe(time => {
			lastUpdateTime = time;
		});

		// Initialize store if needed
		await rssStore.init();
		
		// Check if we have cached articles
		if (newsItems.length === 0) {
			// No cache, show loading and fetch immediately
			isLoading = true;
			await fetchAllFeeds();
		} else {
			// We have cache, update in background
			isLoading = false;
			backgroundUpdate();
		}

		// Set up refresh interval using UnifiedTimerManager
		timerManager.addInterval(timerId, backgroundUpdate, effectiveInterval);
		timerManager.startInterval(timerId);

		// Listen for updates from background script
		messageListener = (message: any, sender: any, sendResponse: any): boolean => {
			if (message.type === 'RSS_FEED_UPDATE') {
				backgroundUpdate();
				return true;
			}
			return false;
		};

		browser_ext.runtime.onMessage.addListener(messageListener as any);
	});

	// Clean up on component destroy
	onDestroy(() => {
		if (unsubscribeStore) unsubscribeStore();
		if (unsubscribeLoading) unsubscribeLoading();
		if (unsubscribeUpdating) unsubscribeUpdating();
		if (unsubscribeLastUpdate) unsubscribeLastUpdate();
		timerManager.stopInterval(timerId);
		timerManager.removeInterval(timerId);
		if (messageListener) {
			browser_ext.runtime.onMessage.removeListener(messageListener as any);
		}
	});

	// Fetch all feeds and update the store
	async function fetchAllFeeds() {
		rssStore.setLoading(true);
		error = null;

		try {
			const allItems: RSSItem[] = [];

			const feedPromises = feedUrls.map(
				(url: string): Promise<RSSFeed | null> =>
					rssService.fetchFeed(url).catch((err: unknown): null => {
						log.warn(`Failed to fetch feed ${url}:`, false, err);
						return null;
					})
			);

			const feeds = await Promise.all(feedPromises);

			feeds.forEach((feed) => {
				if (feed) {
					allItems.push(...feed.items.slice(0, maxItemsPerFeed));
				}
			});

			if (allItems.length > 0) {
				await rssStore.setArticles(allItems);
			} else if (newsItems.length === 0) {
				// Only show error if we have no existing content
				error = 'No articles found';
			}
		} catch (err) {
			if (newsItems.length === 0) {
				error = err instanceof Error ? err.message : 'Failed to load RSS feeds';
			}
			log.warn('RSS feed error:', false, err);
		} finally {
			rssStore.setLoading(false);
			isLoading = false;
		}
	}

	// Update feeds in background without clearing existing content
	async function backgroundUpdate() {
		if (isUpdating) return; // Prevent concurrent updates
		
		rssStore.setUpdating(true);

		try {
			const allItems: RSSItem[] = [];

			const feedPromises = feedUrls.map(
				(url: string): Promise<RSSFeed | null> =>
					rssService.fetchFeed(url).catch((err: unknown): null => {
						log.debug(`Background update failed for ${url}:`, false, err);
						return null;
					})
			);

			const feeds = await Promise.all(feedPromises);

			feeds.forEach((feed) => {
				if (feed) {
					allItems.push(...feed.items.slice(0, maxItemsPerFeed));
				}
			});

			if (allItems.length > 0) {
				// Add new articles to the store (it will handle deduplication)
				await rssStore.addArticles(allItems);
			}
		} catch (err) {
			log.debug('Background RSS update error:', false, err);
		} finally {
			rssStore.setUpdating(false);
		}
	}

	// Manual refresh - clear and reload
	async function refreshFeeds() {
		if (isLoading || isUpdating) return;
		
		// Clear existing items to show full refresh
		await rssStore.clear();
		newsItems = [];
		isLoading = true;
		await fetchAllFeeds();
	}

	// Format last update time
	function formatLastUpdate(date: Date | null): string {
		if (!date) return '';
		
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		
		if (minutes < 1) return 'Just updated';
		if (minutes === 1) return '1 minute ago';
		if (minutes < 60) return `${minutes} minutes ago`;
		
		const hours = Math.floor(minutes / 60);
		if (hours === 1) return '1 hour ago';
		if (hours < 24) return `${hours} hours ago`;
		
		return 'More than a day ago';
	}
</script>

{#if show}
	<div class={className}>
		{#if isLoading && newsItems.length === 0}
			<!-- Show centered loading spinner only on first load -->
			<div class="flex items-center justify-center p-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
			</div>
		{:else if error && newsItems.length === 0}
			<!-- Only show error if we have no content at all -->
			<div class="flex flex-col items-center justify-center p-8 text-red-500">
				<p class="text-sm font-medium">Error loading news</p>
				<p class="text-xs mt-1">{error}</p>
				<button
					onclick={refreshFeeds}
					class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
				>
					Retry
				</button>
			</div>
		{:else}
			<!-- Header with title and update indicator -->
			<div class="flex items-center justify-between mb-2 relative">
				{#if title}
					<h2 class="text-lg font-semibold">{title}</h2>
				{/if}
				<div class="flex items-center gap-3 {!title ? 'ml-auto' : ''}">
					{#if isUpdating}
						<!-- Update indicator -->
						<div class="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
							<div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
							<span class="animate-pulse">Updating articles...</span>
						</div>
					{:else if lastUpdateTime && !isFirstLoad}
						<!-- Last update time -->
						<span class="text-xs text-zinc-400 dark:text-zinc-500">
							{formatLastUpdate(lastUpdateTime)}
						</span>
					{/if}
					
					<!-- Refresh button -->
					<button
						onclick={refreshFeeds}
						class="p-1 text-blue-500 hover:text-blue-600 transition-colors"
						aria-label="Refresh feeds"
						disabled={isLoading || isUpdating}
						title="Refresh articles"
					>
						<RefreshIcon 
							className="w-4 h-4 {isLoading || isUpdating ? 'opacity-50' : ''}" 
						/>
					</button>
				</div>
			</div>
			
			<!-- News items -->
			{#if newsItems.length > 0}
				<NewsFeed 
					{newsItems} 
					{maxVisibleItems} 
					{className} 
					{locked} 
					{maxItemsPerFeed} 
				/>
			{:else if !isLoading}
				<!-- No articles state -->
				<div class="flex flex-col items-center justify-center p-8 text-zinc-500">
					<p class="text-sm">No articles available</p>
					<button
						onclick={refreshFeeds}
						class="mt-2 text-xs text-blue-500 hover:text-blue-600"
					>
						Load articles
					</button>
				</div>
			{/if}
		{/if}
	</div>
{/if}