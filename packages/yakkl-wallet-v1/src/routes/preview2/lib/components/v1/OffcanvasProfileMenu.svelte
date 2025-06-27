<script lang="ts">
	import { goto } from '$app/navigation';
	import { PATH_LOGOUT } from '$lib/common';
	import { showProfileSettingsModal } from '$lib/common/stores/ui';
	import Avatar from './Avatar.svelte';
	import Profile from './Profile.svelte';
	import Settings from './Settings.svelte';
	import WatchList from './WatchList.svelte';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { getSettings } from '$lib/common/stores';
	import { shouldShowProFeatures } from '$lib/common/token-analytics';
	import { PlanType } from '$lib/common/types';
	import type { Settings } from '$lib/common/interfaces';

	const props = $props<{
		userName?: string;
		avatarUrl?: string;
	}>();

	let showProfileModal = $state(false);
	let showSettingsModal = $state(false);
	let showWatchListModal = $state(false);
	let offcanvasElement: HTMLElement;
	let isHoveringMenu = $state(false);
	let hoverTimeout: number | null = null;
	let settings: Settings | null = null;
	let isProUser = $state(false);

	onMount(async () => {
		// Load settings to check membership
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
		const isNotTrigger = !target.closest('[data-bs-toggle="offcanvas"][data-bs-target="#offcanvasProfileMenu"]');
		
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

	function openProfile() {
		showProfileModal = true;
	}

	function openSettings() {
		showSettingsModal = true;
	}

	function openWatchList() {
		if (!isProUser) return;
		showWatchListModal = true;
	}

	function handleProfileComplete() {
		// Refresh page or update stores as needed
		showProfileModal = false;
	}

	function handleSettingsComplete() {
		// Refresh page or update stores as needed
		showSettingsModal = false;
	}

	function handleWatchListComplete() {
		// Refresh page or update stores as needed
		showWatchListModal = false;
	}
</script>

<div
	bind:this={offcanvasElement}
	class="z-100 offcanvas offcanvas-end top-0 right-0 fixed bottom-auto flex flex-col min-w-[200px] max-w-[280px] font-sans antialiased invisible bg-clip-padding shadow-sm outline-none transition duration-300 ease-in-out border-none rounded-l-md bg-primary text-base-content"
	tabindex="-1"
	id="offcanvasProfileMenu"
	aria-labelledby="offcanvasProfileMenuLabel"
	role="dialog"
	aria-modal="true"
	onmouseenter={handleMenuMouseEnter}
	onmouseleave={handleMenuMouseLeave}
>
	<!-- Header -->
	<div class="offcanvas-header flex items-center justify-between px-4 pt-2 pb-2 bg-primary-200">
		<h5 class="offcanvas-title font-semibold" id="offcanvasProfileMenuLabel">Profile</h5>
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

	<!-- User Info -->
	<div class="flex items-center gap-3 px-4 py-3">
		<Avatar
			url={props.avatarUrl}
			ariaLabel="Profile"
			className="w-10 h-10 rounded-full ring-2 ring-offset-1"
		/>
		<div class="text-sm font-semibold">{props.userName ?? 'Anonymous Yakker'}</div>
	</div>

	<hr class="my-1 border-base-content/20" />

	<!-- Menu Items -->
	<ul class="px-2 space-y-1">
		<li data-bs-dismiss="offcanvas">
			<button
				onclick={openProfile}
				class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition"
			>
				👤 Profile
			</button>
		</li>
		<li data-bs-dismiss="offcanvas">
			<button
				onclick={openSettings}
				class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition"
			>
				⚙️ Account Settings
			</button>
		</li>
		<li data-bs-dismiss={isProUser ? "offcanvas" : ""}>
			{#if isProUser}
				<button
					onclick={openWatchList}
					class="w-full text-left px-4 py-2 rounded-md text-sm hover:bg-primary-100 transition flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"/>
					</svg>
					Watch Accounts
				</button>
			{:else}
				<SimpleTooltip content="Upgrade to Pro for portfolio tracking, whale watching, and social trading intelligence">
					<button
						disabled
						class="w-full text-left px-4 py-2 rounded-md text-sm text-gray-400 cursor-not-allowed flex items-center gap-2"
					>
						<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"/>
						</svg>
						Watch Accounts
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
			<button
				onclick={handleLogout}
				class="w-full text-left px-4 py-2 rounded-md text-sm text-red-600 hover:text-red-800 hover:bg-primary-100 transition"
			>
				🔒 Logout
			</button>
		</li>
	</ul>

	<hr class="my-1 border-base-content/20" />

	<div class="text-center py-2 bg-primary">
		<a
			class="text-sm font-semibold text-base-content hover:underline"
			href="https://yakkl.com/?utm_source=yakkl&utm_medium=extension&utm_campaign=extension&utm_content=profile&utm_term=extension"
			target="_blank"
			rel="noreferrer"
		>
			yakkl.com
		</a>
	</div>
</div>

<!-- Profile and Settings Modals -->
<Profile
	bind:show={showProfileModal}
	onComplete={handleProfileComplete}
	onClose={() => (showProfileModal = false)}
/>

<Settings
	bind:show={showSettingsModal}
	onComplete={handleSettingsComplete}
	onClose={() => (showSettingsModal = false)}
/>

<WatchList
	bind:show={showWatchListModal}
	onComplete={handleWatchListComplete}
	onClose={() => (showWatchListModal = false)}
/>
