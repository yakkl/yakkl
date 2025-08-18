<script lang="ts">
	import { viewStore, currentView } from '$lib/stores/view.store';
	import type { ViewType } from '$lib/stores/view.store';
	import { goto } from '$app/navigation';
	
	// Props
	let {
		className = ''
	} = $props();
	
	// Navigation items
	const navItems: Array<{
		id: ViewType;
		label: string;
		icon: string;
		route: string;
		color: string;
	}> = [
		{
			id: 'dashboard',
			label: 'Dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
			route: '/dashboard',
			color: 'blue'
		},
		{
			id: 'accounts',
			label: 'Accounts',
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
			route: '/accounts',
			color: 'green'
		},
		{
			id: 'tokens',
			label: 'Tokens',
			icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
			route: '/tokens',
			color: 'purple'
		},
		{
			id: 'transactions',
			label: 'Transactions',
			icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
			route: '/transactions',
			color: 'orange'
		},
		{
			id: 'networks',
			label: 'Networks',
			icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
			route: '/networks',
			color: 'teal'
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
			route: '/settings',
			color: 'gray'
		}
	];
	
	// Handle navigation
	function navigate(item: typeof navItems[0]) {
		viewStore.switchView(item.id);
		if (item.route && item.route !== '/tokens' && item.route !== '/transactions') {
			goto(item.route);
		}
	}
</script>

<nav class="traditional-nav {className}">
	<div class="nav-grid">
		{#each navItems as item}
			<button
				class="nav-item"
				class:active={$currentView === item.id}
				onclick={() => navigate(item)}
				aria-label={item.label}
				aria-current={$currentView === item.id ? 'page' : undefined}
			>
				<div class="nav-icon bg-{item.color}-100 dark:bg-{item.color}-900/20">
					<svg class="w-6 h-6 text-{item.color}-600 dark:text-{item.color}-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
					</svg>
				</div>
				<span class="nav-label">{item.label}</span>
			</button>
		{/each}
	</div>
</nav>

<style>
	.traditional-nav {
		width: 100%;
		padding: 1rem;
	}
	
	.nav-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}
	
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.nav-item:hover {
		background: #f9fafb;
		transform: translateY(-2px);
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
	
	.nav-item.active {
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		border-color: transparent;
	}
	
	.nav-item.active .nav-icon {
		background: rgba(255, 255, 255, 0.2) !important;
	}
	
	.nav-item.active .nav-icon svg {
		color: white !important;
	}
	
	.nav-item.active .nav-label {
		color: white;
		font-weight: 600;
	}
	
	.nav-icon {
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
	}
	
	.nav-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}
	
	/* Dark mode */
	:global(.dark) .nav-item {
		background: #1f2937;
		border-color: #374151;
	}
	
	:global(.dark) .nav-item:hover {
		background: #374151;
	}
	
	:global(.dark) .nav-label {
		color: #d1d5db;
	}
	
	/* Responsive */
	@media (min-width: 640px) {
		.nav-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	
	@media (max-width: 639px) {
		.nav-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>