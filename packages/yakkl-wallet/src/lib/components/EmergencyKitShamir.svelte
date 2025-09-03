<script lang="ts">
  import { ShamirSecretManager, type ShamirResult, type ShamirShard } from '$lib/managers/ShamirSecretManager';
  import { notificationService } from '$lib/services/notification.service';
  import { log } from '$lib/common/logger-wrapper';
  import Modal from '@yakkl/ui/src/components/Modal.svelte';
  
  let { 
    show = $bindable(false),
    emergencyKitData,
    onComplete
  } = $props();
  
  // State
  let mode = $state<'create' | 'recover'>('create');
  let loading = $state(false);
  let step = $state<'config' | 'generate' | 'display' | 'recover'>('config');
  
  // Create mode state
  let totalShards = $state(5);
  let threshold = $state(3);
  let shamirResult = $state<ShamirResult | null>(null);
  let displayedShardIndex = $state(0);
  
  // Recovery mode state
  let recoveryShards = $state<string[]>([]);
  let recoveredData = $state<string | null>(null);
  
  // Computed
  let currentShard = $derived(
    shamirResult && displayedShardIndex < shamirResult.shards.length 
      ? shamirResult.shards[displayedShardIndex] 
      : null
  );
  
  async function generateShards() {
    if (!emergencyKitData) {
      await notificationService.show({
        message: 'No emergency kit data available',
        type: 'error'
      });
      return;
    }
    
    loading = true;
    try {
      // Convert emergency kit data to string
      const secretData = JSON.stringify(emergencyKitData);
      
      // Generate shards
      shamirResult = await ShamirSecretManager.createShards(
        secretData,
        totalShards,
        threshold
      );
      
      step = 'display';
      
      await notificationService.show({
        message: `Successfully created ${totalShards} shards. You need ${threshold} to recover.`,
        type: 'success'
      });
    } catch (error) {
      log.error('Failed to create Shamir shards:', false, error);
      
      // Check if it's because the real implementation isn't available
      if (error.message.includes('not available in the public build')) {
        await notificationService.show({
          message: 'Shamir\'s Secret Sharing requires the security package. Please ensure yakkl-security is properly installed.',
          type: 'error'
        });
      } else {
        await notificationService.show({
          message: 'Failed to create shards. Please try again.',
          type: 'error'
        });
      }
    } finally {
      loading = false;
    }
  }
  
  async function recoverFromShards() {
    if (recoveryShards.filter(s => s.trim()).length < threshold) {
      await notificationService.show({
        message: `You need at least ${threshold} shards to recover`,
        type: 'error'
      });
      return;
    }
    
    loading = true;
    try {
      // Parse shards from input
      const shardObjects: ShamirShard[] = recoveryShards
        .filter(s => s.trim())
        .map((shardData, index) => {
          try {
            return JSON.parse(shardData);
          } catch {
            throw new Error(`Invalid shard format at position ${index + 1}`);
          }
        });
      
      // Recover the secret
      const recovered = await ShamirSecretManager.reconstructSecret(
        shardObjects,
        { totalShards, threshold, metadata: { version: '1.0.0', created: new Date() } }
      );
      
      recoveredData = recovered;
      
      // Parse and validate recovered data
      const parsedData = JSON.parse(recovered);
      
      await notificationService.show({
        message: 'Successfully recovered emergency kit data!',
        type: 'success'
      });
      
      if (onComplete) {
        onComplete(parsedData);
      }
    } catch (error) {
      log.error('Failed to recover from shards:', false, error);
      await notificationService.show({
        message: error.message || 'Failed to recover data from shards',
        type: 'error'
      });
    } finally {
      loading = false;
    }
  }
  
  function printCurrentShard() {
    if (!currentShard || !shamirResult) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const instructions = ShamirSecretManager.getDistributionInstructions(shamirResult.config);
    const formattedShard = ShamirSecretManager.formatShardForDisplay(currentShard, displayedShardIndex);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>YAKKL Emergency Kit - Shard ${displayedShardIndex + 1}</title>
        <style>
          body { 
            font-family: monospace; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          .warning {
            background: #fff3cd;
            border: 2px solid #ff0000;
            padding: 20px;
            margin: 20px 0;
            font-weight: bold;
          }
          .shard-box {
            border: 3px solid #000;
            padding: 30px;
            margin: 30px 0;
            background: #f8f9fa;
            word-break: break-all;
          }
          .shard-data {
            font-size: 12px;
            line-height: 1.5;
          }
          .instructions {
            white-space: pre-wrap;
            font-size: 12px;
            line-height: 1.8;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>YAKKL Emergency Kit Recovery Shard</h1>
          <h2>Shard ${displayedShardIndex + 1} of ${totalShards}</h2>
          <p>Minimum ${threshold} shards required for recovery</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="warning">
          ⚠️ CRITICAL: This is 1 of ${totalShards} shards needed to recover your wallet.
          Store this in a secure location separate from other shards.
          NEVER photograph or digitally store this document.
        </div>
        
        <div class="shard-box">
          <h3>Shard Data (Keep this exact format):</h3>
          <div class="shard-data">
            ${JSON.stringify(currentShard, null, 2)}
          </div>
        </div>
        
        <div class="instructions">
          ${instructions}
        </div>
        
        <scr${''}ipt>
          window.print();
        </scr${''}ipt>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }
  
  function downloadAllShards() {
    if (!shamirResult) return;
    
    const shardsData = {
      version: '1.0.0',
      created: new Date().toISOString(),
      config: shamirResult.config,
      instructions: ShamirSecretManager.getDistributionInstructions(shamirResult.config),
      warning: 'NEVER store this file digitally. Print and delete immediately.',
      shards: shamirResult.shards.map((shard, index) => ({
        index: index + 1,
        data: shard,
        formatted: ShamirSecretManager.formatShardForDisplay(shard, index)
      }))
    };
    
    const blob = new Blob([JSON.stringify(shardsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yakkl-emergency-shards-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function reset() {
    mode = 'create';
    step = 'config';
    shamirResult = null;
    displayedShardIndex = 0;
    recoveryShards = [];
    recoveredData = null;
  }
</script>

<Modal bind:show title="Shamir's Secret Sharing" className="max-w-3xl">
  <div class="p-6">
    {#if step === 'config'}
      <!-- Mode Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4">Choose Mode</h3>
        <div class="grid grid-cols-2 gap-4">
          <button
            onclick={() => mode = 'create'}
            class="p-4 border-2 rounded-lg transition-all {mode === 'create' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-300 dark:border-zinc-600'}"
          >
            <h4 class="font-medium mb-1">Create Shards</h4>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              Split your emergency kit into secure shards
            </p>
          </button>
          
          <button
            onclick={() => { mode = 'recover'; step = 'recover'; }}
            class="p-4 border-2 rounded-lg transition-all {mode === 'recover' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-zinc-300 dark:border-zinc-600'}"
          >
            <h4 class="font-medium mb-1">Recover from Shards</h4>
            <p class="text-sm text-zinc-600 dark:text-zinc-400">
              Reconstruct kit from existing shards
            </p>
          </button>
        </div>
      </div>
      
      {#if mode === 'create'}
        <!-- Configuration -->
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">Configure Sharding</h3>
          
          <div>
            <label for="total-shards-input" class="block text-sm font-medium mb-2">
              Total Shards to Create
            </label>
            <input
              id="total-shards-input"
              type="number"
              bind:value={totalShards}
              min="3"
              max="10"
              class="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800"
            />
            <p class="text-xs text-zinc-500 mt-1">
              Recommended: 5 shards for good distribution
            </p>
          </div>
          
          <div>
            <label for="threshold-input" class="block text-sm font-medium mb-2">
              Shards Required to Recover
            </label>
            <input
              id="threshold-input"
              type="number"
              bind:value={threshold}
              min="2"
              max={totalShards - 1}
              class="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800"
            />
            <p class="text-xs text-zinc-500 mt-1">
              Recommended: 3 shards (you can lose up to {totalShards - threshold} shards)
            </p>
          </div>
          
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-4">
            <h4 class="font-medium text-amber-800 dark:text-amber-200 mb-2">
              Important Security Notes:
            </h4>
            <ul class="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Each shard must be stored in a different secure location</li>
              <li>• Never store shards digitally or photograph them</li>
              <li>• Give shards to different trusted people or locations</li>
              <li>• Loss of {totalShards - threshold + 1} or more shards = permanent loss</li>
            </ul>
          </div>
          
          <button
            onclick={() => step = 'generate'}
            class="yakkl-btn-primary w-full"
          >
            Continue to Generate Shards
          </button>
        </div>
      {/if}
      
    {:else if step === 'generate'}
      <!-- Generation Confirmation -->
      <div class="text-center space-y-6">
        <div class="mx-auto w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
          <svg class="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        
        <div>
          <h3 class="text-xl font-semibold mb-2">Ready to Create Shards</h3>
          <p class="text-zinc-600 dark:text-zinc-400">
            This will split your emergency kit into {totalShards} shards.
            You'll need any {threshold} shards to recover your wallet.
          </p>
        </div>
        
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4">
          <p class="text-sm text-red-700 dark:text-red-300">
            <strong>Warning:</strong> Once created, you must securely store each shard separately.
            The original emergency kit data will not be accessible without the shards.
          </p>
        </div>
        
        <div class="flex gap-3">
          <button
            onclick={() => step = 'config'}
            class="yakkl-btn-secondary flex-1"
          >
            Back
          </button>
          <button
            onclick={generateShards}
            class="yakkl-btn-primary flex-1"
            disabled={loading}
          >
            {#if loading}
              <span class="loading loading-spinner loading-sm"></span>
              Generating...
            {:else}
              Generate Shards
            {/if}
          </button>
        </div>
      </div>
      
    {:else if step === 'display' && shamirResult}
      <!-- Display Shards -->
      <div class="space-y-6">
        <div class="text-center">
          <h3 class="text-xl font-semibold mb-2">Shard {displayedShardIndex + 1} of {totalShards}</h3>
          <p class="text-zinc-600 dark:text-zinc-400">
            Store each shard in a different secure location
          </p>
        </div>
        
        {#if currentShard}
          <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-6 font-mono text-xs break-all">
            {JSON.stringify(currentShard, null, 2)}
          </div>
        {/if}
        
        <div class="flex justify-between items-center">
          <button
            onclick={() => displayedShardIndex = Math.max(0, displayedShardIndex - 1)}
            class="yakkl-btn-secondary"
            disabled={displayedShardIndex === 0}
          >
            Previous
          </button>
          
          <span class="text-sm text-zinc-600 dark:text-zinc-400">
            Shard {displayedShardIndex + 1} / {totalShards}
          </span>
          
          <button
            onclick={() => displayedShardIndex = Math.min(totalShards - 1, displayedShardIndex + 1)}
            class="yakkl-btn-secondary"
            disabled={displayedShardIndex === totalShards - 1}
          >
            Next
          </button>
        </div>
        
        <div class="flex flex-wrap gap-3">
          <button
            onclick={printCurrentShard}
            class="yakkl-btn-secondary flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print This Shard
          </button>
          
          <button
            onclick={downloadAllShards}
            class="yakkl-btn-secondary flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All (PRINT & DELETE!)
          </button>
        </div>
        
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4">
          <h4 class="font-medium text-green-800 dark:text-green-200 mb-2">✓ Success!</h4>
          <p class="text-sm text-green-700 dark:text-green-300">
            Your emergency kit has been split into {totalShards} shards. 
            Remember: You need any {threshold} shards to recover your wallet.
            Store each shard in a different secure location.
          </p>
        </div>
        
        <button
          onclick={() => { show = false; reset(); }}
          class="yakkl-btn-primary w-full"
        >
          Done
        </button>
      </div>
      
    {:else if step === 'recover'}
      <!-- Recovery Mode -->
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-2">Enter Your Shards</h3>
          <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Paste at least {threshold} shards to recover your emergency kit
          </p>
        </div>
        
        {#each Array(threshold) as _, index}
          <div>
            <label for="shard-input-{index}" class="block text-sm font-medium mb-2">
              Shard {index + 1}
            </label>
            <textarea
              id="shard-input-{index}"
              bind:value={recoveryShards[index]}
              placeholder="Paste shard JSON data here..."
              class="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 font-mono text-xs"
              rows="4"
            ></textarea>
          </div>
        {/each}
        
        <button
          onclick={recoverFromShards}
          class="yakkl-btn-primary w-full"
          disabled={loading || recoveryShards.filter(s => s.trim()).length < threshold}
        >
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
            Recovering...
          {:else}
            Recover Emergency Kit
          {/if}
        </button>
        
        {#if recoveredData}
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4">
            <h4 class="font-medium text-green-800 dark:text-green-200 mb-2">
              ✓ Recovery Successful!
            </h4>
            <p class="text-sm text-green-700 dark:text-green-300">
              Your emergency kit has been successfully recovered from the shards.
            </p>
          </div>
        {/if}
        
        <button
          onclick={reset}
          class="yakkl-btn-secondary w-full"
        >
          Back
        </button>
      </div>
    {/if}
  </div>
</Modal>