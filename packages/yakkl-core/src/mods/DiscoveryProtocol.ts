/**
 * DiscoveryProtocol - Discovers mods in the environment and enables cross-app enhancement
 */

import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '../engine/WalletEngine';
import type { DiscoveredMod, DiscoverySource } from './types';
import { Logger } from '../utils/Logger';

export interface DiscoveryProtocolEvents {
  'mod:discovered': (mods: DiscoveredMod[]) => void;
  'mod:lost': (modId: string) => void;
  'peer:detected': (peer: DiscoveredPeer) => void;
}

export interface DiscoveredPeer {
  id: string;
  type: 'extension' | 'webapp' | 'desktop' | 'mobile';
  version: string;
  mods: string[];
  capabilities: string[];
}

export class DiscoveryProtocol extends EventEmitter<DiscoveryProtocolEvents> {
  private engine: WalletEngine;
  private logger: Logger;
  private discoveredMods = new Map<string, DiscoveredMod>();
  private discoveredPeers = new Map<string, DiscoveredPeer>();
  private scanInterval: NodeJS.Timeout | null = null;
  private running = false;

  constructor(engine: WalletEngine) {
    super();
    this.engine = engine;
    this.logger = new Logger('DiscoveryProtocol');
  }

  /**
   * Start the discovery protocol
   */
  async start(): Promise<void> {
    if (this.running) return;

    this.logger.info('Starting mod discovery protocol');
    
    try {
      // Initial scan
      await this.scanEnvironment();
      
      // Setup periodic scanning
      this.scanInterval = setInterval(() => {
        this.scanEnvironment().catch(error => {
          this.logger.warn('Discovery scan failed', error);
        });
      }, 30000); // Scan every 30 seconds
      
      // Setup peer detection
      await this.setupPeerDetection();
      
      this.running = true;
    } catch (error) {
      this.logger.error('Failed to start discovery protocol', error as Error);
      throw error;
    }
  }

  /**
   * Stop the discovery protocol
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.logger.info('Stopping mod discovery protocol');
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    await this.teardownPeerDetection();
    
    this.discoveredMods.clear();
    this.discoveredPeers.clear();
    this.running = false;
  }

  /**
   * Manually scan for mods
   */
  async scan(): Promise<DiscoveredMod[]> {
    return this.scanEnvironment();
  }

  /**
   * Get all discovered mods
   */
  getDiscoveredMods(): DiscoveredMod[] {
    return Array.from(this.discoveredMods.values());
  }

  /**
   * Get all discovered peers
   */
  getDiscoveredPeers(): DiscoveredPeer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Check if a specific mod is available in the environment
   */
  isModAvailable(modId: string): boolean {
    return this.discoveredMods.has(modId);
  }

  /**
   * Private methods
   */
  private async scanEnvironment(): Promise<DiscoveredMod[]> {
    const discovered: DiscoveredMod[] = [];

    try {
      // Scan different sources
      const sources: DiscoverySource[] = ['registry', 'local', 'environment', 'peer'];
      
      for (const source of sources) {
        try {
          const mods = await this.scanSource(source);
          discovered.push(...mods);
        } catch (error) {
          this.logger.debug(`Failed to scan ${source}`, error as Error);
        }
      }

      // Update discovered mods map
      const newMods: DiscoveredMod[] = [];
      for (const mod of discovered) {
        if (!this.discoveredMods.has(mod.manifest.id)) {
          newMods.push(mod);
        }
        this.discoveredMods.set(mod.manifest.id, mod);
      }

      // Emit discovery events
      if (newMods.length > 0) {
        this.emit('mod:discovered', newMods);
        this.logger.info(`Discovered ${newMods.length} new mods`);
      }

      return discovered;
    } catch (error) {
      this.logger.error('Environment scan failed', error as Error);
      return [];
    }
  }

  private async scanSource(source: DiscoverySource): Promise<DiscoveredMod[]> {
    switch (source) {
      case 'registry':
        return this.scanRegistry();
      
      case 'local':
        return this.scanLocal();
      
      case 'environment':
        return this.scanEnvironmentMods();
      
      case 'peer':
        return this.scanPeerMods();
      
      default:
        return [];
    }
  }

