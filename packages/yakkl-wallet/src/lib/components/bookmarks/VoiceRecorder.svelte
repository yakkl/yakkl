<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { enhancedBookmarkStore } from '$lib/stores/enhancedBookmark.store';
  import type { BookmarkNote } from '$lib/types/bookmark.types';
  
  interface Props {
    bookmarkId: string;
    onSave?: (note: BookmarkNote) => void;
    onCancel?: () => void;
    maxDuration?: number;
  }
  
  let {
    bookmarkId,
    onSave,
    onCancel,
    maxDuration = 120
  }: Props = $props();
  
  let isRecording = $state(false);
  let isPaused = $state(false);
  let isPlaying = $state(false);
  let isSaving = $state(false);
  let recordingTime = $state(0);
  let playbackTime = $state(0);
  let audioUrl = $state<string | null>(null);
  let waveformData = $state<number[]>(new Array(50).fill(0));
  let permissionStatus = $state<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  let showPermissionGuide = $state(false);
  let noteTitle = $state('');
  
  let mediaRecorder: MediaRecorder | null = null;
  let audioChunks: Blob[] = [];
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let stream: MediaStream | null = null;
  let recordingTimer: number | null = null;
  let playbackTimer: number | null = null;
  let audioElement: HTMLAudioElement | null = null;
  let animationFrame: number | null = null;
  
  onMount(async () => {
    await checkPermissionStatus();
    // Auto-request permission on mount for better UX
    if (permissionStatus === 'prompt') {
      await requestMicrophonePermission();
    }
  });
  
  onDestroy(() => {
    cleanup();
  });
  
  async function checkPermissionStatus() {
    try {
      // Check if permission API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionStatus = result.state as 'prompt' | 'granted' | 'denied';
        
        result.addEventListener('change', () => {
          permissionStatus = result.state as 'prompt' | 'granted' | 'denied';
        });
      } else {
        // Fallback: try to get stream to check permission
        permissionStatus = stream ? 'granted' : 'prompt';
      }
    } catch (error) {
      console.log('Permission API not available, will request on record');
      permissionStatus = 'prompt';
    }
  }

  async function requestMicrophonePermission() {
    try {
      permissionStatus = 'checking';
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setupAudioContext();
      permissionStatus = 'granted';
      showPermissionGuide = false;
      
      // Play a success sound to indicate microphone is working
      playSound('start');
      setTimeout(() => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
      }, 500);
    } catch (error) {
      console.error('Failed to get microphone permission:', error);
      permissionStatus = 'denied';
      showPermissionGuide = true;
    }
  }
  
  function setupAudioContext() {
    if (!stream) return;
    
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
  }
  
  async function startRecording() {
    console.log('Start recording clicked');
    if (!stream) {
      await requestMicrophonePermission();
      if (!stream) {
        console.log('No stream available after permission request');
        return;
      }
    }
    
    audioChunks = [];
    audioUrl = null;
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioUrl = URL.createObjectURL(audioBlob);
      audioChunks = [];
    };
    
    mediaRecorder.start();
    isRecording = true;
    isPaused = false;
    recordingTime = 0;
    
    startRecordingTimer();
    startWaveformAnimation();
    playSound('start');
  }
  
  function pauseRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      isPaused = true;
      stopRecordingTimer();
      stopWaveformAnimation();
    }
  }
  
  function resumeRecording() {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      isPaused = false;
      startRecordingTimer();
      startWaveformAnimation();
    }
  }
  
  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      isRecording = false;
      isPaused = false;
      stopRecordingTimer();
      stopWaveformAnimation();
      playSound('stop');
    }
  }
  
  function startRecordingTimer() {
    recordingTimer = window.setInterval(() => {
      recordingTime += 0.1;
      
      if (recordingTime >= maxDuration) {
        stopRecording();
      }
    }, 100);
  }
  
  function stopRecordingTimer() {
    if (recordingTimer !== null) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
  }
  
  function startWaveformAnimation() {
    const updateWaveform = () => {
      if (!analyser || !isRecording || isPaused) return;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);
      
      const step = Math.floor(bufferLength / 50);
      const newData = [];
      
      for (let i = 0; i < 50; i++) {
        const value = dataArray[i * step] / 255;
        newData.push(value);
      }
      
      waveformData = newData;
      
      if (isRecording && !isPaused) {
        animationFrame = requestAnimationFrame(updateWaveform);
      }
    };
    
    updateWaveform();
  }
  
  function stopWaveformAnimation() {
    if (animationFrame !== null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    waveformData = new Array(50).fill(0);
  }
  
  async function playRecording() {
    if (!audioUrl) return;
    
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    
    audioElement = new Audio(audioUrl);
    audioElement.onended = () => {
      isPlaying = false;
      playbackTime = 0;
      stopPlaybackTimer();
    };
    
    audioElement.ontimeupdate = () => {
      if (audioElement) {
        playbackTime = audioElement.currentTime;
      }
    };
    
    await audioElement.play();
    isPlaying = true;
    startPlaybackTimer();
  }
  
  function pausePlayback() {
    if (audioElement) {
      audioElement.pause();
      isPlaying = false;
      stopPlaybackTimer();
    }
  }
  
  function startPlaybackTimer() {
    playbackTimer = window.setInterval(() => {
      if (audioElement) {
        playbackTime = audioElement.currentTime;
      }
    }, 100);
  }
  
  function stopPlaybackTimer() {
    if (playbackTimer !== null) {
      clearInterval(playbackTimer);
      playbackTimer = null;
    }
  }
  
  async function saveRecording() {
    if (!audioUrl) return;
    
    isSaving = true;
    
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      const note = await enhancedBookmarkStore.addNote(bookmarkId, {
        type: 'voice',
        title: noteTitle || undefined,
        content: base64,
        duration: recordingTime
      });
      
      if (onSave) {
        onSave(note);
      }
      
      playSound('save');
      cleanup();
      
    } catch (error) {
      console.error('Failed to save voice note:', error);
    } finally {
      isSaving = false;
    }
  }
  
  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  function cancelRecording() {
    cleanup();
    if (onCancel) {
      onCancel();
    }
  }
  
  function cleanup() {
    stopRecording();
    stopRecordingTimer();
    stopPlaybackTimer();
    stopWaveformAnimation();
    
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      audioUrl = null;
    }
    
    if (source) {
      source.disconnect();
      source = null;
    }
    
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function playSound(type: 'start' | 'stop' | 'save') {
    try {
      const sounds = {
        start: '/sounds/record-start.mp3',
        stop: '/sounds/record-stop.mp3',
        save: '/sounds/voice-save.mp3'
      };
      
      const audio = new Audio(sounds[type]);
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound playback not available');
    }
  }
