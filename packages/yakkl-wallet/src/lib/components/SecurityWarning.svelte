<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import messagingService from '$lib/common/messaging';
  import { NotificationService } from '$lib/common/notifications';
  import { browser_ext } from '$lib/common/environment';
  import { createCountdownTimer, type CountdownTimer } from '$lib/managers/CountdownTimer';

  interface Props {
    warningTime?: number;
    onComplete?: () => void;
  }

  let { warningTime = 30, onComplete = () => {} } = $props();

  let timeLeft = $state(warningTime);
  let countdownTimer: CountdownTimer | null = null;

  async function triggerLockdown() {
    try {
      // Send lockdown message
      if (browser_ext) {
        await browser_ext.runtime.sendMessage({
          type: 'lockdown',
          reason: 'idle-timeout'
        });
      }

      // Clear any existing notifications
      NotificationService.clear('lockdown-warning');

      // Call the completion handler
      onComplete();
    } catch (error) {
      console.error('Failed to trigger lockdown:', error);
    }
  }

  onMount(() => {
    countdownTimer = createCountdownTimer(
      'security-warning',
      warningTime,
      (remaining) => {
        timeLeft = remaining;
      },
      triggerLockdown
    );
    countdownTimer.start();
  });

  onDestroy(() => {
    if (countdownTimer) {
      countdownTimer.destroy();
      countdownTimer = null;
    }
  });
</script>

<div
  class="fixed top-0 left-0 right-0 bg-red-900/90 text-white p-2 text-center z-50"
  transition:fade
>
  <div class="flex items-center justify-center space-x-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
    </svg>
    <span>Security Warning: Wallet will lock in {timeLeft} seconds</span>
  </div>
</div>
