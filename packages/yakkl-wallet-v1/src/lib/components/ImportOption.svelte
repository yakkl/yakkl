<script lang="ts">
	import { onMount } from 'svelte';
	import { getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { Settings } from '$lib/common/interfaces';
	import SimpleTooltip from './SimpleTooltip.svelte';

	interface Props {
		/// <reference types="svelte" />
		showImportWatch?: boolean;
		title?: string;
		onImportKey: () => void;
		onImportPhrase: () => void;
		onImportWatch: () => void;
		onRestore: () => void;
	}

	let {
		showImportWatch = false,
		title = 'Importing/Restoring Options',
		onImportKey,
		onImportPhrase,
		onImportWatch,
		onRestore
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

<div
	class="bg-surface-light dark:bg-surface-dark text-primary-light dark:text-primary-dark rounded-lg p-6 shadow-md"
>
	<h1 class="text-2xl font-bold text-center text-primary-light dark:text-primary-dark mb-4">
		{title}
	</h1>

	<div class="space-y-4 mb-6">
		<p class="text-secondary-light dark:text-secondary-dark text-center">
			Choose an option to import or restore your wallet:
		</p>
		<ul class="list-disc list-inside text-secondary-light dark:text-secondary-dark space-y-2">
			<li>Import a single account using a private key</li>
			<li>Import a single account using a secret phrase (12-24 words)</li>
			{#if showImportWatch}
				<li>Import a single watch-only address</li>
			{/if}
			<li>Restore everything from a YAKKL Emergency Kit (recover your whole wallet)</li>
		</ul>
	</div>

	<div class="space-y-3">
		<!-- Import using Private Key -->
		<button
			onclick={onImportKey}
			class="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
		>
			Import using Private Key
		</button>

		<!-- Import Watch-Only Address (if applicable) -->
		{#if showImportWatch}
			<button
				onclick={onImportWatch}
				class="w-full py-2 px-4 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
			>
				Import Watch-Only Address
			</button>
		{/if}

		<!-- Import using Secret Phrase -->
		<button
			onclick={onImportPhrase}
			class="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
		>
			Import using Secret Phrase
		</button>

		<!-- Restore from Emergency Kit -->
		{#if isProUser}
			<button
				onclick={handleRestore}
				class="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition duration-200 ease-in-out flex items-center justify-center gap-2"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
				</svg>
				Restore all from Emergency Kit
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
					Restore all from Emergency Kit
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
