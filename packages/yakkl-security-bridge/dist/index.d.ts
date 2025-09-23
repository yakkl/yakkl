/**
 * @yakkl/security-bridge
 *
 * Integration bridge between yakkl-wallet and security packages.
 * This package handles wallet-specific security integrations without
 * creating circular dependencies.
 */
export * from './bridges/auth-bridge';
export * from './bridges/security-bridge';
export * from './bridges/store-bridge';
export * from './interfaces/wallet-context';
export * from './interfaces/security-context';
export * from './services/wallet-integration.service';
export * from './services/security-sync.service';
//# sourceMappingURL=index.d.ts.map