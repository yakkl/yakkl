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
export { IdentityManager as default } from './core/IdentityManager';
import { IdentityManager } from './core/IdentityManager';
/**
 * Create identity manager for browser applications
 */
export declare function createBrowserIdentity(config?: any): IdentityManager;
/**
 * Create identity manager for CLI tools
 */
export declare function createCLIIdentity(config?: any): IdentityManager;
/**
 * Create identity manager for services/servers
 */
export declare function createServiceIdentity(config?: any): IdentityManager;
/**
 * Create identity manager for agents/MCP servers
 */
export declare function createAgentIdentity(config?: any): IdentityManager;
