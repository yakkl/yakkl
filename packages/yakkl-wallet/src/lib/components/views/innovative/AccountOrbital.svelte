<script lang="ts">
	import { spring } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { currentAccount } from '$lib/stores/account.store';
	import { walletCacheStore } from '$lib/stores/wallet-cache.store';
	import { BigNumberishUtils } from '$lib/common/BigNumberishUtils';
	import SimpleTooltip from '$lib/components/SimpleTooltip.svelte';
	import { onMount } from 'svelte';

	// Props
	let {
		useRealData = false,
		animationSpeed = 1,
		showLabels = true,
		enableInteraction = true,
		className = ''
	} = $props();

	// State
	let rotation = spring(0, { stiffness: 0.05, damping: 0.25 });
	let hoveredAccount = $state<string | null>(null);
	let selectedAccountId = $state<string | null>(null);
	let isDragging = $state(false);
	let dragStartAngle = $state(0);
	let animationFrame: number;

	// Demo data for testing
	const demoAccounts = [
		{ 
			id: 'main', 
			name: 'Main Account', 
			address: '0x742d...5dC8',
			balance: 125000, // cents
			transactions: 342,
			lastActive: Date.now() - 3600000
		},
		{ 
			id: 'trading', 
			name: 'Trading', 
			address: '0x8B3f...9aE2',
			balance: 87500,
			transactions: 1289,
			lastActive: Date.now() - 7200000
		},
		{ 
			id: 'savings', 
			name: 'Savings', 
			address: '0x5C9a...2fB1',
			balance: 450000,
			transactions: 23,
			lastActive: Date.now() - 86400000
		},
		{ 
			id: 'defi', 
			name: 'DeFi Yield', 
			address: '0x3D4e...7cA9',
			balance: 234500,
			transactions: 156,
			lastActive: Date.now() - 1800000
		},
		{ 
			id: 'nft', 
			name: 'NFT Vault', 
			address: '0x9F2b...4dE3',
			balance: 56700,
			transactions: 89,
			lastActive: Date.now() - 43200000
		}
	];

	// Get real accounts from cache
	let accounts = $derived.by(() => {
		if (!useRealData) return demoAccounts;
		
		const cache = $walletCacheStore;
		if (!cache?.accounts) return demoAccounts;
		
		// Transform real accounts to match our format
		return Object.values(cache.accounts).map((acc: any) => ({
			id: acc.address,
			name: acc.name || acc.ens || `Account ${acc.index}`,
			address: acc.address,
			balance: acc.balance || 0,
			transactions: acc.transactionCount || 0,
			lastActive: acc.lastActive || Date.now()
		}));
	});

	// Calculate total balance
	let totalBalance = $derived.by(() => {
		return accounts.reduce((sum, acc) => sum + acc.balance, 0);
	});

	// Format balance for display
	function formatBalance(cents: number): string {
		const dollars = cents / 100;
		if (dollars >= 1000000) {
			return `$${(dollars / 1000000).toFixed(1)}M`;
		} else if (dollars >= 1000) {
			return `$${(dollars / 1000).toFixed(1)}K`;
		} else {
			return `$${dollars.toFixed(2)}`;
		}
	}

	// Calculate orbital properties for each account
	function getOrbitalProps(account: any, index: number, total: number) {
		// Size based on balance (relative to total)
		const balanceRatio = account.balance / Math.max(totalBalance, 1);
		const minSize = 30;
		const maxSize = 60;
		const size = minSize + (maxSize - minSize) * balanceRatio;

		// Distance based on activity (more active = closer)
		const hoursSinceActive = (Date.now() - account.lastActive) / 3600000;
		const activityScore = Math.max(0, 1 - (hoursSinceActive / 168)); // 168 hours = 1 week
		const minRadius = 80;
		const maxRadius = 150;
		const radius = minRadius + (maxRadius - minRadius) * (1 - activityScore);

		// Angle evenly distributed
		const baseAngle = (index * (360 / total));
		const angle = (baseAngle + $rotation) % 360;
		const radians = (angle - 90) * (Math.PI / 180);

		// Position
		const x = Math.cos(radians) * radius;
		const y = Math.sin(radians) * radius;

		// Color based on balance tier
		let color = '';
		if (account.balance >= 250000) {
			color = 'from-purple-400 to-pink-400'; // High value
		} else if (account.balance >= 100000) {
			color = 'from-blue-400 to-indigo-400'; // Medium value
		} else if (account.balance >= 50000) {
			color = 'from-green-400 to-teal-400'; // Low-medium value
		} else {
			color = 'from-gray-400 to-gray-500'; // Low value
		}

		// Orbital speed (slower for outer orbits)
		const speed = (200 - radius) / 100;

		return { size, radius, angle, x, y, color, speed };
	}

	// Animation loop
	function animate() {
		if (animationSpeed > 0 && !isDragging) {
			rotation.update(r => r + (0.2 * animationSpeed));
		}
		animationFrame = requestAnimationFrame(animate);
	}

	// Handle account selection
	function selectAccount(accountId: string) {
		if (!enableInteraction) return;
		selectedAccountId = accountId;
		// In real implementation, this would switch the active account
		console.log('Selected account:', accountId);
	}

	// Mouse/touch drag handling
	function handlePointerDown(event: PointerEvent) {
		if (!enableInteraction) return;
		isDragging = true;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		dragStartAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!isDragging) return;
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI);
		const deltaAngle = currentAngle - dragStartAngle;
		rotation.update(r => r + deltaAngle);
		dragStartAngle = currentAngle;
	}

	function handlePointerUp() {
		isDragging = false;
	}

	onMount(() => {
		animate();
		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});

	// Get time since last active
	function getActivityLabel(lastActive: number): string {
		const hours = (Date.now() - lastActive) / 3600000;
		if (hours < 1) return 'Active now';
		if (hours < 24) return `${Math.round(hours)}h ago`;
		const days = Math.round(hours / 24);
		if (days === 1) return '1 day ago';
		return `${days} days ago`;
	}
