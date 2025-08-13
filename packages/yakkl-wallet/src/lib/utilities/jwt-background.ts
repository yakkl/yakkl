/**
 * Background Context JWT Manager
 * Works in all browser extension contexts (background, content scripts, service workers)
 * Does NOT use Svelte stores - uses browser storage APIs directly
 *
 * Security Features:
 * - Token blacklisting: Invalidated tokens are stored in a blacklist to prevent reuse
 * - Automatic cleanup: Blacklisted tokens expire after 24 hours
 * - Hash-based storage: Only token hashes are stored in the blacklist, not full tokens
 * - Lock integration: Tokens are automatically invalidated when the wallet is locked
 *
 * Usage:
 * - invalidateJWT(token?) - Invalidate a specific token or the current token
 * - clearJWTBlacklist() - Clear all blacklisted tokens (use with caution)
 * - validateToken() now checks blacklist before validating
 * - hasValidToken() also checks if token is blacklisted
 */

// No imports needed - this is for background context only
import browser from 'webextension-polyfill';

interface JWTPayload {
	sub: string; // Subject (user ID)
	username: string; // Username
	profileId: string; // Profile ID
	planLevel: string; // Plan level (basic, pro, etc.)
	sessionId: string; // Session ID for tracking
	iat: number; // Issued at
	exp: number; // Expires at
	iss: string; // Issuer
	aud: string; // Audience
}

interface StoredJWTData {
	token: string;
	payload: JWTPayload;
	expiresAt: number;
}

class BackgroundJWTManager {
	private static instance: BackgroundJWTManager | null = null;
	private readonly STORAGE_KEY = 'yakkl_jwt_token';
	private readonly BLACKLIST_KEY = 'yakkl_jwt_blacklist';
	private readonly ISSUER = 'yakkl-wallet';
	private readonly AUDIENCE = 'yakkl-api';
	private readonly BLACKLIST_EXPIRY_HOURS = 24; // Keep blacklisted tokens for 24 hours

	private constructor() {}

	static getInstance(): BackgroundJWTManager {
		if (!BackgroundJWTManager.instance) {
			BackgroundJWTManager.instance = new BackgroundJWTManager();
		}
		return BackgroundJWTManager.instance;
	}

	/**
	 * Generate a JWT token - works in any context
	 */
	async generateToken(
		userId: string,
		username: string,
		profileId: string,
		planLevel: string = 'explorer_member',
		sessionId?: string,
		expirationMinutes: number = 60
	): Promise<string> {
		try {
			const now = Date.now();
			const exp = now + expirationMinutes * 60 * 1000;

			// Generate session ID if not provided
			const finalSessionId = sessionId || this.generateSessionId();

			const payload: JWTPayload = {
				sub: userId,
				username,
				profileId,
				planLevel,
				sessionId: finalSessionId,
				iat: Math.floor(now / 1000),
				exp: Math.floor(exp / 1000),
				iss: this.ISSUER,
				aud: this.AUDIENCE
			};

			// Get signing key
			const signingKey = await this.getSigningKey();

			// Create JWT
			const header = {
				alg: 'HS256',
				typ: 'JWT'
			};

			const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
			const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

			const signature = await this.sign(`${encodedHeader}.${encodedPayload}`, signingKey);
			const encodedSignature = this.base64UrlEncode(signature);

			const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

			// Store token data
			await this.storeToken(token, payload, exp);

			return token;
		} catch (error) {
			console.error('Failed to generate JWT token:', error);
			throw new Error('Token generation failed');
		}
	}

	/**
	 * Get current JWT token - works in any context
	 */
	async getCurrentToken(): Promise<string | null> {
		try {
			const stored = await this.getStoredToken();
			if (!stored) return null;

			// Check if token is expired
			if (Date.now() >= stored.expiresAt) {
				await this.clearToken();
				return null;
			}

			return stored.token;
		} catch (error) {
			console.error('Failed to get current token:', error);
			return null;
		}
	}

	/**
	 * Validate a JWT token
	 */
	async validateToken(token: string): Promise<boolean> {
		try {
			// First check if token is blacklisted
			if (await this.isTokenBlacklisted(token)) {
				console.debug('Token is blacklisted');
				return false;
			}

			const parts = token.split('.');
			if (parts.length !== 3) return false;

			const payload = JSON.parse(this.base64UrlDecode(parts[1])) as JWTPayload;

			// Check expiration
			if (Date.now() >= payload.exp * 1000) return false;

			// Verify signature
			const signingKey = await this.getSigningKey();
			const expectedSignature = await this.sign(`${parts[0]}.${parts[1]}`, signingKey);
			const actualSignature = this.base64UrlDecode(parts[2]);

			return expectedSignature === actualSignature;
		} catch (error) {
			console.error('Token validation failed:', error);
			return false;
		}
	}

