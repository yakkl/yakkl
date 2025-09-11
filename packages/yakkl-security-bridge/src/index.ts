/**
 * @yakkl/security-bridge
 * 
 * Integration bridge between yakkl-wallet and security packages.
 * This package handles wallet-specific security integrations without
 * creating circular dependencies.
 */

// Export bridges
export * from './bridges/auth-bridge';
export * from './bridges/security-bridge';
export * from './bridges/store-bridge';

// Export interfaces
export * from './interfaces/wallet-context';
export * from './interfaces/security-context';

// Export services
export * from './services/wallet-integration.service';
export * from './services/security-sync.service';