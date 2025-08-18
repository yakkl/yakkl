<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { spring } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
	import { getNativeTokenSymbol, isNativeToken } from '$lib/utils/native-token.utils';
	import type { Chain } from '$lib/common';
	
	// Props
	let {
		tokens = [],
		chain = null as Chain | null,
		onTokenClick = (token: any) => {},
		onNetworkSwitch = (chainId: number) => {},
		maxTokens = 12,
		enableAnimation = true,
		enableKeyboard = true,
		enableTouch = true,
		showValues = true,
		className = ''
	} = $props<{
		tokens?: any[];
		chain?: Chain | null;
		onTokenClick?: (token: any) => void;
		onNetworkSwitch?: (chainId: number) => void;
		maxTokens?: number;
		enableAnimation?: boolean;
		enableKeyboard?: boolean;
		enableTouch?: boolean;
		showValues?: boolean;
		className?: string;
	}>();
	
	// State
	let containerEl: HTMLDivElement;
	let rotation = spring(0, { stiffness: 0.1, damping: 0.25 });
	let selectedTokenIndex = $state<number | null>(null);
	let hoveredTokenIndex = $state<number | null>(null);
	let showNetworkMenu = $state(false);
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartRotation = $state(0);
	
	// Touch handling
	let touchStartX = $state(0);
	let touchStartRotation = $state(0);
	
	// Computed values
	let displayTokens = $derived(tokens.slice(0, maxTokens));
	let angleStep = $derived(360 / Math.max(displayTokens.length, 1));
	let nativeTokenIndex = $derived(
		displayTokens.findIndex(t => isNativeToken(t.symbol, chain))
	);
	
	// Network colors mapping
	const networkColors: Record<number, string> = {
		1: '#627EEA',      // Ethereum - Blue
		137: '#8247E5',    // Polygon - Purple
		56: '#F3BA2F',     // BSC - Yellow
		43114: '#E84142',  // Avalanche - Red
		250: '#1969FF',    // Fantom - Blue
		42161: '#28A0F0',  // Arbitrum - Light Blue
		10: '#FF0420',     // Optimism - Red
		8453: '#0052FF',   // Base - Blue
	};
	
	// Get network color
	let networkColor = $derived(
		chain?.chainId && networkColors[chain.chainId] 
			? networkColors[chain.chainId]
			: '#627EEA' // Default to Ethereum blue
	);
	
	// Calculate positions for tokens
	function calculateTokenPosition(index: number, totalTokens: number) {
		const angle = (index * angleStep + $rotation) * (Math.PI / 180);
		const radius = 120; // Distance from center
		const x = Math.cos(angle) * radius;
		const y = Math.sin(angle) * radius;
		return { x, y, angle: angle * (180 / Math.PI) };
	}
	
	// Handle mouse wheel for rotation
	function handleWheel(event: WheelEvent) {
		if (!enableAnimation) return;
		event.preventDefault();
		rotation.update(r => r + event.deltaY * 0.5);
	}
	
	// Handle drag start
	function handleDragStart(event: MouseEvent) {
		if (!enableAnimation) return;
		isDragging = true;
		dragStartX = event.clientX;
		dragStartRotation = $rotation;
	}
	
	// Handle drag move
	function handleDragMove(event: MouseEvent) {
		if (!isDragging || !enableAnimation) return;
		const deltaX = event.clientX - dragStartX;
		rotation.set(dragStartRotation + deltaX * 0.5);
	}
	
	// Handle drag end
	function handleDragEnd() {
		isDragging = false;
	}
	
	// Handle touch start
	function handleTouchStart(event: TouchEvent) {
		if (!enableTouch || !enableAnimation) return;
		touchStartX = event.touches[0].clientX;
		touchStartRotation = $rotation;
	}
	
	// Handle touch move
	function handleTouchMove(event: TouchEvent) {
		if (!enableTouch || !enableAnimation) return;
		event.preventDefault();
		const deltaX = event.touches[0].clientX - touchStartX;
		rotation.set(touchStartRotation + deltaX * 0.5);
	}
	
	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!enableKeyboard) return;
		
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				rotation.update(r => r - angleStep);
				break;
			case 'ArrowRight':
				event.preventDefault();
				rotation.update(r => r + angleStep);
				break;
			case 'Enter':
			case ' ':
				if (selectedTokenIndex !== null) {
					event.preventDefault();
					onTokenClick(displayTokens[selectedTokenIndex]);
				}
				break;
			case 'Tab':
				event.preventDefault();
				// Cycle through tokens
				if (selectedTokenIndex === null) {
					selectedTokenIndex = 0;
				} else {
					selectedTokenIndex = (selectedTokenIndex + 1) % displayTokens.length;
				}
				// Rotate to selected token
				rotation.set(-selectedTokenIndex * angleStep);
				break;
			case 'Escape':
				selectedTokenIndex = null;
				showNetworkMenu = false;
				break;
		}
	}
	
	// Format token value
	function formatValue(value: any): string {
		if (!value) return '$0.00';
		const numValue = value && typeof value === 'number' 
			? value 
			: (value ? BigNumberishUtils.toNumber(value) : 0);
		if (numValue < 0.01) return '<$0.01';
		return `$${numValue.toLocaleString('en-US', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 2 
		})}`;
	}
	
	// Format token balance
	function formatBalance(balance: any, decimals = 18): string {
		if (!balance) return '0';
		const rawBalance = balance && typeof balance === 'number' 
			? balance 
			: (balance ? BigNumberishUtils.toNumber(balance) : 0);
		const numBalance = rawBalance / Math.pow(10, decimals);
		if (numBalance < 0.0001) return '<0.0001';
		if (numBalance < 1) {
			return numBalance.toFixed(4);
		}
		return numBalance.toLocaleString('en-US', { 
			minimumFractionDigits: 2, 
			maximumFractionDigits: 4 
		});
	}
	
	// Auto-rotate animation
	let autoRotateInterval: ReturnType<typeof setInterval> | null = null;
	
	function startAutoRotate() {
		if (!enableAnimation) return;
		autoRotateInterval = setInterval(() => {
			if (!isDragging && hoveredTokenIndex === null) {
				rotation.update(r => r + 0.5);
			}
		}, 50);
	}
	
	function stopAutoRotate() {
		if (autoRotateInterval) {
			clearInterval(autoRotateInterval);
			autoRotateInterval = null;
		}
	}
	
	onMount(() => {
		// Add event listeners
		if (containerEl) {
			containerEl.addEventListener('wheel', handleWheel, { passive: false });
		}
		
		// Start auto-rotate if enabled
		if (enableAnimation) {
			startAutoRotate();
		}
		
		// Add global mouse event listeners for drag
		document.addEventListener('mousemove', handleDragMove);
		document.addEventListener('mouseup', handleDragEnd);
		document.addEventListener('keydown', handleKeydown);
	});
	
	onDestroy(() => {
		// Clean up event listeners
		if (containerEl) {
			containerEl.removeEventListener('wheel', handleWheel);
		}
		document.removeEventListener('mousemove', handleDragMove);
		document.removeEventListener('mouseup', handleDragEnd);
		document.removeEventListener('keydown', handleKeydown);
		
		// Stop auto-rotate
		stopAutoRotate();
	});
