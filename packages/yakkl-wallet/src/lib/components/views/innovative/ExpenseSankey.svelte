<script lang="ts">
	import { onMount } from 'svelte';

	// Props
	let {
		useRealData = false,
		period = 'month', // 'week', 'month', 'year'
		className = ''
	} = $props();

	// State
	let hoveredFlow = $state<string | null>(null);
	let selectedCategory = $state<string | null>(null);

	// Demo data for Sankey diagram
	const demoData = {
		nodes: [
			// Sources (left)
			{ id: 'purchases', label: 'Purchases', level: 0, value: 450000, color: '#3b82f6' },
			{ id: 'yields', label: 'DeFi Yields', level: 0, value: 125000, color: '#10b981' },
			{ id: 'airdrops', label: 'Airdrops', level: 0, value: 32000, color: '#8b5cf6' },
			{ id: 'transfers_in', label: 'Transfers In', level: 0, value: 180000, color: '#06b6d4' },
			
			// Middle (wallet)
			{ id: 'wallet', label: 'Wallet', level: 1, value: 787000, color: '#f59e0b' },
			
			// Destinations (right)
			{ id: 'gas', label: 'Gas Fees', level: 2, value: 85000, color: '#ef4444' },
			{ id: 'swaps', label: 'Swaps', level: 2, value: 234000, color: '#ec4899' },
			{ id: 'nfts', label: 'NFT Purchases', level: 2, value: 156000, color: '#a855f7' },
			{ id: 'defi', label: 'DeFi Deposits', level: 2, value: 198000, color: '#14b8a6' },
			{ id: 'transfers_out', label: 'Transfers Out', level: 2, value: 67000, color: '#f97316' },
			{ id: 'holding', label: 'Holding', level: 2, value: 47000, color: '#84cc16' }
		],
		links: [
			// Income to wallet
			{ source: 'purchases', target: 'wallet', value: 450000 },
			{ source: 'yields', target: 'wallet', value: 125000 },
			{ source: 'airdrops', target: 'wallet', value: 32000 },
			{ source: 'transfers_in', target: 'wallet', value: 180000 },
			
			// Wallet to expenses
			{ source: 'wallet', target: 'gas', value: 85000 },
			{ source: 'wallet', target: 'swaps', value: 234000 },
			{ source: 'wallet', target: 'nfts', value: 156000 },
			{ source: 'wallet', target: 'defi', value: 198000 },
			{ source: 'wallet', target: 'transfers_out', value: 67000 },
			{ source: 'wallet', target: 'holding', value: 47000 }
		]
	};

	// Calculate node positions
	const nodeWidth = 30;
	const nodePadding = 20;
	const svgWidth = 800;
	const svgHeight = 500;
	const margin = { top: 20, right: 150, bottom: 20, left: 150 };
	const chartWidth = svgWidth - margin.left - margin.right;
	const chartHeight = svgHeight - margin.top - margin.bottom;

	// Position nodes by level
	function calculateNodePositions() {
		const levels = [[], [], []];
		demoData.nodes.forEach(node => {
			levels[node.level].push(node);
		});

		// Calculate x position for each level
		const levelX = [
			margin.left,
			margin.left + chartWidth / 2 - nodeWidth / 2,
			svgWidth - margin.right - nodeWidth
		];

		// Calculate y positions for nodes in each level
		levels.forEach((levelNodes, levelIndex) => {
			const totalValue = levelNodes.reduce((sum, node) => sum + node.value, 0);
			const totalHeight = chartHeight;
			const spacing = nodePadding * (levelNodes.length - 1);
			const availableHeight = totalHeight - spacing;
			
			let currentY = margin.top;
			
			levelNodes.forEach(node => {
				const nodeHeight = (node.value / totalValue) * availableHeight;
				node.x = levelX[levelIndex];
				node.y = currentY;
				node.height = Math.max(nodeHeight, 20); // Minimum height for visibility
				node.width = nodeWidth;
				currentY += node.height + nodePadding;
			});
		});
	}

	// Generate path for Sankey links
	function generateLinkPath(link: any): string {
		const sourceNode = demoData.nodes.find(n => n.id === link.source);
		const targetNode = demoData.nodes.find(n => n.id === link.target);
		
		if (!sourceNode || !targetNode) return '';
		
		// Calculate link thickness based on value
		const sourceTotal = demoData.links
			.filter(l => l.source === link.source)
			.reduce((sum, l) => sum + l.value, 0);
		const targetTotal = demoData.links
			.filter(l => l.target === link.target)
			.reduce((sum, l) => sum + l.value, 0);
			
		const sourceRatio = link.value / sourceTotal;
		const targetRatio = link.value / targetTotal;
		
		// Calculate link positions
		const sourceLinkY = getSourceLinkY(sourceNode, link);
		const targetLinkY = getTargetLinkY(targetNode, link);
		const linkHeight = Math.max(sourceRatio * sourceNode.height, targetRatio * targetNode.height, 5);
		
		const x0 = sourceNode.x + sourceNode.width;
		const x1 = targetNode.x;
		const y0 = sourceLinkY;
		const y1 = targetLinkY;
		
		// Bezier curve control points
		const xi = (x0 + x1) / 2;
		
		return `
			M ${x0} ${y0}
			C ${xi} ${y0}, ${xi} ${y1}, ${x1} ${y1}
			L ${x1} ${y1 + linkHeight}
			C ${xi} ${y1 + linkHeight}, ${xi} ${y0 + linkHeight}, ${x0} ${y0 + linkHeight}
			Z
		`;
	}

	// Calculate Y position for source side of link
	function getSourceLinkY(node: any, link: any): number {
		const outgoingLinks = demoData.links.filter(l => l.source === node.id);
		const linkIndex = outgoingLinks.findIndex(l => l === link);
		
		let offset = 0;
		for (let i = 0; i < linkIndex; i++) {
			offset += (outgoingLinks[i].value / node.value) * node.height;
		}
		
		return node.y + offset;
	}

	// Calculate Y position for target side of link
	function getTargetLinkY(node: any, link: any): number {
		const incomingLinks = demoData.links.filter(l => l.target === node.id);
		const linkIndex = incomingLinks.findIndex(l => l === link);
		
		let offset = 0;
		for (let i = 0; i < linkIndex; i++) {
			offset += (incomingLinks[i].value / node.value) * node.height;
		}
		
		return node.y + offset;
	}

	// Format value for display
	function formatValue(value: number): string {
		return `$${(value / 1000).toFixed(1)}k`;
	}

	// Get percentage of total
	function getPercentage(value: number, total: number): string {
		return `${((value / total) * 100).toFixed(1)}%`;
	}

	onMount(() => {
		calculateNodePositions();
	});
