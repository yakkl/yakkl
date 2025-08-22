<script lang="ts">
	import { spring } from 'svelte/motion';
	import { viewStore, currentView, viewStats, isRefreshing } from '$lib/stores/view.store';
	import type { ViewType } from '$lib/stores/view.store';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { walletCacheStore } from '$lib/stores/wallet-cache.store';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

	// Props
	let {
		showTotal = true,
		enableAnimations = true,
		className = ''
	} = $props();

	// State
	let rotation = spring(0, { stiffness: 0.1, damping: 0.25 });
	let selectedView = $state<ViewType>('dashboard');
	let isDragging = $state(false);
	let dragStartAngle = $state(0);
	let hoveredView = $state<ViewType | null>(null);

	// Cache for portfolio total
	let portfolioTotal = $derived.by(() => {
		const cache = $walletCacheStore;
		return cache?.portfolioRollups?.grandTotal?.totalValue || '0';
	});

	// Format portfolio value for display
	function formatPortfolioValue(value: any): string {
		try {
			// Safe conversion (value is in cents)
			let numValue: number;
			if (value && typeof value === 'number') {
				numValue = value / 100;
			} else if (value && typeof value === 'bigint') {
				numValue = Number(value) / 100;
			} else if (value) {
				numValue = BigNumberishUtils.toNumber(value) / 100;
			} else {
				return '0.00';
			}

			// Format as currency - use compact notation for large numbers
			if (numValue >= 1000000) {
				return new Intl.NumberFormat('en-US', {
					notation: 'compact',
					minimumFractionDigits: 1,
					maximumFractionDigits: 1
				}).format(numValue).replace('M', 'M').replace('K', 'K');
			} else {
				return new Intl.NumberFormat('en-US', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(numValue);
			}
		} catch {
			return '0.00';
		}
	}

	// Get responsive font size for orbital view
	function getResponsiveFontSize(value: any): string {
		try {
			let numValue: number;
			if (value && typeof value === 'number') {
				numValue = value / 100;
			} else if (value && typeof value === 'bigint') {
				numValue = Number(value) / 100;
			} else if (value) {
				numValue = BigNumberishUtils.toNumber(value) / 100;
			} else {
				return 'text-lg';
			}

			// Inverse sizing for circular container - smaller text for larger values
			if (numValue >= 10000000) return 'text-xs'; // ≥$10M
			if (numValue >= 1000000) return 'text-sm';  // ≥$1M
			if (numValue >= 100000) return 'text-base';  // ≥$100K
			if (numValue >= 10000) return 'text-lg';     // ≥$10K
			return 'text-xl'; // <$10K
		} catch {
			return 'text-lg';
		}
	}

	// View definitions with orbital positions
	const views: Array<{
		id: ViewType;
		icon: string;
		label: string;
		angle: number;
		color: string;
		gradient: string;
	}> = [
		{
			id: 'dashboard',
			icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
			label: 'Dashboard',
			angle: 0,
			color: 'blue',
			gradient: 'from-blue-400 to-blue-600'
		},
		{
			id: 'accounts',
			icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
			label: 'Accounts',
			angle: 60,
			color: 'purple',
			gradient: 'from-purple-400 to-purple-600'
		},
		{
			id: 'networks',
			icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
			label: 'Networks',
			angle: 120,
			color: 'indigo',
			gradient: 'from-indigo-400 to-indigo-600'
		},
		{
			id: 'tokens',
			icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
			label: 'Tokens',
			angle: 180,
			color: 'green',
			gradient: 'from-green-400 to-green-600'
		},
		{
			id: 'transactions',
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
			label: 'Transactions',
			angle: 240,
			color: 'yellow',
			gradient: 'from-yellow-400 to-yellow-600'
		},
		{
			id: 'watchlist',
			icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
			label: 'Watching',
			angle: 300,
			color: 'red',
			gradient: 'from-red-400 to-red-600'
		}
	];

	// Get view stats summary
	function getViewSummary(viewId: ViewType): string {
		const stats = $viewStats;
		switch (viewId) {
			case 'accounts':
				return `${stats.totalAccounts} accounts`;
			case 'tokens':
				return `${stats.totalTokens} tokens`;
			case 'transactions':
				return `${stats.totalTransactions} txns`;
			case 'watchlist':
				return `${stats.watchlistCount} watching`;
			// case 'networks':
			// 	return `${stats.activeNetworks} networks`;
			default:
				return 'Overview';
		}
	}

	// Select a view
	function selectView(viewId: ViewType) {
		const view = views.find(v => v.id === viewId);
		if (view && enableAnimations) {
			// Calculate shortest rotation path
			const currentRotation = $rotation;
			const targetRotation = -view.angle;
			const diff = targetRotation - (currentRotation % 360);

			// Normalize to shortest path
			const shortestPath = ((diff + 540) % 360) - 180;
			rotation.set(currentRotation + shortestPath);
		}
		selectedView = viewId;
		viewStore.switchView(viewId);

		// Navigate to the appropriate route
		navigateToView(viewId);
	}

	// Navigate to the view's route
	function navigateToView(viewId: ViewType) {
		import('$app/navigation').then(({ goto }) => {
			switch(viewId) {
				case 'dashboard':
					goto('/home');
					break;
				case 'accounts':
					goto('/accounts');
					break;
				case 'tokens':
					// For now, stay on home - tokens view not implemented yet
					// goto('/tokens');
					break;
				case 'transactions':
					// For now, stay on home - transactions view not implemented yet
					// goto('/transactions');
					break;
				case 'watchlist':
					// For now, stay on home - watchlist view not implemented yet
					// goto('/watchlist');
					break;
				case 'networks':
					goto('/networks');
					break;
				case 'settings':
					goto('/settings');
					break;
			}
		});
	}

	// Handle drag to rotate
	function handleMouseDown(event: MouseEvent) {
		if (!enableAnimations) return;

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		dragStartAngle = Math.atan2(
			event.clientY - centerY,
			event.clientX - centerX
		) * 180 / Math.PI;

		isDragging = true;
	}

	function handleMouseMove(event: MouseEvent) {
		if (!isDragging || !enableAnimations) return;

		const container = document.querySelector('.orbital-container');
		if (!container) return;

		const rect = container.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const currentAngle = Math.atan2(
			event.clientY - centerY,
			event.clientX - centerX
		) * 180 / Math.PI;

		const angleDiff = currentAngle - dragStartAngle;
		rotation.update(r => r + angleDiff);
		dragStartAngle = currentAngle;
	}

	function handleMouseUp() {
		if (!isDragging) return;
		isDragging = false;

		// Snap to nearest view
		const currentRotation = $rotation % 360;
		const normalizedRotation = ((currentRotation % 360) + 360) % 360;

		let closestView = views[0];
		let minDiff = 360;

		for (const view of views) {
			const diff = Math.abs(((view.angle - normalizedRotation + 180) % 360) - 180);
			if (diff < minDiff) {
				minDiff = diff;
				closestView = view;
			}
		}

		selectView(closestView.id);
	}

	// Calculate card position
	function getCardTransform(view: typeof views[0]): string {
		const radius = 150;
		const angleRad = (view.angle * Math.PI) / 180;
		const x = Math.cos(angleRad) * radius;
		const y = Math.sin(angleRad) * radius;

		if (enableAnimations) {
			const rotationAdjust = -$rotation;
			return `rotate(${view.angle}deg) translateX(${radius}px) rotate(${rotationAdjust - view.angle}deg)`;
		}

		return `translate(${x}px, ${y}px)`;
	}

	// Get connection line endpoints
	function getConnectionLine(viewId: ViewType) {
		const view = views.find(v => v.id === viewId);
		if (!view) return null;

		const radius = 150;
		const angleRad = ((view.angle + $rotation) * Math.PI) / 180;
		const x = Math.cos(angleRad) * radius;
		const y = Math.sin(angleRad) * radius;

		return { x2: 200 + x, y2: 200 + y };
	}

	// Lifecycle
	$effect(() => {
		selectedView = $currentView;
		const view = views.find(v => v.id === $currentView);
		if (view && enableAnimations) {
			rotation.set(-view.angle);
		}
	});

	$effect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);

			return () => {
				window.removeEventListener('mousemove', handleMouseMove);
				window.removeEventListener('mouseup', handleMouseUp);
			};
		}
	});
