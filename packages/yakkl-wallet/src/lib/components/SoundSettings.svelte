<script lang="ts">
  import { onMount } from 'svelte';
  import { Volume2, VolumeX, Play } from 'lucide-svelte';
  import { getSettings, setSettings } from '$lib/common/stores';
  import type { Settings } from '$lib/common/interfaces';
  import { log } from '$lib/common/logger-wrapper';

  interface Props {
    className?: string;
  }
  let { className = '' }: Props = $props();

  // Available sounds - using frequencies for built-in sounds
  const SOUND_OPTIONS = [
    { 
      id: 'default', 
      name: 'Default Beep',
      value: 'beep:800:0.2' // frequency:duration
    },
    {
      id: 'chime',
      name: 'Soft Chime',
      value: 'beep:600:0.3'
    },
    {
      id: 'bell',
      name: 'Bell',
      value: 'beep:440:0.4'
    },
    {
      id: 'alert',
      name: 'Alert',
      value: 'beep:1000:0.15'
    },
    {
      id: 'custom',
      name: 'Custom Sound',
      value: ''
    }
  ];

  let settings = $state<Settings | null>(null);
  let soundEnabled = $state(true);
  let selectedSound = $state('default');
  let customSoundUrl = $state('');
  let isPlaying = $state(false);

  let audioContext: AudioContext | null = null;

  onMount(() => {
    loadSettings();
    
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  });

  async function loadSettings() {
    try {
      settings = await getSettings();
      if (settings) {
        soundEnabled = settings.soundEnabled !== false; // Default to true
        
        // Find matching sound or set to custom
        const matchingSound = SOUND_OPTIONS.find(s => s.value === settings.sound);
        if (matchingSound) {
          selectedSound = matchingSound.id;
        } else if (settings.sound) {
          selectedSound = 'custom';
          customSoundUrl = settings.sound;
        }
      }
    } catch (error) {
      log.error('Failed to load sound settings', false, error);
    }
  }

  async function saveSettings() {
    if (!settings) return;

    try {
      let soundValue = '';
      
      if (selectedSound === 'custom') {
        soundValue = customSoundUrl;
      } else {
        const sound = SOUND_OPTIONS.find(s => s.id === selectedSound);
        soundValue = sound?.value || '';
      }

      settings.soundEnabled = soundEnabled;
      settings.sound = soundValue;
      
      await setSettings(settings);
      log.info('Sound settings saved');
    } catch (error) {
      log.error('Failed to save sound settings', false, error);
    }
  }

  async function playSound(event?: Event) {
    // Prevent event bubbling that might close the modal
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!soundEnabled || isPlaying) return;

    isPlaying = true;

    try {
      let soundData = '';
      if (selectedSound === 'custom') {
        soundData = customSoundUrl;
      } else {
        const sound = SOUND_OPTIONS.find(s => s.id === selectedSound);
        soundData = sound?.value || '';
      }

      if (!soundData) {
        throw new Error('No sound selected');
      }

      // Handle different sound formats
      if (soundData.startsWith('beep:')) {
        // Built-in beep sounds
        if (!audioContext) {
          audioContext = new AudioContext();
        }
        
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
        
        oscillator.onended = () => {
          isPlaying = false;
        };
      } else if (soundData.startsWith('http') || soundData.startsWith('/')) {
        // URL or file path
        const audio = new Audio(soundData);
        audio.volume = 0.5;
        audio.onended = () => { isPlaying = false; };
        audio.onerror = () => {
          log.error('Failed to load audio file', false, soundData);
          isPlaying = false;
        };
        await audio.play();
      } else {
        // Fallback to simple beep
        if (!audioContext) {
          audioContext = new AudioContext();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
        
        oscillator.onended = () => {
          isPlaying = false;
        };
      }
    } catch (error) {
      log.error('Failed to play sound', false, error);
      isPlaying = false;
    }
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    saveSettings();
  }

  function handleSoundChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    selectedSound = target.value;
    saveSettings();
  }

  function handleCustomUrlChange(event: Event) {
    const target = event.target as HTMLInputElement;
    customSoundUrl = target.value;
    if (selectedSound === 'custom') {
      saveSettings();
    }
  }
</script>

<div class="space-y-4 {className}">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Notification Sounds</h3>
    <button
      onclick={toggleSound}
      class="p-2 rounded-lg transition-colors {soundEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-600'}"
      aria-label={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
    >
      {#if soundEnabled}
        <Volume2 class="h-5 w-5" />
      {:else}
        <VolumeX class="h-5 w-5" />
      {/if}
    </button>
  </div>

  <div class="space-y-3">
    <div>
      <label for="sound-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Notification Sound
      </label>
      <div class="flex gap-2">
        <select
          id="sound-select"
          value={selectedSound}
          onchange={handleSoundChange}
          disabled={!soundEnabled}
          class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {#each SOUND_OPTIONS as sound}
            <option value={sound.id}>{sound.name}</option>
          {/each}
        </select>
        
        <button
          onclick={(e) => playSound(e)}
          disabled={!soundEnabled || isPlaying}
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          aria-label="Preview sound"
          type="button"
        >
          <Play class="h-4 w-4" />
          Preview
        </button>
      </div>
    </div>

    {#if selectedSound === 'custom'}
      <div>
        <label for="custom-url" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Custom Sound URL
        </label>
        <input
          id="custom-url"
          type="text"
          value={customSoundUrl}
          onchange={handleCustomUrlChange}
          disabled={!soundEnabled}
          placeholder="Enter sound URL or data URI"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter a URL to an audio file or a data URI
        </p>
      </div>
    {/if}

    <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">When sounds play:</h4>
      <ul class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <li class="flex items-start gap-2">
          <span class="text-yellow-500 mt-0.5">•</span>
          <span>First warning when session is about to expire (2 minutes before)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-red-500 mt-0.5">•</span>
          <span>Final warning (5 seconds before session expires)</span>
        </li>
        <li class="flex items-start gap-2">
          <span class="text-blue-500 mt-0.5">•</span>
          <span>Important security notifications</span>
        </li>
      </ul>
    </div>
  </div>
</div>