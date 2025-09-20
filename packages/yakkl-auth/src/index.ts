/**
 * @yakkl/auth
 * Universal authentication library for secure multi-provider login
 * Framework-agnostic, works in any JavaScript environment
 */

export * from './types';
export * from './AuthManager';
export * from './providers';
export * from './strategies';
export * from './utils';

// Session management
export * from './session/SessionManagerBase';

// Validation utilities
export * from './validation/auth-validation';

// Main authentication manager
export { AuthManager as default } from './AuthManager';