</script>

<div 
	bind:this={containerEl}
	class="orbital-token-view relative w-full h-[400px] flex items-center justify-center select-none {className}"
	role="region"
	aria-label="Token orbital view"
	tabindex="0"
>
	<!-- Background gradient effect -->
	<div class="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/5 dark:to-white/5 pointer-events-none"></div>
	
	<!-- Orbital rings -->
	<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
		<div class="absolute w-64 h-64 rounded-full border border-gray-200 dark:border-gray-700 opacity-20"></div>
		<div class="absolute w-48 h-48 rounded-full border border-gray-200 dark:border-gray-700 opacity-30"></div>
		<div class="absolute w-32 h-32 rounded-full border border-gray-200 dark:border-gray-700 opacity-40"></div>
	</div>
	
	<!-- Center Network Circle -->
	<div 
		class="absolute z-20"
		onmouseenter={() => showNetworkMenu = true}
		onmouseleave={() => showNetworkMenu = false}
	>
		<div 
			class="w-24 h-24 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 shadow-lg"
			style="background-color: {networkColor}"
		>
			{#if chain}
				<div class="text-center text-white">
					<div class="text-xs font-medium opacity-90">Network</div>
					<div class="text-sm font-bold">{chain.chainName || 'Unknown'}</div>
					{#if chain.nativeCurrency}
						<div class="text-xs opacity-80">{chain.nativeCurrency.symbol}</div>
					{/if}
				</div>
			{:else}
				<div class="text-white text-sm font-medium">No Network</div>
			{/if}
		</div>
		
		<!-- Network hover menu -->
		{#if showNetworkMenu}
			<div 
				transition:scale={{ duration: 200, easing: cubicOut }}
				class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-30"
			>
				<div class="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1">Switch Network</div>
				<!-- Add network options here -->
				<button 
					class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
					onclick={() => onNetworkSwitch(1)}
				>
					Ethereum
				</button>
				<button 
					class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
					onclick={() => onNetworkSwitch(137)}
				>
					Polygon
				</button>
				<button 
					class="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
					onclick={() => onNetworkSwitch(56)}
				>
					BSC
				</button>
			</div>
		{/if}
	</div>
	
	<!-- Orbiting Tokens -->
	<div class="absolute inset-0 flex items-center justify-center">
		{#each displayTokens as token, index}
			{@const position = calculateTokenPosition(index, displayTokens.length)}
			{@const isNative = index === nativeTokenIndex}
			{@const isHovered = index === hoveredTokenIndex}
			{@const isSelected = index === selectedTokenIndex}
			
			<div
				class="absolute transition-all duration-300 cursor-pointer"
				style="transform: translate({position.x}px, {position.y}px) scale({isHovered ? 1.15 : isSelected ? 1.1 : 1})"
				onmouseenter={() => {
					hoveredTokenIndex = index;
					stopAutoRotate();
				}}
				onmouseleave={() => {
					hoveredTokenIndex = null;
					if (enableAnimation) startAutoRotate();
				}}
				onmousedown={(e) => handleDragStart(e)}
				ontouchstart={(e) => handleTouchStart(e)}
				ontouchmove={(e) => handleTouchMove(e)}
				onclick={() => {
					selectedTokenIndex = index;
					onTokenClick(token);
				}}
				role="button"
				tabindex="0"
				aria-label={`${token.symbol} token`}
			>
				<SimpleTooltip 
					text={`${token.name || token.symbol}${showValues ? ` - ${formatValue(token.value)}` : ''}`}
					position="top"
				>
					<div 
						class="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 {isNative ? 'ring-2 ring-yellow-400' : ''} {isSelected ? 'ring-2 ring-blue-500' : ''}"
						style="background: linear-gradient(135deg, {token.color || '#667eea'} 0%, {token.color || '#764ba2'} 100%); box-shadow: 0 4px 12px rgba(0,0,0,0.15)"
					>
						{#if token.logo}
							<img 
								src={token.logo} 
								alt={token.symbol}
								class="w-8 h-8 rounded-full"
							/>
						{:else}
							<span class="text-white font-bold text-sm">
								{token.symbol.slice(0, 3)}
							</span>
						{/if}
						
						{#if isNative}
							<div class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
								<span class="text-xs">N</span>
							</div>
						{/if}
					</div>
				</SimpleTooltip>
				
				{#if showValues && (isHovered || isSelected)}
					<div 
						transition:fade={{ duration: 200 }}
						class="absolute top-full mt-1 text-center whitespace-nowrap"
					>
						<div class="text-xs font-medium text-gray-700 dark:text-gray-300">
							{token.symbol}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{formatBalance(token.balance, token.decimals)}
						</div>
						<div class="text-xs font-medium text-gray-600 dark:text-gray-400">
							{formatValue(token.value)}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	
	<!-- Controls hint -->
	{#if enableAnimation}
		<div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
			{#if enableKeyboard}
				Use arrow keys or mouse wheel to rotate
			{:else}
				Scroll or drag to rotate
			{/if}
		</div>
	{/if}
</div>

<style>
	.orbital-token-view {
		/* Prevent text selection during drag */
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		user-select: none;
	}
	
	/* Radial gradient background */
	.bg-gradient-radial {
		background: radial-gradient(circle at center, var(--tw-gradient-stops));
	}
	
	/* Smooth animations */
	:global(.orbital-token-view *) {
		will-change: transform;
	}
</style>