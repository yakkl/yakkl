<!-- svelte-ignore non_reactive_update -->
<!-- svelte-ignore non_reactive_update -->
<!-- File: src/lib/components/SectionCard.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import ChevronDownIcon from './icons/ChevronDownIcon.svelte';
	import ChevronUpIcon from './icons/ChevronUpIcon.svelte';
	import ResizeIcon from './icons/ResizeIcon.svelte';
	import EyeIcon from './icons/EyeIcon.svelte';
	import { cn } from '$lib/utils';
	import Tooltip from './Tooltip.svelte';

	let {
		show = $bindable(true),
		title,
		icon: Icon = null,
		className = '',
		isPinned = false,
		eye = false,
		eyeTooltip = 'Toggle visibility of values',
		minHeight = '200px',
		maxHeight = '400px',
		locked = true,
		footer: Footer = null,
		footerProps = {},
		lockedFooter: LockedFooter = null,
		lockedFooterProps = {},
		children
	} = $props<{
		show?: boolean;
		title: string;
		icon?: any;
		className?: string;
		isPinned?: boolean;
		eye?: boolean;
		eyeTooltip?: string;
		minHeight?: string;
		maxHeight?: string;
		locked?: boolean;
		footer?: any;
		footerProps?: Record<string, any>;
		lockedFooter?: any;
		lockedFooterProps?: Record<string, any>;
		children: () => any;
	}>();

	let isCollapsed = $state(false);
	let isResizing = $state(false);
	let cardHeight = $state(minHeight);
	let startY = $state(0);
	let startHeight = $state(0);
	let cardElement = $state<HTMLElement | null>(null);
	let contentElement = $state<HTMLElement | null>(null);
	let hasItems = $state(false);
	let calculatedMinHeight = $state('');
	let isHovered = $state(false);
	let showEye = $state(true);

	function calculateMinHeight() {
		if (!cardElement || !contentElement) return;

		const headerHeight =
			(cardElement.querySelector('header') as HTMLElement | null)?.offsetHeight || 0;
		const firstItemHeight =
			(contentElement.querySelector('.item') as HTMLElement | null)?.offsetHeight || 0;

		// If there are items, min height is header + one item
		// If no items, min height is just the header
		const newMinHeight = hasItems ? headerHeight + firstItemHeight : headerHeight;
		calculatedMinHeight = `${newMinHeight}px`;

		// Update card height if it's currently smaller than the new minimum
		if (parseInt(cardHeight) < newMinHeight) {
			cardHeight = calculatedMinHeight;
		}
	}

	function handleResizeStart(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		startY = e.clientY;
		startHeight = cardElement.offsetHeight;
		document.addEventListener('mousemove', handleResizeMove);
		document.addEventListener('mouseup', handleResizeEnd);
	}

	function handleResizeMove(e: MouseEvent) {
		if (!isResizing) return;

		const deltaY = e.clientY - startY;
		const newHeight = Math.max(
			parseInt(calculatedMinHeight || minHeight),
			Math.min(parseInt(maxHeight), startHeight + deltaY)
		);
		cardHeight = `${newHeight}px`;
	}

	function handleResizeEnd() {
		isResizing = false;
		document.removeEventListener('mousemove', handleResizeMove);
		document.removeEventListener('mouseup', handleResizeEnd);
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
	}

	function toggleEye() {
		showEye = !showEye;
	}

	onMount(() => {
		// Initial calculation
		calculateMinHeight();

		// Observe content changes to recalculate minimum height
		const observer = new MutationObserver(() => {
			hasItems = contentElement.querySelector('.item') !== null;
			calculateMinHeight();
		});

		if (contentElement) {
			observer.observe(contentElement, {
				childList: true,
				subtree: true
			});
		}

		return () => {
			document.removeEventListener('mousemove', handleResizeMove);
			document.removeEventListener('mouseup', handleResizeEnd);
			observer.disconnect();
		};
	});
</script>

{#if show}
	<div
		bind:this={cardElement}
		role="region"
		aria-label="Section card"
		class={cn(
			'bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm rounded-2xl shadow-md border border-zinc-200 dark:border-zinc-700',
			'transition-all duration-300 ease-in-out',
			'hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700',
			'flex flex-col',
			'relative',
			'group',
			isPinned && 'sticky top-0 z-20 scroll-mt-4',
			className
		)}
		style="height: {isCollapsed ? 'auto' : cardHeight}"
		onmouseenter={() => isHovered = true}
		onmouseleave={() => isHovered = false}
	>
		<!-- Header -->
		<header
			class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700 bg-gradient-to-r from-transparent via-white/50 dark:via-zinc-800/50 to-transparent"
		>
			<div class="flex items-center gap-3">
				{#if Icon}
					<div class="p-2 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
						<Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
					</div>
				{/if}
				<h2 class="text-lg font-bold bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 bg-clip-text text-transparent">{title}</h2>
				{#if eye}
					<Tooltip content={showEye ? eyeTooltip : 'Values are hidden'}>
						<button 
							onclick={toggleEye}
							class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-200"
						>
							<EyeIcon className="w-4 h-4 {showEye ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}" />
						</button>
					</Tooltip>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				<button
					class="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all duration-200 group-hover:scale-110"
					onclick={toggleCollapse}
					aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
				>
					{#if isCollapsed}
						<ChevronDownIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
					{:else}
						<ChevronUpIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
					{/if}
				</button>
			</div>
		</header>

		<!-- Content -->
		<div
			bind:this={contentElement}
			class="flex-1 overflow-y-auto transition-all duration-300 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent"
			style="height: {isCollapsed ? '0' : 'auto'}; opacity: {isCollapsed ? '0' : '1'}"
		>
			<div class="px-4 pb-4 pt-4">
				{@render children()}
			</div>
		</div>

		<!-- Footer -->
		{#if !isCollapsed}
			{#if locked && LockedFooter}
				<div
					class="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-b-2xl transition-all duration-300"
				>
					<LockedFooter {...lockedFooterProps} />
				</div>
			{:else if Footer}
				<div
					class="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-b-2xl transition-all duration-300"
				>
					<Footer {...footerProps} />
				</div>
			{/if}
		{/if}

		<!-- Resize Handle -->
		{#if !isCollapsed}
			<div
				role="button"
				tabindex="0"
				aria-label="Resize section"
				class="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-5 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
				onmousedown={handleResizeStart}
			>
				<div class="w-12 h-1 bg-gradient-to-r from-transparent via-zinc-400 dark:via-zinc-600 to-transparent rounded-full">
					<ResizeIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 mx-auto -mt-1.5" />
				</div>
			</div>
		{/if}
	</div>
{/if}
