<!-- SessionWarning.svelte -->
<script lang="ts">
  import Modal from './Modal.svelte';
  import { log } from '$lib/common/logger-wrapper';
  
  interface Props {
    show: boolean;
    timeRemaining: number; // in seconds
    onExtendSession: () => void;
    onLogoutNow: () => void;
    autoLogoutEnabled?: boolean;
  }
  
  let { 
    show = $bindable(false),
    timeRemaining,
    onExtendSession,
    onLogoutNow,
    autoLogoutEnabled = true
  }: Props = $props();
  
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let localTimeRemaining = $state(timeRemaining);
  
  // Format time as MM:SS
  const formattedTime = $derived(() => {
    const minutes = Math.floor(localTimeRemaining / 60);
    const seconds = localTimeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });
  
  const isUrgent = $derived(localTimeRemaining <= 30); // Last 30 seconds
  const isCritical = $derived(localTimeRemaining <= 10); // Last 10 seconds
  
  // Update local countdown
  $effect(() => {
    localTimeRemaining = timeRemaining;
  });
  
  // Handle countdown and auto-logout
  $effect(() => {
    if (show && autoLogoutEnabled) {
      countdownInterval = setInterval(() => {
        localTimeRemaining--;
        
        if (localTimeRemaining <= 0) {
          log.warn('Session expired - auto logout', false);
          handleLogoutNow();
        }
      }, 1000);
      
      return () => {
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      };
    }
  });
  
  // Cleanup on component destruction
  $effect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  });
  
  function handleExtendSession() {
    try {
      onExtendSession();
      show = false;
      log.debug('Session extended by user', false);
    } catch (error) {
      log.error('Failed to extend session:', false, error);
    }
  }
  
  function handleLogoutNow() {
    try {
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      onLogoutNow();
      show = false;
      log.debug('User logged out via session warning', false);
    } catch (error) {
      log.error('Failed to logout:', false, error);
    }
  }
  
  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (!show) return;
    
    if (event.key === 'Enter') {
      event.preventDefault();
      handleExtendSession();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleLogoutNow();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<Modal bind:show title="Session Expiring" className="z-[800]" preventClose={true}>
  <div class="p-6 text-center space-y-6">
    <!-- Warning icon and countdown -->
    <div class="flex flex-col items-center space-y-4">
      <div class="relative">
        <svg 
          class="w-16 h-16 {isCritical ? 'text-red-500 animate-pulse' : isUrgent ? 'text-orange-500 animate-bounce' : 'text-yellow-500'}" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {#if isCritical}
          <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
        {/if}
      </div>
      
      <div class="text-center">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Your session is about to expire
        </h3>
        <div class="text-3xl font-mono font-bold {isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-yellow-600'}">
          {formattedTime}
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {isCritical ? 'Logging out in seconds!' : isUrgent ? 'Time is running out!' : 'You will be automatically logged out for security.'}
        </p>
      </div>
    </div>
    
    <!-- Session info -->
    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
      <p class="text-sm text-blue-800 dark:text-blue-200">
        For your security, we automatically log you out after periods of inactivity.
        You can extend your session to continue working.
      </p>
    </div>
    
    <!-- Action buttons -->
    <div class="flex gap-4 justify-center">
      <button
        onclick={handleLogoutNow}
        class="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        title="Logout Now (Esc)"
      >
        Logout Now
      </button>
      <button
        onclick={handleExtendSession}
        class="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-md {isCritical ? 'animate-pulse' : ''}"
        title="Extend Session (Enter)"
      >
        Extend Session (+30 min)
      </button>
    </div>
    
    <!-- Keyboard shortcuts hint -->
    <div class="text-xs text-gray-500 dark:text-gray-400 border-t pt-4">
      <p>Keyboard shortcuts: <kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to extend, <kbd class="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Esc</kbd> to logout</p>
    </div>
  </div>
</Modal>