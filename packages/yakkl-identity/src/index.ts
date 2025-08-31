/**
 * @yakkl/identity
 * Universal Identity and Access Management System
 * No API keys - Identity-based authentication for all contexts
 */

export * from './types';
export { IdentityManager } from './core/IdentityManager';
export { ServiceAuthHandler } from './handlers/ServiceAuthHandler';
export { CLIAuthHandler } from './handlers/CLIAuthHandler';
export { BrowserAuthHandler } from './handlers/BrowserAuthHandler';
export { AgentAuthHandler } from './handlers/AgentAuthHandler';
export { IdentityStorage } from './storage/IdentityStorage';

// Main export
export { IdentityManager as default } from './core/IdentityManager';

// Import for use in factory functions
import { IdentityManager } from './core/IdentityManager';

// Convenience exports for common use cases

/**
 * Create identity manager for browser applications
 */
export function createBrowserIdentity(config?: any) {
  return new IdentityManager({
    storage: 'memory',
    providers: {
      oauth: true,
      passkey: true,
      email: true,
      service: false
    },
    session: {
      ttl: 3600,
      renewable: true
    },
    ...config
  });
}

/**
 * Create identity manager for CLI tools
 */
export function createCLIIdentity(config?: any) {
  return new IdentityManager({
    storage: 'memory',
    providers: {
      oauth: true,
      service: true,
      email: true,
      passkey: false
    },
    session: {
      ttl: 86400,
      renewable: true
    },
    ...config
  });
}

/**
 * Create identity manager for services/servers
 */
export function createServiceIdentity(config?: any) {
  return new IdentityManager({
    storage: 'distributed',
    providers: {
      service: true,
      oauth: false,
      passkey: false,
      email: false
    },
    session: {
      ttl: 3600,
      renewable: true,
      maxRenewals: 10
    },
    ...config
  });
}

/**
 * Create identity manager for agents/MCP servers
 */
export function createAgentIdentity(config?: any) {
  return new IdentityManager({
    storage: 'hybrid',
    providers: {
      service: true,
      oauth: false,
      passkey: false,
      email: false
    },
    session: {
      ttl: 1800,
      renewable: true
    },
    tracking: {
      enabled: true,
      services: ['*']
    },
    ...config
  });
}