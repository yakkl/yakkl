<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser as isBrowser } from '$app/environment';
  import { browser_ext } from '$lib/common/environment';
  import { fade, fly, scale } from 'svelte/transition';
  import { NotificationService } from '$lib/common/notifications';
  import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

  // State
  let notifications = $state<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: number;
    countdown?: number;
    countdownInterval?: string; // Now stores timer ID
    delayMs?: number;
  }>>([]);

  // Enhanced state for lockdown notifications
  let isLockdownActive = $state(false);
  let lockdownTimeLeft = $state(0);
  let isUrgent = $state(false);

  const timerManager = UnifiedTimerManager.getInstance();

  // Initialize listener
  onMount(() => {
    if (!isBrowser || !browser_ext) return;

    const messageListener = (message: any, sender: any, sendResponse: any): true => {
      if (!message || typeof message !== 'object') return true;

      // Handle security alerts
      if (message.type === 'SECURITY_ALERT' || message.type === 'IMPORTANT_NOTIFICATION') {
        addNotification({
          id: message.id || `notification-${Date.now()}`,
          type: 'security',
          title: message.title || '🔒 Security Alert',
          message: message.message,
          timestamp: message.timestamp || Date.now()
        });
      }

      // Handle lockdown warnings specifically
      else if (message.type === 'LOCKDOWN_WARNING') {
        const id = `lockdown-${Date.now()}`;
        const delayMs = message.delayMs || 30000;
        const countdown = Math.ceil(delayMs / 1000);

        // Set lockdown state
        isLockdownActive = true;
        lockdownTimeLeft = countdown;
        isUrgent = countdown <= 10;

        addNotification({
          id,
          type: 'lockdown',
          title: '🔒 Security Alert',
          message: message.message || 'YAKKL will be locked soon due to inactivity.',
          timestamp: message.timestamp || Date.now(),
          countdown,
          delayMs
        });

        // Start countdown using UnifiedTimerManager
        const intervalId = `countdown-${id}`;
        timerManager.addInterval(intervalId, () => {
          updateCountdown(id);
        }, 1000);
        timerManager.startInterval(intervalId);

        // Store the interval ID
        notifications = notifications.map(n =>
          n.id === id ? { ...n, countdownInterval: intervalId } : n
        );

        if (browser_ext.runtime && browser_ext.runtime.onMessage) {
          browser_ext.runtime.sendMessage({type: 'lockdownImminent', delayMs, timestamp: Date.now()});
        }
      }

      // Handle clear notifications
      else if (message.type === 'CLEAR_NOTIFICATION') {
        removeNotification(message.notificationId);
      }

      return true;
    };

    // Listen for idle state changes to clear lockdown state
    const handleIdleStateChange = (event: CustomEvent) => {
      if (event.detail.state === 'active') {
        isLockdownActive = false;
        lockdownTimeLeft = 0;
        isUrgent = false;
        // Clear lockdown notifications
        notifications = notifications.filter(n => n.type !== 'lockdown');
        clearAllIntervals();
      }
    };

    // Listen for user activity
    const handleUserActivity = () => {
      if (isLockdownActive) {
        isLockdownActive = false;
        lockdownTimeLeft = 0;
        isUrgent = false;
        notifications = notifications.filter(n => n.type !== 'lockdown');
        clearAllIntervals();
      }
    };

    // Add listeners
    if (browser_ext.runtime && browser_ext.runtime.onMessage) {
      browser_ext.runtime.onMessage.addListener(messageListener);
    }

    window.addEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
    window.addEventListener('yakklUserActivityDetected', handleUserActivity as EventListener);

    return () => {
      // Clean up listeners
      if (browser_ext.runtime && browser_ext.runtime.onMessage) {
        browser_ext.runtime.onMessage.removeListener(messageListener);
      }

      window.removeEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
      window.removeEventListener('yakklUserActivityDetected', handleUserActivity as EventListener);

      // Clear all intervals
      clearAllIntervals();
    };
  });

  onDestroy(() => {
    clearAllIntervals();
  });

  // Add a notification to the list
  function addNotification(notification: any) {
    // Check if we already have this notification
    const existing = notifications.find(n => n.id === notification.id);

    if (existing) {
      // Update existing notification
      notifications = notifications.map(n =>
        n.id === notification.id ? { ...n, ...notification } : n
      );
    } else {
      // Add new notification
      notifications = [...notifications, notification];
    }
  }

  // Remove a notification
  function removeNotification(id: string) {
    // Clear any countdown interval
    const notification = notifications.find(n => n.id === id);
    if (notification && notification.countdownInterval) {
      timerManager.stopInterval(notification.countdownInterval);
      timerManager.removeInterval(notification.countdownInterval);
    }

    // If removing lockdown notification, clear lockdown state
    if (notification?.type === 'lockdown') {
      isLockdownActive = false;
      lockdownTimeLeft = 0;
      isUrgent = false;
    }

    // Remove from list
    notifications = notifications.filter(n => n.id !== id);
  }

  // Update countdown for a notification
  function updateCountdown(id: string) {
    const notification = notifications.find(n => n.id === id);

    if (notification && notification.countdown) {
      // Decrement countdown
      const newCountdown = notification.countdown - 1;
      lockdownTimeLeft = newCountdown;
      isUrgent = newCountdown <= 10;

      if (newCountdown <= 0) {
        // Remove notification when countdown reaches zero
        removeNotification(id);
      } else {
        // Update countdown
        notifications = notifications.map(n =>
          n.id === id ? { ...n, countdown: newCountdown } : n
        );
      }
    }
  }

  // Clear all intervals
  function clearAllIntervals() {
    notifications.forEach(notification => {
      if (notification.countdownInterval) {
        timerManager.stopInterval(notification.countdownInterval);
        timerManager.removeInterval(notification.countdownInterval);
      }
    });
  }

  // Track user activity for analytics - only for significant interactions
  function trackUserActivity(action: string) {
    // Only track specific actions that are meaningful for analytics
    const trackableActions = [
      'dismiss_notification',
      'interact_with_notification',
      'view_notification'
    ];

    if (trackableActions.includes(action) && browser_ext) {
      try {
        browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now(),
          context: 'analytics',
          action
        }).catch(() => {
          // Ignore errors
        });
      } catch (e) {
        // Ignore errors
      }
    }
  }

  // Handle user interaction with a notification
  function handleUserActivity(notificationId: string) {
    // Only track significant interactions
    trackUserActivity('interact_with_notification');
    removeNotification(notificationId);
  }

  // Dismiss a single notification
  function dismiss(id: string) {
    // Only send security activity message for lockdown warnings
    const notification = notifications.find(n => n.id === id);
    if (notification?.type === 'lockdown' && browser_ext) {
      try {
        browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now(),
          context: 'security',
          action: 'dismiss_lockdown_warning'
        }).catch(() => {
          // Ignore errors
        });
      } catch (e) {
        // Ignore errors
      }
    }

    // Remove the notification
    removeNotification(id);
  }

  // Dismiss all notifications
  async function dismissAll() {
    // Only send security activity message if we have a lockdown warning
    const hasLockdownWarning = notifications.some(n => n.type === 'lockdown');
    if (hasLockdownWarning && browser_ext) {
      try {
        await browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now(),
          context: 'security',
          action: 'dismiss_all_lockdown_warnings'
        });
      } catch (e) {
        // Ignore errors
      }
    }

    // Use centralized clearing
    await NotificationService.clearAllAlertsEnhanced();

    // Clear local state
    clearAllIntervals();
    notifications = [];
    isLockdownActive = false;
    lockdownTimeLeft = 0;
    isUrgent = false;
  }
