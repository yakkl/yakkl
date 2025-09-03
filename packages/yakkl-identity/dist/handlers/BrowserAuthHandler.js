/**
 * Browser Authentication Handler
 * Handles web-based authentication flows
 */
export class BrowserAuthHandler {
    constructor(manager) {
        this.manager = manager;
    }
    /**
     * Authenticate in browser context
     */
    async authenticate(request) {
        const { method, credentials } = request;
        switch (method) {
            case 'oauth':
                return this.handleOAuth(credentials);
            case 'passkey':
                return this.handlePasskey(credentials);
            case 'email':
                return this.handleEmail(credentials);
            case 'wallet':
                return this.handleWallet(credentials);
            default:
                throw new Error(`Unsupported browser auth method: ${method}`);
        }
    }
    /**
     * Handle OAuth authentication
     */
    async handleOAuth(credentials) {
        // Use @yakkl/auth OAuthProvider
        const { OAuthProvider } = await import('@yakkl/auth');
        const provider = new OAuthProvider({
            provider: credentials.provider,
            clientId: credentials.clientId || process.env.VITE_OAUTH_CLIENT_ID,
            redirectUri: credentials.redirectUri || window.location.origin + '/callback',
            scopes: credentials.scopes
        });
        // If we have a code (callback), exchange it
        if (credentials.code) {
            const result = await provider.authenticate({ code: credentials.code });
            if (result.success && result.user) {
                return {
                    id: result.user.id,
                    method: 'oauth',
                    tier: 'community',
                    metadata: {
                        name: result.user.displayName,
                        email: result.user.email,
                        avatar: result.user.avatar,
                        context: 'browser',
                        provider: credentials.provider
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
        }
        else {
            // Start OAuth flow
            const authUrl = provider.getAuthorizationUrl(credentials.state);
            window.location.href = authUrl;
        }
        return null;
    }
    /**
     * Handle Passkey authentication
     */
    async handlePasskey(credentials) {
        // Use @yakkl/auth PasskeyProvider
        const { PasskeyProvider } = await import('@yakkl/auth');
        const provider = new PasskeyProvider({
            rpName: credentials.rpName || 'YAKKL',
            rpId: credentials.rpId || window.location.hostname,
            origin: window.location.origin
        });
        // Check if passkeys are supported
        if (!PasskeyProvider.isSupported()) {
            throw new Error('Passkeys not supported on this device');
        }
        if (credentials.action === 'register') {
            // Registration flow
            const options = await provider.startRegistration({
                id: credentials.userId,
                name: credentials.username,
                displayName: credentials.displayName
            });
            // Create credential
            const credential = await navigator.credentials.create({
                publicKey: options
            });
            if (!credential) {
                throw new Error('Passkey registration cancelled');
            }
            const result = await provider.completeRegistration(credentials.userId, credential);
            if (result.success) {
                return {
                    id: credentials.userId,
                    method: 'passkey',
                    publicKey: result.credentialId,
                    tier: 'developer',
                    metadata: {
                        name: credentials.displayName,
                        context: 'browser',
                        authenticator: 'passkey'
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
        }
        else {
            // Authentication flow
            const options = await provider.startAuthentication(credentials.userId);
            // Get credential
            const credential = await navigator.credentials.get({
                publicKey: options
            });
            if (!credential) {
                throw new Error('Passkey authentication cancelled');
            }
            const result = await provider.authenticate({
                assertion: credential,
                userId: credentials.userId
            });
            if (result.success && result.user) {
                return {
                    id: result.user.id,
                    method: 'passkey',
                    tier: 'developer',
                    metadata: {
                        name: result.user.displayName,
                        context: 'browser',
                        authenticator: 'passkey'
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
        }
        return null;
    }
    /**
     * Handle Email/Magic Link authentication
     */
    async handleEmail(credentials) {
        const { email, code } = credentials;
        if (!email) {
            throw new Error('Email required');
        }
        if (code) {
            // Verify magic link code
            const verified = await this.verifyMagicLink(email, code);
            if (verified) {
                return {
                    id: `email_${this.hashEmail(email)}`,
                    method: 'email',
                    tier: 'community',
                    metadata: {
                        email,
                        name: email,
                        displayName: email.split('@')[0],
                        context: 'browser'
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
            }
        }
        else {
            // Send magic link
            await this.sendMagicLink(email);
            // Return null - user needs to check email
            return null;
        }
        return null;
    }
    /**
     * Handle Web3 Wallet authentication
     */
    async handleWallet(credentials) {
        // Use @yakkl/auth Web3Provider
        const { Web3Provider } = await import('@yakkl/auth');
        const provider = new Web3Provider({
            chainId: credentials.chainId || 1, // Default to mainnet
            verifySignature: true,
            message: credentials.message || 'Sign to authenticate with YAKKL'
        });
        const result = await provider.authenticate({
            address: credentials.address,
            signature: credentials.signature,
            message: credentials.message,
            nonce: credentials.nonce
        });
        if (result.success && result.user) {
            return {
                id: result.user.id,
                method: 'wallet',
                publicKey: credentials.address,
                tier: 'developer',
                metadata: {
                    name: result.user.displayName,
                    context: 'browser',
                    walletType: credentials.walletType || 'unknown'
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
        return null;
    }
    // Helper methods
    async sendMagicLink(email) {
        // In production, call backend to send email
        const response = await fetch('/api/auth/magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) {
            throw new Error('Failed to send magic link');
        }
    }
    async verifyMagicLink(email, code) {
        // In production, verify with backend
        const response = await fetch('/api/auth/verify-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        return response.ok;
    }
    hashEmail(email) {
        // Simple hash for ID generation
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            const char = email.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
}
