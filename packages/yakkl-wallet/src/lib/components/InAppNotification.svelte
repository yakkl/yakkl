<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { browser_ext, browserSvelte } from '$lib/common/environment';
  import { NotificationService } from '$lib/common/notifications';
  import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
  import { getSettings } from '$lib/common/stores';
  import type { Settings } from '$lib/common/interfaces';
  import { Bell, BellOff, X, AlertTriangle, Info, CheckCircle, XCircle, Clock, Volume2 } from 'lucide-svelte';
  import { addSafeMessageListener } from '$lib/common/messageChannelWrapper';

  // Notification types
  type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'security' | 'lockdown';

  interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    countdown?: number;
    countdownInterval?: string;
    delayMs?: number;
    persistent?: boolean;
    action?: {
      label: string;
      callback: () => void;
    };
  }

  // State
  let notifications = $state<Notification[]>([]);
  let isLockdownActive = $state(false);
  let lockdownTimeLeft = $state(0);
  let isUrgent = $state(false);
  let settings = $state<Settings | null>(null);
  let removeMessageListener: (() => void) | null = null;

  // Audio context for playing sounds
  let audioContext: AudioContext | null = null;

  const timerManager = UnifiedTimerManager.getInstance();

  // Default notification sounds as data URIs
  const DEFAULT_SOUNDS = {
    warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
    final: 'data:audio/wav;base64,UklGRl4EAABXQVZFZm10IBAAAAABAAEAiBUAAIgVAAABAAgAZGF0YToEAADJyszKx8C2rJePgnJjVUhDPjo8PkJIT1dfaXN+i5SgrKu5vsXJy8rKysfDvrWupZuTiYF3b2ddVk5HQTw5OTs/RElPV19neXuDlJeprLe8w8fJzMnKyMa8uLKon5'
  };

  // Get notification icon based on type
  function getNotificationIcon(type: NotificationType) {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return XCircle;
      case 'security': return AlertTriangle;
      case 'lockdown': return Clock;
      default: return Info;
    }
  }

  // Get notification colors based on type
  function getNotificationColors(type: NotificationType) {
    switch (type) {
      case 'info': return 'bg-blue-500 dark:bg-blue-600 text-white';
      case 'success': return 'bg-green-500 dark:bg-green-600 text-white';
      case 'warning': return 'bg-yellow-500 dark:bg-yellow-600 text-white';
      case 'error': return 'bg-red-500 dark:bg-red-600 text-white';
      case 'security': return 'bg-orange-500 dark:bg-orange-600 text-white';
      case 'lockdown': return 'bg-red-600 dark:bg-red-700 text-white';
      default: return 'bg-gray-500 dark:bg-gray-600 text-white';
    }
  }

  // Play notification sound
  async function playNotificationSound(type: 'warning' | 'final') {
    if (!settings?.soundEnabled) return;

    try {
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      // Use custom sound if available, otherwise use default
      const soundData = settings?.sound || DEFAULT_SOUNDS[type];
      
      if (soundData.startsWith('data:')) {
        // Data URI - decode and play
        const response = await fetch(soundData);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } else {
        // File path - create audio element
        const audio = new Audio(soundData);
        audio.volume = 0.5;
        await audio.play();
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  // Load settings
  async function loadSettings() {
    try {
      settings = await getSettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // Initialize
  onMount(() => {
    if (!browserSvelte || !browser_ext) return;

    loadSettings();

    const messageListener = (message: any, sender: any, sendResponse: any): void => {
      if (!message || typeof message !== 'object') return;

      // Handle different notification types
      switch (message.type) {
        case 'SHOW_NOTIFICATION':
          addNotification({
            id: message.id || `notification-${Date.now()}`,
            type: message.notificationType || 'info',
            title: message.title || 'Notification',
            message: message.message,
            timestamp: message.timestamp || Date.now(),
            persistent: message.persistent,
            action: message.action
          });
          break;

        case 'SECURITY_ALERT':
        case 'IMPORTANT_NOTIFICATION':
          addNotification({
            id: message.id || `notification-${Date.now()}`,
            type: 'security',
            title: message.title || '🔒 Security Alert',
            message: message.message,
            timestamp: message.timestamp || Date.now()
          });
          break;

        case 'LOCKDOWN_WARNING':
          handleLockdownWarning(message);
          break;

        case 'CLEAR_NOTIFICATION':
          removeNotification(message.notificationId);
          break;

        case 'CLEAR_ALL_NOTIFICATIONS':
          dismissAll();
          break;
      }
    };

    // Event listeners
    const handleIdleStateChange = (event: CustomEvent) => {
      if (event.detail.state === 'active') {
        clearLockdownState();
      }
    };

    const handleUserActivity = () => {
      if (isLockdownActive) {
        clearLockdownState();
      }
    };

    // Add safe message listener
    removeMessageListener = addSafeMessageListener(messageListener);

    window.addEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
    window.addEventListener('yakklUserActivityDetected', handleUserActivity);

    return () => {
      // Cleanup
      if (removeMessageListener) {
        removeMessageListener();
      }

      window.removeEventListener('yakklIdleStateChanged', handleIdleStateChange as EventListener);
      window.removeEventListener('yakklUserActivityDetected', handleUserActivity);

      clearAllIntervals();
    };
  });

  onDestroy(() => {
    clearAllIntervals();
    if (audioContext) {
      audioContext.close();
    }
  });

  // Handle lockdown warning
  function handleLockdownWarning(message: any) {
    const id = `lockdown-${Date.now()}`;
    const delayMs = message.delayMs || 30000;
    const countdown = Math.ceil(delayMs / 1000);

    // Play warning sound
    playNotificationSound('warning');

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

    // Start countdown
    const intervalId = `countdown-${id}`;
    timerManager.addInterval(
      intervalId,
      () => {
        updateCountdown(id);
      },
      1000
    );
    timerManager.startInterval(intervalId);

    // Store interval ID
    notifications = notifications.map(n =>
      n.id === id ? { ...n, countdownInterval: intervalId } : n
    );

    // Notify background
    if (browser_ext.runtime) {
      browser_ext.runtime.sendMessage({
        type: 'lockdownImminent',
        delayMs,
        timestamp: Date.now()
      });
    }
  }

  // Add notification
  function addNotification(notification: Notification) {
    const existing = notifications.find(n => n.id === notification.id);

    if (existing) {
      // Update existing
      notifications = notifications.map(n =>
        n.id === notification.id ? { ...n, ...notification } : n
      );
    } else {
      // Add new
      notifications = [...notifications, notification];

      // Auto-dismiss non-persistent notifications after 5 seconds
      if (!notification.persistent && notification.type !== 'lockdown') {
        setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);
      }
    }
  }

  // Remove notification
  function removeNotification(id: string) {
    const notification = notifications.find(n => n.id === id);
    
    if (notification) {
      // Clear countdown interval
      if (notification.countdownInterval) {
        timerManager.stopInterval(notification.countdownInterval);
        timerManager.removeInterval(notification.countdownInterval);
      }

      // Clear lockdown state if needed
      if (notification.type === 'lockdown') {
        clearLockdownState();
      }

      // Remove from list
      notifications = notifications.filter(n => n.id !== id);
    }
  }

  // Update countdown
  function updateCountdown(id: string) {
    const notification = notifications.find(n => n.id === id);

    if (notification?.countdown) {
      const newCountdown = notification.countdown - 1;
      lockdownTimeLeft = newCountdown;
      isUrgent = newCountdown <= 10;

      // Play final warning sound
      if (newCountdown === 5) {
        playNotificationSound('final');
      }

      if (newCountdown <= 0) {
        removeNotification(id);
      } else {
        notifications = notifications.map(n =>
          n.id === id ? { ...n, countdown: newCountdown } : n
        );
      }
    }
  }

  // Clear lockdown state
  function clearLockdownState() {
    isLockdownActive = false;
    lockdownTimeLeft = 0;
    isUrgent = false;
    notifications = notifications.filter(n => n.type !== 'lockdown');
    clearAllIntervals();
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

  // Dismiss notification
  function dismiss(id: string) {
    const notification = notifications.find(n => n.id === id);
    
    // Send security activity for lockdown
    if (notification?.type === 'lockdown' && browser_ext) {
      browser_ext.runtime.sendMessage({
        type: 'USER_ACTIVITY',
        timestamp: Date.now(),
        context: 'security',
        action: 'dismiss_lockdown_warning'
      });
    }

    removeNotification(id);
  }

  // Dismiss all
  async function dismissAll() {
    const hasLockdown = notifications.some(n => n.type === 'lockdown');
    
    if (hasLockdown && browser_ext) {
      await browser_ext.runtime.sendMessage({
        type: 'USER_ACTIVITY',
        timestamp: Date.now(),
        context: 'security',
        action: 'dismiss_all_lockdown_warnings'
      });
    }

    await NotificationService.clearAllAlertsEnhanced();
    
    clearAllIntervals();
    notifications = [];
    clearLockdownState();
  }

  // Handle notification action
  function handleAction(notification: Notification) {
    if (notification.action?.callback) {
      notification.action.callback();
    }
    removeNotification(notification.id);
  }
</script>

<!-- Lockdown Bar -->
{#if isLockdownActive}
  <div
    class="fixed top-0 left-0 right-0 z-[1001] bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg border-b-2 border-red-500"
    class:animate-pulse={isUrgent}
    transition:fly={{ y: -100, duration: 400 }}
  >
    <div class="max-w-7xl mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        <!-- Left: Icon and message -->
        <div class="flex items-center gap-3">
          <div class="relative">
            <Clock class="h-6 w-6 text-yellow-300 {isUrgent ? 'animate-spin' : ''}" />
            {#if isUrgent}
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            {/if}
          </div>
          
          <div>
            <div class="font-semibold text-lg">🔒 YAKKL Security Alert</div>
            <div class="text-red-100 text-sm">
              Wallet will lock due to inactivity - take any action to stay active
            </div>
          </div>
        </div>

        <!-- Center: Countdown -->
        <div class="flex items-center gap-4">
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
              <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="2" fill="none" class="text-red-800" />
              <circle
                cx="16" cy="16" r="14"
                stroke="currentColor" stroke-width="2" fill="none"
                stroke-linecap="round"
                class="text-yellow-300 transition-all duration-1000"
                class:text-yellow-100={isUrgent}
                style="stroke-dasharray: {2 * Math.PI * 14}; stroke-dashoffset: {2 * Math.PI * 14 * (1 - lockdownTimeLeft / 30)}"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="text-xs font-bold text-white">
                {Math.round((lockdownTimeLeft / 30) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-3">
          <button
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-red-600"
            onclick={() => dismissAll()}
          >
            ✅ I'm Active
          </button>

          <button
            class="text-red-200 hover:text-white transition-colors duration-200"
            onclick={() => dismissAll()}
            aria-label="Dismiss"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Regular Notifications -->
{#if notifications.length > 0}
  <div
    class="fixed right-4 z-40 flex flex-col gap-3 max-w-md transition-all duration-300"
    class:top-24={isLockdownActive}
    class:top-4={!isLockdownActive}
  >
    {#each notifications as notification (notification.id)}
      {#if notification.type !== 'lockdown'}
        {@const Icon = getNotificationIcon(notification.type)}
        {@const colors = getNotificationColors(notification.type)}
        
        <div
          class="p-4 rounded-lg shadow-xl backdrop-blur-sm {colors} transition-all duration-300 hover:shadow-2xl"
          in:fly={{ x: 50, duration: 300 }}
          out:fade={{ duration: 200 }}
        >
          <div class="flex items-start gap-3">
            <Icon class="h-5 w-5 flex-shrink-0 mt-0.5" />
            
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-sm">{notification.title}</h3>
              <p class="text-sm mt-1 opacity-90">{notification.message}</p>
              
              {#if notification.action}
                <button
                  class="mt-2 text-xs font-medium px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                  onclick={() => handleAction(notification)}
                >
                  {notification.action.label}
                </button>
              {/if}
            </div>

            <button
              class="opacity-70 hover:opacity-100 transition-opacity"
              onclick={() => dismiss(notification.id)}
              aria-label="Dismiss"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </div>
      {/if}
    {/each}

    <!-- Dismiss all button -->
    {#if notifications.filter(n => n.type !== 'lockdown').length > 1}
      <button
        class="self-end bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm transition-colors"
        onclick={dismissAll}
      >
        Dismiss All
      </button>
    {/if}
  </div>
{/if}