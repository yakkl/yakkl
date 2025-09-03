<script lang="ts">
  import Modal from '@yakkl/ui/src/components/Modal.svelte';
  
  interface Props {
    show?: boolean;
    fromToken?: any;
    toToken?: any;
    onClose?: () => void;
  }
  
  let { 
    show = $bindable(false),
    fromToken = null,
    toToken = null,
    onClose = () => {}
  }: Props = $props();
  
  function handleClose() {
    show = false;
    onClose();
  }
</script>

<Modal bind:show={show} title="Swap Tokens" size="lg">
  <div class="p-6">
    <div class="text-center">
      <h3 class="text-lg font-semibold mb-4">Token Swap</h3>
      <p class="text-gray-600 mb-6">
        Swap functionality is coming soon. This feature will allow you to exchange tokens directly from your wallet.
      </p>
      
      {#if fromToken}
        <div class="mb-4">
          <p class="text-sm text-gray-500">From Token:</p>
          <p class="font-semibold">{fromToken.symbol || fromToken.name || 'Unknown'}</p>
        </div>
      {/if}
      
      <button 
        class="btn btn-primary" 
        onclick={handleClose}
      >
        Close
      </button>
    </div>
  </div>
</Modal>