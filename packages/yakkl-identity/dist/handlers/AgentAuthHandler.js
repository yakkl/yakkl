/**
 * Agent Authentication Handler
 * For AI agents, MCP servers, and autonomous services
 */
import { nanoid } from 'nanoid';
export class AgentAuthHandler {
    constructor(manager) {
        this.manager = manager;
        this.agents = new Map();
    }
    /**
     * Authenticate an agent or MCP server
     */
    async authenticate(request) {
        const { credentials } = request;
        if (credentials.agentId && credentials.signature) {
            // Existing agent authentication
            return this.authenticateExistingAgent(credentials);
        }
        else if (credentials.parentToken) {
            // Create new agent from parent identity
            return this.createDelegatedAgent(credentials);
        }
        else if (credentials.mcpClientId) {
            // MCP server authentication
            return this.authenticateMCPServer(credentials);
        }
        else {
            throw new Error('Invalid agent authentication credentials');
        }
    }
    /**
     * Create a new agent identity
     */
    async createAgent(config) {
        const agentId = `agent_${nanoid()}`;
        const secretKey = nanoid(32);
        const agent = {
            id: agentId,
            method: 'delegated',
            tier: 'developer',
            metadata: {
                name: config.name,
                context: 'agent',
                parent: config.parentIdentity,
                type: config.type,
                capabilities: config.capabilities,
                restrictions: config.restrictions,
                rateLimit: config.rateLimit
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Store agent with secret
        this.agents.set(agentId, {
            ...agent,
            secretKey,
            config
        });
        return {
            agent,
            credentials: {
                agentId,
                secretKey
            }
        };
    }
    /**
     * Create MCP server identity
     */
    async createMCPServer(config) {
        const mcpId = `mcp_${nanoid()}`;
        const identity = {
            id: mcpId,
            method: 'delegated',
            tier: 'developer',
            metadata: {
                name: config.name,
                context: 'mcp',
                parent: config.parentIdentity,
                clientId: config.clientId,
                tools: config.tools,
                permissions: this.getToolPermissions(config.tools)
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Store MCP server
        this.agents.set(mcpId, {
            ...identity,
            config
        });
        return identity;
    }
    /**
     * Authenticate existing agent
     */
    async authenticateExistingAgent(credentials) {
        const agent = this.agents.get(credentials.agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }
        // Verify signature
        const valid = await this.verifyAgentSignature(agent, credentials.signature, credentials.nonce || Date.now().toString());
        if (!valid) {
            throw new Error('Invalid agent signature');
        }
        // Check if agent is still valid
        if (agent.config.ttl) {
            const age = Date.now() - agent.createdAt.getTime();
            if (age > agent.config.ttl * 1000) {
                throw new Error('Agent credentials expired');
            }
        }
        // Update last used
        agent.updatedAt = new Date();
        return agent;
    }
    /**
     * Create delegated agent from parent identity
     */
    async createDelegatedAgent(credentials) {
        // Verify parent token
        const parentIdentity = await this.manager.verify(credentials.parentToken);
        if (!parentIdentity) {
            throw new Error('Invalid parent identity');
        }
        // Create agent config
        const config = {
            name: credentials.name || `Agent of ${parentIdentity.id}`,
            type: credentials.type || 'automation',
            capabilities: credentials.capabilities || ['read'],
            parentIdentity: parentIdentity.id,
            restrictions: credentials.restrictions,
            rateLimit: credentials.rateLimit || 100,
            ttl: credentials.ttl || 3600
        };
        // Create agent
        const { agent } = await this.createAgent(config);
        return agent;
    }
    /**
     * Authenticate MCP server
     */
    async authenticateMCPServer(credentials) {
        // MCP servers authenticate through their client
        const clientIdentity = await this.manager.verify(credentials.clientToken);
        if (!clientIdentity) {
            throw new Error('Invalid MCP client identity');
        }
        // Check if MCP server exists
        let mcpServer = this.agents.get(credentials.mcpServerId);
        if (!mcpServer) {
            // Create new MCP server identity
            mcpServer = await this.createMCPServer({
                name: credentials.serverName,
                tools: credentials.tools || [],
                clientId: clientIdentity.id,
                parentIdentity: clientIdentity.id
            });
        }
        // Verify client has permission to use this MCP server
        if (mcpServer.metadata.clientId !== clientIdentity.id &&
            mcpServer.metadata.parent !== clientIdentity.id) {
            throw new Error('Client not authorized for this MCP server');
        }
        return mcpServer;
    }
    /**
     * Verify agent signature
     */
    async verifyAgentSignature(agent, signature, nonce) {
        try {
            // Create expected message
            const message = `${agent.id}:${nonce}`;
            // Verify HMAC signature
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(agent.secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
            const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
            const messageBytes = new TextEncoder().encode(message);
            return crypto.subtle.verify('HMAC', key, signatureBytes, messageBytes);
        }
        catch {
            return false;
        }
    }
    /**
     * Get permissions for MCP tools
     */
    getToolPermissions(tools) {
        const permissions = [];
        for (const tool of tools) {
            switch (tool) {
                case 'read_file':
                case 'list_files':
                    permissions.push('fs.read');
                    break;
                case 'write_file':
                case 'create_file':
                    permissions.push('fs.write');
                    break;
                case 'execute_command':
                    permissions.push('process.execute');
                    break;
                case 'network_request':
                    permissions.push('network.request');
                    break;
                case 'database_query':
                    permissions.push('db.query');
                    break;
                case 'ai_inference':
                    permissions.push('ai.inference');
                    break;
                default:
                    permissions.push(`tool.${tool}`);
            }
        }
        return [...new Set(permissions)];
    }
    /**
     * List agents for a parent identity
     */
    async listAgents(parentIdentityId) {
        const agents = [];
        for (const agent of this.agents.values()) {
            if (agent.metadata.parent === parentIdentityId) {
                agents.push(agent);
            }
        }
        return agents;
    }
    /**
     * Revoke agent
     */
    async revokeAgent(agentId) {
        this.agents.delete(agentId);
    }
    /**
     * Generate agent configuration file
     */
    generateAgentConfig(agent, secretKey) {
        return JSON.stringify({
            agentId: agent.id,
            secretKey,
            endpoint: process.env.YAKKL_AUTH_ENDPOINT || 'https://api.yakkl.com/auth',
            metadata: agent.metadata
        }, null, 2);
    }
}
