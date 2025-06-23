<script lang="ts">
	import { goto } from '$app/navigation';
	import { PATH_LOGOUT } from '$lib/common';
	import {
		showEmergencyKit,
		showEmergencyKitExport,
		showEmergencyKitImport
	} from '$lib/common/stores/ui';
	import { onMount, onDestroy } from 'svelte';
	import { getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { Settings } from '$lib/common/interfaces';
	import SimpleTooltip from './SimpleTooltip.svelte';

	let settings: Settings | null = $state(null);
	let isProUser = $state(false);
	let offcanvasElement: HTMLElement;
	let isHoveringMenu = $state(false);
	let hoverTimeout: number | null = null;

	onMount(async () => {
		settings = await getSettings();
		isProUser = shouldShowProFeatures(settings?.plan?.type || PlanType.BASIC_MEMBER);
		
		// Add click outside listener (browser only)
		if (typeof window !== 'undefined') {
			setupClickOutsideListener();
		}
	});

	onDestroy(() => {
		// Cleanup event listeners (browser only)
		if (typeof window !== 'undefined' && typeof document !== 'undefined') {
			document.removeEventListener('click', handleClickOutside);
		}
		// Cleanup hover timeout
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
	});

	function setupClickOutsideListener() {
		if (typeof document !== 'undefined') {
			document.addEventListener('click', handleClickOutside);
		}
	}

	function handleClickOutside(event: MouseEvent) {
		if (!offcanvasElement) return;
		
		const target = event.target as HTMLElement;
		const isOffcanvasVisible = offcanvasElement.classList.contains('show');
		
		// Check if click is outside the offcanvas and not on a trigger button
		const isClickOutside = !offcanvasElement.contains(target);
		const isNotTrigger = !target.closest('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasMainMenu"]');
		
		if (isOffcanvasVisible && isClickOutside && isNotTrigger) {
			closeOffcanvas();
		}
	}

	function closeOffcanvas() {
		if (typeof window !== 'undefined' && window.bootstrap) {
			const offcanvasInstance = window.bootstrap.Offcanvas.getInstance(offcanvasElement);
			if (offcanvasInstance) {
				offcanvasInstance.hide();
			}
		}
	}

	function handleMenuMouseEnter() {
		isHoveringMenu = true;
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
			hoverTimeout = null;
		}
	}

	function handleMenuMouseLeave() {
		isHoveringMenu = false;
		// Start timeout to close menu when mouse leaves
		hoverTimeout = setTimeout(() => {
			closeOffcanvas();
		}, 500) as unknown as number; // 500ms delay when leaving menu
	}

	function handleLogout() {
		goto(PATH_LOGOUT);
	}

	function openExportKit() {
		if (!isProUser) return;
		showEmergencyKitExport.set(true);
		showEmergencyKitImport.set(false);
		showEmergencyKit.set(true);
	}

	function openImportKit() {
		if (!isProUser) return;
		showEmergencyKitExport.set(false);
		showEmergencyKitImport.set(true);
		showEmergencyKit.set(true);
	}
</script>

<div
	bind:this={offcanvasElement}
	class="z-100 offcanvas offcanvas-start top-0 left-0 fixed bottom-auto flex flex-col min-w-[200px] max-w-[280px] font-sans antialiased invisible bg-clip-padding shadow-sm outline-none transition duration-300 ease-in-out border-none rounded-r-md bg-primary text-base-content"
	tabindex="-1"
	id="offcanvasMainMenu"
	aria-labelledby="offcanvasMainMenuLabel"
	role="dialog"
	aria-modal="true"
	onmouseenter={handleMenuMouseEnter}
	onmouseleave={handleMenuMouseLeave}
>
	<!-- Header -->
	<div class="offcanvas-header flex items-center justify-between px-4 pt-2 pb-2 bg-primary-200">
		<h5 class="offcanvas-title font-semibold" id="offcanvasMainMenuLabel">Menu</h5>
		<button
			type="button"
			class="text-base-content opacity-60 hover:opacity-100"
			data-bs-dismiss="offcanvas"
			aria-label="Close"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="w-5 h-5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<hr class="my-1 border-base-content/20" />

	<!-- Menu Items -->
	<ul class="px-2 space-y-1">
		<li data-bs-dismiss={isProUser ? "offcanvas" : ""}>
			{#if isProUser}
				<button
					onclick={openExportKit}
					class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					Export Emergency Kit
				</button>
			{:else}
				<SimpleTooltip content="Upgrade to Pro for full Emergency Kit features">
					<button
						disabled
						class="w-full text-left px-4 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
						</svg>
						Export Emergency Kit
						<div class="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center ml-auto">
							<svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
						</div>
					</button>
				</SimpleTooltip>
			{/if}
		</li>
		<li data-bs-dismiss={isProUser ? "offcanvas" : ""}>
			{#if isProUser}
				<button
					onclick={openImportKit}
					class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					Import Emergency Kit
				</button>
			{:else}
				<SimpleTooltip content="Upgrade to Pro for full Emergency Kit features">
					<button
						disabled
						class="w-full text-left px-4 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
						</svg>
						Import Emergency Kit
						<div class="w-3 h-3 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center ml-auto">
							<svg class="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
							</svg>
						</div>
					</button>
				</SimpleTooltip>
			{/if}
		</li>
		<li data-bs-dismiss="offcanvas">
			<a
				href="https://yakkl.com/university/support?utm_source=yakkl&utm_medium=extension&utm_campaign=extension&utm_content=menu&utm_term=help"
				class="block px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition"
				target="_blank"
				rel="noreferrer"
			>
				❓ Help Center
			</a>
		</li>
		<li data-bs-dismiss="offcanvas">
			<button
				onclick={handleLogout}
				class="w-full text-left px-4 py-2 rounded-md text-sm text-red-600 hover:text-red-800 hover:bg-primary-100 transition"
			>
				🔒 Lock & Logout
			</button>
		</li>
		<li data-bs-dismiss="offcanvas">
			<button
				onclick={handleLogout}
				class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition"
			>
				🧨 Exit YAKKL
			</button>
		</li>
	</ul>

	<hr class="my-1 border-base-content/20" />

	<div class="text-center py-2 bg-primary">
		<a
			class="text-sm font-semibold text-base-content hover:underline"
			href="https://yakkl.com/?utm_source=yakkl&utm_medium=extension&utm_campaign=extension&utm_content=menu&utm_term=extension"
			target="_blank"
			rel="noreferrer"
		>
			yakkl.com
		</a>
	</div>
</div>
