/**
 * Agent Authentication Handler
 * For AI agents, MCP servers, and autonomous services
 */
import type { Identity, AuthRequest } from '../types';
export interface AgentConfig {
    name: string;
    type: 'ai' | 'mcp' | 'automation' | 'scheduler';
    capabilities: string[];
    parentIdentity: string;
    restrictions?: string[];
    rateLimit?: number;
    ttl?: number;
}
export declare class AgentAuthHandler {
    private manager;
    private agents;
    constructor(manager: any);
    /**
     * Authenticate an agent or MCP server
     */
    authenticate(request: AuthRequest): Promise<Identity | null>;
    /**
     * Create a new agent identity
     */
    createAgent(config: AgentConfig): Promise<{
        agent: Identity;
        credentials: {
            agentId: string;
            secretKey: string;
        };
    }>;
    /**
     * Create MCP server identity
     */
    createMCPServer(config: {
        name: string;
        tools: string[];
        clientId: string;
        parentIdentity: string;
    }): Promise<Identity>;
    /**
     * Authenticate existing agent
     */
    private authenticateExistingAgent;
    /**
     * Create delegated agent from parent identity
     */
    private createDelegatedAgent;
    /**
     * Authenticate MCP server
     */
    private authenticateMCPServer;
    /**
     * Verify agent signature
     */
    private verifyAgentSignature;
    /**
     * Get permissions for MCP tools
     */
    private getToolPermissions;
    /**
     * List agents for a parent identity
     */
    listAgents(parentIdentityId: string): Promise<Identity[]>;
    /**
     * Revoke agent
     */
    revokeAgent(agentId: string): Promise<void>;
    /**
     * Generate agent configuration file
     */
    generateAgentConfig(agent: Identity, secretKey: string): string;
}
