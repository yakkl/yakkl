<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from '$lib/components/Icon.svelte';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	
	// Navigation item interface
	interface NavItem {
		id: string;
		label: string;
		icon: string;
		action: () => void;
		color?: string;
		disabled?: boolean;
		badge?: string | number;
		tooltip?: string;
	}
	
	// Props
	let {
		items = [] as NavItem[],
		centerContent = null as { icon?: string; label?: string; image?: string } | null,
		onCenterClick = () => {},
		radius = 100,
		itemSize = 48,
		centerSize = 64,
		enableAnimation = true,
		enableKeyboard = true,
		expandOnHover = true,
		showLabels = false,
		className = ''
	} = $props<{
		items?: NavItem[];
		centerContent?: { icon?: string; label?: string; image?: string } | null;
		onCenterClick?: () => void;
		radius?: number;
		itemSize?: number;
		centerSize?: number;
		enableAnimation?: boolean;
		enableKeyboard?: boolean;
		expandOnHover?: boolean;
		showLabels?: boolean;
		className?: string;
	}>();
	
	// State
	let isExpanded = $state(false);
	let selectedIndex = $state<number | null>(null);
	let hoveredIndex = $state<number | null>(null);
	let rotation = spring(0, { stiffness: 0.1, damping: 0.25 });
	let containerEl: HTMLDivElement;
	
	// Calculate item positions
	function calculatePosition(index: number, total: number, currentRadius: number) {
		const angle = (index * (360 / total) - 90 + $rotation) * (Math.PI / 180);
		const x = Math.cos(angle) * currentRadius;
		const y = Math.sin(angle) * currentRadius;
		return { x, y, angle: angle * (180 / Math.PI) + 90 };
	}
	
	// Get item color or default
	function getItemColor(item: NavItem, index: number): string {
		if (item.color) return item.color;
		
		// Default color palette
		const colors = [
			'#3B82F6', // blue
			'#10B981', // emerald
			'#F59E0B', // amber
			'#EF4444', // red
			'#8B5CF6', // violet
			'#EC4899', // pink
			'#14B8A6', // teal
			'#F97316', // orange
		];
		
		return colors[index % colors.length];
	}
	
	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!enableKeyboard) return;
		
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				navigateItems(-1);
				break;
			case 'ArrowRight':
				event.preventDefault();
				navigateItems(1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				if (!isExpanded) {
					isExpanded = true;
				}
				break;
			case 'ArrowDown':
				event.preventDefault();
				if (isExpanded) {
					isExpanded = false;
				}
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				if (selectedIndex !== null && items[selectedIndex] && !items[selectedIndex].disabled) {
					items[selectedIndex].action();
				} else {
					onCenterClick();
				}
				break;
			case 'Escape':
				event.preventDefault();
				isExpanded = false;
				selectedIndex = null;
				break;
			case 'Tab':
				event.preventDefault();
				navigateItems(event.shiftKey ? -1 : 1);
				break;
		}
	}
	
	// Navigate through items
	function navigateItems(direction: number) {
		if (items.length === 0) return;
		
		if (selectedIndex === null) {
			selectedIndex = direction > 0 ? 0 : items.length - 1;
		} else {
			selectedIndex = (selectedIndex + direction + items.length) % items.length;
		}
		
		// Rotate to selected item
		if (enableAnimation) {
			const targetAngle = -(selectedIndex * (360 / items.length));
			rotation.set(targetAngle);
		}
	}
	
	// Handle item click
	function handleItemClick(item: NavItem, index: number) {
		if (item.disabled) return;
		
		selectedIndex = index;
		item.action();
		
		// Optionally collapse after action
		setTimeout(() => {
			isExpanded = false;
		}, 300);
	}
	
	// Auto-expand on hover
	let expandTimeout: ReturnType<typeof setTimeout> | null = null;
	
	function handleMouseEnter() {
		if (!expandOnHover) return;
		
		expandTimeout = setTimeout(() => {
			isExpanded = true;
		}, 200);
	}
	
	function handleMouseLeave() {
		if (expandTimeout) {
			clearTimeout(expandTimeout);
			expandTimeout = null;
		}
		
		if (expandOnHover) {
			setTimeout(() => {
				if (hoveredIndex === null) {
					isExpanded = false;
				}
			}, 500);
		}
	}
	
	onMount(() => {
		// Add keyboard listener
		if (typeof document !== 'undefined') {
			document.addEventListener('keydown', handleKeydown);
		}
	});
	
	onDestroy(() => {
		// Clean up
		if (typeof document !== 'undefined') {
			document.removeEventListener('keydown', handleKeydown);
		}
		if (expandTimeout) {
			clearTimeout(expandTimeout);
		}
	});
	
	// Computed values
	let currentRadius = $derived(isExpanded ? radius : radius * 0.3);
	let itemScale = $derived(isExpanded ? 1 : 0.7);
	let itemOpacity = $derived(isExpanded ? 1 : 0.3);
