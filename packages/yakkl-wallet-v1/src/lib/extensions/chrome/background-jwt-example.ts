/**
 * Example Background Script JWT Usage
 * Demonstrates how to use JWT tokens in browser extension background contexts
 */

import { log } from '$lib/common/logger-wrapper';
import { getJWTForBackground, createJWTInBackground } from '$lib/utilities/jwt';
import { backgroundJWTManager } from '$lib/utilities/jwt-background';

/**
 * Example: Handle API request from content script with JWT authentication
 */
async function handleAPIRequest(request: any, sender: any) {
	try {
		// Get current JWT token
		const token = await getJWTForBackground();

		if (!token) {
			return {
				success: false,
				error: 'No authentication token available'
			};
		}

		// Validate token
		const isValid = await backgroundJWTManager.validateToken(token);
		if (!isValid) {
			return {
				success: false,
				error: 'Authentication token is invalid or expired'
			};
		}

		// Make authenticated API call
		const response = await fetch(request.url, {
			method: request.method || 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				...request.headers
			},
			body: request.body ? JSON.stringify(request.body) : undefined
		});

		const data = await response.json();

		return {
			success: response.ok,
			data: response.ok ? data : undefined,
			error: response.ok ? undefined : data.error || `HTTP ${response.status}`
		};
	} catch (error) {
		log.warn('Background API request failed:', false, error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Network error'
		};
	}
}

/**
 * Example: Create JWT token after successful authentication in background
 */
async function createJWTAfterAuth(userDetails: {
	userId: string;
	username: string;
	profileId: string;
	planLevel?: string;
	sessionId?: string;
}) {
	try {
		const token = await createJWTInBackground(
			userDetails.userId,
			userDetails.username,
			userDetails.profileId,
			userDetails.planLevel || 'basic',
			userDetails.sessionId
		);

		log.info('JWT token created in background context:', false, {
			hasToken: !!token,
			username: userDetails.username
		});

		return token;
	} catch (error) {
		log.warn('Failed to create JWT in background:', false, error);
		throw error;
	}
}

/**
 * Example: Background script message listener
 */
if (typeof chrome !== 'undefined' && chrome.runtime) {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// Handle JWT-authenticated API requests
		if (request.type === 'AUTHENTICATED_API_REQUEST') {
			handleAPIRequest(request, sender).then(sendResponse);
			return true; // Indicates async response
		}

		// Handle JWT token creation requests
		if (request.type === 'CREATE_JWT_TOKEN') {
			createJWTAfterAuth(request.userDetails)
				.then((token) => sendResponse({ success: true, token }))
				.catch((error) =>
					sendResponse({
						success: false,
						error: error.message
					})
				);
			return true; // Indicates async response
		}

		// Handle JWT token validation requests
		if (request.type === 'VALIDATE_JWT_TOKEN') {
			backgroundJWTManager
				.validateToken(request.token)
				.then((isValid) => sendResponse({ success: true, isValid }))
				.catch((error) =>
					sendResponse({
						success: false,
						error: error.message
					})
				);
			return true; // Indicates async response
		}

		// Handle get current JWT token requests
		if (request.type === 'GET_CURRENT_JWT_TOKEN') {
			getJWTForBackground()
				.then((token) => sendResponse({ success: true, token }))
				.catch((error) =>
					sendResponse({
						success: false,
						error: error.message
					})
				);
			return true; // Indicates async response
		}
	});
}

/**
 * Example: Periodic token validation (background task)
 */
async function validateCurrentToken() {
	try {
		const token = await getJWTForBackground();
		if (token) {
			const isValid = await backgroundJWTManager.validateToken(token);
			if (!isValid) {
				log.info('JWT token expired, clearing from storage');
				await backgroundJWTManager.clearToken();
			}
		}
	} catch (error) {
		log.warn('Token validation error:', false, error);
	}
}

// Run token validation every 5 minutes
if (typeof setInterval !== 'undefined') {
	setInterval(validateCurrentToken, 5 * 60 * 1000);
}

export { handleAPIRequest, createJWTAfterAuth, validateCurrentToken };
