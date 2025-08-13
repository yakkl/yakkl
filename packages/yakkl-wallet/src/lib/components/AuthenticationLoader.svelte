<!-- AuthenticationLoader.svelte - Shows status during authentication -->
<script lang="ts">
  import { onMount } from 'svelte';
  
  interface Props {
    message?: string;
  }
  
  let { message = 'Authenticating...' }: Props = $props();
  
  let statusMessage = $state(message);
  let dots = $state('');
  
  onMount(() => {
    // Animate dots
    const interval = setInterval(() => {
      dots = dots.length < 3 ? dots + '.' : '';
    }, 500);
    
    // Change status message over time to show progress
    const messages = [
      'Authenticating...',
      'Verifying credentials...',
      'Loading security context...',
      'Performing security audit...',
      'Initializing wallet...',
      'Almost ready...'
    ];
    
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      statusMessage = messages[messageIndex];
    }, 2500);
    
    return () => {
      clearInterval(interval);
      clearInterval(messageInterval);
    };
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
  <div class="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4">
    <div class="flex flex-col items-center space-y-6">
      <!-- Spinner -->
      <div class="relative">
        <div class="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-800 rounded-full"></div>
        <div class="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-600 dark:border-indigo-400 rounded-full border-t-transparent animate-spin"></div>
      </div>
      
      <!-- Status Message -->
      <div class="text-center space-y-2">
        <h3 class="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          {statusMessage}{dots}
        </h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Please wait while we secure your wallet
        </p>
      </div>
      
      <!-- Security Badge -->
      <div class="flex items-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span>End-to-end encrypted</span>
      </div>
    </div>
  </div>
</div>