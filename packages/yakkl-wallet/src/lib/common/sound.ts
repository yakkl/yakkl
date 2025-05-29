import { log } from "$lib/plugins/Logger";

/**
 * Play a beep sound immediately
 * @param frequency - Sound frequency in Hz (default: 800)
 * @param duration - Sound duration in seconds (default: 0.2)
 * @param volume - Sound volume 0-1 (default: 0.3)
 */
export function playBeep(frequency: number = 800, duration: number = 0.2, volume: number = 0.3): void {
  try {
    if (typeof window === 'undefined' || !window.AudioContext) {
      return;
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    (window as any).__yakklAudioContext = audioContext;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    // Clean up after sound finishes
    setTimeout(() => {
      audioContext.close().catch(() => {});
    }, (duration + 0.1) * 1000);
  } catch (error) {
    log.error('[Sound] Failed to play beep:', false, error);
  }
}