  private async scanRegistry(): Promise<DiscoveredMod[]> {
    try {
      // Scan official YAKKL mod registry
      const response = await fetch('https://registry.yakkl.com/api/mods/featured');
      if (!response.ok) {
        throw new Error(`Registry request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.mods.map((manifest: any) => ({
        source: 'registry' as DiscoverySource,
        manifest,
        verified: true,
        available: true,
        installUrl: `https://registry.yakkl.com/mods/${manifest.id}/install`
      }));
    } catch (error) {
      // Registry might not be available yet
      this.logger.debug('Registry scan failed', error as Error);
      return [];
    }
  }

  private async scanLocal(): Promise<DiscoveredMod[]> {
    try {
      // Scan for local development mods
      const localMods: DiscoveredMod[] = [];

      // Check if we're in development mode
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
        // Simulate finding local mods in development
        const devMods = [
          'basic-portfolio',
          'advanced-analytics',
          'secure-recovery'
        ];

        for (const modId of devMods) {
          try {
            // Try to load manifest
            const manifestUrl = `/src/routes/preview2/lib/mods/${modId}/manifest.json`;
            const response = await fetch(manifestUrl);
            if (response.ok) {
              const manifest = await response.json();
              localMods.push({
                source: 'local',
                manifest,
                verified: true,
                available: true
              });
            }
          } catch {
            // Mod doesn't exist locally
          }
        }
      }

      return localMods;
    } catch (error) {
      this.logger.debug('Local scan failed', error as Error);
      return [];
    }
  }

  private async scanEnvironmentMods(): Promise<DiscoveredMod[]> {
    try {
      // Scan the current web page for embedded mods
      const mods: DiscoveredMod[] = [];

      // Look for YAKKL mod declarations in the page
      const modElements = document.querySelectorAll('[data-yakkl-mod]');
      
      for (let i = 0; i < modElements.length; i++) {
        const element = modElements[i];
        try {
          const modData = element.getAttribute('data-yakkl-mod');
          if (modData) {
            const manifest = JSON.parse(modData);
            mods.push({
              source: 'environment',
              manifest,
              verified: false,
              available: true
            });
          }
        } catch {
          // Invalid mod data
        }
      }

      // Check for postMessage announcements
      this.setupPostMessageListener();

      return mods;
    } catch (error) {
      this.logger.debug('Environment scan failed', error as Error);
      return [];
    }
  }

  private async scanPeerMods(): Promise<DiscoveredMod[]> {
    const mods: DiscoveredMod[] = [];

    // Collect mods from discovered peers
    for (const peer of this.discoveredPeers.values()) {
      for (const modId of peer.mods) {
        mods.push({
          source: 'peer',
          manifest: { id: modId, name: modId, version: '1.0.0' } as any,
          verified: false,
          available: true
        });
      }
    }

    return mods;
  }

  private async setupPeerDetection(): Promise<void> {
    // Setup cross-origin communication for peer detection
    if (typeof window !== 'undefined') {
      // Broadcast our presence
      this.broadcastPresence().catch(error => {
        this.logger.debug('Failed to broadcast initial presence', error);
      });
      
      // Listen for other YAKKL instances
      window.addEventListener('message', this.handlePeerMessage.bind(this));
      
      // Setup periodic presence broadcasting
      setInterval(() => {
        this.broadcastPresence().catch(error => {
          this.logger.debug('Failed to broadcast periodic presence', error);
        });
      }, 60000); // Every minute
    }
  }

  private async teardownPeerDetection(): Promise<void> {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.handlePeerMessage.bind(this));
    }
  }

  private async broadcastPresence(): Promise<void> {
    try {
      const presence = {
        type: 'yakkl:presence',
        id: this.generatePeerId(),
        version: '2.0.0',
        mods: (await this.engine.getLoadedMods()).map((m: any) => m.manifest.id),
        capabilities: ['mod-discovery', 'cross-enhancement'],
        timestamp: Date.now()
      };

      // Broadcast to parent window (for iframes)
      if (window.parent !== window) {
        window.parent.postMessage(presence, '*');
      }

      // Broadcast to child frames
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage(presence, '*');
        } catch {
          // Cross-origin frame, ignore
        }
      }
    } catch (error) {
      this.logger.debug('Failed to broadcast presence', error as Error);
    }
  }

  private handlePeerMessage(event: MessageEvent): void {
    try {
      const data = event.data;
      
      if (data.type === 'yakkl:presence') {
        const peer: DiscoveredPeer = {
          id: data.id,
          type: 'webapp', // Assume webapp for now
          version: data.version,
          mods: data.mods || [],
          capabilities: data.capabilities || []
        };

        // Update peer
        this.discoveredPeers.set(peer.id, peer);
        this.emit('peer:detected', peer);
        
        this.logger.debug(`Discovered peer: ${peer.id} with ${peer.mods.length} mods`);
      }
    } catch (error) {
      this.logger.debug('Failed to handle peer message', error as Error);
    }
  }

  private setupPostMessageListener(): void {
    // Listen for mod announcements from the page
    window.addEventListener('message', (event) => {
      try {
        const data = event.data;
        
        if (data.type === 'yakkl:mod-announcement') {
          const discoveredMod: DiscoveredMod = {
            source: 'environment',
            manifest: data.manifest,
            verified: data.verified || false,
            available: true
          };

          this.discoveredMods.set(data.manifest.id, discoveredMod);
          this.emit('mod:discovered', [discoveredMod]);
        }
      } catch {
        // Invalid message format
      }
    });
  }

  private generatePeerId(): string {
    // Generate a session-unique peer ID
    if (!localStorage.getItem('yakkl:peerId')) {
      const id = `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('yakkl:peerId', id);
    }
    return localStorage.getItem('yakkl:peerId')!;
  }
}