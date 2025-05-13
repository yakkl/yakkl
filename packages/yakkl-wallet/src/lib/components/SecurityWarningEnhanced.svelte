<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { bounceIn } from 'svelte/easing';
  import { NotificationService } from '$lib/common/notifications';
  import { browser_ext } from '$lib/common/environment';
  import { securityWarningStore, hideSecurityWarning } from '$lib/common/stores/securityWarning';
	import { log } from '$lib/common/logger-wrapper';

  interface Props {
    warningTime?: number;
    onComplete?: () => void;
  }

  let { warningTime = 30, onComplete = () => {} } = $props();

  let timeLeft = $state(warningTime);
  let timer = $state<number | undefined>(undefined);
  let show = $state(false);
  let isUrgent = $state(false);
  let originalTitle = '';
  let titleFlashInterval = $state<number | undefined>(undefined);
  let isCleaningUp = $state(false);

  // Subscribe to the security warning store
  let unsubscribe: (() => void) | undefined;

  async function triggerLockdown() {
    if (isCleaningUp) return;

    try {
      log.info('🔒 [SecurityWarningEnhanced] Triggering lockdown');
      isCleaningUp = true;

      // Clean up our own timers first
      cleanup();

      // Send lockdown message
      if (browser_ext) {
        await browser_ext.runtime.sendMessage({
          type: 'lockdown',
          reason: 'idle-timeout'
        });
      }

      // Clear enhanced alerts
      await NotificationService.clearAllAlertsEnhanced();

      // Hide the warning
      hideSecurityWarning();

      // Call the completion handler
      onComplete();
    } catch (error) {
      console.error('Failed to trigger lockdown:', error);
    } finally {
      isCleaningUp = false;
    }
  }

  function cleanup() {
    // Clear main countdown timer
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }

    // Clear title flash interval
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = undefined;
    }

    // Close audio context
    if (typeof window !== 'undefined') {
      const audioContext = (window as any).__yakklAudioContext;
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
        (window as any).__yakklAudioContext = null;
      }
    }

    // Restore document title
    if (originalTitle && document.title.includes('🚨 URGENT')) {
      document.title = originalTitle;
      originalTitle = '';
    }

    removeListeners();
  }

  function startCountdown() {
    log.info('⏰ [SecurityWarningEnhanced] Starting countdown from', false, timeLeft);

    // Clean up any existing timer first
    cleanup();

    // Store original title for restoration
    originalTitle = document.title;

    timer = window.setInterval(() => {
      timeLeft--;
      log.debug('⏱️ [SecurityWarningEnhanced] Time left:', false, timeLeft);

      // Update urgency state
      isUrgent = timeLeft <= 10;

      // Start title flashing at 15 seconds if not already flashing
      if (timeLeft <= 15 && !titleFlashInterval && !document.title.includes('🚨 URGENT')) {
        startTitleFlash();
      }

      // Play final warning sound at 5 seconds
      if (timeLeft === 5) {
        playFinalWarningSound();
      }

      if (timeLeft <= 0) {
        clearInterval(timer);
        timer = undefined;
        triggerLockdown();
      }
    }, 1000);

    // Store reference for cleanup
    if (typeof window !== 'undefined') {
      (window as any).__yakklSecurityWarningTimer = timer;
    }

    log.info('✅ [SecurityWarningEnhanced] Countdown started');
  }

  function startTitleFlash() {
    if (titleFlashInterval || !originalTitle) return;

    log.info('⚡ [SecurityWarningEnhanced] Starting title flash');

    let flashCount = 0;
    titleFlashInterval = window.setInterval(() => {
      if (flashCount >= 20) { // Flash 10 times total
        if (titleFlashInterval) {
          clearInterval(titleFlashInterval);
          titleFlashInterval = undefined;
        }
        if (originalTitle) {
          document.title = originalTitle;
        }
        return;
      }

      const flashTitle = flashCount % 2 === 0 ? '🚨 URGENT: Security Warning!' : originalTitle;
      document.title = flashTitle;
      flashCount++;
    }, 500);

    // Store reference for cleanup
    if (typeof window !== 'undefined') {
      (window as any).__yakklSecurityTitleFlash = titleFlashInterval;
    }
  }

  function stopCountdown() {
    log.info('⏹️ [SecurityWarningEnhanced] Stopping countdown');
    cleanup();
  }

  function playFinalWarningSound() {
    try {
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Create urgent final warning sound sequence
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            try {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();

              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);

              oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
              gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
            } catch (e) {
              log.debug('Audio beep failed in final warning:', false, e);
            }
          }, i * 400);
        }

        // Close audio context after sounds complete
        setTimeout(() => {
          audioContext.close().catch(() => {});
        }, 2000);
      }
    } catch (error) {
      console.warn('Failed to play final warning sound:', error);
    }
  }

  function handleUserActivity() {
    if (isCleaningUp) return;

    log.info('👆 [SecurityWarningEnhanced] User activity detected - canceling warning');
    isCleaningUp = true;

    try {
      // Clean up our own state first
      cleanup();

      // Hide the security warning
      hideSecurityWarning();

      // Send activity message to background
      if (browser_ext) {
        browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now(),
          context: 'security',
          action: 'security_warning_interaction'
        }).catch(() => {
          // Ignore errors
        });
      }

      // Clear all enhanced alerts through the notification service
      NotificationService.clearAllAlertsEnhanced().catch((error) => {
        log.warn('Error clearing enhanced alerts from SecurityWarning:', false, error);
      });
    } catch (error) {
      log.error('Error in handleUserActivity:', false, error);
    } finally {
      isCleaningUp = false;
    }
  }

  function addListeners() {
    if (typeof window === 'undefined') return;

    // Use passive listeners and single-use listeners for better performance
    window.addEventListener('mousemove', handleUserActivity, { once: true, passive: true });
    window.addEventListener('keydown', handleUserActivity, { once: true, passive: true });
    window.addEventListener('click', handleUserActivity, { once: true, passive: true });
    window.addEventListener('focus', handleUserActivity, { once: true, passive: true });

    log.debug('✅ [SecurityWarningEnhanced] Activity listeners added');
  }

  function removeListeners() {
    if (typeof window === 'undefined') return;

    // Remove all listeners (in case they weren't used yet)
    window.removeEventListener('mousemove', handleUserActivity);
    window.removeEventListener('keydown', handleUserActivity);
    window.removeEventListener('click', handleUserActivity);
    window.removeEventListener('focus', handleUserActivity);

    log.debug('✅ [SecurityWarningEnhanced] Activity listeners removed');
  }

  $effect(() => {
    if (show && !isCleaningUp) {
      addListeners();
    } else {
      removeListeners();
    }
  });

  onMount(() => {
    log.info('🚀 [SecurityWarningEnhanced] Component mounted');

    // Subscribe to the security warning store
    unsubscribe = securityWarningStore.subscribe((state) => {
      log.info('📢 [SecurityWarningEnhanced] Store state changed:', false, state);

      if (state.show && !show && !isCleaningUp) {
        // Show warning
        show = true;
        timeLeft = state.warningTime;
        if (state.onComplete) {
          onComplete = state.onComplete;
        }
        startCountdown();
      } else if (!state.show && show) {
        // Hide warning
        show = false;
        stopCountdown();
      }
    });

    // Focus window when component mounts during warning
    if (show && typeof window !== 'undefined') {
      window.focus();
    }
  });

  onDestroy(() => {
    log.info('🔥 [SecurityWarningEnhanced] Component destroyed - performing cleanup');

    // Ensure complete cleanup
    cleanup();

    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

{#if show}
<div
  class="fixed inset-0 z-50 flex items-start justify-center pt-4"
  transition:fade={{ duration: 300 }}
>
  <!-- Backdrop with enhanced pulsing effect -->
  <div
    class="fixed inset-0 bg-red-900/70 backdrop-blur-md"
    class:animate-pulse={isUrgent}
    style="animation-duration: {isUrgent ? '0.5s' : '2s'}"
  ></div>

  <!-- Enhanced warning panel -->
  <div
    class="relative bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-400 text-white p-6 rounded-xl shadow-2xl max-w-lg mx-4 {isUrgent ? 'animate-bounce shadow-red-500/50' : ''}"
    transition:scale={{ duration: 400, easing: bounceIn }}
    role="alert"
    aria-live="assertive"
    style="box-shadow: {isUrgent ? '0 0 30px rgba(239, 68, 68, 0.5)' : ''}"
  >
    <!-- Urgent indicator with enhanced visibility -->
    {#if isUrgent}
    <div class="absolute -top-3 -right-3 bg-yellow-400 text-red-900 px-3 py-1 rounded-full text-sm font-bold animate-ping shadow-lg">
      URGENT!
    </div>
    {/if}

    <!-- Enhanced header -->
    <div class="flex items-center justify-center space-x-4 mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-yellow-300" class:animate-pulse={true} viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      <div class="text-center">
        <h2 class="text-2xl font-bold">🚨 SECURITY WARNING</h2>
        <p class="text-red-200 text-sm mt-1">Immediate attention required</p>
      </div>
    </div>

    <!-- Enhanced countdown display -->
    <div class="text-center mb-6">
      <div class="text-sm text-red-200 mb-3">Wallet will lock due to inactivity in:</div>
      <div
        class="text-6xl font-mono font-bold text-yellow-300 mb-3 transition-all duration-300"
        class:text-red-300={isUrgent}
        class:animate-pulse={isUrgent}
        class:scale-110={isUrgent}
      >
        {timeLeft}
      </div>
      <div class="text-base text-red-200 font-semibold">seconds</div>
    </div>

    <!-- Enhanced progress bar -->
    <div class="w-full bg-red-800 rounded-full h-3 mb-6 shadow-inner">
      <div
        class="h-3 rounded-full transition-all duration-1000 shadow-sm"
        class:bg-gradient-to-r={!isUrgent}
        class:from-yellow-400={!isUrgent}
        class:to-yellow-300={!isUrgent}
        class:bg-red-400={isUrgent}
        class:animate-pulse={isUrgent}
        style="width: {(timeLeft / warningTime) * 100}%"
      ></div>
    </div>

    <!-- Enhanced action buttons -->
    <div class="flex space-x-4 mb-4">
      <button
        class="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-500/50 shadow-lg"
        onclick={handleUserActivity}
        disabled={isCleaningUp}
      >
        ✅ I'm Here - Stay Active
      </button>

      <button
        class="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-lg font-bold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50 shadow-lg"
        onclick={triggerLockdown}
        disabled={isCleaningUp}
      >
        🔒 Lock Now
      </button>
    </div>

    <!-- Enhanced additional info -->
    <div class="text-center">
      <div class="text-xs text-red-200 mb-2">
        Click anywhere on this warning or press any key to stay active
      </div>
      <div class="text-xs text-red-300 opacity-75">
        Your extension badge is also showing the countdown
      </div>
    </div>
  </div>
</div>
{/if}