</script>

<div 
	class="account-orbital relative inline-block {className}"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointerleave={handlePointerUp}
	role="navigation"
	aria-label="Account orbital selector"
>
	<!-- Container for proper sizing -->
	<div class="relative" style="width: 400px; height: 400px;">
		<!-- Orbital rings (decorative) -->
		<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
			<div class="absolute rounded-full border border-gray-200 dark:border-gray-700 opacity-10"
				style="width: 160px; height: 160px;"></div>
			<div class="absolute rounded-full border border-gray-200 dark:border-gray-700 opacity-10"
				style="width: 260px; height: 260px;"></div>
			<div class="absolute rounded-full border border-gray-200 dark:border-gray-700 opacity-5"
				style="width: 360px; height: 360px;"></div>
		</div>

		<!-- Central total (sun) -->
		<div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
			<div class="relative">
				<div class="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 shadow-2xl flex flex-col items-center justify-center">
					<div class="text-xs text-white/80 font-medium">Total</div>
					<div class="text-lg text-white font-bold">
						{formatBalance(totalBalance)}
					</div>
				</div>
				<!-- Glow effect -->
				<div class="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 opacity-30 blur-xl animate-pulse"></div>
			</div>
		</div>

		<!-- Account orbitals (planets) -->
		{#each accounts as account, index}
			{@const props = getOrbitalProps(account, index, accounts.length)}
			<div
				class="absolute top-1/2 left-1/2 transition-all duration-300"
				style="
					transform: translate(
						calc(-50% + {props.x}px), 
						calc(-50% + {props.y}px)
					);
				"
				in:scale={{ delay: index * 50, duration: 500, easing: cubicOut }}
			>
				<SimpleTooltip
					text="{account.name} • {formatBalance(account.balance)} • {account.transactions} txns • {getActivityLabel(account.lastActive)}"
					position="top"
				>
					<button
						onclick={() => selectAccount(account.id)}
						onmouseenter={() => hoveredAccount = account.id}
						onmouseleave={() => hoveredAccount = null}
						class="relative group transition-all duration-300 {hoveredAccount === account.id ? 'scale-110' : ''}"
						style="width: {props.size}px; height: {props.size}px;"
						aria-label="{account.name} - {formatBalance(account.balance)}"
					>
						<!-- Account background -->
						<div class="absolute inset-0 rounded-full bg-gradient-to-br {props.color} shadow-lg transition-all duration-300
							{selectedAccountId === account.id ? 'ring-2 ring-white ring-offset-2' : ''}
							{hoveredAccount === account.id ? 'shadow-2xl' : ''}"></div>
						
						<!-- Account info -->
						<div class="relative z-10 w-full h-full flex flex-col items-center justify-center text-white">
							{#if props.size >= 40}
								<div class="text-[10px] font-bold truncate max-w-[90%]">
									{account.name}
								</div>
								<div class="text-[11px] font-semibold">
									{formatBalance(account.balance)}
								</div>
							{:else}
								<div class="text-[10px] font-bold">
									{formatBalance(account.balance)}
								</div>
							{/if}
						</div>

						<!-- Active indicator -->
						{#if account.id === $currentAccount?.address}
							<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
						{/if}

						<!-- Transaction activity rings -->
						{#if account.transactions > 100}
							<div class="absolute inset-0 rounded-full border-2 border-white/20 animate-ping"></div>
						{/if}
					</button>
				</SimpleTooltip>

				<!-- Account label (if enabled) -->
				{#if showLabels && props.size < 40}
					<div class="absolute top-full mt-1 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
						<div class="text-[9px] font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-1 rounded">
							{account.name}
						</div>
					</div>
				{/if}
			</div>
		{/each}

		<!-- Instructions -->
		{#if enableInteraction}
			<div class="absolute bottom-0 left-0 right-0 text-center">
				<div class="text-xs text-gray-500 dark:text-gray-400">
					Drag to rotate • Click to select
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.account-orbital {
		user-select: none;
		touch-action: none;
	}

	/* Smooth cursor transitions */
	.account-orbital:active {
		cursor: grabbing;
	}

	.account-orbital:not(:active) {
		cursor: grab;
	}

</style>