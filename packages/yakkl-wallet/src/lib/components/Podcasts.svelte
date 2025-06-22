<!-- File: src/lib/components/Podcasts.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { log } from '$lib/managers/Logger';
	import PodcastLineView from './PodcastLineView.svelte';
	import ChevronDownIcon from '$lib/components/icons/ChevronDownIcon.svelte';
	import ChevronUpIcon from '$lib/components/icons/ChevronUpIcon.svelte';

	interface Props {
		maxVisibleItems?: number;
		className?: string;
	}

	let { maxVisibleItems = 3, className = '' }: Props = $props();

	let podcasts = $state([
		{
			title: 'The Future of DeFi',
			host: 'Crypto Insights',
			duration: '45 min',
			date: '2 days ago',
			imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200',
			url: 'https://example.com/podcast/1'
		},
		{
			title: 'Understanding Layer 2 Solutions',
			host: 'Blockchain Weekly',
			duration: '38 min',
			date: '3 days ago',
			imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200',
			url: 'https://example.com/podcast/2'
		},
		{
			title: 'NFT Market Analysis',
			host: 'Digital Assets Today',
			duration: '52 min',
			date: '4 days ago',
			imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200',
			url: 'https://example.com/podcast/3'
		},
		{
			title: 'Crypto Security Best Practices',
			host: 'Security First',
			duration: '41 min',
			date: '5 days ago',
			imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200',
			url: 'https://example.com/podcast/4'
		}
	]);

	let visibleItems = $state(podcasts.slice(0, maxVisibleItems));
	let remainingItems = $state(podcasts.slice(maxVisibleItems));
	let isRemainingSectionCollapsed = $state(true);

	// Check if we have any valid podcast items
	const hasValidItems = podcasts.length > 0;

	// Function to handle RSS feed parsing (to be implemented)
	async function fetchPodcastFeed() {
		try {
			// TODO: Implement RSS feed fetching and parsing
			// const response = await fetch('RSS_FEED_URL');
			// const data = await response.text();
			// Parse RSS feed and update podcastItems
		} catch (error) {
			console.error('Error fetching podcast feed:', error);
		}
	}

	onMount(() => {
		fetchPodcastFeed();
	});
</script>

<div class={className}>
	{#if hasValidItems}
		<!-- Visible Items Section -->
		<div class="space-y-0">
			{#each visibleItems as item, index}
				<div class="relative">
					<PodcastLineView {...item} />
					{#if index < visibleItems.length - 1}
						<div class="flex justify-center">
							<div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Remaining Items Section -->
		{#if remainingItems.length > 0}
			<div class="space-y-0">
				<button
					class="flex items-center justify-between w-full py-2 cursor-pointer"
					onclick={() => (isRemainingSectionCollapsed = !isRemainingSectionCollapsed)}
				>
					<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
						{remainingItems.length} More Episodes
					</h3>
					<div class="text-gray-500 dark:text-gray-400">
						{#if isRemainingSectionCollapsed}
							<ChevronDownIcon className="w-4 h-4" />
						{:else}
							<ChevronUpIcon className="w-4 h-4" />
						{/if}
					</div>
				</button>

				{#if !isRemainingSectionCollapsed}
					<div class="space-y-0">
						{#each remainingItems as item, index}
							<div class="relative">
								<PodcastLineView {...item} />
								{#if index < remainingItems.length - 1}
									<div class="flex justify-center">
										<div class="w-[80%] h-[1px] bg-gray-200 dark:bg-gray-700"></div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
			<p class="text-sm">No podcast episodes available at this time</p>
		</div>
	{/if}
</div>
