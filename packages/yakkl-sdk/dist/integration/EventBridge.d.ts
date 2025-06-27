/**
 * EventBridge - Cross-frame communication and event management
 */
import { EventEmitter } from 'eventemitter3';
export interface BridgeMessage {
    id: string;
    type: string;
    source: string;
    target: string;
    data: any;
    timestamp: number;
}
export interface BridgeEvents {
    'message': (message: BridgeMessage) => void;
    'request': (message: BridgeMessage) => void;
    'response': (message: BridgeMessage) => void;
    'error': (error: Error) => void;
}
export declare class EventBridge extends EventEmitter<BridgeEvents> {
    private instanceId;
    private allowedOrigins;
    private pendingRequests;
    private requestTimeout;
    constructor(options?: {
        instanceId?: string;
        allowedOrigins?: string[];
        requestTimeout?: number;
    });
    /**
     * Send a message to a target
     */
    send(target: string, type: string, data?: any): void;
    /**
     * Send a request and wait for response
     */
    request(target: string, type: string, data?: any): Promise<any>;
    /**
     * Respond to a request
     */
    respond(originalMessage: BridgeMessage, data: any): void;
    /**
     * Register a handler for a specific message type
     */
    onMessage(type: string, handler: (data: any, message: BridgeMessage) => void): void;
    /**
     * Register a handler for a specific request type
     */
    onRequest(type: string, handler: (data: any, message: BridgeMessage) => Promise<any> | any): void;
    /**
     * Set allowed origins for security
     */
    setAllowedOrigins(origins: string[]): void;
    /**
     * Connect to a specific window/frame
     */
    connectToWindow(targetWindow: Window, targetOrigin?: string): void;
    /**
     * Connect to parent window (for iframes)
     */
    connectToParent(): void;
    /**
     * Connect to opener window (for popups)
     */
    connectToOpener(): void;
    /**
     * Broadcast to all connected windows
     */
    broadcast(type: string, data?: any): void;
    /**
     * Create a secure channel between two instances
     */
    createSecureChannel(target: string, sharedSecret?: string): SecureChannel;
    /**
     * Destroy the bridge and clean up
     */
    destroy(): void;
    /**
     * Private methods
     */
    private messageHandler;
    private setupMessageListener;
    private handleResponse;
    private isValidMessage;
    private postMessage;
    private generateId;
}
/**
 * SecureChannel - Encrypted communication channel
 */
export declare class SecureChannel {
    private bridge;
    private target;
    private secret;
    constructor(bridge: EventBridge, target: string, sharedSecret?: string);
    /**
     * Send encrypted message
     */
    send(type: string, data: any): Promise<void>;
    /**
     * Send encrypted request
     */
    request(type: string, data: any): Promise<any>;
    /**
     * Listen for encrypted messages
     */
    onMessage(type: string, handler: (data: any) => void): void;
    private encrypt;
    private decrypt;
    private generateSecret;
}
/**
 * Create an event bridge instance
 */
export declare function createEventBridge(options?: {
    instanceId?: string;
    allowedOrigins?: string[];
    requestTimeout?: number;
}): EventBridge;
