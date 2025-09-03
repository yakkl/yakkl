<script lang="ts">
  import { twMerge } from 'tailwind-merge';

  interface AddressDisplayProps {
    address: string;
    truncate?: boolean;
    copyable?: boolean;
    showIcon?: boolean;
    className?: string;
  }

  const {
    address,
    truncate = true,
    copyable = true,
    showIcon = false,
    className = ''
  }: AddressDisplayProps = $props();

  let copied = $state(false);

  function truncateAddress(addr: string): string {
    if (!truncate || addr.length <= 13) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  async function copyToClipboard() {
    if (!copyable) return;
    
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }

  $: displayAddress = truncateAddress(address);
  $: containerClasses = twMerge(
    'inline-flex items-center gap-2',
    copyable && 'cursor-pointer hover:opacity-80',
    className
  );
</script>

<div 
  class={containerClasses}
  onclick={copyToClipboard}
  role={copyable ? 'button' : undefined}
  tabindex={copyable ? 0 : undefined}
  title={address}
>
  {#if showIcon}
    <svg 
      class="w-4 h-4" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        stroke-width="2" 
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  {/if}
  
  <code class="text-sm font-mono">
    {displayAddress}
  </code>
  
  {#if copyable}
    <svg 
      class="w-4 h-4 transition-all" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      class:text-success={copied}
    >
      {#if copied}
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M5 13l4 4L19 7"
        />
      {:else}
        <path 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          stroke-width="2" 
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      {/if}
    </svg>
  {/if}
</div>