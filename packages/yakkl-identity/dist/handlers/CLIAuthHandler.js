/**
 * CLI Authentication Handler
 * Supports browser spawn, device code, and interactive flows
 */
import { nanoid } from 'nanoid';
export class CLIAuthHandler {
    constructor(manager) {
        this.manager = manager;
        this.pendingAuths = new Map();
    }
    /**
     * Authenticate from CLI context
     */
    async authenticate(request) {
        const { credentials } = request;
        const method = credentials?.method || 'browser';
        switch (method) {
            case 'browser':
                return this.browserFlow(credentials);
            case 'deviceCode':
                return this.deviceCodeFlow(credentials);
            case 'interactive':
                return this.interactiveFlow(credentials);
            case 'serviceAccount':
                return this.serviceAccountFlow(credentials);
            default:
                throw new Error(`Unsupported CLI auth method: ${method}`);
        }
    }
    /**
     * Browser-based OAuth flow for CLI
     */
    async browserFlow(credentials) {
        const http = await import('http');
        const { execSync } = await import('child_process');
        // Start local server for callback
        const port = await this.findAvailablePort();
        const state = nanoid();
        const server = http.createServer();
        return new Promise((resolve, reject) => {
            let resolved = false;
            // Setup callback handler
            server.on('request', async (req, res) => {
                const url = new URL(req.url, `http://localhost:${port}`);
                if (url.pathname === '/callback') {
                    const code = url.searchParams.get('code');
                    const receivedState = url.searchParams.get('state');
                    if (receivedState === state && code) {
                        // Success response to browser
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`
              <html>
                <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                  <div style="text-align: center;">
                    <h2 style="color: #10b981;">✓ Authentication Successful</h2>
                    <p>You can close this window and return to your terminal.</p>
                    <script>setTimeout(() => window.close(), 2000);</script>
                  </div>
                </body>
              </html>
            `);
                        if (!resolved) {
                            resolved = true;
                            server.close();
                            // Exchange code for identity
                            const identity = await this.exchangeCode(code, credentials.provider);
                            resolve(identity);
                        }
                    }
                    else {
                        res.writeHead(400);
                        res.end('Invalid state or missing code');
                    }
                }
            });
            // Start server
            server.listen(port, async () => {
                console.log(`\n🔐 Opening browser for authentication...`);
                // Build auth URL
                const authUrl = this.buildAuthUrl({
                    provider: credentials.provider || 'google',
                    redirectUri: `http://localhost:${port}/callback`,
                    state,
                    clientId: credentials.clientId || process.env.YAKKL_OAUTH_CLIENT_ID
                });
                // Open browser
                const platform = process.platform;
                const openCommand = platform === 'darwin' ? 'open' :
                    platform === 'win32' ? 'start' :
                        'xdg-open';
                try {
                    execSync(`${openCommand} "${authUrl}"`);
                    console.log(`If browser didn't open, visit: ${authUrl}\n`);
                }
                catch {
                    console.log(`Please visit: ${authUrl}\n`);
                }
            });
            // Timeout after 5 minutes
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    server.close();
                    reject(new Error('Authentication timeout'));
                }
            }, 300000);
        });
    }
    /**
     * Device code flow (like GitHub CLI)
     */
    async deviceCodeFlow(credentials) {
        // Request device code
        const device = await this.requestDeviceCode(credentials.provider);
        console.log('\n🔐 Device Authentication');
        console.log('─'.repeat(40));
        console.log(`1. Visit: ${device.verificationUrl}`);
        console.log(`2. Enter code: ${device.userCode}`);
        console.log('─'.repeat(40));
        console.log('Waiting for authentication...\n');
        // Poll for completion
        return this.pollForCompletion(device.deviceCode, credentials.provider);
    }
    /**
     * Interactive terminal flow
     */
    async interactiveFlow(credentials) {
        // Dynamic import for Node.js readline
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const question = (prompt) => {
            return new Promise(resolve => {
                rl.question(prompt, resolve);
            });
        };
        try {
            console.log('\n🔐 Interactive Authentication');
            console.log('─'.repeat(40));
            // Choose method
            console.log('Choose authentication method:');
            console.log('1. Email (magic link)');
            console.log('2. Service Account');
            console.log('3. OAuth (Google/GitHub/X)');
            const choice = await question('Enter choice (1-3): ');
            switch (choice) {
                case '1': {
                    const email = await question('Email: ');
                    await this.sendMagicLink(email);
                    const code = await question('Enter code from email: ');
                    return this.verifyMagicLink(email, code);
                }
                case '2': {
                    const keyPath = await question('Path to service account key: ');
                    return this.loadServiceAccount(keyPath);
                }
                case '3': {
                    const provider = await question('Provider (google/github/x): ');
                    return this.browserFlow({ ...credentials, provider });
                }
                default:
                    throw new Error('Invalid choice');
            }
        }
        finally {
            rl.close();
        }
    }
    /**
     * Service account flow for CLI
     */
    async serviceAccountFlow(credentials) {
        // Check environment first
        if (process.env.YAKKL_SERVICE_ACCOUNT_KEY) {
            return this.authenticateServiceAccount(process.env.YAKKL_SERVICE_ACCOUNT_ID, process.env.YAKKL_SERVICE_ACCOUNT_KEY);
        }
        // Check for key file
        if (credentials.keyFile) {
            return this.loadServiceAccount(credentials.keyFile);
        }
        throw new Error('No service account credentials found');
    }
    // Private helper methods
    async findAvailablePort() {
        const net = await import('net');
        return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(0, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
        });
    }
    buildAuthUrl(params) {
        const baseUrl = process.env.YAKKL_AUTH_URL || 'https://auth.yakkl.com';
        const url = new URL(`${baseUrl}/oauth/authorize`);
        url.searchParams.set('client_id', params.clientId);
        url.searchParams.set('redirect_uri', params.redirectUri);
        url.searchParams.set('state', params.state);
        url.searchParams.set('provider', params.provider);
        url.searchParams.set('response_type', 'code');
        return url.toString();
    }
    async exchangeCode(code, provider) {
        // In production, call auth server to exchange code
        // For now, return mock identity
        return {
            id: `cli_${nanoid()}`,
            method: 'oauth',
            tier: 'developer',
            metadata: {
                context: 'cli',
                name: 'CLI User',
                displayName: 'CLI User'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    async requestDeviceCode(provider) {
        // In production, call auth server
        return {
            deviceCode: nanoid(),
            userCode: nanoid(8).toUpperCase(),
            verificationUrl: 'https://auth.yakkl.com/device',
            expiresIn: 900,
            interval: 5
        };
    }
    async pollForCompletion(deviceCode, provider) {
        const maxAttempts = 60;
        const interval = 5000;
        for (let i = 0; i < maxAttempts; i++) {
            // Check if authenticated
            const result = await this.checkDeviceAuth(deviceCode);
            if (result.status === 'complete') {
                console.log('✓ Authentication successful!\n');
                return result.identity;
            }
            else if (result.status === 'pending') {
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, interval));
            }
            else {
                throw new Error('Authentication failed');
            }
        }
        throw new Error('Authentication timeout');
    }
    async checkDeviceAuth(deviceCode) {
        // In production, check with auth server
        // Mock implementation
        if (Math.random() > 0.8) {
            return {
                status: 'complete',
                identity: {
                    id: `cli_${nanoid()}`,
                    method: 'oauth',
                    tier: 'developer',
                    metadata: {
                        context: 'cli',
                        name: 'CLI User',
                        displayName: 'CLI User'
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            };
        }
        return { status: 'pending' };
    }
    async sendMagicLink(email) {
        console.log(`Magic link sent to ${email}`);
        // In production, actually send email
    }
    async verifyMagicLink(email, code) {
        // In production, verify with auth server
        return {
            id: `cli_${nanoid()}`,
            method: 'email',
            tier: 'developer',
            metadata: {
                context: 'cli',
                email,
                name: email,
                displayName: email
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    async loadServiceAccount(keyPath) {
        const fs = await import('fs');
        const content = fs.readFileSync(keyPath, 'utf-8');
        const config = JSON.parse(content);
        return this.authenticateServiceAccount(config.id, config.privateKey);
    }
    async authenticateServiceAccount(id, key) {
        // Use service auth handler
        const serviceHandler = new (await import('./ServiceAuthHandler')).ServiceAuthHandler(this.manager);
        return serviceHandler.authenticateFromKey('env');
    }
}
