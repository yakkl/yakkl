<script lang="ts">
  import Copy from '$lib/components/Copy.svelte';
  import { Copy as CopyIcon, Check } from 'lucide-svelte';
  
  // Test data
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testPrivateKey = 'private-key-12345-67890-abcdef';
  
  // State for manual copy button
  let copiedManual = $state(false);
  
  function handleManualCopy() {
    navigator.clipboard.writeText(testAddress);
    copiedManual = true;
    setTimeout(() => {
      copiedManual = false;
    }, 2000);
  }
</script>

<div class="p-6 max-w-2xl mx-auto space-y-8">
  <h1 class="text-2xl font-bold mb-6">Copy Functionality Test</h1>
  
  <!-- Example 1: Using the Copy component -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">1. Using the Copy Component</h2>
    <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="font-mono text-sm">{testAddress}</div>
        <Copy 
          target={{ value: testAddress }}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          showFeedback={true}
        />
      </div>
    </div>
  </div>
  
  <!-- Example 2: Manual implementation with animation -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">2. Manual Implementation</h2>
    <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="font-mono text-sm">{testAddress}</div>
        <button
          onclick={handleManualCopy}
          class="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
          title={copiedManual ? "Copied!" : "Copy Address"}
        >
          {#if copiedManual}
            <Check class="w-5 h-5 text-green-500 animate-scale-in" />
          {:else}
            <CopyIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {/if}
        </button>
      </div>
    </div>
  </div>
  
  <!-- Example 3: With timeout for sensitive data -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">3. Copy with Auto-Clear (30 seconds)</h2>
    <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="font-mono text-sm">Sensitive data (auto-clears after 30s)</div>
        <Copy 
          target={{ 
            value: testPrivateKey, 
            timeout: 30000,
            redactText: "YAKKL_REDACTED_KEY"
          }}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
          showFeedback={true}
          feedbackDuration={3000}
        />
      </div>
    </div>
  </div>
  
  <!-- Example 4: Multiple values -->
  <div class="space-y-4">
    <h2 class="text-lg font-semibold">4. Copy Multiple Values</h2>
    <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
      <div class="space-y-2 mb-3">
        <div class="font-mono text-sm">Address: {testAddress}</div>
        <div class="font-mono text-sm">Chain ID: 1</div>
        <div class="font-mono text-sm">Network: Ethereum Mainnet</div>
      </div>
      <Copy 
        target={[
          { value: `Address: ${testAddress}` },
          { value: "Chain ID: 1" },
          { value: "Network: Ethereum Mainnet" }
        ]}
        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center gap-2"
        showFeedback={true}
      />
    </div>
  </div>
</div>

<style>
  @keyframes scale-in {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  :global(.animate-scale-in) {
    animation: scale-in 0.3s ease-out;
  }
</style>