</script>

<div class="voice-recorder" transition:scale={{ duration: 300 }}>
  <div class="recorder-header">
    <h3 class="text-lg font-semibold text-base-content flex items-center gap-2">
      <span class="text-2xl">🎙️</span>
      Voice Note
    </h3>
    
    <button
      class="btn btn-ghost btn-sm btn-circle"
      onclick={cancelRecording}
      title="Cancel"
    >
      ✕
    </button>
  </div>
  
  <!-- Title Input -->
  <div class="px-4 pb-2">
    <input
      type="text"
      bind:value={noteTitle}
      placeholder="Give your voice note a title..."
      class="input input-bordered input-sm w-full"
    />
  </div>
  
  <div class="recorder-body">
    {#if permissionStatus === 'checking'}
      <!-- Loading State -->
      <div class="flex flex-col items-center justify-center p-8 space-y-3">
        <span class="loading loading-spinner loading-lg"></span>
        <p class="text-sm text-base-content/60">Checking microphone access...</p>
      </div>
    {:else if permissionStatus === 'denied' || showPermissionGuide}
      <!-- Permission Guide -->
      <div class="permission-guide">
        <div class="bg-error/10 border border-error/20 rounded-lg p-4">
          <h4 class="font-semibold text-error mb-3 flex items-center gap-2">
            <span class="text-2xl">🎤</span>
            Microphone Access Needed
          </h4>
          
          <div class="space-y-3">
            <p class="text-sm">
              Your browser has blocked microphone access. Here's how to fix it:
            </p>
            
            <div class="bg-base-200 rounded-lg p-3 space-y-2">
              <div class="flex items-start gap-2">
                <span class="badge badge-primary badge-sm">1</span>
                <p class="text-sm flex-1">
                  Look for the <span class="font-mono bg-base-300 px-1 rounded">🔒</span> or 
                  <span class="font-mono bg-base-300 px-1 rounded">ⓘ</span> icon 
                  in your browser's address bar
                </p>
              </div>
              
              <div class="flex items-start gap-2">
                <span class="badge badge-primary badge-sm">2</span>
                <p class="text-sm flex-1">
                  Click on it and find <strong>"Microphone"</strong> in the permissions
                </p>
              </div>
              
              <div class="flex items-start gap-2">
                <span class="badge badge-primary badge-sm">3</span>
                <p class="text-sm flex-1">
                  Change from <span class="text-error font-semibold">❌ Block</span> to 
                  <span class="text-success font-semibold">✅ Allow</span>
                </p>
              </div>
              
              <div class="flex items-start gap-2">
                <span class="badge badge-primary badge-sm">4</span>
                <p class="text-sm flex-1">
                  Close and reopen this voice recorder
                </p>
              </div>
            </div>
            
            <div class="divider">OR</div>
            
            <button 
              class="btn btn-primary btn-sm w-full"
              onclick={() => requestMicrophonePermission()}
            >
              🎤 Request Permission Again
            </button>
            
            <p class="text-xs text-base-content/60 text-center">
              Note: If the button above doesn't work, you must manually allow access using the steps above.
            </p>
          </div>
        </div>
      </div>
    {:else if !audioUrl}
      <div class="waveform-container">
        <div class="waveform">
          {#each waveformData as level, i}
            <div 
              class="waveform-bar"
              style="height: {Math.max(5, level * 100)}%"
              class:active={isRecording && !isPaused}
            ></div>
          {/each}
        </div>
      </div>
      
      <div class="timer">
        {formatTime(recordingTime)} / {formatTime(maxDuration)}
      </div>
      
      <div class="controls">
        {#if !isRecording}
          <button
            class="btn btn-primary btn-circle btn-lg"
            onclick={startRecording}
            title="Start recording"
          >
            <span class="text-2xl">🔴</span>
          </button>
        {:else if isPaused}
          <button
            class="btn btn-success btn-circle"
            onclick={resumeRecording}
            title="Resume"
          >
            ▶️
          </button>
          <button
            class="btn btn-error btn-circle"
            onclick={stopRecording}
            title="Stop"
          >
            ⏹️
          </button>
        {:else}
          <button
            class="btn btn-warning btn-circle"
            onclick={pauseRecording}
            title="Pause"
          >
            ⏸️
          </button>
          <button
            class="btn btn-error btn-circle"
            onclick={stopRecording}
            title="Stop"
          >
            ⏹️
          </button>
        {/if}
      </div>
      
    {:else}
      <div class="playback-container">
        <div class="audio-preview">
          <div class="timer">
            {formatTime(playbackTime)} / {formatTime(recordingTime)}
          </div>
          
          <div class="progress-bar">
            <div 
              class="progress-fill"
              style="width: {(playbackTime / recordingTime) * 100}%"
            ></div>
          </div>
        </div>
        
        <div class="controls">
          {#if !isPlaying}
            <button
              class="btn btn-primary btn-circle"
              onclick={playRecording}
              title="Play"
            >
              ▶️
            </button>
          {:else}
            <button
              class="btn btn-warning btn-circle"
              onclick={pausePlayback}
              title="Pause"
            >
              ⏸️
            </button>
          {/if}
          
          <button
            class="btn btn-error btn-circle"
            onclick={startRecording}
            title="Re-record"
          >
            🔄
          </button>
          
          <button
            class="btn btn-success btn-circle"
            onclick={saveRecording}
            disabled={isSaving}
            title="Save"
          >
            {#if isSaving}
              <span class="loading loading-spinner"></span>
            {:else}
              💾
            {/if}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .voice-recorder {
    @apply bg-base-100 text-base-content rounded-lg shadow-xl p-4 w-80;
    border: 1px solid rgba(var(--base-300), 0.5);
  }
  
  .recorder-header {
    @apply flex justify-between items-center mb-4 pb-2 border-b border-base-300;
  }
  
  .recorder-body {
    @apply space-y-4;
  }
  
  .waveform-container {
    @apply bg-base-200 rounded-lg p-4 h-24 flex items-center justify-center;
  }
  
  .waveform {
    @apply flex items-center justify-center gap-1 h-full w-full;
  }
  
  .waveform-bar {
    @apply bg-base-content/30 rounded-full transition-all duration-100;
    width: 2px;
    min-height: 5px;
  }
  
  .waveform-bar.active {
    @apply bg-primary;
    animation: pulse 0.5s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
  }
  
  .timer {
    @apply text-center font-mono text-lg text-base-content;
  }
  
  .controls {
    @apply flex justify-center gap-2;
  }
  
  .playback-container {
    @apply space-y-4;
  }
  
  .audio-preview {
    @apply space-y-2;
  }
  
  .progress-bar {
    @apply bg-base-200 rounded-full h-2 overflow-hidden;
  }
  
  .progress-fill {
    @apply bg-primary h-full transition-all duration-100;
  }
  
  /* Dark mode enhancements */
  :global(.dark) .voice-recorder {
    @apply bg-base-100 text-base-content;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  }
  
  :global(.dark) .waveform-container {
    @apply bg-base-200;
  }
  
  :global(.dark) .permission-guide {
    @apply text-base-content;
  }
</style>