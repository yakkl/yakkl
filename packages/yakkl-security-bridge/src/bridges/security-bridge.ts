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

export function createSecurityBridge(): SecurityBridge {
  return {
    initialize: () => {},
    shutdown: () => {},
    sync: () => {}
  };
}

