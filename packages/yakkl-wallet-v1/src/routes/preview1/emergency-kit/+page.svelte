<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, fly, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import Header from '../components/Header.svelte';
	import BackButton from '../components/BackButton.svelte';

	// Emergency kit state
	let activeTab = $state('export');
	let exportOptions = $state({
		includePrivateKeys: true,
		includeTransactionHistory: true,
		includeContacts: true,
		includeSettings: true,
		password: '',
		confirmPassword: ''
	});

	let importData = $state({
		file: null as File | null,
		password: '',
		preview: null as any
	});

	let showPasswordModal = $state(false);
	let isExporting = $state(false);
	let isImporting = $state(false);

	// Mock kit data for export preview
	let exportPreview = $state({
		accounts: 3,
		privateKeys: 3,
		transactions: 247,
		contacts: 8,
		settings: 'All preferences'
	});

	function switchTab(tab: string) {
		activeTab = tab;
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		
		if (file) {
			importData.file = file;
			// Mock preview data
			importData.preview = {
				accounts: 2,
				transactions: 156,
				contacts: 5,
				createdAt: new Date('2024-01-10'),
				version: '1.0.0'
			};
		}
	}

	async function exportEmergencyKit() {
		if (!exportOptions.password || exportOptions.password !== exportOptions.confirmPassword) {
			alert('Please enter matching passwords');
			return;
		}

		isExporting = true;
		
		try {
			// Mock export process
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Create mock download
			const kitData = {
				version: '1.0.0',
				createdAt: new Date().toISOString(),
				accounts: exportOptions.includePrivateKeys ? ['account1', 'account2', 'account3'] : [],
				transactions: exportOptions.includeTransactionHistory ? 'encrypted_data' : null,
				contacts: exportOptions.includeContacts ? 'encrypted_contacts' : null,
				settings: exportOptions.includeSettings ? 'encrypted_settings' : null
			};

			const dataStr = JSON.stringify(kitData, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);
			
			const link = document.createElement('a');
			link.href = url;
			link.download = `yakkl-emergency-kit-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			alert('Emergency Kit exported successfully!');
		} catch (error) {
			console.error('Export failed:', error);
			alert('Export failed. Please try again.');
		} finally {
			isExporting = false;
			showPasswordModal = false;
		}
	}

	async function importEmergencyKit() {
		if (!importData.file || !importData.password) {
			alert('Please select a file and enter password');
			return;
		}

		isImporting = true;

		try {
			// Mock import process
			await new Promise(resolve => setTimeout(resolve, 2000));

			// TODO: Implement actual import logic
			console.log('Importing emergency kit:', {
				file: importData.file.name,
				password: importData.password
			});

			alert('Emergency Kit imported successfully!');
			
			// Reset form
			importData = {
				file: null,
				password: '',
				preview: null
			};
			
		} catch (error) {
			console.error('Import failed:', error);
			alert('Import failed. Please check your file and password.');
		} finally {
			isImporting = false;
		}
	}

	function goBack() {
		goto('/new-wallet/settings');
	}
</script>

<svelte:head>
	<title>Emergency Kit - YAKKL Smart Wallet</title>
</svelte:head>

<div class="flex flex-col h-screen bg-background">
	<Header />
	
	<main class="flex-1 overflow-auto">
		<!-- Header Section -->
		<div class="p-4">
			<div class="flex items-center space-x-4 mb-6">
				<BackButton onclick={goBack} />
				<div>
					<h1 class="text-xl font-semibold text-text-primary flex items-center gap-2">
						Emergency Kit
						<span class="px-2 py-1 text-xs font-medium bg-warning-100 text-warning-800 rounded-full">PRO</span>
					</h1>
					<p class="text-sm text-text-muted">Backup and restore your complete wallet</p>
				</div>
			</div>

			<!-- Warning Banner -->
			<div class="bg-danger-50 border border-danger-200 rounded-card p-4 mb-6">
				<div class="flex items-start space-x-3">
					<svg class="w-5 h-5 text-danger-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
					</svg>
					<div class="space-y-2">
						<p class="text-sm font-medium text-danger-800">Critical Security Warning</p>
						<ul class="text-xs text-danger-700 space-y-1">
							<li>• Emergency kits contain highly sensitive data including private keys</li>
							<li>• Store backups in secure, offline locations only</li>
							<li>• Never share emergency kits or upload to cloud services</li>
							<li>• Use strong, unique passwords for encryption</li>
						</ul>
					</div>
				</div>
			</div>

			<!-- Tab Navigation -->
			<div class="flex bg-surface rounded-card p-1 border border-border mb-6">
				<button
					onclick={() => switchTab('export')}
					class="flex-1 flex items-center justify-center space-x-2 py-3 rounded transition-all {activeTab === 'export' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-text-primary hover:bg-background'}"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					<span class="font-medium">Export</span>
				</button>
				<button
					onclick={() => switchTab('import')}
					class="flex-1 flex items-center justify-center space-x-2 py-3 rounded transition-all {activeTab === 'import' ? 'bg-primary-500 text-white' : 'text-text-secondary hover:text-text-primary hover:bg-background'}"
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
					</svg>
					<span class="font-medium">Import</span>
				</button>
			</div>
		</div>

		<!-- Tab Content -->
		<div class="px-4 space-y-6">
			{#if activeTab === 'export'}
				<!-- Export Tab -->
				<div in:fade={{ duration: 200 }}>
					<!-- What to Include -->
					<div class="bg-surface rounded-card p-4 border border-border mb-6">
						<h3 class="font-medium text-text-primary mb-4">What to Include</h3>
						<div class="space-y-3">
							<label class="flex items-center space-x-3 cursor-pointer">
								<input
									bind:checked={exportOptions.includePrivateKeys}
									type="checkbox"
									class="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
								/>
								<div>
									<p class="text-sm font-medium text-text-primary">Private Keys & Seeds</p>
									<p class="text-xs text-text-muted">Required for full wallet recovery</p>
								</div>
							</label>

							<label class="flex items-center space-x-3 cursor-pointer">
								<input
									bind:checked={exportOptions.includeTransactionHistory}
									type="checkbox"
									class="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
								/>
								<div>
									<p class="text-sm font-medium text-text-primary">Transaction History</p>
									<p class="text-xs text-text-muted">All past transactions and metadata</p>
								</div>
							</label>

							<label class="flex items-center space-x-3 cursor-pointer">
								<input
									bind:checked={exportOptions.includeContacts}
									type="checkbox"
									class="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
								/>
								<div>
									<p class="text-sm font-medium text-text-primary">Address Book</p>
									<p class="text-xs text-text-muted">Saved contacts and labels</p>
								</div>
							</label>

							<label class="flex items-center space-x-3 cursor-pointer">
								<input
									bind:checked={exportOptions.includeSettings}
									type="checkbox"
									class="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
								/>
								<div>
									<p class="text-sm font-medium text-text-primary">Settings & Preferences</p>
									<p class="text-xs text-text-muted">Theme, currency, and all preferences</p>
								</div>
							</label>
						</div>
					</div>

					<!-- Export Preview -->
					<div class="bg-surface rounded-card p-4 border border-border mb-6">
						<h3 class="font-medium text-text-primary mb-4">Export Preview</h3>
						<div class="space-y-2 text-sm">
							<div class="flex justify-between">
								<span class="text-text-secondary">Accounts:</span>
								<span class="text-text-primary">{exportPreview.accounts} accounts</span>
							</div>
							{#if exportOptions.includePrivateKeys}
								<div class="flex justify-between">
									<span class="text-text-secondary">Private Keys:</span>
									<span class="text-text-primary">{exportPreview.privateKeys} keys</span>
								</div>
							{/if}
							{#if exportOptions.includeTransactionHistory}
								<div class="flex justify-between">
									<span class="text-text-secondary">Transactions:</span>
									<span class="text-text-primary">{exportPreview.transactions} records</span>
								</div>
							{/if}
							{#if exportOptions.includeContacts}
								<div class="flex justify-between">
									<span class="text-text-secondary">Contacts:</span>
									<span class="text-text-primary">{exportPreview.contacts} contacts</span>
								</div>
							{/if}
							{#if exportOptions.includeSettings}
								<div class="flex justify-between">
									<span class="text-text-secondary">Settings:</span>
									<span class="text-text-primary">{exportPreview.settings}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Export Button -->
					<button
						onclick={() => showPasswordModal = true}
						disabled={!exportOptions.includePrivateKeys && !exportOptions.includeTransactionHistory && !exportOptions.includeContacts && !exportOptions.includeSettings}
						class="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-card transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
						</svg>
						<span>Create Emergency Kit</span>
					</button>
				</div>
			{:else}
				<!-- Import Tab -->
				<div in:fade={{ duration: 200 }}>
					<!-- File Upload -->
					<div class="bg-surface rounded-card p-4 border border-border mb-6">
						<h3 class="font-medium text-text-primary mb-4">Select Emergency Kit File</h3>
						
						<div class="border-2 border-dashed border-border rounded-card p-6 text-center mb-4">
							<input
								type="file"
								accept=".json"
								onchange={handleFileSelect}
								class="hidden"
								id="emergency-kit-file"
							/>
							<label for="emergency-kit-file" class="cursor-pointer">
								<svg class="w-12 h-12 text-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
								</svg>
								<p class="text-text-primary font-medium mb-1">
									{importData.file ? importData.file.name : 'Choose Emergency Kit File'}
								</p>
								<p class="text-sm text-text-muted">
									{importData.file ? 'Click to change file' : 'Select a .json emergency kit file'}
								</p>
							</label>
						</div>

						{#if importData.file}
							<div class="bg-success-50 border border-success-200 rounded-card p-3">
								<div class="flex items-center space-x-2">
									<svg class="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<span class="text-sm font-medium text-success-800">File loaded successfully</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Import Preview -->
					{#if importData.preview}
						<div class="bg-surface rounded-card p-4 border border-border mb-6" in:slide={{ duration: 200 }}>
							<h3 class="font-medium text-text-primary mb-4">Import Preview</h3>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-text-secondary">Kit Version:</span>
									<span class="text-text-primary">{importData.preview.version}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-text-secondary">Created:</span>
									<span class="text-text-primary">{importData.preview.createdAt.toLocaleDateString()}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-text-secondary">Accounts:</span>
									<span class="text-text-primary">{importData.preview.accounts} accounts</span>
								</div>
								<div class="flex justify-between">
									<span class="text-text-secondary">Transactions:</span>
									<span class="text-text-primary">{importData.preview.transactions} records</span>
								</div>
								<div class="flex justify-between">
									<span class="text-text-secondary">Contacts:</span>
									<span class="text-text-primary">{importData.preview.contacts} contacts</span>
								</div>
							</div>
						</div>
					{/if}

					<!-- Password Input -->
					{#if importData.file}
						<div class="bg-surface rounded-card p-4 border border-border mb-6" in:slide={{ duration: 200 }}>
							<h3 class="font-medium text-text-primary mb-4">Decryption Password</h3>
							<input
								bind:value={importData.password}
								type="password"
								placeholder="Enter the password used to encrypt this kit"
								class="w-full px-3 py-3 bg-background border border-border rounded-card text-text-primary placeholder-text-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
							/>
						</div>
					{/if}

					<!-- Import Button -->
					<button
						onclick={importEmergencyKit}
						disabled={!importData.file || !importData.password || isImporting}
						class="w-full py-4 bg-success-500 hover:bg-success-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-card transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
					>
						{#if isImporting}
							<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
							</svg>
							<span>Importing...</span>
						{:else}
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
							</svg>
							<span>Import Emergency Kit</span>
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<!-- Bottom Spacing -->
		<div class="h-6"></div>
	</main>
</div>

<!-- Password Modal for Export -->
{#if showPasswordModal}
	<div 
		class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
		onclick={() => showPasswordModal = false}
		in:fade={{ duration: 200 }}
		out:fade={{ duration: 150 }}
	>
		<div 
			class="bg-surface-elevated rounded-card p-6 w-full max-w-md"
			onclick={(e) => e.stopPropagation()}
			in:fly={{ y: 50, duration: 200 }}
			out:fly={{ y: 50, duration: 150 }}
		>
			<h3 class="text-lg font-semibold text-text-primary mb-4">Encrypt Emergency Kit</h3>
			
			<div class="space-y-4">
				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Encryption Password</label>
					<input
						bind:value={exportOptions.password}
						type="password"
						placeholder="Enter a strong password"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>

				<div class="space-y-2">
					<label class="block text-sm font-medium text-text-primary">Confirm Password</label>
					<input
						bind:value={exportOptions.confirmPassword}
						type="password"
						placeholder="Confirm your password"
						class="w-full px-3 py-2 bg-background border border-border rounded-button text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
					/>
				</div>

				<div class="bg-warning-50 border border-warning-200 rounded-card p-3">
					<div class="flex items-start space-x-2">
						<svg class="w-4 h-4 text-warning-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
						<p class="text-xs text-warning-700">
							<strong>Important:</strong> Store this password safely. Without it, your emergency kit cannot be restored.
						</p>
					</div>
				</div>
			</div>

			<div class="flex space-x-3 mt-6">
				<button
					onclick={() => showPasswordModal = false}
					class="flex-1 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={exportEmergencyKit}
					disabled={!exportOptions.password || exportOptions.password !== exportOptions.confirmPassword || isExporting}
					class="flex-1 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-border disabled:text-text-muted text-white font-medium rounded-button transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
				>
					{#if isExporting}
						<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						<span>Exporting...</span>
					{:else}
						<span>Export Kit</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}