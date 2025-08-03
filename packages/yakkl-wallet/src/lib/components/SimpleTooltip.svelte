<script lang="ts">
	import { onMount, tick } from 'svelte';

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

	let containerRef: HTMLElement | null = $state(null);
	let measureTooltipRef: HTMLElement | null = $state(null);
	let portalContainer: HTMLElement | null = $state(null);
	let portalTooltip: HTMLElement | null = $state(null);
	let computedPosition = $state(position === 'auto' ? 'top' : position);
	let isVisible = $state(false);
	let tooltipCoords = $state({ x: 0, y: 0 });

	onMount(() => {
		// Create portal container at body level to escape stacking contexts
		portalContainer = document.createElement('div');
		portalContainer.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			pointer-events: none;
			z-index: 2147483647;
		`;
		document.body.appendChild(portalContainer);

		// Create tooltip element for portal
		portalTooltip = document.createElement('div');
		portalTooltip.className = 'absolute px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm leading-normal shadow-xl border border-gray-700 dark:border-gray-300 pointer-events-none transition-opacity duration-200 ease-in-out';

		// Initially hide the tooltip completely
		portalTooltip.style.cssText = `
			position: absolute;
			left: -9999px;
			top: -9999px;
			opacity: 0;
			visibility: hidden;
			max-width: ${maxWidth};
			white-space: normal;
			word-wrap: break-word;
		`;

		portalContainer.appendChild(portalTooltip);

		return () => {
			if (portalContainer && portalContainer.parentNode) {
				portalContainer.parentNode.removeChild(portalContainer);
			}
		};
	});

	function getViewportBounds() {
		// Check if we're in a popup window (chrome extension popup)
		if (window.outerWidth <= 450 && window.outerHeight <= 950) {
			return {
				width: window.innerWidth,
				height: window.innerHeight,
				top: 0,
				left: 0,
				right: window.innerWidth,
				bottom: window.innerHeight
			};
		}

		// Check for constraining parent containers
		let constrainingElement = containerRef?.closest('.popup, .modal, .sidebar, .panel, [data-popup]');

		if (constrainingElement) {
			const rect = constrainingElement.getBoundingClientRect();
			return {
				width: rect.width,
				height: rect.height,
				top: rect.top,
				left: rect.left,
				right: rect.right,
				bottom: rect.bottom
			};
		}

		return {
			width: window.innerWidth,
			height: window.innerHeight,
			top: 0,
			left: 0,
			right: window.innerWidth,
			bottom: window.innerHeight
		};
	}

	async function updateTooltipPosition() {
		if (!containerRef || !measureTooltipRef || !portalTooltip) return;

		await tick();

		const containerRect = containerRef.getBoundingClientRect();
		const tooltipRect = measureTooltipRef.getBoundingClientRect();
		const viewport = getViewportBounds();
		const margin = 8;

		let finalPosition = position;
		let x = 0, y = 0;

		// Manual positioning overrides auto-calculation
		if (manualX !== undefined && manualY !== undefined) {
			tooltipCoords = { x: manualX, y: manualY };
			updatePortalTooltip();
			return;
		}

		// Auto-position: find the best fit
		if (position === 'auto') {
			finalPosition = calculateOptimalPosition(containerRect, tooltipRect, viewport, margin);
		}

		// Calculate base coordinates for the chosen position
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

		// Constrain to viewport bounds
		const constrained = constrainToViewport(x, y, tooltipRect.width, tooltipRect.height, viewport, margin);

		computedPosition = finalPosition;
		tooltipCoords = constrained;
		updatePortalTooltip();
	}

	function updatePortalTooltip() {
		if (!portalTooltip) return;

		if (isVisible) {
			// Only set content when visible
			portalTooltip.textContent = content;
			portalTooltip.style.cssText = `
				position: absolute;
				left: ${tooltipCoords.x}px;
				top: ${tooltipCoords.y}px;
				max-width: ${maxWidth};
				white-space: normal;
				word-wrap: break-word;
				opacity: 1;
				visibility: visible;
			`;
		} else {
			// Hide completely when not visible
			portalTooltip.style.cssText = `
				position: absolute;
				left: -9999px;
				top: -9999px;
				max-width: ${maxWidth};
				white-space: normal;
				word-wrap: break-word;
				opacity: 0;
				visibility: hidden;
			`;
		}
	}

	function calculateOptimalPosition(containerRect: DOMRect, tooltipRect: DOMRect, viewport: any, margin: number) {
		const spaces = {
			top: containerRect.top - viewport.top,
			bottom: viewport.bottom - containerRect.bottom,
			left: containerRect.left - viewport.left,
			right: viewport.right - containerRect.right
		};

		const required = {
			vertical: tooltipRect.height + margin,
			horizontal: tooltipRect.width + margin
		};

		const candidates = [
			{
				name: 'top',
				fits: spaces.top >= required.vertical,
				space: spaces.top,
				score: spaces.top >= required.vertical ? spaces.top + 1000 : spaces.top
			},
			{
				name: 'bottom',
				fits: spaces.bottom >= required.vertical,
				space: spaces.bottom,
				score: spaces.bottom >= required.vertical ? spaces.bottom + 1000 : spaces.bottom
			},
			{
				name: 'left',
				fits: spaces.left >= required.horizontal,
				space: spaces.left,
				score: spaces.left >= required.horizontal ? spaces.left + 1000 : spaces.left
			},
			{
				name: 'right',
				fits: spaces.right >= required.horizontal,
				space: spaces.right,
				score: spaces.right >= required.horizontal ? spaces.right + 1000 : spaces.right
			}
		];

		return candidates.reduce((best, current) =>
			current.score > best.score ? current : best
		).name;
	}

	function constrainToViewport(x: number, y: number, width: number, height: number, viewport: any, margin: number) {
		if (x < viewport.left + margin) {
			x = viewport.left + margin;
		} else if (x + width > viewport.right - margin) {
			x = Math.max(viewport.left + margin, viewport.right - width - margin);
		}

		if (y < viewport.top + margin) {
			y = viewport.top + margin;
		} else if (y + height > viewport.bottom - margin) {
			y = Math.max(viewport.top + margin, viewport.bottom - height - margin);
		}

		return { x, y };
	}

	async function handleMouseEnter() {
		isVisible = true;
		// Initialize with safe coordinates before calculation
		tooltipCoords = { x: -9999, y: -9999 };
		updatePortalTooltip();
		setTimeout(updateTooltipPosition, 10);
	}

	function handleMouseLeave() {
		isVisible = false;
		// Reset coordinates and hide
		tooltipCoords = { x: -9999, y: -9999 };
		updatePortalTooltip();
	}
</script>

<span
	class="relative inline-block {className}"
	bind:this={containerRef}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="button"
	tabindex="-1"
>
	{@render children()}
</span>

<!-- Hidden measuring tooltip -->
{#if isVisible}
	<div
		bind:this={measureTooltipRef}
		class="absolute px-3 py-2 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm leading-normal shadow-xl border border-gray-700 dark:border-gray-300 pointer-events-none opacity-0"
		style="position: fixed; top: -9999px; left: -9999px; max-width: {maxWidth}; white-space: normal; word-wrap: break-word; visibility: hidden;"
	>
		{content}
	</div>
{/if}
