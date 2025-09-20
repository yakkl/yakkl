/**
 * TOR Detection Service
 * Detects if the user is running through TOR and blocks wallet operation
 */

import { log } from '$lib/common/logger-wrapper';

export interface TORDetectionResult {
  isTOR: boolean;
  confidence: 'high' | 'medium' | 'low';
  detectionMethod: string[];
  reason?: string;
}

class TORDetectorService {
  private static instance: TORDetectorService | null = null;
  private detectionCache: TORDetectionResult | null = null;
  private lastCheck: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): TORDetectorService {
    if (!TORDetectorService.instance) {
      TORDetectorService.instance = new TORDetectorService();
    }
    return TORDetectorService.instance;
  }

  /**
   * Main detection method - combines multiple techniques
   */
  async detectTOR(): Promise<TORDetectionResult> {
    // Skip TOR detection for sidepanel - it doesn't interact with blockchain
    // Sidepanel only aggregates news and pricing, no wallet operations
    if (typeof window !== 'undefined' && window.location?.pathname?.includes('sidepanel')) {
      return {
        isTOR: false,
        confidence: 'low',
        detectionMethod: [],
        reason: undefined
      };
    }

    // Check cache
    if (this.detectionCache && Date.now() - this.lastCheck < this.CACHE_DURATION) {
      return this.detectionCache;
    }

    const detectionMethods: string[] = [];
    let isTOR = false;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    try {
      // Method 1: Check TOR exit nodes
      const exitNodeCheck = await this.checkTORExitNode();
      if (exitNodeCheck) {
        detectionMethods.push('exit-node-api');
        isTOR = true;
        confidence = 'high';
      }

      // Method 2: Browser fingerprinting
      const fingerprintCheck = this.checkTORFingerprint();
      if (fingerprintCheck) {
        detectionMethods.push('fingerprint');
        isTOR = true;
        confidence = confidence === 'high' ? 'high' : 'medium';
      }

      // Method 3: Network timing analysis
      const timingCheck = await this.checkNetworkTiming();
      if (timingCheck) {
        detectionMethods.push('timing-analysis');
        isTOR = true;
        confidence = confidence === 'low' ? 'medium' : confidence;
      }

      // Method 4: WebRTC leak detection (TOR blocks WebRTC)
      const webRTCCheck = await this.checkWebRTC();
      if (webRTCCheck) {
        detectionMethods.push('webrtc-blocked');
        isTOR = true;
        confidence = confidence === 'low' ? 'medium' : confidence;
      }

    } catch (error) {
      log.error('TOR detection error:', false, error);
    }

    const result: TORDetectionResult = {
      isTOR,
      confidence,
      detectionMethod: detectionMethods,
      reason: isTOR ? this.getBlockReason() : undefined
    };

    // Cache result
    this.detectionCache = result;
    this.lastCheck = Date.now();

    if (isTOR) {
      log.warn(`TOR detected with ${confidence} confidence using methods: ${detectionMethods.join(', ')}`);
    }

    return result;
  }

  /**
   * Check against TOR exit node API
   */
  private async checkTORExitNode(): Promise<boolean> {
    try {
      // Use check.torproject.org API
      const response = await fetch('https://check.torproject.org/api/ip', {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.IsTor === true;
      }
    } catch (error) {
      // Fallback to alternative check
      try {
        const response = await fetch('https://www.dan.me.uk/torcheck', {
          signal: AbortSignal.timeout(5000)
        });
        const text = await response.text();
        return text.includes('using Tor');
      } catch {
        // Silent fail - use other methods
      }
    }
    return false;
  }

  /**
   * Check TOR browser fingerprint characteristics
   */
  private checkTORFingerprint(): boolean {
    if (typeof window === 'undefined') return false;

    const checks = {
      // TOR Browser uses specific window sizes
      windowSize: (
        window.screen.width === 1000 &&
        window.screen.height === 1000
      ) || (
        window.screen.width === 1000 &&
        window.screen.height === 900
      ),

      // TOR Browser always reports UTC timezone
      timezone: new Date().getTimezoneOffset() === 0,

      // TOR Browser has no plugins
      noPlugins: navigator.plugins.length === 0,

      // TOR Browser blocks canvas fingerprinting
      canvasBlocked: this.isCanvasBlocked(),

      // TOR Browser user agent pattern - MUST include "Tor" explicitly
      userAgent: navigator.userAgent.includes('Tor')
    };

    // Count positive signals
    const signals = Object.values(checks).filter(v => v === true).length;

    // Increased threshold from 3 to 4 signals to reduce false positives
    // Must have at least 4 out of 5 indicators to be considered TOR
    return signals >= 4;
  }

  /**
   * Check if canvas fingerprinting is blocked (TOR behavior)
   */
  private isCanvasBlocked(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      // Try to extract canvas data
      ctx.fillText('test', 2, 2);
      const dataURL = canvas.toDataURL();
      
      // TOR Browser returns a blank or generic canvas
      return dataURL === 'data:,' || dataURL.length < 100;
    } catch {
      return true; // Canvas blocked
    }
  }

  /**
   * Analyze network timing for TOR characteristics
   */
  private async checkNetworkTiming(): Promise<boolean> {
    try {
      const timings: number[] = [];

      // Make multiple small requests to measure latency
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        await fetch('https://www.google.com/favicon.ico', {
          signal: AbortSignal.timeout(10000),
          cache: 'no-cache'
        });
        const end = performance.now();
        timings.push(end - start);
      }

      // Calculate average and variance
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;

      // TOR typically has VERY high latency (>2000ms) and extreme variance
      // Adjusted from 500ms to 2000ms to avoid false positives on slow connections
      // Also increased variance threshold from 10000 to 50000
      return avg > 2000 && variance > 50000;
    } catch {
      return false;
    }
  }

  /**
   * Check WebRTC availability (TOR blocks it)
   */
  private async checkWebRTC(): Promise<boolean> {
    try {
      // @ts-ignore - RTCPeerConnection might not exist
      if (typeof RTCPeerConnection === 'undefined') {
        return true; // WebRTC blocked
      }

      // Try to create a peer connection
      // @ts-ignore
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // TOR blocks local IP discovery
      return new Promise((resolve) => {
        let hasLocalIP = false;
        
        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            pc.close();
            resolve(!hasLocalIP); // No local IP = likely TOR
            return;
          }
          
          // Check if we can see local IP
          const candidate = event.candidate.candidate;
          if (candidate.includes('192.168') || 
              candidate.includes('10.') || 
              candidate.includes('172.')) {
            hasLocalIP = true;
          }
        };

        // Timeout after 2 seconds
        setTimeout(() => {
          pc.close();
          resolve(!hasLocalIP);
        }, 2000);
      });
    } catch {
      return true; // WebRTC blocked or errored
    }
  }

  /**
   * Get user-friendly reason for blocking
   */
  private getBlockReason(): string {
    return `YAKKL Wallet cannot operate over TOR because:
    • Blockchain RPC providers block TOR exit nodes
    • Transaction broadcasting will fail
    • Extreme latency breaks DeFi interactions
    • Real-time price feeds are unavailable
    
    Please use a standard internet connection for trading.`;
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache = null;
    this.lastCheck = 0;
  }
}

export const torDetector = TORDetectorService.getInstance();