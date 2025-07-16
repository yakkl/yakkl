<script lang="ts">
  // Generic Icon component that routes to specific icon components
  import EyeIcon from '$lib/components/icons/EyeIcon.svelte';
  import EyeOffIcon from '$lib/components/icons/EyeOffIcon.svelte';
  import ChevronDownIcon from '$lib/components/icons/ChevronDownIcon.svelte';
  import ChevronUpIcon from '$lib/components/icons/ChevronUpIcon.svelte';
  import LockIcon from '$lib/components/icons/LockIcon.svelte';
  import TrashIcon from '$lib/components/icons/TrashIcon.svelte';
  import SearchIcon from '$lib/components/icons/SearchIcon.svelte';
  import RefreshIcon from '$lib/components/icons/RefreshIcon.svelte';
  
  let { 
    name = '',
    size = 20,
    class: className = ''
  } = $props();

  // Map icon names to components
  const iconMap = {
    'eye': EyeIcon,
    'eye-off': EyeOffIcon,
    'chevron-down': ChevronDownIcon,
    'chevron-up': ChevronUpIcon,
    'lock': LockIcon,
    'trash': TrashIcon,
    'search': SearchIcon,
    'refresh': RefreshIcon,
    // Fallback icons using inline SVG
    'arrow-left': null,
    'shield': null,
    'copy': null,
  };

  const IconComponent = $derived(iconMap[name]);
</script>

{#if IconComponent}
  <IconComponent {size} className={className} />
{:else if name === 'arrow-left'}
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round" 
    class={className}
  >
    <path d="M19 12H5"></path>
    <path d="M12 19l-7-7 7-7"></path>
  </svg>
{:else if name === 'shield'}
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round" 
    class={className}
  >
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
  </svg>
{:else if name === 'copy'}
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round" 
    class={className}
  >
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
  </svg>
{:else}
  <!-- Default fallback icon -->
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round" 
    class={className}
  >
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 8v8"></path>
    <path d="M8 12h8"></path>
  </svg>
{/if}