<!-- File: src/lib/components/PodcastLineView.svelte -->
<script lang="ts">
	interface Props {
		title: string;
		host: string;
		duration: string;
		date: string;
		imageUrl: string;
		url: string;
		className?: string;
	}

	let { title, host, duration, date, imageUrl, url, className = '' }: Props = $props();
</script>

<a href={url} class="block hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
	<div class="flex items-start space-x-4 p-4 item">
		<!-- Podcast Cover Image -->
		<div class="flex-shrink-0">
			<img src={imageUrl} alt={title} class="w-16 h-16 rounded-lg object-cover shadow-sm" />
		</div>

		<!-- Podcast Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-center justify-between">
				<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
					{title}
				</h3>
				<span class="text-xs text-gray-500 dark:text-gray-400">
					{duration}
				</span>
			</div>
			<p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
				{host}
			</p>
			<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
				{date}
			</p>
		</div>
	</div>
</a>