</script>

<div class="expense-sankey {className}">
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full h-full">
		<defs>
			<!-- Gradients for links -->
			{#each demoData.links as link}
				{@const sourceNode = demoData.nodes.find(n => n.id === link.source)}
				{@const targetNode = demoData.nodes.find(n => n.id === link.target)}
				<linearGradient id="gradient-{link.source}-{link.target}">
					<stop offset="0%" stop-color={sourceNode?.color} stop-opacity="0.6"/>
					<stop offset="100%" stop-color={targetNode?.color} stop-opacity="0.6"/>
				</linearGradient>
			{/each}
		</defs>

		<!-- Links -->
		<g class="links">
			{#each demoData.links as link}
				{@const isHovered = hoveredFlow === `${link.source}-${link.target}`}
				{@const relatedToSelected = selectedCategory && (link.source === selectedCategory || link.target === selectedCategory)}
				<path
					d={generateLinkPath(link)}
					fill="url(#gradient-{link.source}-{link.target})"
					opacity={selectedCategory ? (relatedToSelected ? 0.8 : 0.2) : (isHovered ? 0.8 : 0.5)}
					class="transition-opacity duration-300 cursor-pointer"
					onmouseenter={() => hoveredFlow = `${link.source}-${link.target}`}
					onmouseleave={() => hoveredFlow = null}
				/>
			{/each}
		</g>

		<!-- Nodes -->
		<g class="nodes">
			{#each demoData.nodes as node}
				{#if node.x !== undefined && node.y !== undefined}
					{@const isHovered = selectedCategory === node.id}
					<g
						transform="translate({node.x}, {node.y})"
						class="cursor-pointer"
						onclick={() => selectedCategory = selectedCategory === node.id ? null : node.id}
						onmouseenter={() => selectedCategory = node.id}
						onmouseleave={() => selectedCategory = null}
					>
						<!-- Node rectangle -->
						<rect
							width={node.width}
							height={node.height}
							fill={node.color}
							opacity={selectedCategory ? (isHovered ? 1 : 0.3) : 0.9}
							rx="2"
							class="transition-opacity duration-300"
						/>
						
						<!-- Node label -->
						<text
							x={node.level === 0 ? -10 : (node.level === 2 ? node.width + 10 : node.width / 2)}
							y={node.height / 2}
							text-anchor={node.level === 0 ? 'end' : (node.level === 2 ? 'start' : 'middle')}
							dominant-baseline="middle"
							fill="white"
							font-size="12"
							font-weight="500"
						>
							{node.label}
						</text>
						
						<!-- Value label -->
						<text
							x={node.level === 0 ? -10 : (node.level === 2 ? node.width + 10 : node.width / 2)}
							y={node.height / 2 + 15}
							text-anchor={node.level === 0 ? 'end' : (node.level === 2 ? 'start' : 'middle')}
							dominant-baseline="middle"
							fill="white"
							font-size="10"
							opacity="0.7"
						>
							{formatValue(node.value)}
						</text>
						
						<!-- Percentage for expense nodes -->
						{#if node.level === 2 && node.id !== 'holding'}
							{@const total = demoData.nodes.filter(n => n.level === 2 && n.id !== 'holding').reduce((sum, n) => sum + n.value, 0)}
							<text
								x={node.width + 10}
								y={node.height / 2 + 30}
								text-anchor="start"
								fill={node.color}
								font-size="9"
								opacity="0.8"
							>
								{getPercentage(node.value, total)} of expenses
							</text>
						{/if}
					</g>
				{/if}
			{/each}
		</g>

		<!-- Title and Period -->
		<g transform="translate({svgWidth / 2}, 15)">
			<text text-anchor="middle" fill="white" font-size="14" font-weight="bold">
				Cash Flow Analysis - Last {period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year'}
			</text>
		</g>

		<!-- Legend -->
		<g transform="translate(20, {svgHeight - 40})">
			<text fill="white" font-size="10" opacity="0.6">
				Flow width represents value • Click categories to highlight
			</text>
		</g>

		<!-- Summary Stats -->
		{#snippet summaryStats()}
			{@const totalIn = demoData.nodes.filter(n => n.level === 0).reduce((sum, n) => sum + n.value, 0)}
			{@const totalOut = demoData.nodes.filter(n => n.level === 2 && n.id !== 'holding').reduce((sum, n) => sum + n.value, 0)}
			{@const netFlow = totalIn - totalOut}
			<g transform="translate({svgWidth - 150}, {svgHeight - 60})">
			<text fill="#10b981" font-size="11" text-anchor="end">
				In: {formatValue(totalIn)}
			</text>
			<text fill="#ef4444" font-size="11" text-anchor="end" dy="15">
				Out: {formatValue(totalOut)}
			</text>
			<text fill={netFlow > 0 ? '#10b981' : '#ef4444'} font-size="11" text-anchor="end" dy="30" font-weight="bold">
				Net: {netFlow > 0 ? '+' : ''}{formatValue(netFlow)}
			</text>
		</g>
		{/snippet}
		{@render summaryStats()}
	</svg>
</div>

<style>
	.expense-sankey {
		width: 100%;
		height: 100%;
		min-height: 500px;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
		border-radius: 0.5rem;
		padding: 1rem;
	}
</style>