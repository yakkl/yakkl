<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Settings state
	let userProfile = $state({
		name: 'Anonymous Yakker',
		email: '',
		avatar: '',
		plan: 'Basic Member'
	});

	let securitySettings = $state({
		autoLock: 15,
		biometric: false,
		twoFactor: false,
		sessionTimeout: 30
	});

	let preferenceSettings = $state({
		currency: 'USD',
		language: 'English',
		notifications: true,
		priceAlerts: true,
		theme: 'system'
	});

	let networkSettings = $state({
		defaultNetwork: 'ethereum',
		rpcEndpoints: {
			ethereum: 'https://eth-mainnet.alchemyapi.io/v2/...',
			polygon: 'https://polygon-mainnet.alchemyapi.io/v2/...',
			arbitrum: 'https://arb-mainnet.alchemyapi.io/v2/...'
		},
		gasSettings: 'auto'
	});

	// Expansion state for sections
	let expandedSections = $state({
		profile: false,
		security: false,
		preferences: false,
		network: false,
		advanced: false,
		pro: false
	});

	let isProUser = $state(false); // Mock - would come from actual user data

	function toggleSection(section: string) {
		expandedSections[section] = !expandedSections[section];
	}

	function saveSettings() {
		console.log('Saving settings:', {
			userProfile,
			securitySettings,
			preferenceSettings,
			networkSettings
		});
		// TODO: Implement actual settings save
		alert('Settings saved successfully!');
	}

	function exportData() {
		console.log('Exporting user data...');
		// TODO: Implement data export
	}

	function resetWallet() {
		if (confirm('Are you sure you want to reset your wallet? This action cannot be undone.')) {
			console.log('Resetting wallet...');
			// TODO: Implement wallet reset
		}
	}

	function upgradeToPro() {
		console.log('Upgrading to Pro...');
		goto('/preview/upgrade');
	}

	function goBack() {
		goto('/preview');
	}
</script>

