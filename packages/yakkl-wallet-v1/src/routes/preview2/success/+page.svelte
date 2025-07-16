<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { uiStore } from '../lib/stores/ui.store';

	let countdown = $state(5);
	let confettiCanvas: HTMLCanvasElement;

	onMount(() => {
		// Animate confetti
		if (typeof window !== 'undefined') {
			createConfetti();
		}

		// Countdown timer
		const timer = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				clearInterval(timer);
				goto('/preview2');
			}
		}, 1000);

		// Show success notification
		uiStore.showSuccess(
			'Migration Complete!',
			'Welcome to Preview 2.0 - your wallet has been successfully upgraded!'
		);

		return () => clearInterval(timer);
	});

	function createConfetti() {
		if (!confettiCanvas) return;

		const ctx = confettiCanvas.getContext('2d');
		if (!ctx) return;

		const canvas = confettiCanvas;
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		const confetti: Array<{
			x: number;
			y: number;
			size: number;
			color: string;
			velocity: { x: number; y: number };
			rotation: number;
			rotationSpeed: number;
		}> = [];

		const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

		// Create confetti pieces
		for (let i = 0; i < 100; i++) {
			confetti.push({
				x: Math.random() * canvas.width,
				y: -10,
				size: Math.random() * 6 + 3,
				color: colors[Math.floor(Math.random() * colors.length)],
				velocity: {
					x: (Math.random() - 0.5) * 2,
					y: Math.random() * 3 + 2
				},
				rotation: Math.random() * 360,
				rotationSpeed: (Math.random() - 0.5) * 10
			});
		}

		function animate() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			for (let i = confetti.length - 1; i >= 0; i--) {
				const piece = confetti[i];

				// Update position
				piece.x += piece.velocity.x;
				piece.y += piece.velocity.y;
				piece.rotation += piece.rotationSpeed;

				// Draw confetti piece
				ctx.save();
				ctx.translate(piece.x, piece.y);
				ctx.rotate(piece.rotation * Math.PI / 180);
				ctx.fillStyle = piece.color;
				ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
				ctx.restore();

				// Remove if off screen
				if (piece.y > canvas.height + 10) {
					confetti.splice(i, 1);
				}
			}

			if (confetti.length > 0) {
				requestAnimationFrame(animate);
			}
		}

		animate();
	}

	function goToWallet() {
		goto('/preview2');
	}
</script>

<svelte:head>
	<title>Migration Successful - YAKKL Preview 2.0</title>
</svelte:head>

<!-- Confetti Canvas -->
<canvas
	bind:this={confettiCanvas}
	class="fixed inset-0 pointer-events-none z-10"
></canvas>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900 dark:to-emerald-900 flex items-center justify-center p-4 relative">
	<!-- Success Container -->
	<div class="max-w-md w-full text-center relative z-20">
		<!-- Success Icon -->
		<div class="mb-8 relative">
			<div class="w-24 h-24 mx-auto bg-green-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
				<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			
			<!-- Animated rings -->
			<div class="absolute inset-0 w-24 h-24 mx-auto border-4 border-green-300 rounded-full animate-ping"></div>
			<div class="absolute inset-0 w-32 h-32 mx-auto -m-4 border-2 border-green-200 rounded-full animate-pulse"></div>
		</div>

		<!-- Success Message -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-6">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
				🎉 Migration Successful!
			</h1>
			
			<p class="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
				Welcome to <strong>YAKKL Preview 2.0</strong>! Your wallet has been successfully upgraded with enhanced features, improved security, and a beautiful new design.
			</p>

			<!-- Feature highlights -->
			<div class="grid grid-cols-2 gap-4 mb-6 text-sm">
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Enhanced UI/UX
				</div>
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Feature Control
				</div>
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Payment Gateway
				</div>
				<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Data Preserved
				</div>
			</div>

			<!-- Countdown -->
			<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
				<p class="text-sm text-gray-600 dark:text-gray-300 mb-2">
					Redirecting to your wallet in:
				</p>
				<div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
					{countdown}s
				</div>
			</div>

			<!-- Action Button -->
			<button
				onclick={goToWallet}
				class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
			>
				Enter Your Wallet Now
			</button>
		</div>

		<!-- Additional Info -->
		<div class="text-sm text-gray-500 dark:text-gray-400">
			<p>Your original data has been safely migrated and backed up.</p>
			<p class="mt-1">You can always switch back if needed.</p>
		</div>
	</div>

	<!-- Background decorations -->
	<div class="absolute inset-0 overflow-hidden">
		<div class="absolute -top-10 -right-10 w-40 h-40 bg-green-200 dark:bg-green-700 rounded-full opacity-20 animate-pulse"></div>
		<div class="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-200 dark:bg-emerald-700 rounded-full opacity-20 animate-pulse"></div>
		<div class="absolute top-1/2 left-1/4 w-6 h-6 bg-green-300 dark:bg-green-600 rounded-full opacity-40 animate-bounce" style="animation-delay: 0.5s;"></div>
		<div class="absolute top-1/3 right-1/4 w-4 h-4 bg-emerald-300 dark:bg-emerald-600 rounded-full opacity-40 animate-bounce" style="animation-delay: 1s;"></div>
	</div>
</div>

<style>
</style>