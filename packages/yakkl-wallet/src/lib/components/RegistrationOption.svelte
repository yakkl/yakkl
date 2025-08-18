<script lang="ts">
	// NOTE: This is for the RegistrationOption component. The RegistrationOptionModal is only for the RegistrationOption component. Restore requires a valid account to be created first. So, removed restore from here for now.
	import { onMount } from 'svelte';
	import { getYakklSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { YakklSettings } from '$lib/common/interfaces';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

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

	let settings: YakklSettings | null = $state(null);
	let isProUser = $state(false);

	onMount(async () => {
		settings = await getYakklSettings();
		isProUser = shouldShowProFeatures(settings?.plan?.type || PlanType.EXPLORER_MEMBER);
	});

	function handleRestore() {
		if (!isProUser) return;
		onRestore();
	}
</script>

<div class="yakkl-card">
	<h1 class="text-2xl font-bold text-center text-zinc-900 dark:text-white mb-4">
		{title}
	</h1>

	<div class="space-y-4 mb-6">
		<p class="text-zinc-600 dark:text-zinc-400 text-center">
			Choose an option to get started with your wallet:
		</p>
		<div class="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 space-y-3">
			<div class="flex items-start gap-3">
				<span class="text-indigo-600 dark:text-indigo-400 mt-0.5">•</span>
				<span class="text-zinc-700 dark:text-zinc-300">Create a new account if this is your first time</span>
			</div>
			<div class="flex items-start gap-3">
				<span class="text-green-600 dark:text-green-400 mt-0.5">•</span>
				<span class="text-zinc-700 dark:text-zinc-300">Import an existing account if you have one</span>
			</div>
			<div class="flex items-start gap-3">
				<span class="text-red-600 dark:text-red-400 mt-0.5">•</span>
				<span class="text-zinc-700 dark:text-zinc-300">Restore from Emergency Kit if recovering your wallet</span>
			</div>
		</div>
	</div>

	<div class="space-y-3">
		<!-- Create New Account Button -->
		<button
			onclick={onCreate}
			class="yakkl-btn-primary w-full flex items-center justify-center gap-2"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create New Account
		</button>

		<!-- Import Existing Account Button -->
		<button
			onclick={onImport}
			class="yakkl-btn-secondary w-full flex items-center justify-center gap-2"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
			</svg>
			Import Existing Account
		</button>

		<!-- Restore from Emergency Kit Button -->
		{#if isProUser}
			<button
				onclick={handleRestore}
				class="yakkl-btn-danger w-full flex items-center justify-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Restore from Emergency Kit
			</button>
		{:else}
			<SimpleTooltip content="Upgrade to Pro for full Emergency Kit features">
				<button
					disabled
					class="w-full bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-semibold px-4 py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 relative"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
					Restore from Emergency Kit
					<span class="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
						PRO
					</span>
				</button>
			</SimpleTooltip>
		{/if}
	</div>
</div>