	/**
	 * Get token payload without validation
	 */
	getTokenPayload(token: string): JWTPayload | null {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) return null;

			return JSON.parse(this.base64UrlDecode(parts[1])) as JWTPayload;
		} catch (error) {
			console.error('Failed to decode token payload:', error);
			return null;
		}
	}

	/**
	 * Invalidate a specific token or the current token
	 * Adds token to blacklist to prevent further use
	 */
	async invalidateToken(tokenToInvalidate?: string): Promise<void> {
		try {
			// Get the token to invalidate
			const token = tokenToInvalidate || await this.getCurrentToken();
			if (!token) return;

			// Add to blacklist
			await this.addToBlacklist(token);

			// If it's the current token, clear it
			const currentToken = await this.getCurrentToken();
			if (currentToken === token) {
				await this.clearToken();
			}

			console.debug('Token invalidated successfully');
		} catch (error) {
			console.error('Failed to invalidate token:', error);
		}
	}

	/**
	 * Clear stored token
	 */
	async clearToken(): Promise<void> {
		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.remove([this.STORAGE_KEY]);
				});
			} else if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(this.STORAGE_KEY);
			}
		} catch (error) {
			console.error('Failed to clear token:', error);
		}
	}

	/**
	 * Get current session information
	 */
	async getSessionInfo(): Promise<{
		hasActiveSession: boolean;
		sessionExpiresAt: number | null;
		sessionId: string | null;
		payload: JWTPayload | null;
	}> {
		try {
			const stored = await this.getStoredToken();

			if (!stored) {
				return {
					hasActiveSession: false,
					sessionExpiresAt: null,
					sessionId: null,
					payload: null
				};
			}

			const hasActiveSession = Date.now() < stored.expiresAt;

			return {
				hasActiveSession,
				sessionExpiresAt: stored.expiresAt,
				sessionId: stored.payload?.sessionId || null,
				payload: stored.payload
			};
		} catch (error) {
			console.error('Failed to get session info:', error);
			return {
				hasActiveSession: false,
				sessionExpiresAt: null,
				sessionId: null,
				payload: null
			};
		}
	}

	/**
	 * Check if token exists and is valid
	 */
	async hasValidToken(): Promise<boolean> {
		const token = await this.getCurrentToken();
		if (!token) return false;

		// Also check if it's not blacklisted
		return !(await this.isTokenBlacklisted(token));
	}

	/**
	 * Clear all blacklisted tokens
	 */
	async clearBlacklist(): Promise<void> {
		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.remove([this.BLACKLIST_KEY]);
				});
			} else if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(this.BLACKLIST_KEY);
			}
		} catch (error) {
			console.error('Failed to clear blacklist:', error);
		}
	}

	// Private helper methods

	private async getSigningKey(): Promise<string> {
		try {
			// Generate a key based on date for daily rotation
			const today = new Date().toISOString().split('T')[0];
			const baseKey = `yakkl-jwt-key-${today}`;

			// Create a more complex key by hashing with user-specific data if available
			const encoder = new TextEncoder();
			const data = encoder.encode(baseKey);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
		} catch (error) {
			console.error('Failed to generate signing key:', error);
			// Fallback key
			return 'yakkl-default-key-' + new Date().toISOString().split('T')[0];
		}
	}

	private async sign(data: string, key: string): Promise<string> {
		try {
			const encoder = new TextEncoder();
			const keyData = encoder.encode(key);
			const messageData = encoder.encode(data);

			const cryptoKey = await crypto.subtle.importKey(
				'raw',
				keyData,
				{ name: 'HMAC', hash: 'SHA-256' },
				false,
				['sign']
			);

			const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
			return Array.from(new Uint8Array(signature))
				.map((b) => String.fromCharCode(b))
				.join('');
		} catch (error) {
			console.error('Failed to sign data:', error);
			throw new Error('Signing failed');
		}
	}

	private base64UrlEncode(str: string): string {
		const base64 = btoa(str);
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	private base64UrlDecode(str: string): string {
		// Add padding if needed
		const padding = '===='.slice(0, (4 - (str.length % 4)) % 4);
		const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
		return atob(base64);
	}

	private generateSessionId(): string {
		return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
	}

	private async storeToken(token: string, payload: JWTPayload, expiresAt: number): Promise<void> {
		const data: StoredJWTData = { token, payload, expiresAt };

		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.set({ [this.STORAGE_KEY]: data });
				});
			} else if (typeof localStorage !== 'undefined') {
				localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
			}
		} catch (error) {
			console.error('Failed to store token:', error);
		}
	}

	private async getStoredToken(): Promise<StoredJWTData | null> {
		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.get([this.STORAGE_KEY]);
				});
			} else if (typeof localStorage !== 'undefined') {
				const stored = localStorage.getItem(this.STORAGE_KEY);
				return stored ? JSON.parse(stored) : null;
			}
			return null;
		} catch (error) {
			console.error('Failed to get stored token:', error);
			return null;
		}
	}

	private isExtensionContext(): boolean {
		return typeof window !== 'undefined' && browser.storage && browser.storage.local !== undefined;
	}

	/**
	 * Add token to blacklist
	 */
	private async addToBlacklist(token: string): Promise<void> {
		try {
			const blacklist = await this.getBlacklist();
			const now = Date.now();
			const expiryTime = now + (this.BLACKLIST_EXPIRY_HOURS * 60 * 60 * 1000);

			// Create a hash of the token for storage (don't store full tokens)
			const tokenHash = await this.hashToken(token);
			blacklist[tokenHash] = expiryTime;

			// Clean up expired entries
			const cleanedBlacklist: Record<string, number> = {};
			for (const [hash, expiry] of Object.entries(blacklist)) {
				if (expiry > now) {
					cleanedBlacklist[hash] = expiry;
				}
			}

			// Store updated blacklist
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.set({ [this.BLACKLIST_KEY]: cleanedBlacklist });
				});
			} else if (typeof localStorage !== 'undefined') {
				localStorage.setItem(this.BLACKLIST_KEY, JSON.stringify(cleanedBlacklist));
			}
		} catch (error) {
			console.error('Failed to add token to blacklist:', error);
		}
	}

	/**
	 * Check if token is blacklisted
	 */
	private async isTokenBlacklisted(token: string): Promise<boolean> {
		try {
			const blacklist = await this.getBlacklist();
			const tokenHash = await this.hashToken(token);
			const expiryTime = blacklist[tokenHash];

			if (!expiryTime) return false;

			// Check if still valid
			return Date.now() < expiryTime;
		} catch (error) {
			console.error('Failed to check blacklist:', error);
			return false;
		}
	}

	/**
	 * Get blacklist from storage
	 */
	private async getBlacklist(): Promise<Record<string, number>> {
		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					browser.storage.local.get([this.BLACKLIST_KEY]);
				});
			} else if (typeof localStorage !== 'undefined') {
				const stored = localStorage.getItem(this.BLACKLIST_KEY);
				return stored ? JSON.parse(stored) : {};
			}
			return {};
		} catch (error) {
			console.error('Failed to get blacklist:', error);
			return {};
		}
	}

	/**
	 * Create a hash of the token for blacklist storage
	 */
	private async hashToken(token: string): Promise<string> {
		try {
			const encoder = new TextEncoder();
			const data = encoder.encode(token);
			const hashBuffer = await crypto.subtle.digest('SHA-256', data);
			const hashArray = Array.from(new Uint8Array(hashBuffer));
			return hashArray.slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
		} catch (error) {
			console.error('Failed to hash token:', error);
			// Fallback to simple hash
			return token.split('.')[2]?.substring(0, 32) || 'invalid';
		}
	}
}

// Export singleton instance
export const backgroundJWTManager = BackgroundJWTManager.getInstance();

// Export class for testing
export { BackgroundJWTManager };

// Example usage for background scripts
export async function getJWTForAPI(): Promise<string | null> {
	return await backgroundJWTManager.getCurrentToken();
}

export async function createJWTForUser(
	userId: string,
	username: string,
	profileId: string,
	planLevel: string = 'explorer_member',
	sessionId?: string
): Promise<string> {
	return await backgroundJWTManager.generateToken(
		userId,
		username,
		profileId,
		planLevel,
		sessionId
	);
}

export async function invalidateJWT(token?: string): Promise<void> {
	return await backgroundJWTManager.invalidateToken(token);
}

export async function clearJWTBlacklist(): Promise<void> {
	return await backgroundJWTManager.clearBlacklist();
}
