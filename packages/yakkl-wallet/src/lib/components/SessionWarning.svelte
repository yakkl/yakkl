<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionManager } from '$lib/managers/SessionManager';
  import { browser_ext } from '$lib/common/environment';
  import { log } from '$lib/common/logger-wrapper';
  import { Button } from '$lib/components/ui/button';
  import { Clock } from 'lucide-svelte';
  import { getSettings } from '$lib/common/stores';
  import type { Settings } from '$lib/common/interfaces';

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
      });

      // Handle notification click
      const handleNotificationClick = (notificationId: string) => {
        if (notificationId === 'session-warning') {
          extendSession();
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

  onMount(() => {
    // Load settings on mount
    loadSettings();

    // Set up session warning callback
    sessionManager.setCallbacks({
      onWarning: async (seconds) => {
        timeRemaining = seconds;
        showWarning = true;

        // Play warning sound
        await playSound('warning');

        // Show browser notification
        await showBrowserNotification(seconds);

        // Start countdown
        clearCountdown();
        countdown = setInterval(() => {
          timeRemaining--;
          
          // Play final warning sound at 5 seconds
          if (timeRemaining === 5) {
            playSound('final');
          }
          
          if (timeRemaining <= 0) {
            clearCountdown();
            showWarning = false;
          }
        }, 1000);
      },
      onExpired: () => {
        showWarning = false;
        clearCountdown();
        // Session expired - user will be redirected to login
      },
      onExtended: () => {
        showWarning = false;
        clearCountdown();
      }
    });
  });

  onDestroy(() => {
    clearCountdown();
    if (audioContext) {
      audioContext.close();
    }
  });
</script>

{#if showWarning}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
                <Button
                  onclick={extendSession}
                  variant="default"
                  class="flex-1 bg-primary hover:bg-primary/90"
                >
                  Extend Session
                </Button>
                <Button
                  onclick={() => { showWarning = false; clearCountdown(); }}
                  variant="outline"
                  class="flex-1"
                >
                  Log Out Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}