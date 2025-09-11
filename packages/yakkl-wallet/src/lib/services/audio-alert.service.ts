/**
 * Smart Audio Alert Service
 * Provides audio feedback for network events with intelligent throttling
 */

import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';

export type AlertType = 'networkDown' | 'networkRestored' | 'providerSwitch' | 'degraded' | 'critical';
export type SoundPack = 'default' | 'subtle' | 'urgent';

export interface AudioAlertConfig {
  enabled: boolean;
  volume: number; // 0-100
  soundPack: SoundPack;
  throttle: {
    maxPerMinute: number;
    escalateAfter: number; // seconds
    muteInBackground: boolean;
  };
  sounds: Record<AlertType, boolean>; // Enable/disable specific alerts
}

interface AlertHistory {
  timestamp: number;
  type: AlertType;
}

class AudioAlertService {
  private static instance: AudioAlertService | null = null;
  private audioContext: AudioContext | null = null;
  private config: AudioAlertConfig;
  private alertHistory: AlertHistory[] = [];
  private isBackgrounded = false;
  private escalationTimer: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'audio_alert_config';
  
  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeAudioContext();
    this.loadConfig();
    this.setupVisibilityListener();
  }
  
  static getInstance(): AudioAlertService {
    if (!AudioAlertService.instance) {
      AudioAlertService.instance = new AudioAlertService();
    }
    return AudioAlertService.instance;
  }
  
  /**
   * Initialize Web Audio API context
   */
  private initializeAudioContext(): void {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        this.audioContext = new AudioContext();
      } else if (typeof window !== 'undefined' && 'webkitAudioContext' in window) {
        // @ts-ignore - Fallback for older browsers
        this.audioContext = new webkitAudioContext();
      }
    } catch (error) {
      log.error('AudioAlert: Failed to initialize audio context:', false, error);
    }
  }
  
  /**
   * Get default configuration
   */
  private getDefaultConfig(): AudioAlertConfig {
    return {
      enabled: true,
      volume: 50,
      soundPack: 'default',
      throttle: {
        maxPerMinute: 3,
        escalateAfter: 60,
        muteInBackground: true
      },
      sounds: {
        networkDown: true,
        networkRestored: true,
        providerSwitch: true,
        degraded: true,
        critical: true
      }
    };
  }
  
  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const result = await browser.storage.local.get(this.STORAGE_KEY);
      if (result[this.STORAGE_KEY]) {
        this.config = { ...this.config, ...(result[this.STORAGE_KEY] as AudioAlertConfig) };
      }
    } catch (error) {
      log.error('AudioAlert: Failed to load config:', false, error);
    }
  }
  
  /**
   * Save configuration to storage
   */
  async saveConfig(config: Partial<AudioAlertConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await browser.storage.local.set({
        [this.STORAGE_KEY]: this.config
      });
    } catch (error) {
      log.error('AudioAlert: Failed to save config:', false, error);
    }
  }
  
  /**
   * Setup visibility change listener
   */
  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isBackgrounded = document.hidden;
      });
    }
  }
  
  /**
   * Check if alert should be throttled
   */
  private shouldThrottle(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old history
    this.alertHistory = this.alertHistory.filter(h => h.timestamp > oneMinuteAgo);
    
    // Check throttle limit
    return this.alertHistory.length >= this.config.throttle.maxPerMinute;
  }
  
  /**
   * Play an alert sound
   */
  async playAlert(type: AlertType, force: boolean = false): Promise<void> {
    try {
      // Check if alerts are enabled
      if (!this.config.enabled || !this.config.sounds[type]) {
        return;
      }
      
      // Check if backgrounded and should mute
      if (this.isBackgrounded && this.config.throttle.muteInBackground && !force) {
        log.debug('AudioAlert: Muted in background');
        return;
      }
      
      // Check throttling
      if (!force && this.shouldThrottle()) {
        log.debug('AudioAlert: Throttled');
        return;
      }
      
      // Resume audio context if suspended
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Play the appropriate sound
      await this.playSound(type);
      
      // Record in history
      this.alertHistory.push({
        timestamp: Date.now(),
        type
      });
      
      // Setup escalation if needed
      if (type === 'networkDown' || type === 'critical') {
        this.setupEscalation(type);
      }
      
      log.debug(`AudioAlert: Played ${type} alert`);
    } catch (error) {
      log.error('AudioAlert: Failed to play alert:', false, error);
    }
  }
  
  /**
   * Play sound using Web Audio API
   */
  private async playSound(type: AlertType): Promise<void> {
    if (!this.audioContext) {
      log.warn('AudioAlert: No audio context available');
      return;
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Set volume
    const volume = this.config.volume / 100;
    gainNode.gain.value = volume * 0.3; // Scale down for comfort
    
    // Configure sound based on type and pack
    const { frequency, duration, pattern } = this.getSoundConfig(type);
    
    // Play pattern
    const startTime = this.audioContext.currentTime;
    for (let i = 0; i < pattern.length; i++) {
      const [freq, dur] = pattern[i];
      const time = startTime + (i * 0.2);
      
      oscillator.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(freq > 0 ? volume * 0.3 : 0, time);
    }
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
  
  /**
   * Get sound configuration for alert type
   */
  private getSoundConfig(type: AlertType): {
    frequency: number;
    duration: number;
    pattern: [number, number][];
  } {
    const pack = this.config.soundPack;
    
    // Sound patterns: [frequency, duration] pairs
    const configs = {
      networkDown: {
        default: {
          frequency: 440,
          duration: 0.8,
          pattern: [[880, 0.1], [0, 0.1], [440, 0.2], [0, 0.1], [220, 0.3]]
        },
        subtle: {
          frequency: 330,
          duration: 0.4,
          pattern: [[330, 0.2], [0, 0.1], [330, 0.1]]
        },
        urgent: {
          frequency: 880,
          duration: 1.2,
          pattern: [[880, 0.2], [660, 0.2], [880, 0.2], [660, 0.2], [880, 0.2], [660, 0.2]]
        }
      },
      networkRestored: {
        default: {
          frequency: 523,
          duration: 0.6,
          pattern: [[261, 0.1], [330, 0.1], [392, 0.1], [523, 0.3]]
        },
        subtle: {
          frequency: 440,
          duration: 0.3,
          pattern: [[440, 0.1], [554, 0.2]]
        },
        urgent: {
          frequency: 659,
          duration: 0.6,
          pattern: [[523, 0.2], [659, 0.2], [784, 0.2]]
        }
      },
      providerSwitch: {
        default: {
          frequency: 392,
          duration: 0.4,
          pattern: [[392, 0.1], [0, 0.05], [392, 0.1], [440, 0.15]]
        },
        subtle: {
          frequency: 330,
          duration: 0.2,
          pattern: [[330, 0.2]]
        },
        urgent: {
          frequency: 440,
          duration: 0.4,
          pattern: [[440, 0.2], [494, 0.2]]
        }
      },
      degraded: {
        default: {
          frequency: 349,
          duration: 0.5,
          pattern: [[349, 0.15], [0, 0.1], [349, 0.15], [0, 0.1]]
        },
        subtle: {
          frequency: 294,
          duration: 0.3,
          pattern: [[294, 0.15], [0, 0.15]]
        },
        urgent: {
          frequency: 440,
          duration: 0.6,
          pattern: [[440, 0.1], [0, 0.1], [440, 0.1], [0, 0.1], [440, 0.2]]
        }
      },
      critical: {
        default: {
          frequency: 988,
          duration: 1.0,
          pattern: [[988, 0.15], [784, 0.15], [988, 0.15], [784, 0.15], [988, 0.15], [784, 0.25]]
        },
        subtle: {
          frequency: 587,
          duration: 0.6,
          pattern: [[587, 0.2], [494, 0.2], [440, 0.2]]
        },
        urgent: {
          frequency: 1047,
          duration: 1.5,
          pattern: [[1047, 0.2], [0, 0.1], [1047, 0.2], [0, 0.1], [1047, 0.2], [0, 0.1], 
                    [1047, 0.2], [0, 0.1], [1047, 0.4]]
        }
      }
    };
    
    // @ts-ignore - Complex nested indexing
    return configs[type][pack] || configs[type]['default'];
  }
  
  /**
   * Setup escalation for critical alerts
   */
  private setupEscalation(type: AlertType): void {
    // Clear existing escalation
    if (this.escalationTimer) {
      clearTimeout(this.escalationTimer);
    }
    
    // Set new escalation
    this.escalationTimer = setTimeout(() => {
      log.warn(`AudioAlert: Escalating ${type} alert`);
      this.playAlert(type, true); // Force play
    }, this.config.throttle.escalateAfter * 1000);
  }
  
  /**
   * Clear escalation timer
   */
  clearEscalation(): void {
    if (this.escalationTimer) {
      clearTimeout(this.escalationTimer);
      this.escalationTimer = null;
    }
  }
  
  /**
   * Test an alert sound
   */
  async testAlert(type: AlertType): Promise<void> {
    await this.playAlert(type, true);
  }
  
  /**
   * Get current configuration
   */
  getConfig(): AudioAlertConfig {
    return { ...this.config };
  }
  
  /**
   * Enable/disable alerts
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfig({ enabled });
  }
  
  /**
   * Set volume (0-100)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(100, volume));
    this.saveConfig({ volume: this.config.volume });
  }
  
  /**
   * Set sound pack
   */
  setSoundPack(pack: SoundPack): void {
    this.config.soundPack = pack;
    this.saveConfig({ soundPack: pack });
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.clearEscalation();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioAlertService = AudioAlertService.getInstance();