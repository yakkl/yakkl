<script lang="ts">
	import { onMount } from 'svelte';
	import { identicon } from '$lib/utilities';
	import { getYakklCurrentlySelected, getProfile, getSettings } from '$lib/common/stores';
	import { safeLogout } from '$lib/common/safeNavigate';
	import { ExtensionContext } from '$lib/common/shared/BrowserAccessor';
	import { browser_ext, browserSvelte } from '$lib/common/environment';
	import { BrowserAccessor } from '$lib/common/shared/BrowserAccessor';
	import Share from '$lib/components/Share.svelte';
	import ImageBar from '$lib/components/ImageBar.svelte';
	import PlanBadge from '$lib/components/PlanBadge.svelte';
	import OffcanvasMainMenu from './OffcanvasMainMenu.svelte';
	import GraduationCapButton from './icons/GraduationCapButton.svelte';
	import { log } from '$lib/managers/Logger';
	import SimpleTooltip from './SimpleTooltip.svelte';
	import OffcanvasProfileMenu from './OffcanvasProfileMenu.svelte';
	import Avatar from './Avatar.svelte';
	import { goto } from '$app/navigation';
	import type { Profile, Settings, ProfileData } from '$lib/common/interfaces';
	import { decryptData } from '$lib/common/encryption';
	import { isEncryptedData } from '$lib/common/misc';
	import { yakklMiscStore } from '$lib/common/stores';
	import { get } from 'svelte/store';

	let browserContext: ExtensionContext;
	let address = '';
	let imageSRC = '';
	let userName = '';
	let avatarUrl = '';
	let browserAccessor = BrowserAccessor.getInstance();

	let hoverTimeoutMain: number | null = null;
	let hoverTimeoutProfile: number | null = null;

	onMount(async () => {
		try {
			browserContext = await browserAccessor.getContext();
			const current = await getYakklCurrentlySelected();
			address = current.shortcuts.address;
			imageSRC = identicon(address || 'default');

			// Get profile data for username and avatar
			const profile = await getProfile();
			if (profile) {
				userName = profile.userName || 'Anonymous Yakker';

				// Check if profile data is encrypted and decrypt if needed
				let profileData: ProfileData;
				if (isEncryptedData(profile.data)) {
					const miscStore = get(yakklMiscStore);
					if (miscStore) {
						profileData = await decryptData(profile.data, miscStore) as ProfileData;
					} else {
						profileData = { name: { first: '', last: '' }, email: '', registered: {} } as ProfileData;
					}
				} else {
					profileData = profile.data as ProfileData;
				}

				// Set avatar URL - could be from profile data or fallback to identicon
				avatarUrl = (profileData.meta as any)?.avatarUrl || imageSRC;
			}
		} catch (e) {
			log.warn('Error loading profile data in Header:', false, e);
			userName = 'Anonymous Yakker';
			avatarUrl = imageSRC;
		}
	});

	function handlePopout() {
		if (browserSvelte) {
			browser_ext.runtime.sendMessage({ type: 'popout' });
			safeLogout();
		}
	}

	function showOffcanvasMain() {
		if (typeof window !== 'undefined' && (window as any).bootstrap) {
			const element = document.getElementById('offcanvasMainMenu');
			if (element) {
				const offcanvasInstance = (window as any).bootstrap.Offcanvas.getOrCreateInstance(element);
				offcanvasInstance.show();
			}
		}
	}

	function hideOffcanvasMain() {
		if (typeof window !== 'undefined' && (window as any).bootstrap) {
			const element = document.getElementById('offcanvasMainMenu');
			if (element) {
				const offcanvasInstance = (window as any).bootstrap.Offcanvas.getInstance(element);
				if (offcanvasInstance) {
					offcanvasInstance.hide();
				}
			}
		}
	}

	function showOffcanvasProfile() {
		if (typeof window !== 'undefined' && (window as any).bootstrap) {
			const element = document.getElementById('offcanvasProfileMenu');
			if (element) {
				const offcanvasInstance = (window as any).bootstrap.Offcanvas.getOrCreateInstance(element);
				offcanvasInstance.show();
			}
		}
	}

	function hideOffcanvasProfile() {
		if (typeof window !== 'undefined' && (window as any).bootstrap) {
			const element = document.getElementById('offcanvasProfileMenu');
			if (element) {
				const offcanvasInstance = (window as any).bootstrap.Offcanvas.getInstance(element);
				if (offcanvasInstance) {
					offcanvasInstance.hide();
				}
			}
		}
	}

	function handleMainMenuHover() {
		if (hoverTimeoutMain) {
			clearTimeout(hoverTimeoutMain);
			hoverTimeoutMain = null;
		}
		// Small delay to prevent immediate showing on quick mouse movements
		setTimeout(() => {
			showOffcanvasMain();
		}, 100);
	}

	function handleMainMenuLeave() {
		// Don't set timeout here, let the menu handle its own timeout
	}

	function handleProfileMenuHover() {
		if (hoverTimeoutProfile) {
			clearTimeout(hoverTimeoutProfile);
			hoverTimeoutProfile = null;
		}
		// Small delay to prevent immediate showing on quick mouse movements
		setTimeout(() => {
			showOffcanvasProfile();
		}, 100);
	}

	function handleProfileMenuLeave() {
		// Don't set timeout here, let the menu handle its own timeout
	}
