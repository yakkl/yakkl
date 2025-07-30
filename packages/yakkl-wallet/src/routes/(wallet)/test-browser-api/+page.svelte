<script lang="ts">
	import { onMount } from 'svelte';
	import { browserAPI } from '$lib/services/browser-api.service';
	import { sessionToken, sessionExpiresAt } from '$lib/common/auth/session';
	import { get } from 'svelte/store';

	let testResults: Array<{
		test: string;
		status: 'pending' | 'success' | 'error';
		result?: any;
		error?: string;
		time?: number;
	}> = [];

	let isAuthenticated = false;
	let currentToken = '';

	onMount(async () => {
		// Add a small delay to ensure everything is initialized
		await new Promise(resolve => setTimeout(resolve, 100));
		
		// Log the browserAPI object itself
		console.log('[BrowserAPI Test] browserAPI object:', {
			browserAPI,
			type: typeof browserAPI,
			keys: Object.keys(browserAPI),
			methods: Object.getOwnPropertyNames(Object.getPrototypeOf(browserAPI)),
			hasStorageGet: typeof browserAPI.storageGet,
			hasStorageSet: typeof browserAPI.storageSet,
			serviceName: (browserAPI as any).serviceName
		});
		
		// Check authentication - be more lenient for testing
		try {
			currentToken = get(sessionToken) || '';
			const expiresAt = get(sessionExpiresAt);
			isAuthenticated = !!currentToken;
			
			console.log('[BrowserAPI Test] Auth check:', { 
				hasToken: !!currentToken, 
				tokenLength: currentToken?.length,
				sessionTokenStore: sessionToken,
				sessionExpiresAt: expiresAt
			});
		} catch (error) {
			console.error('[BrowserAPI Test] Error checking auth:', error);
		}
		
		// Always run tests for POC, but show auth status
		testResults = [{
			test: 'Authentication Status',
			status: 'success', // Always show as success since tests can run regardless
			result: isAuthenticated 
				? `Session token valid (expires: ${new Date(get(sessionExpiresAt) || 0).toLocaleTimeString()})` 
				: 'No session token (tests will still run)',
			error: undefined // No error since this is informational
		}];

		// Run all tests regardless of auth status
		await runAllTests();
	});

	async function runAllTests() {
		const tests = [
			testStorageAPI,
			testTabsAPI,
			testWindowsAPI,
			testRuntimeAPI,
			testNotificationsAPI,
			testIdleAPI
		];

		for (const test of tests) {
			await test();
		}
	}

	async function testStorageAPI() {
		const testKey = 'yakklTestKey';
		const testValue = { test: true, timestamp: Date.now() };
		
		// Test storage.set
		await runTest('Storage API - Set', async () => {
			console.log('[Test] About to call browserAPI.storageSet');
			await browserAPI.storageSet({ [testKey]: testValue });
			return 'Value set successfully';
		});

		// Test storage.get
		await runTest('Storage API - Get', async () => {
			console.log('[Test] About to call browserAPI.storageGet');
			const result = await browserAPI.storageGet(testKey);
			console.log('[Test] Storage get result:', result);
			return result;
		});

		// Test getStorageItem
		await runTest('Storage API - Get Single Item', async () => {
			console.log('[Test] About to call browserAPI.getStorageItem');
			const result = await browserAPI.getStorageItem(testKey);
			console.log('[Test] Storage get single item result:', result);
			return result;
		});

		// Test storage.remove
		await runTest('Storage API - Remove', async () => {
			console.log('[Test] About to call browserAPI.storageRemove');
			await browserAPI.storageRemove(testKey);
			return 'Value removed successfully';
		});

		// Verify removal
		await runTest('Storage API - Verify Removal', async () => {
			console.log('[Test] About to call browserAPI.storageGet for verification');
			const result = await browserAPI.storageGet(testKey);
			console.log('[Test] Verification result:', result);
			return result[testKey] === undefined ? 'Confirmed removed' : 'Still exists';
		});
	}

	async function testTabsAPI() {
		// Test tabs.query
		await runTest('Tabs API - Query Active Tab', async () => {
			const tabs = await browserAPI.tabsQuery({ active: true, currentWindow: true });
			return { count: tabs.length, firstTab: tabs[0] };
		});

		// Test tabs.getCurrent
		await runTest('Tabs API - Get Current Tab', async () => {
			const currentTab = await browserAPI.tabsGetCurrent();
			return currentTab;
		});
	}

	async function testWindowsAPI() {
		// Test windows.getCurrent
		await runTest('Windows API - Get Current Window', async () => {
			const currentWindow = await browserAPI.windowsGetCurrent();
			return currentWindow;
		});

		// Test windows.getAll
		await runTest('Windows API - Get All Windows', async () => {
			const allWindows = await browserAPI.windowsGetAll();
			return { count: allWindows.length, windows: allWindows };
		});

		// Test isPopupWindow
		await runTest('Windows API - Is Popup Window', async () => {
			const isPopup = await browserAPI.isPopupWindow();
			return { isPopup };
		});
	}

	async function testRuntimeAPI() {
		// Test runtime.getManifest
		await runTest('Runtime API - Get Manifest', async () => {
			const manifest = await browserAPI.runtimeGetManifest();
			return { name: manifest.name, version: manifest.version };
		});

		// Test runtime.getURL
		await runTest('Runtime API - Get URL', async () => {
			const url = await browserAPI.runtimeGetURL('/images/favicon.png');
			return url;
		});

		// Test runtime.getPlatformInfo
		await runTest('Runtime API - Get Platform Info', async () => {
			const platformInfo = await browserAPI.runtimeGetPlatformInfo();
			return platformInfo;
		});
	}

	async function testNotificationsAPI() {
		// Test notifications.create
		await runTest('Notifications API - Create', async () => {
			const notificationId = await browserAPI.notificationsCreate(
				'test-notification',
				{
					type: 'basic',
					iconUrl: '/images/favicon.png',
					title: 'Browser API Test',
					message: 'This is a test notification from the browser API proof of concept'
				}
			);
			return { notificationId };
		});
	}

	async function testIdleAPI() {
		// Test idle.queryState
		await runTest('Idle API - Query State', async () => {
			const idleState = await browserAPI.idleQueryState();
			return { state: idleState };
		});
	}


	async function runTest(testName: string, testFn: () => Promise<any>) {
		const testResult: {
			test: string;
			status: 'pending' | 'success' | 'error';
			result?: any;
			error?: string;
			time?: number;
		} = {
			test: testName,
			status: 'pending',
			result: undefined,
			error: undefined,
			time: 0
		};
		
		testResults = [...testResults, testResult];
		
		const startTime = Date.now();
		
		try {
			const result = await testFn();
			testResult.status = 'success';
			testResult.result = result;
			testResult.time = Date.now() - startTime;
		} catch (error) {
			testResult.status = 'error';
			testResult.error = error instanceof Error ? error.message : String(error);
			testResult.time = Date.now() - startTime;
		}
		
		// Update the specific test result
		testResults = testResults.map(tr => 
			tr.test === testName ? testResult : tr
		);
	}
