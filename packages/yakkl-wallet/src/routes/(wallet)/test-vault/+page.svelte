<script lang="ts">
  import { onMount } from 'svelte';
  import { getVaultService } from '$lib/services/vault-bridge.service';
  import type { VaultReference, ImportOptions } from '$lib/interfaces/vault.interface';
  
  let vaultService = $state(getVaultService());
  let vaultReferences = $state<VaultReference[]>([]);
  let selectedVault = $state<VaultReference | null>(null);
  let derivedAccounts = $state<any[]>([]);
  
  // Test data
  let testSeedPhrase = $state('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
  let testPrivateKey = $state('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');
  let importPassword = $state('password123');
  
  // UI state
  let isLoading = $state(false);
  let message = $state('');
  let messageType = $state<'success' | 'error' | 'info'>('info');
  
  onMount(async () => {
    await initializeVault();
    await loadVaultReferences();
  });
  
  async function initializeVault() {
    try {
      isLoading = true;
      await vaultService.initialize();
      showMessage('Vault service initialized', 'success');
    } catch (error) {
      showMessage(`Failed to initialize: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function loadVaultReferences() {
    try {
      vaultReferences = await vaultService.listVaultReferences();
      showMessage(`Loaded ${vaultReferences.length} vault(s)`, 'info');
    } catch (error) {
      showMessage(`Failed to load vaults: ${error}`, 'error');
    }
  }
  
  async function createMasterVault() {
    try {
      isLoading = true;
      const vaultId = await vaultService.createVault('master', {
        label: 'Test Master Vault'
      });
      showMessage(`Created master vault: ${vaultId}`, 'success');
      await loadVaultReferences();
    } catch (error) {
      showMessage(`Failed to create vault: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function importSeedPhrase() {
    try {
      isLoading = true;
      const options: ImportOptions = {
        type: 'seed',
        data: testSeedPhrase,
        password: importPassword,
        label: 'Imported Seed Phrase'
      };
      const vaultId = await vaultService.importToVault(options);
      showMessage(`Imported seed phrase to vault: ${vaultId}`, 'success');
      await loadVaultReferences();
    } catch (error) {
      showMessage(`Failed to import seed: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function importPrivateKey() {
    try {
      isLoading = true;
      const options: ImportOptions = {
        type: 'private_key',
        data: testPrivateKey,
        label: 'Imported Private Key'
      };
      const vaultId = await vaultService.importToVault(options);
      showMessage(`Imported private key to vault: ${vaultId}`, 'success');
      await loadVaultReferences();
    } catch (error) {
      showMessage(`Failed to import key: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function deriveAccount(vault: VaultReference) {
    try {
      isLoading = true;
      const account = await vaultService.deriveAccount(vault.vaultId, {
        startIndex: derivedAccounts.length,
        label: `Account ${derivedAccounts.length + 1}`
      });
      derivedAccounts = [...derivedAccounts, { ...account, vaultId: vault.vaultId }];
      showMessage(`Derived account: ${account.address}`, 'success');
    } catch (error) {
      showMessage(`Failed to derive account: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  async function deleteVault(vault: VaultReference) {
    if (!confirm(`Delete vault "${vault.label || vault.vaultId}"?`)) return;
    
    try {
      isLoading = true;
      await vaultService.deleteVault(vault.vaultId);
      showMessage(`Deleted vault: ${vault.vaultId}`, 'success');
      await loadVaultReferences();
      if (selectedVault?.vaultId === vault.vaultId) {
        selectedVault = null;
      }
    } catch (error) {
      showMessage(`Failed to delete vault: ${error}`, 'error');
    } finally {
      isLoading = false;
    }
  }
  
  function showMessage(msg: string, type: 'success' | 'error' | 'info') {
    message = msg;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }
  
  function selectVault(vault: VaultReference) {
    selectedVault = vault;
    derivedAccounts = derivedAccounts.filter(a => a.vaultId === vault.vaultId);
  }
</script>

<div class="container mx-auto p-6 max-w-6xl">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
      🧪 Vault Service Test Page
    </h1>
    <p class="text-zinc-600 dark:text-zinc-400">
      Test vault operations without requiring pre-existing accounts
    </p>
  </div>

  {#if message}
    <div class="alert mb-6 {messageType === 'success' ? 'alert-success' : messageType === 'error' ? 'alert-error' : 'alert-info'}">
      <span>{message}</span>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Vault Operations -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Vault Operations</h2>
        
        <div class="space-y-4">
          <!-- Create Master Vault -->
          <div>
            <button 
              onclick={createMasterVault}
              disabled={isLoading}
              class="btn btn-primary w-full"
            >
              Create Master Vault
            </button>
          </div>

          <!-- Import Seed Phrase -->
          <div>
            <label class="label">
              <span class="label-text">Seed Phrase</span>
            </label>
            <textarea
              bind:value={testSeedPhrase}
              class="textarea textarea-bordered w-full"
              rows="2"
              placeholder="Enter seed phrase..."
            />
            <input
              type="password"
              bind:value={importPassword}
              class="input input-bordered w-full mt-2"
              placeholder="Password (optional)"
            />
            <button 
              onclick={importSeedPhrase}
              disabled={isLoading || !testSeedPhrase}
              class="btn btn-secondary w-full mt-2"
            >
              Import Seed Phrase
            </button>
          </div>

          <!-- Import Private Key -->
          <div>
            <label class="label">
              <span class="label-text">Private Key</span>
            </label>
            <input
              type="text"
              bind:value={testPrivateKey}
              class="input input-bordered w-full"
              placeholder="0x..."
            />
            <button 
              onclick={importPrivateKey}
              disabled={isLoading || !testPrivateKey}
              class="btn btn-accent w-full mt-2"
            >
              Import Private Key
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault References -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Vault References ({vaultReferences.length})</h2>
        
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each vaultReferences as vault}
            <div 
              class="p-3 rounded-lg border cursor-pointer transition-colors
                     {selectedVault?.vaultId === vault.vaultId 
                       ? 'bg-primary/10 border-primary' 
                       : 'border-base-300 hover:bg-base-200'}"
              onclick={() => selectVault(vault)}
              role="button"
              tabindex="0"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="font-semibold">
                    {vault.label || 'Unnamed Vault'}
                  </div>
                  <div class="text-xs text-zinc-500 dark:text-zinc-400">
                    Type: <span class="badge badge-sm">{vault.type}</span>
                  </div>
                  <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    ID: {vault.vaultId.substring(0, 20)}...
                  </div>
                  <div class="text-xs text-zinc-500 dark:text-zinc-400">
                    Accounts: {vault.accountCount}
                  </div>
                </div>
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    deleteVault(vault);
                  }}
                  class="btn btn-ghost btn-xs text-error"
                >
                  Delete
                </button>
              </div>
            </div>
          {:else}
            <div class="text-center py-8 text-zinc-500">
              No vaults created yet
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Selected Vault Details -->
  {#if selectedVault}
    <div class="card bg-base-100 shadow-xl mt-6">
      <div class="card-body">
        <h2 class="card-title">
          Vault Details: {selectedVault.label || selectedVault.vaultId}
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 class="font-semibold mb-2">Properties</h3>
            <div class="space-y-1 text-sm">
              <div>Type: <span class="badge">{selectedVault.type}</span></div>
              <div>Created: {new Date(selectedVault.createdAt).toLocaleString()}</div>
              <div>Accounts: {selectedVault.accountCount}</div>
              {#if selectedVault.organizationLevel}
                <div>Org Level: {selectedVault.organizationLevel}</div>
              {/if}
            </div>
            
            <button
              onclick={() => deriveAccount(selectedVault)}
              disabled={isLoading}
              class="btn btn-primary btn-sm mt-4"
            >
              Derive New Account
            </button>
          </div>
          
          <div>
            <h3 class="font-semibold mb-2">Derived Accounts</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              {#each derivedAccounts.filter(a => a.vaultId === selectedVault.vaultId) as account, i}
                <div class="text-sm p-2 bg-base-200 rounded">
                  <div class="font-mono text-xs">
                    Account #{i + 1}
                  </div>
                  <div class="font-mono text-xs text-primary break-all">
                    {account.address}
                  </div>
                  <div class="text-xs text-zinc-500">
                    Path: {account.path}
                  </div>
                </div>
              {:else}
                <div class="text-sm text-zinc-500">
                  No accounts derived yet
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

