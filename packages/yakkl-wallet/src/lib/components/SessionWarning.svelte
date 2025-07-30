<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { browser_ext } from '$lib/common/environment';
  import { log } from '$lib/common/logger-wrapper';
  // import { Button } from '$lib/components/ui/button';
  import { Clock } from 'lucide-svelte';
  import { getSettings } from '$lib/common/stores';
  import type { Settings } from '$lib/common/interfaces';
  import { safeLogout } from '$lib/common/safeNavigate';

  let showWarning = false;
  let timeRemaining = 0;
  let countdown: ReturnType<typeof setInterval> | null = null;
  let settings: Settings | null = null;
  let audioContext: AudioContext | null = null;

  // Default notification sounds
  const DEFAULT_SOUNDS = {
    warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
    final: 'data:audio/wav;base64,UklGRl4EAABXQVZFZm10IBAAAAABAAEAiBUAAIgVAAABAAgAZGF0YToEAADJyszKx8C2rJePgnJjVUhDPjo8PkJIT1dfaXN+i5SgrKu5vsXJy8rKysfDvrWupZuTiYF3b2ddVk5HQTw5OTs/RElPV19neXuDlJeprLe8w8fJzMnKyMa8uLKon5'
  };

  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Play notification sound
  async function playSound(type: 'warning' | 'final') {
    if (!settings?.soundEnabled) return;

    try {
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      const soundData = settings?.sound || DEFAULT_SOUNDS[type];

      if (soundData.startsWith('beep:')) {
        // Built-in beep sounds
        const [, freq, duration] = soundData.split(':');
        const frequency = parseInt(freq) || 800;
        const durationSec = parseFloat(duration) || 0.2;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.3;
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + durationSec);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + durationSec);
      } else if (soundData.startsWith('data:')) {
        // Data URI - decode and play
        const response = await fetch(soundData);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } else if (soundData.startsWith('http') || soundData.startsWith('/')) {
        // URL or file path - create audio element
        const audio = new Audio(soundData);
        audio.volume = 0.5;
        await audio.play();
      } else {
        // Use default sound if format is unknown
        const defaultData = DEFAULT_SOUNDS[type];
        const response = await fetch(defaultData);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      }
    } catch (error) {
      log.error('Failed to play notification sound', false, error);
    }
  }

  // Load settings
  async function loadSettings() {
    try {
      settings = await getSettings();
    } catch (error) {
      log.error('Failed to load settings', false, error);
    }
  }

  async function extendSession() {
    try {
      await sessionManager.extendSession(30); // Extend by 30 minutes
      showWarning = false;
      clearCountdown();
      log.info('Session extended by user');

      // Clear any browser notification if shown
      if (browser_ext?.notifications) {
        try {
          await browser_ext.notifications.clear('session-warning');
        } catch (error) {
          log.debug('Could not clear notification', false, error);
        }
      }
    } catch (error) {
      log.error('Failed to extend session', false, error);
    }
  }

  function clearCountdown() {
    if (countdown) {
      clearInterval(countdown);
      countdown = null;
    }
  }

  async function handleLogout() {
    try {
      log.info('Session expired - performing logout');

      // Clear warning and countdown first
      showWarning = false;
      clearCountdown();

      // Clear any browser notifications
      if (browser_ext?.notifications) {
        try {
          await browser_ext.notifications.clear('session-warning');
        } catch (error) {
          log.debug('Could not clear notification', false, error);
        }
      }

      // End the session
      try {
        await sessionManager.endSession();
      } catch (error) {
        log.error('Failed to end session', false, error);
      }

      // Send logout message to background script first
      try {
        if (browser_ext) {
          await browser_ext.runtime.sendMessage({
            type: 'logout',
            payload: 'session-expired'
          });
        }
      } catch (error) {
        log.error('Failed to send logout message', false, error);
      }

      // Give the background script time to process the logout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then navigate to logout page which will close the window
      await safeLogout();
    } catch (error) {
      log.error('Failed to logout after session expiry', false, error);
      // Even if something fails, still try to navigate to logout
      try {
        await safeLogout();
      } catch (error) {
        log.error('Failed to navigate to logout', false, error);
      }
    }
  }

  async function showBrowserNotification(secondsRemaining: number) {
    if (!browser_ext?.notifications) return;

    try {
      await browser_ext.notifications.create('session-warning', {
        type: 'basic',
        iconUrl: browser_ext.runtime.getURL('/images/logoBullLock48x48.png'),
        title: 'YAKKL Session Expiring',
        message: `Your session will expire in ${formatTime(secondsRemaining)}. Click to extend.`,
        priority: 2,
        requireInteraction: true
      } as any);

      // Handle notification click
      const handleNotificationClick = (notificationId: string) => {
        if (notificationId === 'session-warning') {
          extendSession();
          focusWindow();
        }
      };

      // Add listener if not already added
      if (!browser_ext.notifications.onClicked.hasListener(handleNotificationClick)) {
        browser_ext.notifications.onClicked.addListener(handleNotificationClick);
      }
    } catch (error) {
      log.error('Failed to show browser notification', false, error);
    }
  }

  async function focusWindow() {
    try {
      // If we're in an extension popup or sidepanel
      if (browser_ext?.windows) {
        // Get current window
        const currentWindow = await browser_ext.windows.getCurrent();
        if (currentWindow) {
          // Update window to bring it to focus
          await browser_ext.windows.update(currentWindow.id, {
            focused: true,
            drawAttention: true
          });
        }
      }

      // Also try standard window.focus() for web contexts
      if (typeof window !== 'undefined' && window.focus) {
        window.focus();
      }
    } catch (error) {
      log.debug('Failed to focus window', false, error);
    }
  }

  onMount(() => {
    // Load settings on mount
    loadSettings();

    // Only set up callbacks if session manager is available
    if (sessionManager) {
      try {
        // Set up session warning callback
        sessionManager.setCallbacks({
          onWarning: async (seconds) => {
            timeRemaining = seconds;
            showWarning = true;

            // Play warning sound
            await playSound('warning');

            // Show browser notification
            await showBrowserNotification(seconds);

            // Focus the window to bring it to user's attention
            await focusWindow();

            // Start countdown
            clearCountdown();
            countdown = setInterval(async () => {
              timeRemaining--;

              // Play final warning sound at 5 seconds
              if (timeRemaining === 5) {
                playSound('final');
                // Try to focus again at critical moment
                await focusWindow();
              }

              if (timeRemaining <= 0) {
                clearCountdown();
                // Auto-logout when timer expires
                await handleLogout();
              }
            }, 1000);
          },
          onExpired: async () => {
            showWarning = false;
            clearCountdown();
            // Session expired - logout the user
            await handleLogout();
          },
          onExtended: () => {
            showWarning = false;
            clearCountdown();
          }
        });
      } catch (error) {
        log.error('Failed to set session callbacks', false, error);
      }
    }
  });

  onDestroy(() => {
    clearCountdown();
    if (audioContext) {
      audioContext.close();
    }
  });
</script>

{#if showWarning}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
    <div class="w-full max-w-md p-4">
      <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 border border-orange-500">
        <div class="flex items-start gap-3">
          <Clock class="h-5 w-5 text-orange-600 mt-0.5" />
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
              Session Expiring Soon
            </h3>
            <div class="space-y-4">
              <p class="text-orange-700 dark:text-orange-300">
                Your session will expire in <strong>{formatTime(timeRemaining)}</strong>.
              </p>
              <p class="text-sm text-orange-600 dark:text-orange-400">
                Click "Extend Session" to continue working, or your session will automatically end for security.
              </p>
              <div class="flex gap-3 mt-4">
                <button
                  onclick={extendSession}
                  class="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
                >
                  Extend Session
                </button>
<!--                   variant="outline"
 -->
                <button
                  onclick={handleLogout}
                  class="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                >
                  Log Out Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
