<script lang="ts">
	import { onMount } from 'svelte';
	import { getMigrationStatus, type Preview2Migration } from './migrate';
	import { uiStore } from './lib/stores/ui.store';
	import { get } from 'svelte/store';

	let { 
		onMigrate = async () => {}, 
		onDismiss = () => {}, 
		showBanner = $bindable(true) 
	}: {
		onMigrate?: () => Promise<void>;
		onDismiss?: () => void;
		showBanner?: boolean;
	} = $props();

	let migrationStatus = $state<{
		isNeeded: boolean;
		isCompleted: boolean;
		migrationDate?: string;
	}>({ isNeeded: false, isCompleted: false });
	
	let isLoading = $state(false);
	let showDetails = $state(false);

	onMount(async () => {
		try {
			migrationStatus = await getMigrationStatus();
		} catch (error) {
			console.warn('Failed to check migration status:', error);
		}
	});

	async function handleMigrate() {
		try {
			isLoading = true;
			await onMigrate();
			
			// Refresh status
			migrationStatus = await getMigrationStatus();
			
			// Show success notification
			uiStore.showSuccess(
				'Migration Complete!', 
				'Your wallet has been successfully upgraded to Preview 2.0'
			);
			
			// Auto-dismiss banner after migration
			setTimeout(() => {
				showBanner = false;
			}, 3000);
			
		} catch (error) {
			uiStore.showError(
				'Migration Failed', 
				error instanceof Error ? error.message : 'Please try again later'
			);
		} finally {
			isLoading = false;
		}
	}

	function handleDismiss() {
		showBanner = false;
		onDismiss();
	}
</script>

{#if showBanner && migrationStatus.isNeeded}
	<div class="yakkl-migration-banner bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 relative overflow-hidden">
		<!-- Background pattern -->
		<div class="absolute inset-0 opacity-10">
			<svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
				<defs>
					<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
						<path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.5"/>
					</pattern>
				</defs>
				<rect width="100" height="100" fill="url(#grid)" />
			</svg>
		</div>

		<div class="relative z-10">
			<div class="flex items-start justify-between gap-4">
				<!-- Content -->
				<div class="flex-1">
					<div class="flex items-center gap-3 mb-2">
						<!-- Upgrade icon -->
						<div class="flex-shrink-0">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						
						<div>
							<h3 class="text-lg font-semibold">Preview 2.0 Available!</h3>
							<p class="text-sm opacity-90">Experience the new wallet design with enhanced features</p>
						</div>
					</div>

					<!-- Feature highlights -->
					<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs opacity-80 mb-3">
						<div class="flex items-center gap-1">
							<span class="w-1 h-1 bg-white rounded-full"></span>
							Enhanced UI/UX
						</div>
						<div class="flex items-center gap-1">
							<span class="w-1 h-1 bg-white rounded-full"></span>
							Feature-based access
						</div>
						<div class="flex items-center gap-1">
							<span class="w-1 h-1 bg-white rounded-full"></span>
							Payment gateway
						</div>
					</div>

					<!-- Action buttons -->
					<div class="flex flex-wrap items-center gap-2">
						<button
							onclick={handleMigrate}
							disabled={isLoading}
							class="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{#if isLoading}
								<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Migrating...
							{:else}
								Migrate Now
							{/if}
						</button>

						<button
							onclick={() => showDetails = !showDetails}
							class="text-white/80 hover:text-white text-sm underline"
						>
							{showDetails ? 'Hide' : 'Learn More'}
						</button>
					</div>

					<!-- Details panel -->
					{#if showDetails}
						<div class="mt-3 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
							<h4 class="font-medium mb-2">What's new in Preview 2.0?</h4>
							<ul class="text-sm space-y-1 opacity-90">
								<li>• Modern, responsive design optimized for all screen sizes</li>
								<li>• Feature-based access control (Basic/Pro/Enterprise plans)</li>
								<li>• Integrated crypto payment gateway for merchants</li>
								<li>• Enhanced transaction management with real-time updates</li>
								<li>• AI assistant and advanced analytics (Pro features)</li>
								<li>• Improved security and backup/recovery options</li>
							</ul>
							
							<div class="mt-2 p-2 bg-white/5 rounded text-xs">
								<strong>Safe Migration:</strong> Your existing data will be preserved and converted to the new format. 
								A backup is automatically created before migration.
							</div>
						</div>
					{/if}
				</div>

				<!-- Dismiss button -->
				<button
					onclick={handleDismiss}
					class="flex-shrink-0 text-white/60 hover:text-white/80 transition-colors p-1"
					aria-label="Dismiss banner"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Animated elements -->
		<div class="absolute right-4 top-4 opacity-20">
			<svg class="w-24 h-24 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
				<path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" />
			</svg>
		</div>
	</div>
{:else if migrationStatus.isCompleted}
	<!-- Success state -->
	<div class="bg-green-500 text-white p-3 text-center">
		<div class="flex items-center justify-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
			</svg>
			<span class="font-medium">Migration completed successfully!</span>
			{#if migrationStatus.migrationDate}
				<span class="text-sm opacity-80">
					({new Date(migrationStatus.migrationDate).toLocaleDateString()})
				</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.yakkl-migration-banner {
		animation: slideInFromTop 0.5s ease-out;
	}

	@keyframes slideInFromTop {
		from {
			transform: translateY(-100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
</style>