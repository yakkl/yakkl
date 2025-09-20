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
export * from './session/SessionManagerBase';
export * from './validation/auth-validation';
export { AuthManager as default } from './AuthManager';
