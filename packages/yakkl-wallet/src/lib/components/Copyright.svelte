<script lang="ts">
	import { VERSION, YEAR } from '$lib/common/constants';
	import type { Settings } from '$lib/common';
	import { getSettings } from '$lib/common/stores';
	import { onMount } from 'svelte';

	interface Props {
		planType?: string | null;
		className?: string;
	}

	let { planType = null, className = '' }: Props = $props();

	/**
	 * The registered type retrieved from Yakkl settings.
	 * @type {string}
	 */
	let registered: string = $state('');

	onMount(async () => {
		getSettings().then(async (result) => {
			const yakklSettings = result as Settings;
			registered = yakklSettings.plan.type;
		});
	});

	// Format plan type for display (remove underscores and capitalize)
	function formatPlanType(plan: string): string {
		if (!plan) return '';
		return plan
			.replace(/_/g, ' ')
			.split(' ')
			.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	}

	// Get the display plan type
	let displayPlan = $derived(formatPlanType(planType || registered));
</script>

<div class={`inline-flex items-center gap-2 w-full justify-center text-center ${className}`}>
	<!-- Blue highlighted plan type at the beginning -->
	{#if displayPlan}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full shadow text-[10px] font-semibold opacity-80
			bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
			{displayPlan}
		</span>
	{/if}
	
	<!-- Copyright text with clickable YAKKL -->
	<span class="text-[10px] opacity-70 text-gray-400 dark:text-gray-500 select-none">
		<a 
			href="https://yakkl.com" 
			target="_blank" 
			rel="noopener noreferrer"
			class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
		>
			YAKKL®
		</a> ©Copyright {YEAR}, Version: {VERSION}
	</span>
</div>