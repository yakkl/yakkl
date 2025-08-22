<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { spring } from 'svelte/motion';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import { walletCacheStore } from '$lib/stores/wallet-cache.store';

	// Props
	let {
		useRealData = false,
		animationSpeed = 1,
		quality = 'high', // 'low', 'medium', 'high'
		className = ''
	} = $props();

	// State
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationFrame: number;
	let stars: Star[] = [];
	let connections: Connection[] = [];
	let mouseX = $state(0);
	let mouseY = $state(0);
	let hoveredStar = $state<Star | null>(null);
	let cameraZ = spring(100, { stiffness: 0.05, damping: 0.25 });

	// Demo tokens
	const demoTokens = [
		{ symbol: 'ETH', name: 'Ethereum', value: 324500, change: 5.2, marketCap: 400000000000 },
		{ symbol: 'BTC', name: 'Bitcoin', value: 125000, change: 3.8, marketCap: 1200000000000 },
		{ symbol: 'USDC', name: 'USD Coin', value: 100000, change: 0.01, marketCap: 50000000000 },
		{ symbol: 'MATIC', name: 'Polygon', value: 45000, change: -2.1, marketCap: 10000000000 },
		{ symbol: 'LINK', name: 'Chainlink', value: 23400, change: 8.7, marketCap: 15000000000 },
		{ symbol: 'UNI', name: 'Uniswap', value: 18900, change: -1.5, marketCap: 8000000000 },
		{ symbol: 'AAVE', name: 'Aave', value: 15600, change: 4.3, marketCap: 5000000000 },
		{ symbol: 'CRV', name: 'Curve', value: 8900, change: 12.1, marketCap: 2000000000 },
		{ symbol: 'SUSHI', name: 'SushiSwap', value: 5400, change: -3.4, marketCap: 1000000000 },
		{ symbol: 'COMP', name: 'Compound', value: 4200, change: 6.8, marketCap: 3000000000 }
	];

	interface Star {
		x: number;
		y: number;
		z: number;
		size: number;
		color: string;
		brightness: number;
		token: any;
		vx: number;
		vy: number;
		vz: number;
		pulse: number;
	}

	interface Connection {
		from: Star;
		to: Star;
		strength: number;
	}

	// Get tokens from real data or demo
	let tokens = $derived.by(() => {
		if (!useRealData) return demoTokens;
		
		const cache = $walletCacheStore;
		if (!cache?.tokens) return demoTokens;
		
		// Transform real tokens
		return Object.values(cache.tokens).slice(0, 20).map((token: any) => ({
			symbol: token.symbol,
			name: token.name,
			value: token.balance || 0,
			change: token.priceChange24h || 0,
			marketCap: token.marketCap || 0
		}));
	});

	// Initialize stars from tokens
	function initializeStars() {
		stars = tokens.map((token, i) => {
			// Position in 3D space based on market cap and value
			const marketCapScale = Math.log10(Math.max(token.marketCap, 1000000)) / 12;
			const valueScale = Math.log10(Math.max(token.value, 100)) / 6;
			
			// Spread tokens in 3D space
			const phi = Math.acos(1 - 2 * (i + 0.5) / tokens.length);
			const theta = Math.PI * (1 + Math.sqrt(5)) * i;
			
			const radius = 150 + marketCapScale * 100;
			const x = radius * Math.sin(phi) * Math.cos(theta);
			const y = radius * Math.sin(phi) * Math.sin(theta);
			const z = radius * Math.cos(phi);

			// Color based on performance
			let color = '';
			if (token.change > 5) color = '#10b981'; // Green
			else if (token.change > 0) color = '#3b82f6'; // Blue
			else if (token.change > -5) color = '#f59e0b'; // Orange
			else color = '#ef4444'; // Red

			return {
				x,
				y,
				z,
				size: 3 + valueScale * 5,
				color,
				brightness: 0.5 + valueScale * 0.5,
				token,
				vx: (Math.random() - 0.5) * 0.1,
				vy: (Math.random() - 0.5) * 0.1,
				vz: (Math.random() - 0.5) * 0.1,
				pulse: Math.random() * Math.PI * 2
			};
		});

		// Create connections between related tokens (correlation simulation)
		connections = [];
		for (let i = 0; i < stars.length; i++) {
			for (let j = i + 1; j < stars.length; j++) {
				const distance = Math.sqrt(
					Math.pow(stars[i].x - stars[j].x, 2) +
					Math.pow(stars[i].y - stars[j].y, 2) +
					Math.pow(stars[i].z - stars[j].z, 2)
				);
				
				if (distance < 200) {
					connections.push({
						from: stars[i],
						to: stars[j],
						strength: 1 - (distance / 200)
					});
				}
			}
		}
	}

	// Project 3D coordinates to 2D canvas
	function project(x: number, y: number, z: number) {
		const perspective = 600;
		const cameraZValue = $cameraZ;
		const scale = perspective / (perspective + z + cameraZValue);
		const x2d = x * scale + canvas.width / 2;
		const y2d = y * scale + canvas.height / 2;
		return { x: x2d, y: y2d, scale };
	}

	// Draw a single star
	function drawStar(star: Star) {
		const projected = project(star.x, star.y, star.z);
		
		// Skip if behind camera
		if (projected.scale <= 0) return;

		// Pulsing effect
		star.pulse += 0.02 * animationSpeed;
		const pulseFactor = 1 + Math.sin(star.pulse) * 0.2;
		
		// Draw star glow
		const glowSize = star.size * projected.scale * pulseFactor * 3;
		const gradient = ctx.createRadialGradient(
			projected.x, projected.y, 0,
			projected.x, projected.y, glowSize
		);
		gradient.addColorStop(0, star.color + 'ff');
		gradient.addColorStop(0.5, star.color + '40');
		gradient.addColorStop(1, star.color + '00');
		
		ctx.fillStyle = gradient;
		ctx.fillRect(
			projected.x - glowSize,
			projected.y - glowSize,
			glowSize * 2,
			glowSize * 2
		);

		// Draw star core
		const coreSize = star.size * projected.scale * pulseFactor;
		ctx.fillStyle = star.color;
		ctx.beginPath();
		ctx.arc(projected.x, projected.y, coreSize, 0, Math.PI * 2);
		ctx.fill();

		// Draw label for larger stars
		if (coreSize > 3 && quality !== 'low') {
			ctx.fillStyle = '#ffffff' + Math.floor(projected.scale * 255).toString(16).padStart(2, '0');
			ctx.font = `${Math.max(10, coreSize * 2)}px sans-serif`;
			ctx.textAlign = 'center';
			ctx.fillText(star.token.symbol, projected.x, projected.y - coreSize - 5);
		}
	}

	// Draw connection between stars
	function drawConnection(connection: Connection) {
		const from = project(connection.from.x, connection.from.y, connection.from.z);
		const to = project(connection.to.x, connection.to.y, connection.to.z);
		
		if (from.scale <= 0 || to.scale <= 0) return;

		const opacity = Math.min(from.scale, to.scale) * connection.strength * 0.3;
		ctx.strokeStyle = `rgba(100, 150, 255, ${opacity})`;
		ctx.lineWidth = connection.strength * 2 * Math.min(from.scale, to.scale);
		
		ctx.beginPath();
		ctx.moveTo(from.x, from.y);
		ctx.lineTo(to.x, to.y);
		ctx.stroke();
	}

	// Animation loop
	function animate() {
		if (!ctx || !canvas) return;

		// Clear canvas
		ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Update star positions
		if (animationSpeed > 0) {
			stars.forEach(star => {
				star.x += star.vx * animationSpeed;
				star.y += star.vy * animationSpeed;
				star.z += star.vz * animationSpeed;
				
				// Gentle drift
				star.vx += (Math.random() - 0.5) * 0.001;
				star.vy += (Math.random() - 0.5) * 0.001;
				star.vz += (Math.random() - 0.5) * 0.001;
				
				// Damping
				star.vx *= 0.999;
				star.vy *= 0.999;
				star.vz *= 0.999;
			});
		}

		// Sort stars by z-depth for proper rendering
		const sortedStars = [...stars].sort((a, b) => b.z - a.z);

		// Draw connections first (behind stars)
		if (quality !== 'low') {
			connections.forEach(conn => drawConnection(conn));
		}

		// Draw stars
		sortedStars.forEach(star => drawStar(star));

		// Draw hover info
		if (hoveredStar) {
			const projected = project(hoveredStar.x, hoveredStar.y, hoveredStar.z);
			ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
			ctx.fillRect(projected.x + 10, projected.y - 30, 150, 60);
			ctx.fillStyle = '#ffffff';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(hoveredStar.token.name, projected.x + 15, projected.y - 15);
			ctx.fillText(`$${(hoveredStar.token.value / 100).toFixed(2)}`, projected.x + 15, projected.y);
			ctx.fillText(`${hoveredStar.token.change > 0 ? '+' : ''}${hoveredStar.token.change}%`, projected.x + 15, projected.y + 15);
		}

		animationFrame = requestAnimationFrame(animate);
	}

	// Handle mouse movement for parallax
	function handleMouseMove(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;

		// Check for hover
		hoveredStar = null;
		for (const star of stars) {
			const projected = project(star.x, star.y, star.z);
			const distance = Math.sqrt(
				Math.pow(mouseX - projected.x, 2) +
				Math.pow(mouseY - projected.y, 2)
			);
			if (distance < star.size * projected.scale * 2) {
				hoveredStar = star;
				break;
			}
		}

		// Parallax camera movement
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const deltaX = (mouseX - centerX) / centerX;
		const deltaY = (mouseY - centerY) / centerY;
		
		stars.forEach(star => {
			star.x += deltaX * star.z * 0.0001;
			star.y += deltaY * star.z * 0.0001;
		});
	}

	// Handle scroll for zoom
	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		cameraZ.update(z => Math.max(-200, Math.min(300, z + event.deltaY * 0.1)));
	}

	onMount(() => {
		const rect = canvas.parentElement?.getBoundingClientRect();
		if (rect) {
			canvas.width = rect.width;
			canvas.height = rect.height;
		}
		
		ctx = canvas.getContext('2d')!;
		initializeStars();
		animate();
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<div class="token-constellation relative {className}">
	<canvas
		bind:this={canvas}
		class="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900/20 to-purple-900/20 rounded-lg"
		onmousemove={handleMouseMove}
		onwheel={handleWheel}
	></canvas>
	
	<!-- Controls overlay -->
	<div class="absolute top-4 left-4 text-white/60 text-xs">
		<div>Scroll to zoom</div>
		<div>Move mouse for parallax</div>
	</div>
	
	<!-- Performance indicator -->
	{#if quality === 'low'}
		<div class="absolute top-4 right-4 text-yellow-400 text-xs">
			Low Quality Mode
		</div>
	{/if}
</div>

<style>
	.token-constellation {
		width: 100%;
		height: 100%;
		min-height: 400px;
		overflow: hidden;
		cursor: crosshair;
	}
</style>