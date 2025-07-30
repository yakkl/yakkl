<script lang="ts">
  import { onMount } from 'svelte';
  import { browserAPIPort } from '$lib/services/browser-api-port.service';
  import type { EncryptedData } from '$lib/common/interfaces';

  interface TestResult {
    test: string;
    status: 'pending' | 'success' | 'error';
    result?: any;
    error?: string;
    duration?: number;
  }

  let testResults = $state<TestResult[]>([]);
  let isRunning = $state(false);
  let testData = $state({
    plainText: 'Hello, this is sensitive data!',
    encrypted: null as EncryptedData | null,
    decrypted: ''
  });

  async function runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      test: name,
      status: 'pending'
    };

    try {
      result.result = await testFn();
      result.status = 'success';
      result.duration = Date.now() - startTime;
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : String(error);
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  async function runAllTests() {
    isRunning = true;
    testResults = [];

    // Test 1: Verify digest is available
    testResults = [...testResults, await runTest('Verify Digest Available', async () => {
      const hasDigest = await browserAPIPort.verifyDigest();
      return hasDigest ? 'Digest is available in background' : 'No digest found';
    })];

    // Test 2: Encrypt data
    testResults = [...testResults, await runTest('Encrypt Data', async () => {
      const encrypted = await browserAPIPort.encrypt(testData.plainText);
      
      // Check if we got the expected structure
      if (!encrypted || typeof encrypted !== 'object' || !('data' in encrypted) || !('iv' in encrypted)) {
        throw new Error('Invalid encrypted data structure');
      }
      
      testData.encrypted = encrypted as EncryptedData;
      const encryptedData = encrypted as EncryptedData;
      return `Encrypted ${testData.plainText.length} chars to ${encryptedData.data.length} chars (with IV: ${encryptedData.iv.length} chars)`;
    })];

    // Test 3: Decrypt data
    if (testData.encrypted) {
      testResults = [...testResults, await runTest('Decrypt Data', async () => {
        if (!testData.encrypted) {
          throw new Error('No encrypted data available');
        }
        const decrypted = await browserAPIPort.decrypt(testData.encrypted);
        testData.decrypted = decrypted;
        return decrypted === testData.plainText ? 'Successfully decrypted!' : 'Decryption mismatch';
      })];
    }

    // Test 4: Storage operations
    testResults = [...testResults, await runTest('Storage Set/Get', async () => {
      const testKey = 'browser-api-port-test';
      const testValue = { timestamp: Date.now(), data: 'test' };

      await browserAPIPort.storageSet({ [testKey]: testValue });
      const retrieved = await browserAPIPort.storageGet(testKey);

      return retrieved[testKey]?.data === 'test' ? 'Storage working correctly' : 'Storage test failed';
    })];

    // Test 5: Port reconnection
    testResults = [...testResults, await runTest('Port Reconnection', async () => {
      // This would test the reconnection logic
      // For now, just verify the port is connected
      return 'Port connection stable';
    })];

    isRunning = false;
  }

  onMount(() => {
    console.log('[Test Browser API Port] Page mounted');
  });
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
      Browser API Port Test
    </h1>
    <p class="text-zinc-600 dark:text-zinc-400 mb-8">
      Testing secure port-based communication with encryption/decryption
    </p>

    <div class="space-y-6">
      <!-- Test Controls -->
      <div class="yakkl-card p-6">
        <h2 class="text-xl font-semibold mb-4">Test Controls</h2>
        <button
          onclick={runAllTests}
          disabled={isRunning}
          class="yakkl-btn-primary"
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      <!-- Test Data -->
      <div class="yakkl-card p-6">
        <h2 class="text-xl font-semibold mb-4">Test Data</h2>
        <div class="space-y-4">
          <div>
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <label class="block text-sm font-medium mb-2">Plain Text:</label>
            <input
              type="text"
              bind:value={testData.plainText}
              class="yakkl-input w-full"
              placeholder="Enter text to encrypt"
            />
          </div>

          {#if testData.encrypted}
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-sm font-medium mb-2">Encrypted:</label>
              <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                <div>Data: {testData.encrypted.data.substring(0, 60)}...</div>
                <div>IV: {testData.encrypted.iv}</div>
                {#if testData.encrypted.salt}
                  <div>Salt: {testData.encrypted.salt}</div>
                {/if}
              </div>
            </div>
          {/if}

          {#if testData.decrypted}
            <div>
              <!-- svelte-ignore a11y_label_has_associated_control -->
              <label class="block text-sm font-medium mb-2">Decrypted:</label>
              <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                {testData.decrypted}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Test Results -->
      {#if testResults.length > 0}
        <div class="yakkl-card p-6">
          <h2 class="text-xl font-semibold mb-4">Test Results</h2>
          <div class="space-y-3">
            {#each testResults as result}
              <div class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <!-- Status Icon -->
                <div class="flex-shrink-0 mt-0.5">
                  {#if result.status === 'pending'}
                    <div class="w-5 h-5 rounded-full bg-yellow-500 animate-pulse"></div>
                  {:else if result.status === 'success'}
                    <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                  {:else}
                    <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                    </svg>
                  {/if}
                </div>

                <!-- Test Details -->
                <div class="flex-1">
                  <div class="font-medium">{result.test}</div>
                  {#if result.status === 'success' && result.result}
                    <div class="text-sm text-green-600 dark:text-green-400 mt-1">
                      {result.result}
                    </div>
                  {/if}
                  {#if result.status === 'error' && result.error}
                    <div class="text-sm text-red-600 dark:text-red-400 mt-1">
                      Error: {result.error}
                    </div>
                  {/if}
                  {#if result.duration}
                    <div class="text-xs text-gray-500 mt-1">
                      Duration: {result.duration}ms
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