</script>

<div class="orbital-container {className}" class:dragging={isDragging}>
	<!-- Background glow -->
	<div class="absolute inset-0 opacity-30">
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-3xl animate-pulse"></div>
	</div>

	<!-- Central hub with tooltip -->
	<div class="portfolio-hub-container">
		<SimpleTooltip text="Combined value across all your accounts and networks" position="top">
			<div class="portfolio-hub">
			{#if showTotal}
				<div class="total-value">
					<div class="flex flex-col items-center">
						<span class="text-[10px] opacity-90 leading-none">Total</span>
						<span class="text-xs opacity-90 leading-tight -mt-0.5">Portfolio</span>
					</div>
					<div class="{getResponsiveFontSize(portfolioTotal)} font-bold mt-1 transition-all duration-300">
						${formatPortfolioValue(portfolioTotal)}
					</div>
				</div>
			{:else}
				<div class="hub-icon">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={views.find(v => v.id === selectedView)?.icon} />
					</svg>
				</div>
			{/if}

			{#if $isRefreshing}
				<div class="absolute inset-0 rounded-full border-4 border-t-transparent border-white/30 animate-spin"></div>
			{/if}
			</div>
		</SimpleTooltip>
	</div>

	<!-- Active view indicator arrow (stationary on right of selected item) -->
	{#if selectedView}
		{@const selectedViewData = views.find(v => v.id === selectedView)}
		{@const angleRad = ((selectedViewData?.angle || 0) + $rotation) * Math.PI / 180}
		{@const arrowX = 200 + Math.cos(angleRad) * 190}
		{@const arrowY = 200 + Math.sin(angleRad) * 190}
		<div 
			class="active-indicator-arrow"
			style="left: {arrowX}px; top: {arrowY}px; transform: translate(-50%, -50%) rotate({(selectedViewData?.angle || 0) + $rotation}deg);"
		>
			<svg width="20" height="20" viewBox="0 0 20 20">
				<path d="M 5 10 L 15 5 L 15 15 Z" fill="currentColor"/>
			</svg>
		</div>
	{/if}

	<!-- Orbiting cards -->
	<div
		class="orbital-ring"
		style="transform: rotate({enableAnimations ? $rotation : 0}deg)"
		role="navigation"
		aria-label="View selector"
	>
		{#each views as view (view.id)}
			<button
				class="view-card {view.id}"
				class:active={selectedView === view.id}
				class:hovered={hoveredView === view.id}
				style="transform: {getCardTransform(view)}"
				onclick={(e) => {
					e.stopPropagation();
					selectView(view.id);
				}}
				onmouseenter={() => hoveredView = view.id}
				onmouseleave={() => hoveredView = null}
				aria-label="Switch to {view.label} view"
				aria-current={selectedView === view.id ? 'true' : 'false'}
			>
				<div class="card-content">
					<div class="icon-wrapper bg-gradient-to-br {view.gradient}">
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={view.icon} />
						</svg>
					</div>
					<span class="label">{view.label}</span>
					<div class="preview">
						{getViewSummary(view.id)}
					</div>
				</div>

				{#if view.id === 'transactions' && $viewStats.pendingTransactions > 0}
					<div class="notification-badge">
						{$viewStats.pendingTransactions}
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Connection lines -->
	<svg class="connections" viewBox="0 0 400 400">
		{#if selectedView && enableAnimations}
			{@const line = getConnectionLine(selectedView)}
			{#if line}
				<line
					x1="200" y1="200"
					x2={line.x2}
					y2={line.y2}
					class="active-connection"
					transition:fade={{ duration: 200 }}
				/>
			{/if}
		{/if}

		<!-- Orbit path -->
		<circle
			cx="200"
			cy="200"
			r="150"
			fill="none"
			stroke="currentColor"
			stroke-width="1"
			opacity="0.1"
			stroke-dasharray="5 5"
		/>
	</svg>
</div>

<style>
	.orbital-container {
		position: relative;
		width: 400px;
		height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		user-select: none;
	}

	.orbital-container.dragging {
		cursor: grabbing;
	}

	.portfolio-hub-container {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
	}

	.portfolio-hub {
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: linear-gradient(135deg,
			var(--primary, #3b82f6),
			var(--secondary, #8b5cf6)
		);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 0 40px rgba(59, 130, 246, 0.5),
			inset 0 0 20px rgba(255, 255, 255, 0.2);
		backdrop-filter: blur(10px);
		border: 2px solid rgba(255, 255, 255, 0.3);
	}

	.active-indicator-arrow {
		position: absolute;
		z-index: 15;
		pointer-events: none;
		color: #10b981;
		filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.5));
		animation: pulse-arrow 2s ease-in-out infinite;
		transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	@keyframes pulse-arrow {
		0%, 100% {
			filter: drop-shadow(0 2px 8px rgba(16, 185, 129, 0.5));
		}
		50% {
			filter: drop-shadow(0 2px 12px rgba(16, 185, 129, 0.8));
		}
	}

	.total-value {
		text-align: center;
		color: white;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.hub-icon {
		color: white;
	}

	.orbital-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: grab;
	}

	.view-card {
		position: absolute;
		width: 90px;
		height: 90px;
		left: 50%;
		top: 50%;
		margin-left: -45px;
		margin-top: -45px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		overflow: visible;
	}

	.view-card:hover {
		transform-origin: center;
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.4);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.view-card.active {
		background: linear-gradient(135deg,
			rgba(59, 130, 246, 0.3),
			rgba(139, 92, 246, 0.3)
		);
		border-color: rgba(59, 130, 246, 0.5);
		box-shadow:
			0 10px 30px rgba(59, 130, 246, 0.3),
			inset 0 0 10px rgba(255, 255, 255, 0.1);
	}

	.card-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
	}

	.icon-wrapper {
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-primary, #1f2937);
	}

	.preview {
		font-size: 0.625rem;
		opacity: 0.7;
		color: var(--text-secondary, #6b7280);
	}

	.notification-badge {
		position: absolute;
		top: -5px;
		right: -5px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: linear-gradient(135deg, #ef4444, #dc2626);
		color: white;
		font-size: 0.625rem;
		font-weight: bold;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.connections {
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.active-connection {
		stroke: url(#connection-gradient);
		stroke-width: 2;
		stroke-dasharray: 5 5;
		animation: dash 20s linear infinite;
		filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
	}

	@keyframes dash {
		to {
			stroke-dashoffset: -100;
		}
	}

	/* Dark mode adjustments */
	:global(.dark) .view-card {
		background: rgba(17, 24, 39, 0.8);
		border-color: rgba(55, 65, 81, 0.5);
	}

	:global(.dark) .view-card:hover {
		background: rgba(31, 41, 55, 0.9);
		border-color: rgba(75, 85, 99, 0.7);
	}

	:global(.dark) .view-card.active {
		background: linear-gradient(135deg,
			rgba(59, 130, 246, 0.4),
			rgba(139, 92, 246, 0.4)
		);
	}

	:global(.dark) .label {
		color: #f3f4f6;
	}

	:global(.dark) .preview {
		color: #9ca3af;
	}

	/* Add gradient definition for connection lines */
	.connections::before {
		content: '';
		display: block;
		width: 0;
		height: 0;
	}
</style>

<!-- Add SVG gradient definition -->
<svg width="0" height="0" style="position: absolute;">
	<defs>
		<linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.8" />
			<stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0.8" />
		</linearGradient>
	</defs>
</svg>
