<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser as isBrowser } from '$app/environment';
  import { browser_ext } from '$lib/common/environment';
  import { fade, fly } from 'svelte/transition';
  import { NotificationService } from '$lib/common/notifications';

  // State
  let notifications = $state<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: number;
    countdown?: number;
    countdownInterval?: number;
    delayMs?: number;
  }>>([]);

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

        addNotification({
          id,
          type: 'lockdown',
          title: '🔒 Security Alert',
          message: message.message || 'YAKKL will be locked soon due to inactivity.',
          timestamp: message.timestamp || Date.now(),
          countdown: Math.ceil(delayMs / 1000),
          delayMs
        });

        // Start countdown
        const interval = window.setInterval(() => {
          updateCountdown(id);
        }, 1000);

        // Store the interval ID
        notifications = notifications.map(n =>
          n.id === id ? { ...n, countdownInterval: interval } : n
        );
      }

      // Handle clear notifications
      else if (message.type === 'CLEAR_NOTIFICATION') {
        removeNotification(message.notificationId);
      }

      return true;
    };

    // Add listener for messages
    if (browser_ext.runtime && browser_ext.runtime.onMessage) {
      browser_ext.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      // Clean up listener
      if (browser_ext.runtime && browser_ext.runtime.onMessage) {
        browser_ext.runtime.onMessage.removeListener(messageListener);
      }

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
      clearInterval(notification.countdownInterval);
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
        clearInterval(notification.countdownInterval);
      }
    });
  }

  // Dismiss a notification
  function dismiss(id: string) {
    // Send activity message if it's a lockdown warning
    const notification = notifications.find(n => n.id === id);
    if (notification && notification.type === 'lockdown' && browser_ext) {
      try {
        browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now()
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
  function dismissAll() {
    // Send activity message
    if (browser_ext) {
      try {
        browser_ext.runtime.sendMessage({
          type: 'USER_ACTIVITY',
          timestamp: Date.now()
        }).catch(() => {
          // Ignore errors
        });
      } catch (e) {
        // Ignore errors
      }
    }

    // Clear all notifications
    clearAllIntervals();
    notifications = [];
  }
</script>

<!-- Notification Container -->
{#if notifications.length > 0}
<div class="fixed top-4 right-4 z-50 flex flex-col gap-4 max-w-md">
  {#each notifications as notification (notification.id)}
    <!-- Lockdown warning (special styling) -->
    {#if notification.type === 'lockdown'}
      <div
        class="p-4 bg-red-600 text-white rounded-lg shadow-lg"
        in:fly={{ x: 20, duration: 300 }}
        out:fade={{ duration: 200 }}
      >
        <div class="flex justify-between items-start">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m0 0v2m0-2h2m-2 0H9.5" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
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

        <div class="mt-3 flex justify-between items-center">
          <span class="text-sm">Locking in {notification.countdown || 0} seconds</span>
          <button
            class="bg-white text-red-600 px-3 py-1 rounded hover:bg-gray-100"
            onclick={() => dismiss(notification.id)}
          >
            Dismiss
          </button>
        </div>
      </div>
    <!-- Regular security alert -->
    {:else if notification.type === 'security'}
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
  {/each}

  <!-- Dismiss all button (only show if multiple notifications) -->
  {#if notifications.length > 1}
    <button
      class="self-end bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm"
      onclick={dismissAll}
    >
      Dismiss All
    </button>
  {/if}
</div>
{/if}
