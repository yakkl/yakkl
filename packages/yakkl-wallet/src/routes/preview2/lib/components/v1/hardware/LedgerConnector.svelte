<script lang="ts">
	import { pluginRegistry } from '$lib/plugins/registry/PluginRegistry';
	import type {
		HardwareDevice,
		HardwareAccount
	} from '$lib/plugins/hardware/common/HardwareWalletTypes';
	import {
		DeviceNotConnectedError,
		UserRejectedError,
		WrongAppError,
		HardwareWalletError
	} from '$lib/plugins/hardware/common/HardwareWalletTypes';
	import { UpgradeRequiredError } from '$lib/plugins/errors/UpgradeRequiredError';

	// Svelte 5.x event props
	interface Props {
		onconnected?: (event: { device: HardwareDevice; accounts: HardwareAccount[] }) => void;
		onerror?: (event: { error: Error }) => void;
	}

	let { onconnected, onerror }: Props = $props();

	let isConnecting = $state(false);
	let isDiscovering = $state(false);
	let errorMessage = $state('');
	let connectedDevice = $state<HardwareDevice | null>(null);
	let discoveredAccounts = $state<HardwareAccount[]>([]);
	let isSupported = $state(true);

	// Check browser support on component mount
	$effect(() => {
		checkSupport();
	});

	async function checkSupport() {
		try {
			isSupported = await pluginRegistry.hardwareWallet.isSupported();
		} catch (error) {
			isSupported = false;
		}
	}

	async function connectLedger() {
		if (!isSupported) return;

		isConnecting = true;
		errorMessage = '';

		try {
			// Connect to device
			const device = await pluginRegistry.hardwareWallet.connect();
			connectedDevice = device;

			// Discover accounts
			isDiscovering = true;
			const accounts = await pluginRegistry.hardwareWallet.discoverAccounts(device.id, {
				count: 3,
				showOnDevice: false
			});

			discoveredAccounts = accounts;

			onconnected?.({ device, accounts });
		} catch (error) {
			console.error('Ledger connection error:', error);

			if (error instanceof UserRejectedError) {
				errorMessage =
					'Connection cancelled. Please try again and approve the connection on your device.';
			} else if (error instanceof WrongAppError) {
				errorMessage = 'Please open the Ethereum app on your Ledger device and try again.';
			} else if (error instanceof HardwareWalletError && error.code === 'BROWSER_NOT_SUPPORTED') {
				errorMessage =
					'Your browser does not support hardware wallets. Please use Chrome, Edge, or another Chromium-based browser.';
			} else if (error instanceof HardwareWalletError && error.code === 'USER_CANCELLED') {
				errorMessage = 'Connection cancelled. Please try again.';
			} else if (error instanceof HardwareWalletError && error.code === 'ACCESS_DENIED') {
				errorMessage = 'Access denied to device. Please try again and grant permission.';
			} else if (error instanceof UpgradeRequiredError) {
				errorMessage = error.message;
			} else {
				errorMessage = `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
			}

			onerror?.({ error: error instanceof Error ? error : new Error(String(error)) });
		} finally {
			isConnecting = false;
			isDiscovering = false;
		}
	}

	async function disconnect() {
		if (connectedDevice) {
			try {
				await pluginRegistry.hardwareWallet.disconnect(connectedDevice.id);
				connectedDevice = null;
				discoveredAccounts = [];
				errorMessage = '';
			} catch (error) {
				console.error('Disconnect error:', error);
			}
		}
	}
</script>

<div class="ledger-connector">
	{#if !isSupported}
		<div class="alert alert-warning">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
				/>
			</svg>
			<span
				>Hardware wallets are not supported in this browser. Please use Chrome, Edge, or another
				Chromium-based browser.</span
			>
		</div>
	{:else if !connectedDevice}
		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title flex items-center gap-2">
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
						/>
					</svg>
					Connect Ledger Hardware Wallet
				</h3>

				<p class="text-base-content/70">
					Connect your Ledger device to securely manage your accounts and sign transactions.
				</p>

				<div class="alert alert-info mt-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="stroke-current shrink-0 w-6 h-6"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<div>
						<h4 class="font-bold">Before connecting:</h4>
						<ul class="list-disc list-inside mt-1">
							<li>Unlock your Ledger device</li>
							<li>Open the Ethereum app</li>
							<li>Ensure "Blind signing" is enabled in settings (for advanced features)</li>
						</ul>
					</div>
				</div>

				{#if errorMessage}
					<div class="alert alert-error mt-4">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="stroke-current shrink-0 h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{errorMessage}</span>
					</div>
				{/if}

				<div class="card-actions justify-end mt-6">
					<button
						class="btn btn-primary"
						class:loading={isConnecting}
						disabled={isConnecting || !isSupported}
						onclick={connectLedger}
					>
						{#if isConnecting}
							{isDiscovering ? 'Discovering Accounts...' : 'Connecting...'}
						{:else}
							Connect Ledger
						{/if}
					</button>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 shadow-lg">
			<div class="card-body">
				<h3 class="card-title flex items-center gap-2 text-success">
					<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
						/>
					</svg>
					{connectedDevice.model} Connected
				</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
					<div class="stat bg-base-200 rounded-lg">
						<div class="stat-title">Device</div>
						<div class="stat-value text-sm">{connectedDevice.model}</div>
						<div class="stat-desc">ID: {connectedDevice.id.slice(0, 8)}...</div>
					</div>

					<div class="stat bg-base-200 rounded-lg">
						<div class="stat-title">Accounts</div>
						<div class="stat-value text-sm">{discoveredAccounts.length}</div>
						<div class="stat-desc">Discovered accounts</div>
					</div>
				</div>

				{#if discoveredAccounts.length > 0}
					<div class="mt-6">
						<h4 class="font-semibold mb-3">Discovered Accounts:</h4>
						<div class="space-y-2">
							{#each discoveredAccounts as account, index}
								<div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
									<div>
										<div class="font-mono text-sm">{account.address}</div>
										<div class="text-xs text-base-content/70">
											Account {index + 1} • {account.derivationPath}
										</div>
									</div>
									<div class="badge badge-outline">Hardware</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<div class="card-actions justify-between mt-6">
					<button class="btn btn-ghost" onclick={disconnect}> Disconnect </button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.ledger-connector {
		max-width: 600px;
		margin: 0 auto;
	}
</style>
