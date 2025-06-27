<script lang="ts">
  import { currentAccount, accounts } from '$lib/stores/account.store';
  import { currentChain } from '$lib/stores/chain.store';
  
  let { onClose } = $props();
  
  let account = $derived($currentAccount);
  let chain = $derived($currentChain);
  let allAccounts = $derived($accounts);
  
  let showPrivateKey = $state(false);
  let showSeedPhrase = $state(false);
  let copied = $state(false);
  
  function handlePrint() {
    window.print();
  }
  
  function handleDownload() {
    const data = {
      walletName: 'YAKKL Smart Wallet',
      generatedAt: new Date().toISOString(),
      account: {
        address: account?.address,
        name: account?.name || account?.username,
        network: chain?.name
      },
      backupInstructions: 'Store this document securely. Never share your private key or seed phrase.',
      warning: 'Anyone with access to this information can control your wallet.'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yakkl-emergency-kit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div class="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="p-6 border-b border-zinc-200 dark:border-zinc-700">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-zinc-900 dark:text-white">Emergency Recovery Kit</h2>
        <button
          onclick={onClose}
          class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Warning Banner -->
    <div class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 m-6">
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <h3 class="font-semibold text-red-800 dark:text-red-200">Critical Security Information</h3>
          <p class="text-sm text-red-700 dark:text-red-300 mt-1">
            This kit contains sensitive information that provides complete access to your wallet. 
            Store it securely and never share it with anyone.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="p-6 space-y-6">
      <!-- Account Information -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Account Information</h3>
        <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-3">
          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Wallet Address:</span>
            <div class="font-mono text-sm mt-1 break-all">{account?.address || 'No account selected'}</div>
          </div>
          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Account Name:</span>
            <div class="font-medium mt-1">{account?.name || account?.username || 'Default Account'}</div>
          </div>
          <div>
            <span class="text-sm text-zinc-600 dark:text-zinc-400">Current Network:</span>
            <div class="font-medium mt-1">{chain?.name || 'Unknown'}</div>
          </div>
        </div>
      </div>
      
      <!-- Private Key Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Private Key</h3>
          <button
            onclick={() => showPrivateKey = !showPrivateKey}
            class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {showPrivateKey ? 'Hide' : 'Reveal'} Private Key
          </button>
        </div>
        {#if showPrivateKey}
          <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
            <div class="font-mono text-xs break-all select-all">
              ••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••
            </div>
            <p class="text-xs text-zinc-500 mt-2">Private key hidden for security. Use Export Account feature to reveal.</p>
          </div>
        {/if}
      </div>
      
      <!-- Recovery Phrase Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Recovery Phrase</h3>
          <button
            onclick={() => showSeedPhrase = !showSeedPhrase}
            class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {showSeedPhrase ? 'Hide' : 'Reveal'} Recovery Phrase
          </button>
        </div>
        {#if showSeedPhrase}
          <div class="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-4">
            <div class="grid grid-cols-3 gap-3">
              {#each Array(12) as _, i}
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-500">{i + 1}.</span>
                  <span class="font-mono text-sm">••••••••</span>
                </div>
              {/each}
            </div>
            <p class="text-xs text-zinc-500 mt-3">Recovery phrase hidden for security. Use Export Account feature to reveal.</p>
          </div>
        {/if}
      </div>
      
      <!-- Instructions -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Storage Instructions</h3>
        <ul class="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Store in a secure physical location (safe, safety deposit box)
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Consider splitting information across multiple secure locations
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Never store digitally on internet-connected devices
          </li>
          <li class="flex items-start gap-2">
            <svg class="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Never share this information with anyone
          </li>
        </ul>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="p-6 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-3">
      <button
        onclick={handlePrint}
        class="yakkl-btn-secondary flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Kit
      </button>
      
      <button
        onclick={handleDownload}
        class="yakkl-btn-secondary flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Info
      </button>
      
      <button
        onclick={onClose}
        class="yakkl-btn-primary ml-auto"
      >
        Done
      </button>
    </div>
  </div>
</div>

<style>
  @media print {
    .fixed {
      position: static;
      background: white;
    }
    
    button {
      display: none;
    }
    
    .max-h-\[90vh\] {
      max-height: none;
    }
  }
</style>