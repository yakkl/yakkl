/**
 * JWT Token Utilities for YAKKL Wallet
 * Handles JWT token generation and validation for Cloudflare Workers API authentication
 *
 * Note: This manager uses Svelte stores and is for client contexts only.
 * For background/service worker contexts, use jwt-background.ts instead.
 */

import { browser } from '$app/environment';
import { log } from '$lib/common/logger-wrapper';
import { backgroundJWTManager } from './v1_jwt-background';

export interface JWTPayload {
	sub: string; // Subject (user ID)
	iat: number; // Issued at
	exp: number; // Expiration time
	iss: string; // Issuer
	aud: string; // Audience
	profileId?: string; // YAKKL profile ID
	username?: string; // YAKKL username
	planLevel?: string; // User's plan level
	sessionId?: string; // Session identifier
}

export interface JWTHeader {
	alg: string;
	typ: string;
}

export class JWTManager {
	private static instance: JWTManager | null = null;
	private readonly issuer = 'yakkl-wallet';
	private readonly audience = 'yakkl-api';
	private readonly algorithm = 'HS256';

	private constructor() {}

	static getInstance(): JWTManager {
		if (!JWTManager.instance) {
			JWTManager.instance = new JWTManager();
		}
		return JWTManager.instance;
	}

	/**
	 * Generate a JWT token for API authentication
	 */
	async generateToken(
		userId: string,
		username: string,
		profileId: string,
		planLevel: string = 'basic',
		expirationMinutes: number = 60
	): Promise<string> {
		try {
			const now = Math.floor(Date.now() / 1000);
			const sessionId = this.generateSessionId();

			const header: JWTHeader = {
				alg: this.algorithm,
				typ: 'JWT'
			};

			const payload: JWTPayload = {
				sub: userId,
				iat: now,
				exp: now + expirationMinutes * 60,
				iss: this.issuer,
				aud: this.audience,
				profileId,
				username,
				planLevel,
				sessionId
			};

			const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
			const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

			const signature = await this.generateSignature(
				`${encodedHeader}.${encodedPayload}`,
				await this.getSigningKey()
			);

			const token = `${encodedHeader}.${encodedPayload}.${signature}`;

			log.debug('JWT token generated', false, {
				userId,
				username,
				expirationMinutes,
				sessionId
			});

			return token;
		} catch (error) {
			log.error('Failed to generate JWT token:', false, error);
			throw new Error('Token generation failed');
		}
	}

	/**
	 * Validate and decode a JWT token
	 */
	async validateToken(token: string): Promise<JWTPayload | null> {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) {
				throw new Error('Invalid token format');
			}

			const [encodedHeader, encodedPayload, signature] = parts;

			// Verify signature
			const signingKey = await this.getSigningKey();
			const expectedSignature = await this.generateSignature(
				`${encodedHeader}.${encodedPayload}`,
				signingKey
			);

			if (signature !== expectedSignature) {
				throw new Error('Invalid token signature');
			}

			// Decode payload
			const payload: JWTPayload = JSON.parse(this.base64UrlDecode(encodedPayload));

			// Check expiration
			const now = Math.floor(Date.now() / 1000);
			if (payload.exp <= now) {
				throw new Error('Token expired');
			}

			// Validate issuer and audience
			if (payload.iss !== this.issuer || payload.aud !== this.audience) {
				throw new Error('Invalid token issuer or audience');
			}

			log.debug('JWT token validated successfully', false, {
				sub: payload.sub,
				username: payload.username,
				sessionId: payload.sessionId
			});

