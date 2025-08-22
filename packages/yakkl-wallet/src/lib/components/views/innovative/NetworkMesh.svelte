<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';

	// Props
	let {
		useRealData = false,
		animationSpeed = 1,
		className = ''
	} = $props();

	// State
	let hoveredNetwork = $state<string | null>(null);
	let selectedPath = $state<string[]>([]);
	let pulsePhase = $state(0);

	// Demo networks with realistic gas prices and connections
	const networks = [
		{
			id: 'ethereum',
			name: 'Ethereum',
			symbol: 'ETH',
			gasPrice: 35,
			congestion: 0.7,
			color: '#627EEA',
			x: 200,
			y: 200
		},
		{
			id: 'polygon',
			name: 'Polygon',
			symbol: 'MATIC',
			gasPrice: 0.02,
			congestion: 0.3,
			color: '#8247E5',
			x: 400,
			y: 150
		},
		{
			id: 'arbitrum',
			name: 'Arbitrum',
			symbol: 'ARB',
			gasPrice: 0.1,
			congestion: 0.4,
			color: '#28A0F0',
			x: 350,
			y: 300
		},
		{
			id: 'optimism',
			name: 'Optimism',
			symbol: 'OP',
			gasPrice: 0.08,
			congestion: 0.35,
			color: '#FF0420',
			x: 150,
			y: 350
		},
		{
			id: 'avalanche',
			name: 'Avalanche',
			symbol: 'AVAX',
			gasPrice: 0.5,
			congestion: 0.25,
			color: '#E84142',
			x: 500,
			y: 250
		},
		{
			id: 'bnb',
			name: 'BNB Chain',
			symbol: 'BNB',
			gasPrice: 0.3,
			congestion: 0.5,
			color: '#F0B90B',
			x: 100,
			y: 100
		},
		{
			id: 'base',
			name: 'Base',
			symbol: 'BASE',
			gasPrice: 0.01,
			congestion: 0.2,
			color: '#0052FF',
			x: 300,
			y: 400
		}
	];

	// Bridge connections between networks
	const bridges = [
		{ from: 'ethereum', to: 'polygon', strength: 0.9, volume: 850000 },
		{ from: 'ethereum', to: 'arbitrum', strength: 0.85, volume: 620000 },
		{ from: 'ethereum', to: 'optimism', strength: 0.8, volume: 540000 },
		{ from: 'ethereum', to: 'base', strength: 0.75, volume: 420000 },
		{ from: 'polygon', to: 'arbitrum', strength: 0.6, volume: 180000 },
		{ from: 'polygon', to: 'avalanche', strength: 0.5, volume: 120000 },
		{ from: 'arbitrum', to: 'optimism', strength: 0.7, volume: 280000 },
		{ from: 'optimism', to: 'base', strength: 0.65, volume: 210000 },
		{ from: 'avalanche', to: 'bnb', strength: 0.4, volume: 95000 },
		{ from: 'bnb', to: 'ethereum', strength: 0.55, volume: 340000 }
	];

	// Calculate path opacity based on selection
	function getPathOpacity(from: string, to: string): number {
		if (selectedPath.length === 0) return 0.3;
		if (selectedPath.includes(from) && selectedPath.includes(to)) return 1;
		return 0.1;
	}

	// Get network size based on congestion
	function getNetworkSize(network: any): number {
		return 30 + network.congestion * 20;
	}

	// Format gas price
	function formatGasPrice(price: number): string {
		if (price < 0.1) return `${(price * 1000).toFixed(0)} mGwei`;
		return `${price.toFixed(1)} Gwei`;
	}

	// Handle network click for path finding
	function selectNetwork(networkId: string) {
		if (selectedPath.includes(networkId)) {
			selectedPath = [];
		} else if (selectedPath.length === 0) {
			selectedPath = [networkId];
		} else if (selectedPath.length === 1) {
			// Find path between two networks
			selectedPath = findPath(selectedPath[0], networkId);
		} else {
			selectedPath = [networkId];
		}
	}

	// Simple pathfinding between networks
	function findPath(from: string, to: string): string[] {
		if (from === to) return [from];
		
		// Check direct connection
		const directBridge = bridges.find(b => 
			(b.from === from && b.to === to) || 
			(b.from === to && b.to === from)
		);
		if (directBridge) return [from, to];
		
		// Find path through intermediate network (simplified)
		for (const bridge of bridges) {
			if (bridge.from === from) {
				const secondBridge = bridges.find(b => 
					(b.from === bridge.to && b.to === to) ||
					(b.from === to && b.to === bridge.to)
				);
				if (secondBridge) return [from, bridge.to, to];
			}
		}
		
		return [from]; // No path found
	}

	// Animation for pulse effect
	onMount(() => {
		const interval = setInterval(() => {
			pulsePhase = (pulsePhase + 0.05 * animationSpeed) % (Math.PI * 2);
		}, 50);
		
		return () => clearInterval(interval);
	});

	// Get pulse size for active networks
	function getPulseSize(network: any): number {
		const baseSize = getNetworkSize(network);
		if (selectedPath.includes(network.id)) {
			return baseSize + Math.sin(pulsePhase) * 5;
		}
		return baseSize;
	}

	// Calculate bridge path curve
	function getBridgePath(bridge: any): string {
		const from = networks.find(n => n.id === bridge.from)!;
		const to = networks.find(n => n.id === bridge.to)!;
		
		// Calculate control point for curve
		const midX = (from.x + to.x) / 2;
		const midY = (from.y + to.y) / 2;
		const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2));
		const curve = distance * 0.2;
		
		// Perpendicular offset for curve
		const angle = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
		const controlX = midX + Math.cos(angle) * curve;
		const controlY = midY + Math.sin(angle) * curve;
		
		return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
	}
