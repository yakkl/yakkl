<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
		maxWidth?: string;
		className?: string;
		delay?: number;
		children?: any;
	}

	let {
		content = '',
		position = 'auto',
		maxWidth = '300px',
		className = '',
		delay = 0,
		children
	}: Props = $props();

	let containerRef: HTMLElement | null = $state(null);
	let tooltipRef: HTMLElement | null = $state(null);
	let isVisible = $state(false);
	let computedPosition = $state(position);
	let tooltipStyle = $state('');
	let showTimeout: NodeJS.Timeout;

	onMount(() => {
		return () => {
			if (showTimeout) clearTimeout(showTimeout);
		};
	});

	function handleMouseEnter() {
		if (delay > 0) {
			showTimeout = setTimeout(() => {
				showTooltip();
			}, delay);
		} else {
			showTooltip();
		}
	}

	function handleMouseLeave() {
		if (showTimeout) clearTimeout(showTimeout);
		isVisible = false;
	}

	function showTooltip() {
		isVisible = true;
		updatePosition();
	}

	function updatePosition() {
		if (!containerRef || !tooltipRef || !isVisible) return;

		const containerRect = containerRef.getBoundingClientRect();
		const tooltipRect = tooltipRef.getBoundingClientRect();
		const margin = 8;

		let finalPosition = position;
		let x = 0, y = 0;

		// Auto-position: find the best fit
		if (position === 'auto') {
			const spaces = {
				top: containerRect.top,
				bottom: window.innerHeight - containerRect.bottom,
				left: containerRect.left,
				right: window.innerWidth - containerRect.right
			};

			// Prefer top/bottom over left/right
			if (spaces.top > tooltipRect.height + margin) {
				finalPosition = 'top';
			} else if (spaces.bottom > tooltipRect.height + margin) {
				finalPosition = 'bottom';
			} else if (spaces.left > tooltipRect.width + margin) {
				finalPosition = 'left';
			} else if (spaces.right > tooltipRect.width + margin) {
				finalPosition = 'right';
			} else {
				finalPosition = 'top'; // Fallback
			}
		}

		// Calculate coordinates
		switch (finalPosition) {
			case 'top':
				x = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
				y = containerRect.top - tooltipRect.height - margin;
				break;
			case 'bottom':
				x = containerRect.left + containerRect.width / 2 - tooltipRect.width / 2;
				y = containerRect.bottom + margin;
				break;
			case 'left':
				x = containerRect.left - tooltipRect.width - margin;
				y = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
				break;
			case 'right':
				x = containerRect.right + margin;
				y = containerRect.top + containerRect.height / 2 - tooltipRect.height / 2;
				break;
		}

		// Constrain to viewport
		x = Math.max(margin, Math.min(x, window.innerWidth - tooltipRect.width - margin));
		y = Math.max(margin, Math.min(y, window.innerHeight - tooltipRect.height - margin));

		computedPosition = finalPosition;
		tooltipStyle = `left: ${x}px; top: ${y}px; max-width: ${maxWidth};`;
	}

	$effect(() => {
		if (isVisible) {
			updatePosition();
		}
	});
</script>

<div 
	class="relative inline-block"
	bind:this={containerRef}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onfocus={handleMouseEnter}
	onblur={handleMouseLeave}
	role="tooltip"
	aria-describedby={isVisible ? 'tooltip' : undefined}
>
	{@render children?.()}
	
	{#if content && isVisible}
		<div
			id="tooltip"
			bind:this={tooltipRef}
			class="fixed z-[9999] px-3 py-2 text-sm rounded-lg shadow-lg 
				   bg-gray-900 dark:bg-gray-100 
				   text-white dark:text-gray-900 
				   border border-gray-700 dark:border-gray-300
				   pointer-events-none transition-opacity duration-200
				   {isVisible ? 'opacity-100' : 'opacity-0'} {className}"
			style={tooltipStyle}
			role="tooltip"
		>
			{content}
			<div 
				class="absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 
					   border-gray-700 dark:border-gray-300 rotate-45
					   {computedPosition === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
					   {computedPosition === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
					   {computedPosition === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
					   {computedPosition === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l' : ''}"
			/>
		</div>
	{/if}
</div>