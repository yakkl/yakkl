/**
 * NetworkManager - Manages blockchain networks and connections
 */
import { EventEmitter } from 'eventemitter3';
import { ethers } from 'ethers';
import type { WalletEngine } from './WalletEngine';
import type { Network } from './types';
export interface NetworkManagerEvents {
    'network:added': (network: Network) => void;
    'network:updated': (network: Network) => void;
    'network:removed': (networkId: string) => void;
    'network:switched': (network: Network) => void;
    'network:connected': (network: Network) => void;
    'network:disconnected': (network: Network) => void;
}
export declare class NetworkManager extends EventEmitter<NetworkManagerEvents> {
    private engine;
    private networks;
    private providers;
    private currentNetworkId;
    private initialized;
    constructor(engine: WalletEngine);
    /**
     * Initialize the network manager
     */
    initialize(): Promise<void>;
    /**
     * Get all supported networks
     */
    getSupported(): Network[];
    /**
     * Get network by ID
     */
    get(networkId: string): Network | null;
    /**
     * Get current network
     */
    getCurrent(): Network | null;
    /**
     * Switch to a different network
     */
    switch(networkId: string): Promise<Network>;
    /**
     * Add a custom network
     */
    add(networkConfig: Omit<Network, 'id' | 'isCustom'>): Promise<Network>;
    /**
     * Update a custom network
     */
    update(networkId: string, updates: Partial<Network>): Promise<Network>;
    /**
     * Remove a custom network
     */
    remove(networkId: string): Promise<void>;
    /**
     * Get provider for network
     */
    getProvider(networkId?: string): ethers.JsonRpcProvider | null;
    /**
     * Test connection to a network
     */
    testConnection(network: Network): Promise<boolean>;
    /**
     * Get network statistics
     */
    getNetworkStats(networkId?: string): Promise<{
        blockNumber: number;
        gasPrice: bigint;
        chainId: number;
    }>;
    /**
     * Destroy the network manager
     */
    destroy(): Promise<void>;
    /**
     * Private methods
     */
    private loadDefaultNetworks;
    private loadCustomNetworks;
    private saveCustomNetworks;
    private loadCurrentNetwork;
    private saveCurrentNetwork;
    private validateNetworkConfig;
    private generateNetworkId;
    private ensureInitialized;
}
//# sourceMappingURL=NetworkManager.d.ts.map