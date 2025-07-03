<script lang="ts">
  import Modal from './Modal.svelte';
  import type { ChainDisplay } from '$lib/types';
  
  let {
    show = $bindable(false),
    chain,
    onCreateAccount,
    onCancel
  }: {
    show: boolean;
    chain: ChainDisplay;
    onCreateAccount: () => void;
    onCancel: () => void;
  } = $props();
</script>

<Modal bind:show title="Network Address Required" onClose={onCancel}>
  <div class="space-y-4">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900 rounded-full mb-4">
        <svg class="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
        No Address for {chain.name} {chain.network}
      </h3>
      
      <p class="text-zinc-600 dark:text-zinc-400">
        You don't have an address for this network yet. Would you like to create one?
      </p>
    </div>

    <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
      <div class="flex items-center gap-3">
        {#if chain.icon?.includes('/')}
          <img src={chain.icon} alt={chain.name} class="w-8 h-8" />
        {:else}
          <span class="text-2xl">{chain.icon}</span>
        {/if}
        <div>
          <div class="font-medium text-zinc-900 dark:text-white">{chain.name}</div>
          <div class="text-sm text-zinc-600 dark:text-zinc-400">{chain.network}</div>
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <button
        onclick={onCancel}
        class="yakkl-btn-secondary flex-1"
      >
        Cancel
      </button>
      <button
        onclick={onCreateAccount}
        class="yakkl-btn-primary flex-1"
      >
        Create Account
      </button>
    </div>
  </div>
</Modal>