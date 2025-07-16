<script lang="ts">
	import { onMount } from 'svelte';

	const {
		content = '',
		position = 'auto',
		manualX,
		manualY,
		maxWidth = '300px',
		className = '',
		children
	} = $props<{
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
		manualX?: number;
		manualY?: number;
		maxWidth?: string;
		className?: string;
		children?: any;
	}>();

	let containerRef: HTMLElement;
	let tooltipRef: HTMLElement;
	let computedPosition = $state(position === 'auto' ? 'top' : position);
	let isVisible = $state(false);

	function updatePosition() {
		if (!containerRef || !tooltipRef || position !== 'auto') return;

		const containerRect = containerRef.getBoundingClientRect();
		const tooltipRect = tooltipRef.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		// Check if tooltip would go off-screen in each direction
		const wouldOverflowTop = containerRect.top - tooltipRect.height - 8 < 0;
		const wouldOverflowBottom = containerRect.bottom + tooltipRect.height + 8 > viewport.height;
		const wouldOverflowLeft = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2 < 0;
		const wouldOverflowRight = containerRect.left + containerRect.width / 2 + tooltipRect.width / 2 > viewport.width;

		// Determine best position
		let newPosition = 'top';

		if (!wouldOverflowTop) {
			newPosition = 'top';
		} else if (!wouldOverflowBottom) {
			newPosition = 'bottom';
		} else if (!wouldOverflowLeft && !wouldOverflowRight) {
			newPosition = containerRect.top > viewport.height / 2 ? 'top' : 'bottom';
		} else if (!wouldOverflowLeft) {
			newPosition = 'left';
		} else if (!wouldOverflowRight) {
			newPosition = 'right';
		}

		computedPosition = newPosition;
	}

	function handleMouseEnter() {
		isVisible = true;
		if (position === 'auto') {
			// Small delay to ensure tooltip is rendered before calculating position
			setTimeout(updatePosition, 10);
		}
	}

	function handleMouseLeave() {
		isVisible = false;
	}

	// Dynamic positioning classes
	let positionClasses = $derived.by(() => {
		const base = 'absolute z-[9999] px-2 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs pointer-events-none whitespace-nowrap shadow-lg border border-zinc-200 dark:border-zinc-700';
		
		// Manual positioning overrides
		if (manualX !== undefined && manualY !== undefined) {
			return `${base} opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
		}

		// Auto or fixed positioning
		switch (computedPosition) {
			case 'top':
				return `${base} bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
			case 'bottom':
				return `${base} top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
			case 'left':
				return `${base} right-full top-1/2 -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
			case 'right':
				return `${base} left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
			default:
				return `${base} bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200`;
		}
	});

	let manualStyle = $derived(manualX !== undefined && manualY !== undefined 
		? `left: ${manualX}px; top: ${manualY}px; transform: none;` 
		: '');
</script>

<span 
	class="relative group inline-block {className}" 
	bind:this={containerRef}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="button"
	tabindex="-1"
>
	{@render children()}

	<span
		bind:this={tooltipRef}
		class={positionClasses}
		style="{manualStyle} max-width: {maxWidth};"
	>
		{content}
	</span>
</span>
