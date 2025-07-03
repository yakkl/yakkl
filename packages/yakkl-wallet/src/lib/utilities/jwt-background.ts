/**
 * Background Context JWT Manager
 * Works in all browser extension contexts (background, content scripts, service workers)
 * Does NOT use Svelte stores - uses browser storage APIs directly
 */

// No imports needed - this is for background context only

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
	private readonly ISSUER = 'yakkl-wallet';
	private readonly AUDIENCE = 'yakkl-api';

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
		planLevel: string = 'basic',
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
	 * Clear stored token
	 */
	async clearToken(): Promise<void> {
		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					chrome.storage.local.remove([this.STORAGE_KEY], () => {
						resolve();
					});
				});
			} else if (typeof localStorage !== 'undefined') {
				localStorage.removeItem(this.STORAGE_KEY);
			}
		} catch (error) {
			console.error('Failed to clear token:', error);
		}
	}

	/**
	 * Check if token exists and is valid
	 */
	async hasValidToken(): Promise<boolean> {
		const token = await this.getCurrentToken();
		return token !== null;
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
		return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
	}

	private async storeToken(token: string, payload: JWTPayload, expiresAt: number): Promise<void> {
		const data: StoredJWTData = { token, payload, expiresAt };

		try {
			if (this.isExtensionContext()) {
				return new Promise((resolve) => {
					chrome.storage.local.set({ [this.STORAGE_KEY]: data }, () => {
						resolve();
					});
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
					chrome.storage.local.get([this.STORAGE_KEY], (result) => {
						resolve(result[this.STORAGE_KEY] || null);
					});
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
		return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local !== undefined;
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
	planLevel: string = 'basic',
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