			return payload;
		} catch (error) {
			log.warn('JWT token validation failed:', false, error);
			return null;
		}
	}

	/**
	 * Refresh a token if it's close to expiration
	 */
	async refreshTokenIfNeeded(
		token: string,
		refreshThresholdMinutes: number = 10
	): Promise<string | null> {
		try {
			const payload = await this.validateToken(token);
			if (!payload) return null;

			const now = Math.floor(Date.now() / 1000);
			const timeUntilExpiry = payload.exp - now;

			// Refresh if token expires within threshold
			if (timeUntilExpiry <= refreshThresholdMinutes * 60) {
				log.debug('Refreshing JWT token', false, {
					timeUntilExpiry,
					threshold: refreshThresholdMinutes * 60
				});

				return await this.generateToken(
					payload.sub,
					payload.username || '',
					payload.profileId || '',
					payload.planLevel || 'basic'
				);
			}

			return token; // Token is still valid
		} catch (error) {
			log.error('Failed to refresh token:', false, error);
			return null;
		}
	}

	/**
	 * Extract token information without validation
	 */
	decodeToken(token: string): { header: JWTHeader; payload: JWTPayload } | null {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) return null;

			const header = JSON.parse(this.base64UrlDecode(parts[0]));
			const payload = JSON.parse(this.base64UrlDecode(parts[1]));

			return { header, payload };
		} catch {
			return null;
		}
	}

	/**
	 * Get time until token expiration
	 */
	getTimeUntilExpiration(token: string): number | null {
		const decoded = this.decodeToken(token);
		if (!decoded) return null;

		const now = Math.floor(Date.now() / 1000);
		return Math.max(0, decoded.payload.exp - now);
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2);
		return `${timestamp}-${random}`;
	}

	/**
	 * Get signing key (in production, this should be from secure storage)
	 */
	private async getSigningKey(): Promise<string> {
		// In production, this should be retrieved from secure storage
		// For now, we'll generate a key based on the user's profile
		if (browser) {
			try {
				const { getSettings } = await import('$lib/common/stores');
				const settings = await getSettings();

				// Create a signing key from user settings and current date (changes daily for security)
				const today = new Date().toISOString().split('T')[0];
				const keyMaterial = `${settings?.id || 'default'}-${today}-yakkl-jwt-key`;

				// Hash the key material to create a consistent signing key
				const encoder = new TextEncoder();
				const data = encoder.encode(keyMaterial);
				const hashBuffer = await crypto.subtle.digest('SHA-256', data);
				const hashArray = Array.from(new Uint8Array(hashBuffer));
				return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
			} catch (error) {
				log.warn('Failed to generate signing key from settings, using fallback', false, error);
			}
		}

		// Fallback key (not secure for production)
		return 'yakkl-fallback-signing-key-change-in-production';
	}

	/**
	 * Generate HMAC signature
	 */
	private async generateSignature(data: string, key: string): Promise<string> {
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
		return this.base64UrlEncode(new Uint8Array(signature));
	}

	/**
	 * Base64 URL encode
	 */
	private base64UrlEncode(data: string | Uint8Array): string {
		const input = typeof data === 'string' ? new TextEncoder().encode(data) : data;
		const base64 = btoa(String.fromCharCode(...input));
		return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	/**
	 * Base64 URL decode
	 */
	private base64UrlDecode(data: string): string {
		const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
		return atob(padded);
	}
}

// Export singleton instance
export const jwtManager = JWTManager.getInstance();

/**
 * Context-aware JWT manager that automatically uses the appropriate implementation
 * - Uses backgroundJWTManager for service workers/background contexts
 * - Uses regular JWTManager for client contexts with Svelte stores
 */
export class ContextAwareJWTManager {
	private static instance: ContextAwareJWTManager | null = null;

	static getInstance(): ContextAwareJWTManager {
		if (!ContextAwareJWTManager.instance) {
			ContextAwareJWTManager.instance = new ContextAwareJWTManager();
		}
		return ContextAwareJWTManager.instance;
	}

	/**
	 * Detect current execution context
	 */
	private isBackgroundContext(): boolean {
		// Check for service worker context
		try {
			if (
				typeof self !== 'undefined' &&
				'ServiceWorkerGlobalScope' in globalThis &&
				self instanceof (globalThis as any).ServiceWorkerGlobalScope
			) {
				return true;
			}
		} catch {
			// ServiceWorkerGlobalScope not available
		}

		// Check for extension background context
		if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && !browser) {
			return true;
		}

		return false;
	}

	/**
	 * Generate JWT token using appropriate manager
	 */
	async generateToken(
		userId: string,
		username: string,
		profileId: string,
		planLevel: string = 'basic',
		sessionId?: string,
		expirationMinutes: number = 60
	): Promise<string> {
		if (this.isBackgroundContext()) {
			return await backgroundJWTManager.generateToken(
				userId,
				username,
				profileId,
				planLevel,
				sessionId,
				expirationMinutes
			);
		} else {
			return await jwtManager.generateToken(
				userId,
				username,
				profileId,
				planLevel,
				expirationMinutes
			);
		}
	}

	/**
	 * Get current JWT token using appropriate manager
	 */
	async getCurrentToken(): Promise<string | null> {
		if (this.isBackgroundContext()) {
			return await backgroundJWTManager.getCurrentToken();
		} else {
			// For client context, we'd need to get from auth store or session manager
			// This would typically be called from the auth store itself
			console.warn('getCurrentToken called from client context - use authStore instead');
			return null;
		}
	}

	/**
	 * Validate token using appropriate manager
	 */
	async validateToken(token: string): Promise<boolean> {
		if (this.isBackgroundContext()) {
			return await backgroundJWTManager.validateToken(token);
		} else {
			const payload = await jwtManager.validateToken(token);
			return payload !== null;
		}
	}

	/**
	 * Clear token using appropriate manager
	 */
	async clearToken(): Promise<void> {
		if (this.isBackgroundContext()) {
			await backgroundJWTManager.clearToken();
		} else {
			// For client context, this would be handled by auth store
			console.warn('clearToken called from client context - use authStore instead');
		}
	}
}

// Export context-aware instance
export const contextAwareJWT = ContextAwareJWTManager.getInstance();

// Helper functions for easy background script usage
export async function getJWTForBackground(): Promise<string | null> {
	return await backgroundJWTManager.getCurrentToken();
}

export async function createJWTInBackground(
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
