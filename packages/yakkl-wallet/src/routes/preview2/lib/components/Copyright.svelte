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

	// Format plan type for display (remove underscores)
	function formatPlanType(plan: string): string {
		if (!plan) return '';
		return plan.replace(/_/g, ' ');
	}

	// Get the display plan type
	let displayPlan = $derived(() => {
		const plan = planType || registered;
		return formatPlanType(plan);
	});
</script>

<div class={`inline-flex items-center gap-2 w-full justify-center text-center ${className}`}>
	<!-- Blue highlighted plan type at the beginning -->
	{#if displayPlan}
		<span class="inline-flex items-center px-2 py-0.5 rounded-full shadow text-[10px] font-semibold opacity-80
			bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200">
			{displayPlan}
		</span>
	{/if}
	
	<!-- Copyright text -->
	<span class="text-[10px] opacity-70 text-gray-400 dark:text-gray-500 select-none">
		YAKKL® ©Copyright {YEAR}, Version: {VERSION}
	</span>
</div>