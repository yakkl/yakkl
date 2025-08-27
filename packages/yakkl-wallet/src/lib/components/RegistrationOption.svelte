<script lang="ts">
	// NOTE: This is for the RegistrationOption component. The RegistrationOptionModal is only for the RegistrationOption component. Restore requires a valid account to be created first. So, removed restore from here for now.
	// TODO: Fix architecture limitation - import/restore requires an account to exist first. Consider creating temporary account for these operations.
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
		title = 'Get Started with YAKKL',
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

<div class="yakkl-card backdrop-blur-sm bg-white/90 dark:bg-zinc-800/90 max-w-md mx-auto">
	<!-- Header with logo -->
	<div class="text-center mb-6">
		<img src="/images/logoBullFav128x128.png" alt="YAKKL" class="w-16 h-16 mx-auto mb-4" />
		<h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
			{title}
		</h1>
		<p class="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
			Choose how you want to set up your secure wallet
		</p>
	</div>

	<!-- Options Cards -->
	<div class="space-y-3 mb-6">
		<!-- Create New Card -->
		<div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
				</div>
				<div>
					<h3 class="font-semibold text-zinc-900 dark:text-white">Create New Wallet</h3>
					<p class="text-xs text-zinc-600 dark:text-zinc-400">Start fresh with a new secure wallet</p>
				</div>
			</div>
		</div>

		<!-- Import Existing Card -->
		<div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-700">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
				</div>
				<div>
					<h3 class="font-semibold text-zinc-900 dark:text-white">Import Wallet</h3>
					<p class="text-xs text-zinc-600 dark:text-zinc-400">Bring your existing wallet with seed phrase</p>
				</div>
			</div>
		</div>

		<!-- Restore from Emergency Kit Card -->
		<div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 relative">
					<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
					{#if !isProUser}
						<span class="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">
							PRO
						</span>
					{/if}
				</div>
				<div>
					<h3 class="font-semibold text-zinc-900 dark:text-white">Emergency Recovery</h3>
					<p class="text-xs text-zinc-600 dark:text-zinc-400">Restore from your Emergency Kit backup</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="space-y-3">
		<!-- Create New Account Button -->
		<button
			onclick={onCreate}
			class="yakkl-btn-primary w-full flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Create New Wallet
		</button>

		<!-- Import Existing Account Button -->
		<button
			onclick={onImport}
			class="yakkl-btn-secondary w-full flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
			</svg>
			Import Existing Wallet
		</button>

		<!-- Restore from Emergency Kit Button -->
		{#if isProUser}
			<button
				onclick={handleRestore}
				class="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-2"
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
					class="w-full bg-zinc-200 dark:bg-zinc-700/50 text-zinc-400 dark:text-zinc-500 font-semibold px-4 py-2 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 relative opacity-60"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
					</svg>
					Restore from Emergency Kit
					<span class="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-lg">
						PRO
					</span>
				</button>
			</SimpleTooltip>
		{/if}
	</div>
</div>
