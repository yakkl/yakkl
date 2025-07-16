<script lang="ts">
	import { fade } from 'svelte/transition';
	
	let showNotifications = $state(false);
	let showProfile = $state(false);
	let notificationCount = $state(2);

	function toggleNotifications() {
		showNotifications = !showNotifications;
		showProfile = false;
	}

	function toggleProfile() {
		showProfile = !showProfile;
		showNotifications = false;
	}
</script>

<header class="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border-light">
	<div class="flex items-center justify-between px-4 py-3">
		<!-- Logo -->
		<div class="flex items-center space-x-2">
			<div class="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
				<span class="text-white font-bold text-sm">Y</span>
			</div>
			<span class="font-semibold text-text-primary text-lg">YAKKL</span>
		</div>

		<!-- Actions -->
		<div class="flex items-center space-x-3">
			<!-- Notifications -->
			<div class="relative">
				<button
					onclick={toggleNotifications}
					class="p-2 rounded-button hover:bg-surface transition-colors relative"
					aria-label="Notifications"
				>
					<svg class="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM4 19h1.5M4 19h1.5m0 0v-5h9v5m-9 0h9m-9-5V9a4 4 0 118 0v5M9 19h6" />
					</svg>
					{#if notificationCount > 0}
						<span class="absolute -top-1 -right-1 bg-danger text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
							{notificationCount}
						</span>
					{/if}
				</button>

				{#if showNotifications}
					<div
						in:fade={{ duration: 200 }}
						out:fade={{ duration: 150 }}
						class="absolute right-0 top-full mt-2 w-80 bg-surface-elevated rounded-card shadow-lg border border-border p-4 z-50"
					>
						<h3 class="font-medium text-text-primary mb-3">Notifications</h3>
						<div class="space-y-3">
							<div class="flex items-start space-x-3 p-3 bg-background rounded-button">
								<div class="w-2 h-2 bg-success rounded-full mt-2"></div>
								<div>
									<p class="text-sm text-text-primary">Transaction confirmed</p>
									<p class="text-xs text-text-muted">Your USDT transfer was successful</p>
								</div>
							</div>
							<div class="flex items-start space-x-3 p-3 bg-background rounded-button">
								<div class="w-2 h-2 bg-warning rounded-full mt-2"></div>
								<div>
									<p class="text-sm text-text-primary">Price alert</p>
									<p class="text-xs text-text-muted">ETH reached your target price</p>
								</div>
							</div>
						</div>
						<button class="w-full mt-3 text-sm text-primary-500 hover:text-primary-600 transition-colors">
							View all notifications
						</button>
					</div>
				{/if}
			</div>

			<!-- Profile -->
			<div class="relative">
				<button
					onclick={toggleProfile}
					class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center hover:bg-primary-200 transition-colors"
					aria-label="Profile menu"
				>
					<span class="text-primary-700 font-medium text-sm">A</span>
				</button>

				{#if showProfile}
					<div
						in:fade={{ duration: 200 }}
						out:fade={{ duration: 150 }}
						class="absolute right-0 top-full mt-2 w-64 bg-surface-elevated rounded-card shadow-lg border border-border p-4 z-50"
					>
						<div class="flex items-center space-x-3 mb-4">
							<div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
								<span class="text-primary-700 font-medium">A</span>
							</div>
							<div>
								<p class="font-medium text-text-primary">Anonymous Yakker</p>
								<p class="text-xs text-text-muted">Basic Member</p>
							</div>
						</div>
						
						<div class="space-y-2">
							<button class="w-full text-left px-3 py-2 rounded-button hover:bg-background transition-colors text-sm text-text-primary">
								Profile Settings
							</button>
							<button class="w-full text-left px-3 py-2 rounded-button hover:bg-background transition-colors text-sm text-text-primary">
								Security
							</button>
							<button class="w-full text-left px-3 py-2 rounded-button hover:bg-background transition-colors text-sm text-gray-400 cursor-not-allowed flex items-center justify-between">
								Watch Accounts
								<span class="text-xs bg-warning text-white px-2 py-1 rounded-full">PRO</span>
							</button>
							<hr class="border-border-light my-2" />
							<button class="w-full text-left px-3 py-2 rounded-button hover:bg-background transition-colors text-sm text-danger">
								Logout
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

<!-- Click outside to close dropdowns -->
<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('[data-dropdown]')) {
			showNotifications = false;
			showProfile = false;
		}
	}}
/>