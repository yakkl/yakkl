<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import '../../lib/themes/wallet-theme.css';

	// Theme management
	let currentTheme = $state('system');
	let effectiveTheme = $state('light');

	// Initialize theme
	onMount(() => {
		if (browser) {
			// Get saved theme preference
			const savedTheme = localStorage.getItem('yakkl-new-wallet-theme') || 'system';
			currentTheme = savedTheme;
			applyTheme(savedTheme);

			// Listen for system theme changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			mediaQuery.addListener(handleSystemThemeChange);
			
			return () => {
				mediaQuery.removeListener(handleSystemThemeChange);
			};
		}
	});

	function handleSystemThemeChange(e: MediaQueryListEvent) {
		if (currentTheme === 'system') {
			effectiveTheme = e.matches ? 'dark' : 'light';
			updateDocumentTheme();
		}
	}

	function applyTheme(theme: string) {
		if (!browser) return;
		
		currentTheme = theme;
		localStorage.setItem('yakkl-new-wallet-theme', theme);

		if (theme === 'system') {
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			effectiveTheme = isDark ? 'dark' : 'light';
		} else {
			effectiveTheme = theme;
		}

		updateDocumentTheme();
	}

	function updateDocumentTheme() {
		if (!browser) return;
		
		const html = document.documentElement;
		
		// Remove existing theme classes
		html.removeAttribute('data-theme');
		html.classList.remove('dark', 'light');
		
		// Apply new theme
		if (effectiveTheme === 'dark') {
			html.setAttribute('data-theme', 'dark');
			html.classList.add('dark');
		} else {
			html.setAttribute('data-theme', 'light');
			html.classList.add('light');
		}
	}

	// Export theme functions for child components
	export function toggleTheme() {
		const themes = ['light', 'dark', 'system'];
		const currentIndex = themes.indexOf(currentTheme);
		const nextTheme = themes[(currentIndex + 1) % themes.length];
		applyTheme(nextTheme);
	}

	export function setTheme(theme: 'light' | 'dark' | 'system') {
		applyTheme(theme);
	}

	// Make theme state available to child components
	export { currentTheme, effectiveTheme };
</script>

<div class="new-wallet min-h-screen transition-colors duration-200">
	<main class="mx-auto max-w-wallet min-h-wallet">
		<slot />
	</main>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
	
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	/* Ensure smooth transitions */
	:global(*) {
		transition-property: background-color, border-color, color, fill, stroke;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		transition-duration: 150ms;
	}
</style>