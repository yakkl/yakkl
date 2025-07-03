<script lang="ts">
  import { canUseFeature } from '../lib/stores/plan.store';
  import { currentPlan, isOnTrial } from '../lib/stores/plan.store';
  import Upgrade from '../lib/components/Upgrade.svelte';
  
  let showUpgradeModal = $state(false);
  let plan = $derived($currentPlan);
  let trial = $derived($isOnTrial);
</script>

<div class="p-4 space-y-6">
  <div>
    <h1 class="text-xl font-bold mb-2">Settings</h1>
    <p class="text-gray-400 text-sm">Wallet configuration and security settings.</p>
  </div>

  <!-- Basic Settings -->
  <div class="yakkl-card p-4">
    <h2 class="text-lg font-semibold mb-3">General</h2>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <label for="dark-mode-toggle" class="text-sm font-medium">Dark Mode</label>
          <p class="text-xs text-gray-500">Toggle dark theme</p>
        </div>
        <button id="dark-mode-toggle" class="yakkl-btn-secondary text-sm" aria-label="Toggle dark mode">Toggle</button>
      </div>
      
      <div class="flex items-center justify-between">
        <div>
          <label for="testnet-toggle" class="text-sm font-medium">Show Testnet Networks</label>
          <p class="text-xs text-gray-500">Display test networks in chain selector</p>
        </div>
        <button id="testnet-toggle" class="yakkl-btn-secondary text-sm" aria-label="Toggle testnet networks">Toggle</button>
      </div>
    </div>
  </div>

  <!-- Security Settings -->
  <div class="yakkl-card p-4">
    <h2 class="text-lg font-semibold mb-3">Security</h2>
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div>
          <label for="auto-lock-select" class="text-sm font-medium">Auto-lock Timer</label>
          <p class="text-xs text-gray-500">Automatically lock wallet after inactivity</p>
        </div>
        <select id="auto-lock-select" class="yakkl-select text-sm" aria-label="Auto-lock timer">
          <option>5 minutes</option>
          <option>15 minutes</option>
          <option>30 minutes</option>
          <option>Never</option>
        </select>
      </div>
      
      <div class="flex items-center justify-between">
        <div>
          <label for="export-keys-btn" class="text-sm font-medium">Export Private Keys</label>
          <p class="text-xs text-gray-500">Backup your wallet keys</p>
        </div>
        <button id="export-keys-btn" class="yakkl-btn-secondary text-sm" aria-label="Export private keys">Export</button>
      </div>
    </div>
  </div>

  <!-- Pro Features -->
  <div class="yakkl-card p-4 {canUseFeature('advanced_security') ? '' : 'border-2 border-dashed border-gray-300 dark:border-gray-600'}">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        Advanced Security
        {#if !canUseFeature('advanced_security')}
          <span class="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-full">Pro</span>
        {/if}
      </h2>
      {#if !canUseFeature('advanced_security')}
        <button 
          onclick={() => showUpgradeModal = true}
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          Upgrade
        </button>
      {/if}
    </div>
    
    {#if canUseFeature('advanced_security')}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <label for="hw-wallet-btn" class="text-sm font-medium">Hardware Wallet Integration</label>
            <p class="text-xs text-gray-500">Connect Ledger or Trezor devices</p>
          </div>
          <button id="hw-wallet-btn" class="yakkl-btn-secondary text-sm" aria-label="Configure hardware wallet">Configure</button>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <label for="multi-sig-btn" class="text-sm font-medium">Multi-Signature</label>
            <p class="text-xs text-gray-500">Require multiple signatures for transactions</p>
          </div>
          <button id="multi-sig-btn" class="yakkl-btn-secondary text-sm" aria-label="Setup multi-signature">Setup</button>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <label for="tx-policies-btn" class="text-sm font-medium">Transaction Signing Policies</label>
            <p class="text-xs text-gray-500">Set custom rules for transaction approval</p>
          </div>
          <button id="tx-policies-btn" class="yakkl-btn-secondary text-sm" aria-label="Configure transaction signing policies">Configure</button>
        </div>
      </div>
    {:else}
      <div class="text-center py-6 text-gray-500 dark:text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p class="text-sm">Advanced security features including hardware wallet integration and multi-signature support.</p>
      </div>
    {/if}
  </div>

  <!-- Private Features -->
  <div class="yakkl-card p-4 {canUseFeature('private_key_backup') ? '' : 'border-2 border-dashed border-orange-300 dark:border-orange-600'}">
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold flex items-center gap-2">
        Private Security
        {#if !canUseFeature('private_key_backup')}
          <span class="text-xs bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full">Private</span>
        {/if}
      </h2>
      {#if !canUseFeature('private_key_backup')}
        <button 
          onclick={() => showUpgradeModal = true}
          class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          Upgrade
        </button>
      {/if}
    </div>
    
    {#if canUseFeature('private_key_backup')}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <label for="air-gap-btn" class="text-sm font-medium">Air-Gapped Signing</label>
            <p class="text-xs text-gray-500">Sign transactions offline for maximum security</p>
          </div>
          <button id="air-gap-btn" class="yakkl-btn-secondary text-sm" aria-label="Setup air-gapped signing">Setup</button>
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <label for="zkp-btn" class="text-sm font-medium">Zero-Knowledge Proofs</label>
            <p class="text-xs text-gray-500">Private transaction verification</p>
          </div>
          <button id="zkp-btn" class="yakkl-btn-secondary text-sm" aria-label="Enable zero-knowledge proofs">Enable</button>
        </div>
      </div>
    {:else}
      <div class="text-center py-6 text-orange-500 dark:text-orange-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
        <p class="text-sm">Maximum privacy features including air-gapped signing and zero-knowledge proofs.</p>
      </div>
    {/if}
  </div>
</div>

<!-- Upgrade Modal -->
<Upgrade 
  bind:show={showUpgradeModal}
  onComplete={() => showUpgradeModal = false}
  onCancel={() => showUpgradeModal = false}
/>
