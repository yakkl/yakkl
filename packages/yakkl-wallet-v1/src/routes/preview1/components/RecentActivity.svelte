<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Activity {
		type: 'send' | 'receive' | 'swap';
		description: string;
		amount: string;
		time: string;
		isPositive: boolean | null;
	}

	const props = $props<{
		activities: Activity[];
	}>();

	let showAll = $state(false);
	let displayedActivities = $derived(showAll ? props.activities : props.activities.slice(0, 3));

	function toggleShowAll() {
		showAll = !showAll;
	}

	function getActivityIcon(type: string) {
		switch (type) {
			case 'send':
				return {
					icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
					color: 'text-primary-600',
					bg: 'bg-primary-100'
				};
			case 'receive':
				return {
					icon: 'M7 16l-4-4m0 0l4-4m-4 4h18',
					color: 'text-success-600',
					bg: 'bg-success-100'
				};
			case 'swap':
				return {
					icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
					color: 'text-warning-600',
					bg: 'bg-warning-100'
				};
			default:
				return {
					icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
					color: 'text-text-muted',
					bg: 'bg-border-light'
				};
		}
	}

	function handleActivityClick(activity: Activity) {
		console.log('Activity clicked:', activity);
		// TODO: Navigate to transaction detail or show more info
	}
</script>

<div class="bg-surface rounded-card p-4 shadow-card">
	<div class="flex items-center justify-between mb-4">
		<h3 class="font-medium text-text-primary">Recent Activity</h3>
		<button class="text-sm text-primary-500 hover:text-primary-600 transition-colors">
			View All
		</button>
	</div>

	{#if props.activities.length === 0}
		<div class="text-center py-8">
			<svg class="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
			</svg>
			<p class="text-text-muted text-sm">No recent activity</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each displayedActivities as activity, index (activity.description + activity.time)}
				<button
					onclick={() => handleActivityClick(activity)}
					class="w-full flex items-center space-x-3 p-3 rounded-button hover:bg-background transition-all duration-200 group"
					in:fly={{ y: 10, duration: 200, delay: index * 50 }}
				>
					<!-- Activity Icon -->
					<div class="w-10 h-10 {getActivityIcon(activity.type).bg} rounded-full flex items-center justify-center flex-shrink-0">
						<svg class="w-5 h-5 {getActivityIcon(activity.type).color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getActivityIcon(activity.type).icon} />
						</svg>
					</div>

					<!-- Activity Details -->
					<div class="flex-1 text-left">
						<p class="text-sm font-medium text-text-primary group-hover:text-primary-600 transition-colors">
							{activity.description}
						</p>
						<p class="text-xs text-text-muted">{activity.time}</p>
					</div>

					<!-- Amount -->
					<div class="text-right">
						<p class="text-sm font-medium {
							activity.isPositive === true ? 'text-success' : 
							activity.isPositive === false ? 'text-danger' : 
							'text-text-primary'
						}">
							{activity.amount}
						</p>
					</div>

					<!-- Chevron -->
					<svg class="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			{/each}
		</div>

		{#if props.activities.length > 3}
			<button
				onclick={toggleShowAll}
				class="w-full mt-3 py-2 text-sm text-primary-500 hover:text-primary-600 transition-colors font-medium"
			>
				{showAll ? 'Show Less' : `Load More (${props.activities.length - 3} more)`}
			</button>
		{/if}
	{/if}
</div>