</script>

<div class="p-6">
	<h1 class="text-2xl font-bold mb-6">Browser API Test Page</h1>
	
	<div class="alert alert-info mb-4">
		<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
		</svg>
		<span>Testing browser APIs through message passing to background context</span>
	</div>
	
	<div class="space-y-3">
		{#each testResults as result}
			<div class="card bg-base-200 shadow-md">
				<div class="card-body p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold">{result.test}</h3>
						<div class="flex items-center gap-2">
							{#if result.time}
								<span class="text-sm text-base-content/60">{result.time}ms</span>
							{/if}
							{#if result.status === 'pending'}
								<div class="loading loading-spinner loading-sm"></div>
							{:else if result.status === 'success'}
								<div class="badge badge-success">Success</div>
							{:else}
								<div class="badge badge-error">Error</div>
							{/if}
						</div>
					</div>
					
					{#if result.result !== undefined}
						<div class="mt-2">
							<pre class="text-xs bg-base-300 p-2 rounded overflow-x-auto">{JSON.stringify(result.result, null, 2)}</pre>
						</div>
					{/if}
					
					{#if result.error}
						<div class="mt-2">
							<div class="alert alert-error">
								<span class="text-sm">{result.error}</span>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
	
	{#if testResults.length > 0}
		<div class="mt-6">
			<h2 class="text-lg font-semibold mb-2">Summary</h2>
			<div class="stats shadow">
				<div class="stat">
					<div class="stat-title">Total Tests</div>
					<div class="stat-value">{testResults.length}</div>
				</div>
				<div class="stat">
					<div class="stat-title">Passed</div>
					<div class="stat-value text-success">
						{testResults.filter(r => r.status === 'success').length}
					</div>
				</div>
				<div class="stat">
					<div class="stat-title">Failed</div>
					<div class="stat-value text-error">
						{testResults.filter(r => r.status === 'error').length}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>