</script>

<ImageBar>
	<nav class="grid grid-cols-[1fr,2fr,1fr] items-center w-full py-2 px-2 gap-0">
		<!-- Left Icon -->
		<div class="flex items-center justify-start gap-4">
			<SimpleTooltip content="Open the main menu" position="right">
				<a
					data-bs-toggle="offcanvas"
					href="#offcanvasMainMenu"
					aria-controls="offcanvasMainMenu"
					role="button"
					aria-label="Menu"
					onmouseenter={handleMainMenuHover}
					onmouseleave={handleMainMenuLeave}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						class="w-7 h-7 fill-gray-100 hover:fill-gray-400"
					>
						<path
							fill-rule="evenodd"
							d="M3 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.25zm0 4.5A.75.75 0 013.75 9h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 9.75zm0 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zm0 4.5a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
							clip-rule="evenodd"
						/>
					</svg>
				</a>
			</SimpleTooltip>
			<SimpleTooltip content="YAKKL University" position="bottom">
				<GraduationCapButton />
			</SimpleTooltip>
			<!-- New Wallet Demo Button -->
			<SimpleTooltip content="Preview new wallet design" position="bottom">
				<button
					onclick={() => goto('/preview2')}
					class="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-md hover:from-purple-600 hover:to-indigo-700 transition-all"
					aria-label="Preview new design"
				>
					<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</button>
			</SimpleTooltip>
		</div>

		<!-- Center Badge -->
		<div class="flex items-center justify-center">
			<PlanBadge />
		</div>

		<!-- Right Icons -->
		<div class="flex items-center justify-end gap-4">
			<Share />
			{#if browserContext === ExtensionContext.SIDEPANEL}
				<button onclick={handlePopout} aria-label="Popout">
					<!-- popout icon -->
				</button>
			{:else}
				<SimpleTooltip content="Open the profile menu" position="bottom">
					<a
						data-bs-toggle="offcanvas"
						href="#offcanvasProfileMenu"
						aria-controls="offcanvasProfileMenu"
						role="button"
						aria-label="Menu"
						onmouseenter={handleProfileMenuHover}
						onmouseleave={handleProfileMenuLeave}
					>
						<Avatar
							url={avatarUrl}
							userName={userName}
							ariaLabel="Profile"
							className="w-8 h-8 rounded-full ring-2 ring-offset-1"
						/>
					</a>
				</SimpleTooltip>
			{/if}
		</div>
	</nav>
</ImageBar>

<OffcanvasMainMenu />

<OffcanvasProfileMenu {userName} {avatarUrl} />