</script>

<div class="network-mesh relative {className}">
	<svg viewBox="0 0 600 500" class="w-full h-full">
		<!-- Background grid -->
		<defs>
			<pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
				<path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.1"/>
			</pattern>
			
			<!-- Gradient definitions for bridges -->
			{#each bridges as bridge}
				<linearGradient id="bridge-{bridge.from}-{bridge.to}">
					<stop offset="0%" stop-color={networks.find(n => n.id === bridge.from)?.color} stop-opacity="0.6"/>
					<stop offset="50%" stop-color="#ffffff" stop-opacity="0.2"/>
					<stop offset="100%" stop-color={networks.find(n => n.id === bridge.to)?.color} stop-opacity="0.6"/>
				</linearGradient>
			{/each}
			
			<!-- Glow filter -->
			<filter id="glow">
				<feGaussianBlur stdDeviation="3" result="coloredBlur"/>
				<feMerge>
					<feMergeNode in="coloredBlur"/>
					<feMergeNode in="SourceGraphic"/>
				</feMerge>
			</filter>
		</defs>
		
		<!-- Grid background -->
		<rect width="600" height="500" fill="url(#grid)" class="text-gray-600 dark:text-gray-400"/>
		
		<!-- Bridge connections -->
		<g class="bridges">
			{#each bridges as bridge}
				{@const opacity = getPathOpacity(bridge.from, bridge.to)}
				{@const isActive = selectedPath.includes(bridge.from) && selectedPath.includes(bridge.to)}
				
				<!-- Bridge path -->
				<path
					d={getBridgePath(bridge)}
					stroke="url(#bridge-{bridge.from}-{bridge.to})"
					stroke-width={isActive ? 3 : 2}
					fill="none"
					opacity={opacity}
					class="transition-all duration-300"
				/>
				
				<!-- Animated particles on active bridges -->
				{#if isActive && animationSpeed > 0}
					<circle r="2" fill="#ffffff" filter="url(#glow)">
						<animateMotion
							dur={`${3 / animationSpeed}s`}
							repeatCount="indefinite"
							path={getBridgePath(bridge)}
						/>
					</circle>
				{/if}
				
				<!-- Volume indicator on path -->
				{#if opacity > 0.5}
					{@const from = networks.find(n => n.id === bridge.from)!}
					{@const to = networks.find(n => n.id === bridge.to)!}
					{@const midX = (from.x + to.x) / 2}
					{@const midY = (from.y + to.y) / 2}
					<text
						x={midX}
						y={midY - 5}
						text-anchor="middle"
						fill="white"
						font-size="10"
						opacity={opacity}
					>
						${(bridge.volume / 1000).toFixed(0)}k
					</text>
				{/if}
			{/each}
		</g>
		
		<!-- Network nodes -->
		<g class="networks">
			{#each networks as network}
				{@const size = getPulseSize(network)}
				{@const isSelected = selectedPath.includes(network.id)}
				{@const isHovered = hoveredNetwork === network.id}
				
				<g
					transform="translate({network.x}, {network.y})"
					class="cursor-pointer transition-all duration-300"
					onclick={() => selectNetwork(network.id)}
					onmouseenter={() => hoveredNetwork = network.id}
					onmouseleave={() => hoveredNetwork = null}
				>
					<!-- Pulse ring for active -->
					{#if isSelected}
						<circle
							r={size + 10}
							fill="none"
							stroke={network.color}
							stroke-width="2"
							opacity="0.3"
							class="animate-ping"
						/>
					{/if}
					
					<!-- Congestion indicator ring -->
					<circle
						r={size + 5}
						fill="none"
						stroke={network.congestion > 0.6 ? '#ef4444' : network.congestion > 0.4 ? '#f59e0b' : '#10b981'}
						stroke-width="2"
						opacity={network.congestion}
						stroke-dasharray={`${network.congestion * 100} 100`}
						transform="rotate(-90)"
					/>
					
					<!-- Main network circle -->
					<circle
						r={size}
						fill={network.color}
						opacity={isSelected ? 1 : 0.8}
						filter={isHovered ? "url(#glow)" : ""}
					/>
					
					<!-- Network symbol -->
					<text
						text-anchor="middle"
						dy="0"
						fill="white"
						font-size="14"
						font-weight="bold"
					>
						{network.symbol}
					</text>
					
					<!-- Gas price -->
					<text
						text-anchor="middle"
						dy="15"
						fill="white"
						font-size="9"
						opacity="0.8"
					>
						{formatGasPrice(network.gasPrice)}
					</text>
					
					<!-- Network name (on hover) -->
					{#if isHovered}
						<g transform="translate(0, {size + 15})">
							<rect
								x="-40"
								y="-8"
								width="80"
								height="16"
								fill="black"
								opacity="0.8"
								rx="4"
							/>
							<text
								text-anchor="middle"
								fill="white"
								font-size="11"
							>
								{network.name}
							</text>
						</g>
					{/if}
				</g>
			{/each}
		</g>
		
		<!-- Legend -->
		<g transform="translate(10, 450)">
			<text fill="white" font-size="10" opacity="0.6">
				Click networks to find bridge path
			</text>
			<text fill="white" font-size="10" opacity="0.6" dy="12">
				Ring color = congestion level
			</text>
		</g>
	</svg>
</div>

<style>
	.network-mesh {
		width: 100%;
		height: 100%;
		min-height: 400px;
		background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
		border-radius: 0.5rem;
	}
</style>