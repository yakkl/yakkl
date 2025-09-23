/**
 * Security Bridge (stub)
 *
 * Coordinates initialization and synchronization between wallet and
 * security subsystems.
 */
export interface SecurityBridge {
    initialize(): Promise<void> | void;
    shutdown(): Promise<void> | void;
    sync(): Promise<void> | void;
}
export declare function createSecurityBridge(): SecurityBridge;
//# sourceMappingURL=security-bridge.d.ts.map