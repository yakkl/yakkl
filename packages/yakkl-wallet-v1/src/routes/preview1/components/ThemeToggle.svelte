<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fade, scale } from 'svelte/transition';

	let currentTheme = $state('system');
	let effectiveTheme = $state('light');
	let showTooltip = $state(false);

	onMount(() => {
		if (browser) {
			// Get saved theme preference
			const savedTheme = localStorage.getItem('yakkl-new-wallet-theme') || 'system';
			currentTheme = savedTheme;
			updateEffectiveTheme();

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
			updateEffectiveTheme();
		}
	}

	function updateEffectiveTheme() {
		if (!browser) return;
		
		if (currentTheme === 'system') {
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			effectiveTheme = isDark ? 'dark' : 'light';
		} else {
			effectiveTheme = currentTheme;
		}

		applyThemeToDocument();
	}

	function applyThemeToDocument() {
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

	function toggleTheme() {
		const themes = ['light', 'dark', 'system'];
		const currentIndex = themes.indexOf(currentTheme);
		const nextTheme = themes[(currentIndex + 1) % themes.length];
		
		currentTheme = nextTheme;
		localStorage.setItem('yakkl-new-wallet-theme', nextTheme);
		updateEffectiveTheme();
	}

	function getThemeIcon(theme: string) {
		switch (theme) {
			case 'light':
				return 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z';
			case 'dark':
				return 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z';
			case 'system':
				return 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
			default:
				return '';
		}
	}

	function getThemeLabel(theme: string) {
		switch (theme) {
			case 'light':
				return 'Light mode';
			case 'dark':
				return 'Dark mode';
			case 'system':
				return 'System theme';
			default:
				return '';
		}
	}
</script>

<div class="relative">
	<button
		onclick={toggleTheme}
		onmouseenter={() => showTooltip = true}
		onmouseleave={() => showTooltip = false}
		class="w-12 h-12 bg-surface-elevated hover:bg-surface rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border border-border-light group"
		aria-label="Toggle theme"
		in:scale={{ duration: 200 }}
	>
		<svg 
			class="w-5 h-5 text-text-secondary group-hover:text-primary-500 transition-colors" 
			fill="none" 
			stroke="currentColor" 
			viewBox="0 0 24 24"
		>
			<path 
				stroke-linecap="round" 
				stroke-linejoin="round" 
				stroke-width="2" 
				d={getThemeIcon(currentTheme)} 
			/>
		</svg>
	</button>

	{#if showTooltip}
		<div
			in:fade={{ duration: 200 }}
			out:fade={{ duration: 150 }}
			class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-surface-elevated rounded-button shadow-lg border border-border text-sm text-text-primary whitespace-nowrap z-50"
		>
			{getThemeLabel(currentTheme)}
			{#if currentTheme === 'system'}
				<span class="text-text-muted">({effectiveTheme})</span>
			{/if}
			
			<!-- Tooltip arrow -->
			<div class="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border"></div>
		</div>
	{/if}
</div>