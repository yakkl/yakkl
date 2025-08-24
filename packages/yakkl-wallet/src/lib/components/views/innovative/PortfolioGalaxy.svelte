<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { spring } from 'svelte/motion';

	// Props
	let {
		useRealData = false,
		animationSpeed = 1,
		className = ''
	} = $props();

	// State
	let rotation = spring(0, { stiffness: 0.02, damping: 0.25 });
	let zoom = spring(1, { stiffness: 0.1, damping: 0.25 });
	let hoveredObject = $state<any>(null);
	let animationFrame: number;

	// Demo portfolio data structured as a galaxy
	const galaxyData = {
		center: {
			name: 'Total Portfolio',
			value: 987650, // Total value in cents
			type: 'sun'
		},
		orbits: [
			{
				name: 'Major Holdings',
				radius: 120,
				speed: 0.5,
				objects: [
					{ name: 'ETH', value: 324500, size: 25, color: '#627EEA', angle: 0 },
					{ name: 'BTC', value: 125000, size: 20, color: '#F7931A', angle: 120 },
					{ name: 'MATIC', value: 45000, size: 15, color: '#8247E5', angle: 240 }
				]
			},
			{
				name: 'DeFi Positions',
				radius: 200,
				speed: 0.3,
				objects: [
					{ name: 'AAVE', value: 87500, size: 18, color: '#B6509E', angle: 45 },
					{ name: 'UNI LP', value: 65000, size: 16, color: '#FF007A', angle: 135 },
					{ name: 'CRV', value: 34000, size: 12, color: '#40649F', angle: 225 },
					{ name: 'COMP', value: 28000, size: 11, color: '#00D395', angle: 315 }
				]
			},
			{
				name: 'Stablecoins',
				radius: 280,
				speed: 0.2,
				objects: [
					{ name: 'USDC', value: 100000, size: 19, color: '#2775CA', angle: 90 },
					{ name: 'DAI', value: 50000, size: 14, color: '#F5AC37', angle: 270 }
				]
			},
			{
				name: 'Small Holdings',
				radius: 350,
				speed: 0.15,
				objects: [
					{ name: 'LINK', value: 12000, size: 8, color: '#2A5ADA', angle: 30 },
					{ name: 'SNX', value: 8500, size: 7, color: '#00D1FF', angle: 90 },
					{ name: 'SUSHI', value: 5400, size: 6, color: '#FA52A0', angle: 150 },
					{ name: 'YFI', value: 4200, size: 5, color: '#0074FA', angle: 210 },
					{ name: 'ENS', value: 3100, size: 4, color: '#5298FF', angle: 270 },
					{ name: 'GRT', value: 2800, size: 4, color: '#6F4CFF', angle: 330 }
				]
			}
		],
		asteroids: [ // Small random holdings
			{ x: -180, y: 120, value: 500, name: 'SAND' },
			{ x: 220, y: -90, value: 350, name: 'MANA' },
			{ x: -150, y: -180, value: 420, name: 'AXS' },
			{ x: 190, y: 160, value: 280, name: 'CHZ' }
		],
		nebulae: [ // Yield generating areas
			{ x: -100, y: -50, radius: 80, color: '#10b981', opacity: 0.2, name: 'Staking Rewards', value: 15600 },
			{ x: 150, y: 100, radius: 60, color: '#8b5cf6', opacity: 0.2, name: 'LP Fees', value: 8900 }
		]
	};

	// Calculate position for orbital objects
	function getOrbitalPosition(orbit: any, obj: any, time: number) {
		const angle = obj.angle + (time * orbit.speed * animationSpeed);
		const x = Math.cos(angle * Math.PI / 180) * orbit.radius;
		const y = Math.sin(angle * Math.PI / 180) * orbit.radius;
		return { x, y };
	}

	// Format value
	function formatValue(cents: number): string {
		const dollars = cents / 100;
		if (dollars >= 1000000) {
			return `$${(dollars / 1000000).toFixed(2)}M`;
		} else if (dollars >= 1000) {
			return `$${(dollars / 1000).toFixed(1)}K`;
		} else {
			return `$${dollars.toFixed(2)}`;
		}
	}

	// Animation loop
	let time = $state(0);
	function animate() {
		time += 0.01;
		rotation.update(r => r + 0.1 * animationSpeed);
		animationFrame = requestAnimationFrame(animate);
	}

	onMount(() => {
		animate();
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
	});

	// Handle scroll for zoom
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		zoom.update(z => Math.max(0.5, Math.min(2, z + event.deltaY * -0.001)));
	}
</script>