<svelte:head>
	<title>Settings - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto">
		<!-- Header Section -->
		<div class="p-4">
			<div class="flex items-center space-x-4 mb-6">
				<BackButton onclick={goBack} />
				<div>
					<h1 class="text-xl font-semibold text-text-primary">Settings</h1>
					<p class="text-sm text-text-muted">Manage your wallet preferences</p>
				</div>
			</div>
		</div>

		<!-- Settings Sections -->
		<div class="px-4 space-y-4">

			<!-- Pro Upgrade Section (for Basic users) -->
			{#if !isProUser}
				<div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-card p-4 text-white">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="font-semibold mb-1">Upgrade to Pro</h3>
							<p class="text-sm text-primary-100">Unlock advanced features and analytics</p>
						</div>
						<button
							onclick={upgradeToPro}
							class="px-4 py-2 bg-white text-primary-600 font-medium rounded-button hover:bg-primary-50 transition-colors"
						>
							Upgrade
						</button>
					</div>
				</div>
			{/if}

			<!-- Profile Section -->
			<div class="bg-surface rounded-card border border-border">
				<button
					onclick={() => toggleSection('profile')}
					class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
							</svg>
						</div>
						<div class="text-left">
							<h3 class="font-medium text-text-primary">Profile</h3>
							<p class="text-sm text-text-muted">Personal information and account details</p>
						</div>
					</div>
					<svg class="w-5 h-5 text-text-muted transition-transform {expandedSections.profile ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if expandedSections.profile}
					<div class="px-4 pb-4 space-y-4" transition:slide={{ duration: 200 }}>
						<div class="space-y-2">
							<label class="block text-sm font-medium text-text-primary">Display Name</label>
							<input
								bind:value={userProfile.name}
								class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							/>
						</div>
						<div class="space-y-2">
							<label class="block text-sm font-medium text-text-primary">Email (Optional)</label>
							<input
								bind:value={userProfile.email}
								type="email"
								placeholder="your@email.com"
								class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							/>
						</div>
						<div class="flex items-center justify-between py-2">
							<span class="text-sm font-medium text-text-primary">Membership</span>
							<span class="px-3 py-1 text-xs font-medium bg-border text-text-muted rounded-full">
								{userProfile.plan}
							</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Security Section -->
			<div class="bg-surface rounded-card border border-border">
				<button
					onclick={() => toggleSection('security')}
					class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
							</svg>
						</div>
						<div class="text-left">
							<h3 class="font-medium text-text-primary">Security</h3>
							<p class="text-sm text-text-muted">Authentication and protection settings</p>
						</div>
					</div>
					<svg class="w-5 h-5 text-text-muted transition-transform {expandedSections.security ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if expandedSections.security}
					<div class="px-4 pb-4 space-y-4" transition:slide={{ duration: 200 }}>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Auto-lock timer</p>
								<p class="text-xs text-text-muted">Lock wallet after inactivity</p>
							</div>
							<select
								bind:value={securitySettings.autoLock}
								class="px-3 py-2 bg-background border border-border rounded-button text-text-primary text-sm focus:ring-2 focus:ring-primary-500"
							>
								<option value={5}>5 minutes</option>
								<option value={15}>15 minutes</option>
								<option value={30}>30 minutes</option>
								<option value={60}>1 hour</option>
							</select>
						</div>

						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Biometric Authentication</p>
								<p class="text-xs text-text-muted">Use fingerprint or face ID</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									bind:checked={securitySettings.biometric}
									type="checkbox"
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
							</label>
						</div>

						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
								<p class="text-xs text-text-muted">Extra security for transactions</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									bind:checked={securitySettings.twoFactor}
									type="checkbox"
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
							</label>
						</div>
					</div>
				{/if}
			</div>

			<!-- Preferences Section -->
			<div class="bg-surface rounded-card border border-border">
				<button
					onclick={() => toggleSection('preferences')}
					class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
						</div>
						<div class="text-left">
							<h3 class="font-medium text-text-primary">Preferences</h3>
							<p class="text-sm text-text-muted">Display and notification settings</p>
						</div>
					</div>
					<svg class="w-5 h-5 text-text-muted transition-transform {expandedSections.preferences ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if expandedSections.preferences}
					<div class="px-4 pb-4 space-y-4" transition:slide={{ duration: 200 }}>
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Currency</p>
								<p class="text-xs text-text-muted">Display currency for values</p>
							</div>
							<select
								bind:value={preferenceSettings.currency}
								class="px-3 py-2 bg-background border border-border rounded-button text-text-primary text-sm focus:ring-2 focus:ring-primary-500"
							>
								<option value="USD">USD ($)</option>
								<option value="EUR">EUR (€)</option>
								<option value="GBP">GBP (£)</option>
								<option value="JPY">JPY (¥)</option>
							</select>
						</div>

						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Theme</p>
								<p class="text-xs text-text-muted">Interface appearance</p>
							</div>
							<select
								bind:value={preferenceSettings.theme}
								class="px-3 py-2 bg-background border border-border rounded-button text-text-primary text-sm focus:ring-2 focus:ring-primary-500"
							>
								<option value="light">Light</option>
								<option value="dark">Dark</option>
								<option value="system">System</option>
							</select>
						</div>

						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Notifications</p>
								<p class="text-xs text-text-muted">Transaction and activity alerts</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									bind:checked={preferenceSettings.notifications}
									type="checkbox"
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
							</label>
						</div>

						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-text-primary">Price Alerts</p>
								<p class="text-xs text-text-muted">Notify when prices change significantly</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input
									bind:checked={preferenceSettings.priceAlerts}
									type="checkbox"
									class="sr-only peer"
								/>
								<div class="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
							</label>
						</div>
					</div>
				{/if}
			</div>

			<!-- Pro Features Section -->
			{#if isProUser}
				<div class="bg-surface rounded-card border border-border">
					<button
						onclick={() => toggleSection('pro')}
						class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
					>
						<div class="flex items-center space-x-3">
							<div class="w-10 h-10 bg-warning-100 rounded-full flex items-center justify-center">
								<svg class="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
								</svg>
							</div>
							<div class="text-left">
								<h3 class="font-medium text-text-primary flex items-center gap-2">
									Pro Features
									<span class="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full">PRO</span>
								</h3>
								<p class="text-sm text-text-muted">Advanced wallet features</p>
							</div>
						</div>
						<svg class="w-5 h-5 text-text-muted transition-transform {expandedSections.pro ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>

					{#if expandedSections.pro}
						<div class="px-4 pb-4 space-y-3" transition:slide={{ duration: 200 }}>
							<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors flex items-center justify-between">
								<span class="text-sm font-medium text-text-primary">Watch Accounts</span>
								<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
							<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors flex items-center justify-between">
								<span class="text-sm font-medium text-text-primary">Emergency Kit</span>
								<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
							<button class="w-full text-left p-3 rounded-button hover:bg-background transition-colors flex items-center justify-between">
								<span class="text-sm font-medium text-text-primary">Advanced Analytics</span>
								<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Advanced Section -->
			<div class="bg-surface rounded-card border border-border">
				<button
					onclick={() => toggleSection('advanced')}
					class="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
				>
					<div class="flex items-center space-x-3">
						<div class="w-10 h-10 bg-danger-100 rounded-full flex items-center justify-center">
							<svg class="w-5 h-5 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</div>
						<div class="text-left">
							<h3 class="font-medium text-text-primary">Advanced</h3>
							<p class="text-sm text-text-muted">Data management and dangerous actions</p>
						</div>
					</div>
					<svg class="w-5 h-5 text-text-muted transition-transform {expandedSections.advanced ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				{#if expandedSections.advanced}
					<div class="px-4 pb-4 space-y-3" transition:slide={{ duration: 200 }}>
						<button
							onclick={exportData}
							class="w-full text-left p-3 rounded-button hover:bg-background transition-colors flex items-center justify-between"
						>
							<div>
								<p class="text-sm font-medium text-text-primary">Export Data</p>
								<p class="text-xs text-text-muted">Download your transaction history</p>
							</div>
							<svg class="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</button>

						<button
							onclick={resetWallet}
							class="w-full text-left p-3 rounded-button hover:bg-danger-50 transition-colors flex items-center justify-between group"
						>
							<div>
								<p class="text-sm font-medium text-danger group-hover:text-danger-700">Reset Wallet</p>
								<p class="text-xs text-danger-600">Clear all data and start fresh</p>
							</div>
							<svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
							</svg>
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Save Button -->
		<div class="p-4">
			<button
				onclick={saveSettings}
				class="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-card transition-all"
			>
				Save Settings
			</button>
		</div>
	</main>
</div>