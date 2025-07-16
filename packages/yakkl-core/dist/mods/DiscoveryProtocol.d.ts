/**
 * DiscoveryProtocol - Discovers mods in the environment and enables cross-app enhancement
 */
import { EventEmitter } from 'eventemitter3';
import type { WalletEngine } from '../engine/WalletEngine';
import type { DiscoveredMod } from './types';
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
export declare class DiscoveryProtocol extends EventEmitter<DiscoveryProtocolEvents> {
    private engine;
    private logger;
    private discoveredMods;
    private discoveredPeers;
    private scanInterval;
    private running;
    constructor(engine: WalletEngine);
    /**
     * Start the discovery protocol
     */
    start(): Promise<void>;
    /**
     * Stop the discovery protocol
     */
    stop(): Promise<void>;
    /**
     * Manually scan for mods
     */
    scan(): Promise<DiscoveredMod[]>;
    /**
     * Get all discovered mods
     */
    getDiscoveredMods(): DiscoveredMod[];
    /**
     * Get all discovered peers
     */
    getDiscoveredPeers(): DiscoveredPeer[];
    /**
     * Check if a specific mod is available in the environment
     */
    isModAvailable(modId: string): boolean;
    /**
     * Private methods
     */
    private scanEnvironment;
    private scanSource;
    private scanRegistry;
    private scanLocal;
    private scanEnvironmentMods;
    private scanPeerMods;
    private setupPeerDetection;
    private teardownPeerDetection;
    private broadcastPresence;
    private handlePeerMessage;
    private setupPostMessageListener;
    private generatePeerId;
}
//# sourceMappingURL=DiscoveryProtocol.d.ts.map