<div class="portfolio-galaxy {className}" onwheel={handleWheel}>
	<svg viewBox="-400 -400 800 800" class="w-full h-full">
		<defs>
			<!-- Gradients for celestial objects -->
			<radialGradient id="sun-gradient">
				<stop offset="0%" stop-color="#fbbf24" stop-opacity="1"/>
				<stop offset="50%" stop-color="#f59e0b" stop-opacity="0.8"/>
				<stop offset="100%" stop-color="#dc2626" stop-opacity="0.6"/>
			</radialGradient>
			
			<!-- Glow filter -->
			<filter id="glow">
				<feGaussianBlur stdDeviation="4" result="coloredBlur"/>
				<feMerge>
					<feMergeNode in="coloredBlur"/>
					<feMergeNode in="SourceGraphic"/>
				</feMerge>
			</filter>
			
			<!-- Star pattern for background -->
			<pattern id="stars" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
				<circle cx="10" cy="10" r="0.5" fill="white" opacity="0.5"/>
				<circle cx="40" cy="25" r="0.3" fill="white" opacity="0.7"/>
				<circle cx="60" cy="60" r="0.4" fill="white" opacity="0.6"/>
				<circle cx="85" cy="45" r="0.5" fill="white" opacity="0.4"/>
				<circle cx="25" cy="80" r="0.3" fill="white" opacity="0.5"/>
			</pattern>
		</defs>

		<!-- Background stars -->
		<rect x="-400" y="-400" width="800" height="800" fill="url(#stars)"/>

		<!-- Main galaxy group with zoom -->
		<g transform="scale({$zoom})">
			<!-- Nebulae (yield areas) -->
			{#each galaxyData.nebulae as nebula}
				<g>
					<circle
						cx={nebula.x}
						cy={nebula.y}
						r={nebula.radius}
						fill={nebula.color}
						opacity={nebula.opacity}
						filter="url(#glow)"
					/>
					<text
						x={nebula.x}
						y={nebula.y}
						text-anchor="middle"
						fill="white"
						font-size="10"
						opacity="0.7"
					>
						{nebula.name}
					</text>
					<text
						x={nebula.x}
						y={nebula.y + 12}
						text-anchor="middle"
						fill="white"
						font-size="9"
						opacity="0.5"
					>
						+{formatValue(nebula.value)}/mo
					</text>
				</g>
			{/each}

			<!-- Orbital rings -->
			{#each galaxyData.orbits as orbit}
				<circle
					cx="0"
					cy="0"
					r={orbit.radius}
					fill="none"
					stroke="white"
					stroke-width="0.5"
					opacity="0.1"
					stroke-dasharray="5,5"
				/>
			{/each}

			<!-- Central sun (total portfolio) -->
			<g transform="rotate({$rotation})">
				<circle
					cx="0"
					cy="0"
					r="40"
					fill="url(#sun-gradient)"
					filter="url(#glow)"
					class="cursor-pointer"
					onmouseenter={() => hoveredObject = galaxyData.center}
					onmouseleave={() => hoveredObject = null}
				/>
				<!-- Solar flares -->
				{#each [0, 72, 144, 216, 288] as angle}
					<path
						d="M 0,0 L {Math.cos(angle * Math.PI / 180) * 60},{Math.sin(angle * Math.PI / 180) * 60}"
						stroke="#fbbf24"
						stroke-width="2"
						opacity={0.3 + Math.sin(time * 2 + angle) * 0.2}
					/>
				{/each}
			</g>
			
			<!-- Center value -->
			<text
				x="0"
				y="0"
				text-anchor="middle"
				fill="white"
				font-size="16"
				font-weight="bold"
			>
				{formatValue(galaxyData.center.value)}
			</text>

			<!-- Orbital objects (major holdings) -->
			{#each galaxyData.orbits as orbit}
				{#each orbit.objects as obj}
					{@const pos = getOrbitalPosition(orbit, obj, time)}
					<g transform="translate({pos.x}, {pos.y})">
						<!-- Object with moon-like phases -->
						<circle
							r={obj.size}
							fill={obj.color}
							opacity="0.9"
							filter="url(#glow)"
							class="cursor-pointer"
							onmouseenter={() => hoveredObject = obj}
							onmouseleave={() => hoveredObject = null}
						/>
						<!-- Object label -->
						<text
							y={-obj.size - 5}
							text-anchor="middle"
							fill="white"
							font-size="10"
							font-weight="500"
						>
							{obj.name}
						</text>
						<!-- Value -->
						<text
							y={obj.size + 12}
							text-anchor="middle"
							fill="white"
							font-size="9"
							opacity="0.7"
						>
							{formatValue(obj.value)}
						</text>
					</g>
				{/each}
			{/each}

			<!-- Asteroids (small holdings) -->
			{#each galaxyData.asteroids as asteroid}
				<g transform="translate({asteroid.x}, {asteroid.y})">
					<circle
						r="3"
						fill="#94a3b8"
						opacity="0.6"
						class="cursor-pointer"
						onmouseenter={() => hoveredObject = asteroid}
						onmouseleave={() => hoveredObject = null}
					/>
					<text
						y="-5"
						text-anchor="middle"
						fill="white"
						font-size="8"
						opacity="0.5"
					>
						{asteroid.name}
					</text>
				</g>
			{/each}
		</g>

		<!-- Hover info -->
		{#if hoveredObject}
			<g transform="translate(-380, -380)">
				<rect
					width="150"
					height="60"
					fill="black"
					opacity="0.8"
					rx="5"
				/>
				<text x="10" y="20" fill="white" font-size="12" font-weight="bold">
					{hoveredObject.name}
				</text>
				<text x="10" y="40" fill="white" font-size="11">
					Value: {formatValue(hoveredObject.value)}
				</text>
				{#if hoveredObject.type !== 'sun'}
					<text x="10" y="55" fill="#10b981" font-size="10">
						{((hoveredObject.value / galaxyData.center.value) * 100).toFixed(1)}% of portfolio
					</text>
				{/if}
			</g>
		{/if}

		<!-- Controls hint -->
		<text x="-380" y="380" fill="white" font-size="10" opacity="0.5">
			Scroll to zoom • Objects orbit in real-time
		</text>
	</svg>
</div>

<style>
	.portfolio-galaxy {
		width: 100%;
		height: 100%;
		min-height: 400px;
		background: radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 50%, #000000 100%);
		border-radius: 0.5rem;
		overflow: hidden;
		position: relative;
	}

	/* Twinkling stars effect */
	@keyframes twinkle {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}
</style>