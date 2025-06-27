<script lang="ts">
	// NOTE: This is for the RegistrationOption component. The RegistrationOptionModal is only for the RegistrationOption component. Restore requires a valid account to be created first. So, removed restore from here for now.
	import { onMount } from 'svelte';
	import { getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { Settings } from '$lib/common/interfaces';
	import SimpleTooltip from './SimpleTooltip.svelte';

	interface Props {
		/// <reference types="svelte" />
		title?: string;
		onCreate: () => void;
		onImport: () => void; // NOTE: import and restore will not work if there is no account created first. Need to either create a tmp account and restore or move this to another component.
		onRestore: () => void;
	}

	let {
		title = 'Registration/Restoration Options',
		onCreate,
		onImport = () => void {},
		onRestore = () => void {}
	}: Props = $props();

	let settings: Settings | null = $state(null);
	let isProUser = $state(false);

	onMount(async () => {
		settings = await getSettings();
		isProUser = shouldShowProFeatures(settings?.plan?.type || PlanType.BASIC_MEMBER);
	});

	function handleRestore() {
		if (!isProUser) return;
		onRestore();
	}
</script>

<div class="bg-surface-light dark:bg-surface-dark rounded-lg p-6 shadow-md">
	<h1 class="text-2xl font-bold text-center text-primary-light dark:text-primary-dark mb-4">
		{title}
	</h1>

	<div class="space-y-4 mb-6">
		<p class="text-secondary-light dark:text-secondary-dark text-center">
			Choose an option to get started with your wallet:
		</p>
		<ul class="list-disc list-inside text-secondary-light dark:text-secondary-dark space-y-2">
			<li>Create a new account if this is your first time</li>
			<!-- <li>Import an existing account if you have one</li> -->
			<li>
				Restore from a YAKKL Emergency Kit if you're recovering your wallet (AFTER creating the
				initial account!)
			</li>
		</ul>
	</div>

	<div class="space-y-3">
		<!-- Create New Account Button -->
		<button
			onclick={onCreate}
			class="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
		>
			Create New Account
		</button>

		<div class="my-4 border-t border-neutral-dark dark:border-neutral-light"></div>

		<!-- Import Existing Account Button -->
		<button
			onclick={onImport}
			class="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
		>
			Import Existing Account(s)
		</button>

		<!-- Restore from Emergency Kit Button -->
		{#if isProUser}
			<button
				onclick={handleRestore}
				class="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition duration-200 ease-in-out flex items-center justify-center gap-2"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
				</svg>
				Restore from Emergency Kit
			</button>
		{:else}
			<SimpleTooltip content="Upgrade to Pro for full Emergency Kit features">
				<button
					disabled
					class="w-full py-2 px-4 bg-gray-400 text-gray-200 font-semibold rounded-lg shadow-md cursor-not-allowed transition duration-200 ease-in-out flex items-center justify-center gap-2 relative"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					Restore from Emergency Kit
					<div class="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
						<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
				</button>
			</SimpleTooltip>
		{/if}
	</div>
</div>
