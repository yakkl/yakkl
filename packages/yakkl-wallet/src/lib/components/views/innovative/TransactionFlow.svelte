<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Props
	let {
		useRealData = false,
		animationSpeed = 1,
		particleCount = 50,
		className = ''
	} = $props();

	// State
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationFrame: number;
	let particles: Particle[] = [];
	let flows: Flow[] = [];
	let selectedFlow = $state<Flow | null>(null);

	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		size: number;
		color: string;
		alpha: number;
		flowId: string;
		progress: number;
		value: number;
		trail: { x: number; y: number }[];
	}

	interface Flow {
		id: string;
		from: { x: number; y: number; label: string; address: string };
		to: { x: number; y: number; label: string; address: string };
		value: number;
		type: 'send' | 'receive' | 'swap' | 'contract';
		timestamp: number;
		status: 'pending' | 'confirmed' | 'failed';
		gasUsed?: number;
	}

	// Demo transaction flows
	const demoFlows: Flow[] = [
		{
			id: 'tx1',
			from: { x: 100, y: 200, label: 'My Wallet', address: '0x742d...5dC8' },
			to: { x: 500, y: 150, label: 'Uniswap', address: '0x1f98...3b4c' },
			value: 2500,
			type: 'swap',
			timestamp: Date.now() - 60000,
			status: 'confirmed',
			gasUsed: 0.015
		},
		{
			id: 'tx2',
			from: { x: 500, y: 350, label: 'Friend.eth', address: '0x8B3f...9aE2' },
			to: { x: 100, y: 200, label: 'My Wallet', address: '0x742d...5dC8' },
			value: 1000,
			type: 'receive',
			timestamp: Date.now() - 120000,
			status: 'confirmed'
		},
		{
			id: 'tx3',
			from: { x: 100, y: 200, label: 'My Wallet', address: '0x742d...5dC8' },
			to: { x: 300, y: 400, label: 'NFT Market', address: '0x5C9a...2fB1' },
			value: 5000,
			type: 'contract',
			timestamp: Date.now() - 30000,
			status: 'pending'
		},
		{
			id: 'tx4',
			from: { x: 100, y: 200, label: 'My Wallet', address: '0x742d...5dC8' },
			to: { x: 400, y: 250, label: 'Exchange', address: '0x3D4e...7cA9' },
			value: 750,
			type: 'send',
			timestamp: Date.now() - 180000,
			status: 'confirmed',
			gasUsed: 0.008
		}
	];

	// Initialize flows
	function initializeFlows() {
		flows = useRealData ? [] : demoFlows; // Would fetch real data if available
	}

	// Create particle for a flow
	function createParticle(flow: Flow): Particle {
		const angle = Math.atan2(flow.to.y - flow.from.y, flow.to.x - flow.from.x);
		const speed = 2 + (flow.value / 1000) * animationSpeed;
		
		// Color based on transaction type
		let color = '#3b82f6'; // default blue
		if (flow.type === 'receive') color = '#10b981';
		else if (flow.type === 'swap') color = '#f59e0b';
		else if (flow.type === 'contract') color = '#8b5cf6';
		else if (flow.status === 'failed') color = '#ef4444';
		else if (flow.status === 'pending') color = '#fbbf24';

		return {
			x: flow.from.x,
			y: flow.from.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: Math.min(10, 3 + flow.value / 500),
			color,
			alpha: 1,
			flowId: flow.id,
			progress: 0,
			value: flow.value,
			trail: []
		};
	}

	// Calculate bezier curve point
	function getBezierPoint(t: number, p0: { x: number; y: number }, p1: { x: number; y: number }, cp: { x: number; y: number }) {
		const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * cp.x + Math.pow(t, 2) * p1.x;
		const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * cp.y + Math.pow(t, 2) * p1.y;
		return { x, y };
	}

	// Update particle position along bezier curve
	function updateParticle(particle: Particle) {
		const flow = flows.find(f => f.id === particle.flowId);
		if (!flow) return;

		particle.progress += 0.01 * animationSpeed;
		
		if (particle.progress >= 1) {
			// Reset particle to start
			particle.progress = 0;
			particle.trail = [];
			particle.x = flow.from.x;
			particle.y = flow.from.y;
		} else {
			// Calculate control point for curve
			const midX = (flow.from.x + flow.to.x) / 2;
			const midY = (flow.from.y + flow.to.y) / 2;
			const offset = 50;
			const angle = Math.atan2(flow.to.y - flow.from.y, flow.to.x - flow.from.x) + Math.PI / 2;
			const controlPoint = {
				x: midX + Math.cos(angle) * offset,
				y: midY + Math.sin(angle) * offset
			};

			// Get position on bezier curve
			const pos = getBezierPoint(particle.progress, flow.from, flow.to, controlPoint);
			
			// Add to trail
			particle.trail.push({ x: particle.x, y: particle.y });
			if (particle.trail.length > 20) {
				particle.trail.shift();
			}
			
			particle.x = pos.x;
			particle.y = pos.y;
		}
	}

	// Draw flow path
	function drawFlowPath(flow: Flow) {
		const midX = (flow.from.x + flow.to.x) / 2;
		const midY = (flow.from.y + flow.to.y) / 2;
		const offset = 50;
		const angle = Math.atan2(flow.to.y - flow.from.y, flow.to.x - flow.from.x) + Math.PI / 2;
		const controlX = midX + Math.cos(angle) * offset;
		const controlY = midY + Math.sin(angle) * offset;

		// Draw path
		ctx.strokeStyle = selectedFlow?.id === flow.id ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
		ctx.lineWidth = selectedFlow?.id === flow.id ? 2 : 1;
		ctx.setLineDash([5, 5]);
		ctx.beginPath();
		ctx.moveTo(flow.from.x, flow.from.y);
		ctx.quadraticCurveTo(controlX, controlY, flow.to.x, flow.to.y);
		ctx.stroke();
		ctx.setLineDash([]);
	}

	// Draw node
	function drawNode(node: { x: number; y: number; label: string; address: string }, isSource: boolean) {
		// Node circle
		const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20);
		gradient.addColorStop(0, isSource ? '#3b82f6' : '#10b981');
		gradient.addColorStop(1, isSource ? '#1e40af' : '#047857');
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
		ctx.fill();
		
		// Node label
		ctx.fillStyle = '#ffffff';
		ctx.font = '11px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText(node.label, node.x, node.y - 25);
		
		// Address
		ctx.fillStyle = '#94a3b8';
		ctx.font = '9px monospace';
		ctx.fillText(node.address, node.x, node.y + 35);
	}

	// Draw particle with trail
	function drawParticle(particle: Particle) {
		// Draw trail
		ctx.strokeStyle = particle.color;
		ctx.lineWidth = particle.size / 2;
		ctx.beginPath();
		particle.trail.forEach((point, i) => {
			ctx.globalAlpha = (i / particle.trail.length) * 0.5;
			if (i === 0) {
				ctx.moveTo(point.x, point.y);
			} else {
				ctx.lineTo(point.x, point.y);
			}
		});
		ctx.stroke();
		ctx.globalAlpha = 1;

		// Draw particle glow
		const gradient = ctx.createRadialGradient(
			particle.x, particle.y, 0,
			particle.x, particle.y, particle.size * 3
		);
		gradient.addColorStop(0, particle.color);
		gradient.addColorStop(0.5, particle.color + '40');
		gradient.addColorStop(1, particle.color + '00');
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
		ctx.fill();

		// Draw particle core
		ctx.fillStyle = particle.color;
		ctx.beginPath();
		ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
		ctx.fill();
		
		// Value label on particle
		if (particle.progress > 0.3 && particle.progress < 0.7) {
			ctx.fillStyle = '#ffffff';
			ctx.font = '10px sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(`$${(particle.value / 100).toFixed(0)}`, particle.x, particle.y - particle.size - 5);
		}
	}

	// Animation loop
	function animate() {
		if (!ctx || !canvas) return;

		// Clear canvas
		ctx.fillStyle = 'rgba(15, 23, 42, 0.1)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Draw flow paths
		flows.forEach(flow => drawFlowPath(flow));

		// Draw nodes
		const uniqueNodes = new Map();
		flows.forEach(flow => {
			uniqueNodes.set(flow.from.label, flow.from);
			uniqueNodes.set(flow.to.label, flow.to);
		});
		
		uniqueNodes.forEach(node => {
			const isSource = flows.some(f => f.from.label === node.label);
			drawNode(node, isSource);
		});

		// Update and draw particles
		particles.forEach(particle => {
			updateParticle(particle);
			drawParticle(particle);
		});

		// Draw flow info
		if (selectedFlow) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
			ctx.fillRect(10, canvas.height - 100, 200, 90);
			ctx.fillStyle = '#ffffff';
			ctx.font = '12px sans-serif';
			ctx.textAlign = 'left';
			ctx.fillText(`Type: ${selectedFlow.type}`, 15, canvas.height - 80);
			ctx.fillText(`Value: $${(selectedFlow.value / 100).toFixed(2)}`, 15, canvas.height - 60);
			ctx.fillText(`Status: ${selectedFlow.status}`, 15, canvas.height - 40);
			if (selectedFlow.gasUsed) {
				ctx.fillText(`Gas: ${selectedFlow.gasUsed} ETH`, 15, canvas.height - 20);
			}
		}

		animationFrame = requestAnimationFrame(animate);
	}

	// Handle canvas click
	function handleCanvasClick(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		// Check if click is near a flow path
		selectedFlow = null;
		flows.forEach(flow => {
			const distance = getDistanceToFlow(x, y, flow);
			if (distance < 20) {
				selectedFlow = flow;
			}
		});
	}

	// Calculate distance from point to flow curve
	function getDistanceToFlow(x: number, y: number, flow: Flow): number {
		// Simplified distance calculation
		const midX = (flow.from.x + flow.to.x) / 2;
		const midY = (flow.from.y + flow.to.y) / 2;
		return Math.sqrt(Math.pow(x - midX, 2) + Math.pow(y - midY, 2));
	}

	onMount(() => {
		const rect = canvas.parentElement?.getBoundingClientRect();
		if (rect) {
			canvas.width = rect.width;
			canvas.height = rect.height;
		}
		
		ctx = canvas.getContext('2d')!;
		initializeFlows();
		
		// Create initial particles
		flows.forEach(flow => {
			for (let i = 0; i < particleCount / flows.length; i++) {
				const particle = createParticle(flow);
				particle.progress = Math.random(); // Stagger start positions
				particles.push(particle);
			}
		});
		
		animate();
	});

	onDestroy(() => {
		if (animationFrame) {
			cancelAnimationFrame(animationFrame);
		}
	});
</script>

<div class="transaction-flow {className}">
	<canvas
		bind:this={canvas}
		class="w-full h-full cursor-pointer"
		onclick={handleCanvasClick}
	></canvas>
	
	<!-- Legend -->
	<div class="absolute top-4 right-4 text-white/60 text-xs bg-black/50 p-2 rounded">
		<div class="flex items-center gap-2 mb-1">
			<div class="w-3 h-3 rounded-full bg-blue-500"></div>
			<span>Send</span>
		</div>
		<div class="flex items-center gap-2 mb-1">
			<div class="w-3 h-3 rounded-full bg-green-500"></div>
			<span>Receive</span>
		</div>
		<div class="flex items-center gap-2 mb-1">
			<div class="w-3 h-3 rounded-full bg-amber-500"></div>
			<span>Swap</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-3 h-3 rounded-full bg-purple-500"></div>
			<span>Contract</span>
		</div>
	</div>
</div>

<style>
	.transaction-flow {
		position: relative;
		width: 100%;
		height: 100%;
		min-height: 400px;
		background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
		border-radius: 0.5rem;
		overflow: hidden;
	}
</style>