</script>

<!-- Enhanced Lockdown Bar (Full Width at Top) -->
{#if isLockdownActive}
<div
  class="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg border-b-2 border-red-500"
  class:animate-pulse={isUrgent}
  transition:fly={{ y: -100, duration: 400 }}
>
  <div class="max-w-7xl mx-auto px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Left side - Icon and main message -->
      <div class="flex items-center space-x-3">
        <div class="relative">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-yellow-300" class:animate-spin={isUrgent} viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          {#if isUrgent}
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
          {/if}
        </div>

        <div class="flex-1">
          <div class="font-semibold text-lg">
            🔒 YAKKL Security Alert
          </div>
          <div class="text-red-100 text-sm">
            Wallet will lock due to inactivity - take any action to stay active
          </div>
        </div>
      </div>

      <!-- Center - Large countdown timer -->
      <div class="flex items-center space-x-4">
        <div class="text-center">
          <div class="text-xs text-red-200 uppercase tracking-wide">Time Remaining</div>
          <div
            class="text-3xl font-mono font-bold text-yellow-300 transition-all duration-300"
            class:text-yellow-100={isUrgent}
            class:animate-pulse={isUrgent}
            class:scale-110={isUrgent}
          >
            {lockdownTimeLeft}
          </div>
          <div class="text-xs text-red-200">seconds</div>
        </div>

        <!-- Progress ring -->
        <div class="relative w-16 h-16">
          <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 32 32">
            <!-- Background circle -->
            <circle
              cx="16" cy="16" r="14"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              class="text-red-800"
            />
            <!-- Progress circle -->
            <circle
              cx="16" cy="16" r="14"
              stroke="currentColor"
              stroke-width="2"
              fill="none"
              stroke-linecap="round"
              class="text-yellow-300 transition-all duration-1000"
              class:text-yellow-100={isUrgent}
              style="stroke-dasharray: {2 * Math.PI * 14}; stroke-dashoffset: {2 * Math.PI * 14 * (1 - (lockdownTimeLeft / 30))}"
            />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-xs font-bold text-white">{Math.round((lockdownTimeLeft / 30) * 100)}%</div>
          </div>
        </div>
      </div>

      <!-- Right side - Action buttons -->
      <div class="flex items-center space-x-3">
        <button
          class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-red-600"
          onclick={() => dismissAll()}
        >
          ✅ I'm Active
        </button>

        <!-- svelte-ignore a11y_consider_explicit_label -->
        <button
          class="text-red-200 hover:text-white transition-colors duration-200"
          onclick={() => dismissAll()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</div>
{/if}

<!-- Regular Notification Container (positioned lower when lockdown bar is active) -->
{#if notifications.length > 0}
<div
  class="fixed right-4 z-40 flex flex-col gap-4 max-w-md transition-all duration-300"
  class:top-24={isLockdownActive}
  class:top-4={!isLockdownActive}
>
  {#each notifications as notification (notification.id)}
    <!-- Skip lockdown notifications since they're shown in the top bar -->
    {#if notification.type !== 'lockdown'}
      <!-- Regular security alert -->
      {#if notification.type === 'security'}
        <div
          class="p-4 bg-yellow-600 text-white rounded-lg shadow-lg"
          in:fly={{ x: 20, duration: 300 }}
          out:fade={{ duration: 200 }}
        >
          <div class="flex justify-between items-start">
            <div class="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 class="font-bold text-lg">{notification.title}</h3>
            </div>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              class="text-white hover:text-gray-200"
              onclick={() => dismiss(notification.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <p class="mt-2">{notification.message}</p>

          <div class="mt-3 flex justify-end">
            <button
              class="bg-white text-yellow-600 px-3 py-1 rounded hover:bg-gray-100"
              onclick={() => dismiss(notification.id)}
            >
              Dismiss
            </button>
          </div>
        </div>
      {:else}
        <!-- Generic notification -->
        <div
          class="p-4 bg-blue-600 text-white rounded-lg shadow-lg"
          in:fly={{ x: 20, duration: 300 }}
          out:fade={{ duration: 200 }}
        >
          <div class="flex justify-between items-start">
            <h3 class="font-bold">{notification.title}</h3>
            <!-- svelte-ignore a11y_consider_explicit_label -->
            <button
              class="text-white hover:text-gray-200"
              onclick={() => dismiss(notification.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>

          <p class="mt-2">{notification.message}</p>
        </div>
      {/if}
    {/if}
  {/each}

  <!-- Dismiss all button (only show if multiple non-lockdown notifications) -->
  {#if notifications.filter(n => n.type !== 'lockdown').length > 1}
    <button
      class="self-end bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
      onclick={dismissAll}
    >
      Dismiss All
    </button>
  {/if}
</div>
{/if}