</script>

<div 
	bind:this={containerEl}
	class="radial-navigation relative inline-block {className}"
	role="navigation"
	aria-label="Radial navigation menu"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	<!-- Container for proper sizing -->
	<div 
		class="relative"
		style="width: {(radius + itemSize) * 2}px; height: {(radius + itemSize) * 2}px;"
	>
		<!-- Orbital rings (decorative) -->
		{#if isExpanded}
			<div 
				class="absolute inset-0 flex items-center justify-center pointer-events-none"
				transition:fade={{ duration: 300 }}
			>
				<div 
					class="absolute rounded-full border border-gray-200 dark:border-gray-700 opacity-20"
					style="width: {radius * 2}px; height: {radius * 2}px;"
				></div>
				<div 
					class="absolute rounded-full border border-gray-200 dark:border-gray-700 opacity-10"
					style="width: {radius * 2.5}px; height: {radius * 2.5}px;"
				></div>
			</div>
		{/if}
		
		<!-- Center Button -->
		<div 
			class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
			style="width: {centerSize}px; height: {centerSize}px;"
		>
			<button
				onclick={onCenterClick}
				class="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
				aria-label="Center navigation button"
			>
				{#if centerContent}
					{#if centerContent.image}
						<img 
							src={centerContent.image} 
							alt={centerContent.label || 'Navigation center'}
							class="w-3/4 h-3/4 rounded-full object-cover"
						/>
					{:else if centerContent.icon}
						<Icon name={centerContent.icon} className="w-8 h-8" />
					{:else if centerContent.label}
						<span class="font-bold text-sm">{centerContent.label}</span>
					{/if}
				{:else}
					<!-- Default YAKKL logo or icon -->
					<span class="font-bold text-xl">Y</span>
				{/if}
			</button>
			
			<!-- Expand indicator -->
			{#if !isExpanded && items.length > 0}
				<div 
					class="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse"
					transition:scale={{ duration: 200 }}
				>
					<span class="text-xs text-white font-bold">{items.length}</span>
				</div>
			{/if}
		</div>
		
		<!-- Navigation Items -->
		{#each items as item, index}
			{@const position = calculatePosition(index, items.length, currentRadius)}
			{@const isSelected = selectedIndex === index}
			{@const isHovered = hoveredIndex === index}
			{@const color = getItemColor(item, index)}
			
			<div
				class="absolute top-1/2 left-1/2 transition-all duration-300"
				style="
					transform: translate(
						calc(-50% + {position.x}px), 
						calc(-50% + {position.y}px)
					) scale({itemScale * (isHovered ? 1.15 : 1)});
					opacity: {item.disabled ? 0.5 : itemOpacity};
				"
			>
				<SimpleTooltip 
					text={item.tooltip || item.label} 
					position="top"
					disabled={!isExpanded}
				>
					<button
						onclick={() => handleItemClick(item, index)}
						onmouseenter={() => hoveredIndex = index}
						onmouseleave={() => hoveredIndex = null}
						disabled={item.disabled}
						class="relative group transition-all duration-300"
						style="width: {itemSize}px; height: {itemSize}px;"
						aria-label={item.label}
					>
						<!-- Item background -->
						<div 
							class="absolute inset-0 rounded-full shadow-lg transition-all duration-300 {isSelected ? 'ring-2 ring-white ring-offset-2' : ''}"
							style="background: {color}; {isHovered ? 'transform: scale(1.1);' : ''}"
						></div>
						
						<!-- Item icon -->
						<div class="relative z-10 w-full h-full flex items-center justify-center text-white">
							<Icon name={item.icon} className="w-6 h-6" />
						</div>
						
						<!-- Badge -->
						{#if item.badge}
							<div 
								class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
								transition:scale={{ duration: 200 }}
							>
								{item.badge}
							</div>
						{/if}
						
						<!-- Label (if enabled) -->
						{#if showLabels && isExpanded}
							<div 
								class="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm"
								transition:fade={{ duration: 200, delay: 50 }}
							>
								{item.label}
							</div>
						{/if}
					</button>
				</SimpleTooltip>
			</div>
		{/each}
		
		<!-- Quick action hints -->
		{#if isExpanded && enableKeyboard}
			<div 
				class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
				transition:fade={{ duration: 200 }}
			>
				Use arrow keys to navigate • Enter to select
			</div>
		{/if}
	</div>
</div>

<style>
	.radial-navigation {
		/* Prevent text selection during interaction */
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
	}
	
	/* Smooth animations */
	.radial-navigation :global(*) {
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Pulse animation */
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	
	.radial-navigation :global(.animate-pulse) {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>