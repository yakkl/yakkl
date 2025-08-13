<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	
	// Props
	let {
		title = '',
		subtitle = '',
		showBack = true,
		backPath = null as string | null,
		onBack = null as (() => void) | null,
		showBreadcrumbs = false,
		breadcrumbs = [] as Array<{ label: string; path?: string }>,
		showActions = false,
		className = ''
	} = $props<{
		title?: string;
		subtitle?: string;
		showBack?: boolean;
		backPath?: string | null;
		onBack?: (() => void) | null;
		showBreadcrumbs?: boolean;
		breadcrumbs?: Array<{ label: string; path?: string }>;
		showActions?: boolean;
		className?: string;
	}>();
	
	// Derived states
	let currentPath = $derived($page.url.pathname);
	let canGoBack = $derived(showBack && (backPath || onBack || window.history.length > 1));
	
	// Build breadcrumbs from path if not provided
	let computedBreadcrumbs = $derived.by(() => {
		if (breadcrumbs.length > 0) return breadcrumbs;
		
		// Auto-generate breadcrumbs from path
		const pathParts = currentPath.split('/').filter(Boolean);
		const generated: Array<{ label: string; path: string }> = [];
		
		// Add home/root
		generated.push({ label: 'Home', path: '/home' });
		
		// Build breadcrumbs from path segments
		let accumulatedPath = '';
		pathParts.forEach((part, index) => {
			// Skip route groups (parentheses)
			if (part.startsWith('(') && part.endsWith(')')) return;
			
			accumulatedPath += `/${part}`;
			
			// Format label (capitalize, replace hyphens/underscores)
			const label = part
				.replace(/[-_]/g, ' ')
				.replace(/\b\w/g, l => l.toUpperCase());
			
			// Don't add duplicate home
			if (part !== 'home') {
				generated.push({ 
					label, 
					path: index === pathParts.length - 1 ? undefined : accumulatedPath 
				});
			}
		});
		
		return generated;
	});
	
	// Handle back navigation
	function handleBack() {
		if (onBack) {
			onBack();
		} else if (backPath) {
			goto(backPath);
		} else {
			// Use browser back
			window.history.back();
		}
	}
	
	// Navigate to breadcrumb
	function navigateToBreadcrumb(path?: string) {
		if (path) {
			goto(path);
		}
	}
</script>

<header class="navigation-header {className}">
	<div class="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center gap-3 flex-1">
			<!-- Back Button -->
			{#if canGoBack}
				<SimpleTooltip text="Go back" position="right">
					<button
						onclick={handleBack}
						class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
						aria-label="Go back"
					>
						<Icon 
							name="arrow-left" 
							className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors"
						/>
					</button>
				</SimpleTooltip>
			{/if}
			
			<!-- Title Section -->
			<div class="flex-1">
				{#if showBreadcrumbs && computedBreadcrumbs.length > 0}
					<!-- Breadcrumbs -->
					<nav aria-label="Breadcrumb" class="mb-1">
						<ol class="flex items-center space-x-1 text-sm">
							{#each computedBreadcrumbs as crumb, index}
								<li class="flex items-center">
									{#if index > 0}
										<Icon 
											name="chevron-right" 
											className="w-4 h-4 text-gray-400 dark:text-gray-600 mx-1"
										/>
									{/if}
									
									{#if crumb.path}
										<button
											onclick={() => navigateToBreadcrumb(crumb.path)}
											class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
										>
											{crumb.label}
										</button>
									{:else}
										<span class="text-gray-900 dark:text-gray-100 font-medium">
											{crumb.label}
										</span>
									{/if}
								</li>
							{/each}
						</ol>
					</nav>
				{/if}
				
				<!-- Title -->
				{#if title}
					<h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
						{title}
					</h1>
				{/if}
				
				<!-- Subtitle -->
				{#if subtitle}
					<p class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
						{subtitle}
					</p>
				{/if}
			</div>
			
			<!-- Actions Slot -->
			{#if showActions}
				<div class="flex items-center gap-2">
					<slot name="actions" />
				</div>
			{/if}
		</div>
	</div>
	
	<!-- Additional Content Slot -->
	<slot name="extra" />
</header>

<style>
	.navigation-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: inherit;
	}
	
	/* Smooth transitions */
	.navigation-header :global(*) {
		transition-property: color, background-color, border-color;
		transition-duration: 150ms;
	}
</style>