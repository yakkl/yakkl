<!-- SessionProvider.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore, showSessionWarning, sessionTimeRemaining } from '$lib/stores/auth-store';
	import SessionWarning from './SessionWarning.svelte';
	import { log } from '$lib/common/logger-wrapper';
	import { protectedContexts } from '$lib/common/globals';
	import { PATH_LOGOUT } from '$lib/common';

	interface Props {
		children: any;
	}

	let { children }: Props = $props();
	let shouldShowSessionWarning = $state(false);

	// Check if current context needs session warnings
	function getCurrentContextType(): string {
		try {
			if (typeof window === 'undefined') return 'unknown';

			const pathname = window.location.pathname;
			const href = window.location.href;

			if (pathname.includes('sidepanel') || href.includes('sidepanel')) {
				return 'sidepanel';
			} else if (
				pathname.includes('index.html') ||
				href.includes('index.html') ||
				pathname === '/' ||
				pathname === ''
			) {
				return 'popup-wallet';
			} else if (pathname.includes('dapp/popups') || href.includes('dapp/popups')) {
				return 'popup-dapp';
			} else {
				return 'popup-wallet'; // Default to popup-wallet for main extension
			}
		} catch (error) {
			return 'unknown';
		}
	}

	function currentContextNeedsSessionWarning(): boolean {
		const contextType = getCurrentContextType();
		return protectedContexts.includes(contextType);
	}

	onMount(() => {
		shouldShowSessionWarning = currentContextNeedsSessionWarning();
		log.debug('SessionProvider context check:', false, { 
			contextType: getCurrentContextType(), 
			shouldShowSessionWarning 
		});
	});

	// Handle session extension
	async function handleExtendSession() {
		try {
			await authStore.extendSession(30); // Extend by 30 minutes
			log.debug('Session extended via session provider', false);
		} catch (error) {
			log.error('Failed to extend session:', false, error);
		}
	}

	// Handle logout
	async function handleLogoutNow() {
		try {
			await authStore.logout();
			log.debug('User logged out via session provider', false);
			// Navigate to logout page
			goto(PATH_LOGOUT);
		} catch (error) {
			log.error('Failed to logout:', false, error);
			// Still try to navigate even if logout fails
			goto(PATH_LOGOUT);
		}
	}
</script>

<!-- Render children -->
{@render children()}

<!-- Global session warning modal - only show in protected contexts -->
{#if shouldShowSessionWarning}
	<SessionWarning
		bind:show={$showSessionWarning}
		timeRemaining={$sessionTimeRemaining}
		onExtendSession={handleExtendSession}
		onLogoutNow={handleLogoutNow}
		autoLogoutEnabled={true}
	/>
{/if}
