// unified-message-handler.ts
// This file handles all message routing in the extension, combining the original
// sender-based system with the new port-based architecture for better connection tracking

import { log } from '$lib/common/logger-wrapper';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import type { SessionToken } from '$lib/common/interfaces';
import type { YakklResponse } from '$lib/common/interfaces';
import { getSafeUUID } from '$lib/common/uuid';
import { requestManager } from '$contexts/background/extensions/chrome/requestManager';
import { getSigningManager } from '$contexts/background/extensions/chrome/signingManager';
import { getYakklCurrentlySelected } from '$lib/common/stores';
import { showEIP6963Popup } from '$contexts/background/extensions/chrome/eip-6963';
import type { BackgroundPendingRequest } from '$contexts/background/extensions/chrome/background';
import { decryptData } from '$lib/common/encryption';
import { isEncryptedData } from '$lib/common/misc';
import { showPopup } from '$contexts/background/extensions/chrome/ui';
import { startLockIconTimer, stopLockIconTimer } from '$contexts/background/extensions/chrome/iconTimer';
import { setIconLock, setIconUnlock } from '$lib/utilities';
import { isBackgroundContext } from '$lib/common/backgroundSecurity';
import { sessionPortManager } from '$lib/managers/SessionPortManager';
import {
	requestManager as newRequestManager,
	type ExtendedBackgroundPendingRequest
} from '$lib/managers/RequestManager';
import { backgroundJWTManager } from '$lib/utilities/jwt-background';

// Interface for tracking active tabs
interface ActiveTab {
	tabId: number;
	windowId: number;
	windowType: string;
	url?: string;
	title?: string;
	favIconUrl?: string;
	dateTime: string;
}

// Message type constants for routing
export const EIP6963_REQUEST = 'EIP6963_REQUEST';
export const EIP6963_RESPONSE = 'EIP6963_RESPONSE';
export const EIP6963_ANNOUNCE = 'EIP6963_ANNOUNCE';
export const SECURITY_MESSAGE = 'SECURITY_MESSAGE';
export const RUNTIME_MESSAGE = 'RUNTIME_MESSAGE';

// Session management configuration and state
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const JWT_EXPIRATION_MINUTES = 60; // 60 minutes for JWT tokens
let isClientReady = false; // Flag to check if the client is ready before sending messages
let sessionToken: SessionToken | null = null;
let memoryHash: string | null = null;
const sessionPorts = new Map<string, Runtime.Port>(); // Original session port storage
const memoryHashes = new Map<string, string>();
let currentProfileData: { userId?: string; username?: string; profileId?: string } = {};

// Generates a new session token with JWT
async function generateSessionToken(): Promise<SessionToken> {
	try {
		// Generate JWT token if we have profile data
		if (currentProfileData.userId && currentProfileData.username && currentProfileData.profileId) {
			const jwtToken = await backgroundJWTManager.generateToken(
				currentProfileData.userId,
				currentProfileData.username,
				currentProfileData.profileId,
				'basic', // Default plan level
				undefined, // Let it generate session ID
				JWT_EXPIRATION_MINUTES
			);
			
			const expiresAt = Date.now() + JWT_EXPIRATION_MINUTES * 60 * 1000;
			return { token: jwtToken, expiresAt };
		}
	} catch (error) {
		log.warn('Failed to generate JWT token, falling back to simple token', false, error);
	}
	
	// Fallback to simple token
	const token = getSafeUUID();
	const expiresAt = Date.now() + SESSION_TIMEOUT_MS;
	return { token, expiresAt };
}

// Clears the current session data
function clearSession(reason: string) {
	sessionToken = null;
	memoryHash = null;
}

// Original port registration function enhanced to work with both systems
function registerSessionPort(port: Runtime.Port, requestId: string) {
	try {
		log.info('Attempting to register port', false, {
			requestId,
			portName: port?.name,
			portType: typeof port,
			hasOnDisconnect: !!port?.onDisconnect,
			hasOnMessage: !!port?.onMessage
		});

		if (!port || !requestId) {
			log.error('Invalid port or requestId', false, {
				port: port ? { name: port.name, type: typeof port } : null,
				requestId
			});
			return { success: false, error: 'Invalid port or requestId' };
		}

		// Check if port is already registered in original system
		if (sessionPorts.has(requestId)) {
			const existingPort = sessionPorts.get(requestId);
			log.warn('Port already registered for requestId', false, {
				requestId,
				existingPortName: existingPort?.name,
				newPortName: port.name
			});
			return { success: false, error: 'Port already registered' };
		}

		// Store the port in original system
		sessionPorts.set(requestId, port);

		// Also register with the new session port manager for enhanced tracking
		sessionPortManager.registerSessionPort({ requestId }, port);

		log.info('Port registered successfully', false, {
			requestId,
			portName: port.name,
			totalPorts: sessionPorts.size
		});

		return { success: true };
	} catch (error) {
		log.error('Error registering port', false, {
			error: error instanceof Error ? error.message : 'Unknown error',
			requestId,
			port: port ? { name: port.name, type: typeof port } : null,
			stack: error instanceof Error ? error.stack : undefined
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Validates the current session token
async function validateSession(token: string, scope: string): Promise<void> {
	try {
		if (!sessionToken || Date.now() > sessionToken.expiresAt) {
			log.warn('Session validation failed', false, {
				reason: !sessionToken ? 'No session token' : 'Token expired',
				expiresAt: sessionToken?.expiresAt,
				currentTime: Date.now()
			});
			clearSession('Token expired or missing');
			throw new Error('Session expired');
		}
		
		// Try JWT validation first
		const isJWT = token.includes('.');
		if (isJWT) {
			const isValid = await backgroundJWTManager.validateToken(token);
			if (!isValid) {
				log.warn(`JWT validation failed for ${scope}`, false);
				throw new Error('Invalid JWT token');
			}
		} else if (sessionToken.token !== token) {
			log.warn(`Unauthorized access to ${scope}`, false, {
				providedToken: token,
				expectedToken: sessionToken.token
			});
			throw new Error('Unauthorized');
		}
		
		if (!memoryHash) {
			log.warn('Memory hash missing during session validation', false);
			throw new Error('Memory hash missing');
		}
	} catch (error) {
		log.error('Session validation error', false, {
			error: error instanceof Error ? error.message : 'Unknown error',
			scope,
			token
		});
		throw error;
	}
}

// Decrypts data in the background context
export async function decryptDataBackground(payload: any, token: string): Promise<any> {
	// Verify this is being called from the background context
	if (!isBackgroundContext()) {
		throw new Error('Unauthorized context');
	}

	await validateSession(token, 'decryption');
	if (!isEncryptedData(payload)) {
		log.warn('Invalid encrypted data structure');
		throw new Error('Decryption failed');
	}
	return await decryptData(payload, memoryHash!);
}

// New port-based message handler that works with the unified port architecture
export async function onUnifiedPortMessageListener(
	message: any,
	port: Runtime.Port
): Promise<void> {
	try {
		const { id: requestId, method, type, action } = message;

		log.debug('Unified port handler received message', false, {
			requestId: requestId,
			method: method,
			type: type,
			action: action,
			portName: port.name
		});

		// Handle session port registration with new connection ID system
		if (type === 'REGISTER_SESSION_PORT') {
			const connectionId = sessionPortManager.registerSessionPort(message, port);

			// Also register in original system for backward compatibility
			registerSessionPort(port, message.requestId);

			port.postMessage({
				type: 'SESSION_PORT_REGISTERED',
				connectionId: connectionId,
				requestId: message.requestId,
				portName: port.name
			});

			log.info('Session port registered', false, {
				connectionId: connectionId,
				requestId: message.requestId,
				portName: port.name
			});
			return;
		}

		// Handle session port requests with new system
		if (type === 'REQUEST_SESSION_PORT') {
			const sessionInfo = sessionPortManager.getSessionInfo(message.requestId);

			// Fall back to original system if needed
			if (!sessionInfo) {
				const originalPort = sessionPorts.get(message.requestId);
				if (originalPort) {
					port.postMessage({
						type: 'SESSION_PORT_INFO',
						sessionInfo: {
							connectionId: 'legacy',
							portName: originalPort.name,
							requestId: message.requestId
						},
						requestId: message.requestId
					});
					return;
				}
			}

			if (sessionInfo) {
				port.postMessage({
					type: 'SESSION_PORT_INFO',
					sessionInfo: sessionInfo,
					requestId: message.requestId
				});
			} else {
				port.postMessage({
					type: 'SESSION_PORT_NOT_FOUND',
					requestId: message.requestId,
					error: 'No session found for this request ID'
				});
			}

			log.info('Session info request handled', false, {
				requestId: message.requestId,
				found: !!sessionInfo
			});
			return;
		}

		// For all other messages, convert port to sender format and call original handler
		const sender: Runtime.MessageSender = {
			tab: port.sender?.tab,
			id: port.sender?.id,
			url: port.sender?.url,
			frameId: port.sender?.frameId
		};

		// Create an augmented sender with port for handlers that need it
		const senderWithPort = Object.assign({}, sender, { port });

		// Call the original message listener
		const result = await onUnifiedMessageListener(message, senderWithPort);

		// If the original handler returned a result, send it back through the port
		if (result !== undefined) {
			port.postMessage(result);
		}
	} catch (error) {
		log.error('Error in unified port message handler', false, {
			error,
			message,
			portName: port.name
		});

		// Send error response if we have a request ID
		if (message.id) {
			port.postMessage({
				type: 'ERROR_RESPONSE',
				id: message.id,
				error: {
					code: -32603,
					message: error instanceof Error ? error.message : 'Internal error'
				}
			});
		}
	}
}

// Alias for consistency with naming conventions
export const onUnifiedMessageHandler = onUnifiedPortMessageListener;

// Original unified message listener that handles all message types
export async function onUnifiedMessageListener(
	message: any,
	sender: Runtime.MessageSender & { port?: Runtime.Port }
): Promise<any> {
	try {
		const { id: requestId, method, type } = message;

		log.debug('onUnifiedMessageListener - Received message', false, { message, sender });

		// Popout messages
		if (message.type === 'popout') {
			return await handleRuntimeMessage(message, sender);
		}

		// Client ready messages
		if (message.type === 'clientReady') {
			return { success: true, message: 'Client ready acknowledged' };
		}

		// Security messages
		if (message.type === SECURITY_MESSAGE) {
			return await handleSecurityMessage(message, sender);
		}

		// EIP-6963 messages (all variations)
		if (
			message.type === EIP6963_REQUEST ||
			message.type === EIP6963_RESPONSE ||
			message.type === EIP6963_ANNOUNCE ||
			message.type === 'YAKKL_REQUEST:EIP6963' ||
			message.type === 'YAKKL_RESPONSE:EIP6963' ||
			message.type === 'YAKKL_EVENT:EIP6963' ||
			message.type === 'YAKKL_REQUEST:EIP1193' ||
			message.type === 'YAKKL_RESPONSE:EIP1193' ||
			message.type === 'YAKKL_EVENT:EIP1193' ||
			message.method?.startsWith('eth_')
		) {
			// Use the new request manager when we have proper connection tracking
			if (message.id && sender.port) {
				const connectionId = sessionPortManager.getSessionInfo(message.id)?.connectionId;
				newRequestManager.addRequest(
					message.id,
					{
						data: message,
						port: sender.port,
						resolve: () => {},
						reject: () => {}
					} as ExtendedBackgroundPendingRequest,
					connectionId
				);
			}

			return await handleEIP6963Message(message, sender);
		}

		// Runtime messages
		if (
			message.type === RUNTIME_MESSAGE ||
			message.type === 'getActiveTab' ||
			message.type === 'YAKKL_STATE_CHANGE' ||
			message.type === 'SET_PANEL_BEHAVIOR' ||
			message.type === 'clipboard-timeout' ||
			message.type === 'startPricingChecks' ||
			message.type === 'stopPricingChecks'
		) {
			return await handleRuntimeMessage(message, sender);
		}

		// Session messages
		if (
			message.type === 'REQUEST_SESSION_PORT' ||
			message.type === 'REGISTER_SESSION_PORT' ||
			message.type === 'UNREGISTER_SESSION_PORT' ||
			message.type === 'STORE_SESSION_HASH' ||
			message.type === 'REFRESH_SESSION' ||
			message.type === 'SESSION_TOKEN_BROADCAST'
		) {
			return await handleSecurityMessage(message, sender);
		}

		// Signing messages
		if (
			message.type === 'SIGNING_RESPONSE' ||
			message.type?.includes('personal_sign') ||
			message.type?.includes('eth_signTypedData_v4')
		) {
			return await handleSigningMessage(message, sender);
		}

		// Security config messages
		if (
			message.type === 'YAKKL_SECURITY_CONFIG_UPDATE' ||
			message.type === 'SECURITY_CONFIG_UPDATE'
		) {
			return await handleSecurityMessage(message, sender);
		}

		// log.warn('Unknown message type', false, { message });
		return { success: false, error: 'Message type not handled in this listener' };
	} catch (error) {
		log.error('Error in unified message listener', false, error);
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Handles all security-related messages
async function handleSecurityMessage(
	message: any,
	sender: Runtime.MessageSender & { port?: Runtime.Port }
) {
	try {
		log.info('Security message received:', false, {
			type: message?.type,
			action: message?.action,
			hasPayload: !!message?.payload,
			hasToken: !!message?.token,
			requestId: message?.requestId
		});

		// Handle REQUEST_SESSION_PORT
		if (message?.type === 'REQUEST_SESSION_PORT') {
			const requestId = message.requestId;
			if (!requestId) {
				log.error('No requestId provided for REQUEST_SESSION_PORT', false);
				return { success: false, error: 'No requestId provided' };
			}

			// Check both the new and original session management systems
			const newSessionInfo = sessionPortManager.getSessionInfo(requestId);

			log.info('handleSecurityMessage - New session info:', false, newSessionInfo);

			if (newSessionInfo) {
				return { success: true, portName: newSessionInfo.portName };
			}

			// Fall back to original system
			const existingPort = sessionPorts.get(requestId);

			log.info('handleSecurityMessage - Existing port:', false, existingPort);

			if (existingPort) {
				log.info('Found existing port for requestId', false, {
					requestId,
					portName: existingPort.name
				});
				return { success: true, portName: existingPort.name };
			}

			// If no existing port, try to register the sender's port
			if (sender.port) {
				const registrationResult = registerSessionPort(sender.port, requestId);

				log.info('handleSecurityMessage - Registration result:', false, registrationResult);

				if (registrationResult.success) {
					return { success: true, portName: sender.port.name };
				}
			}

			log.warn('No port found for request', false, { requestId });
			return { success: false, error: 'No port found for request' };
		}

		// Handle REGISTER_SESSION_PORT
		if (message?.type === 'REGISTER_SESSION_PORT') {
			if (!message.requestId || !message.port) {
				log.error('Invalid REGISTER_SESSION_PORT request', false, {
					requestId: message?.requestId,
					hasPort: !!message?.port
				});
				return { success: false, error: 'Invalid request' };
			}

			return registerSessionPort(message.port, message.requestId);
		}

		// Handle UNREGISTER_SESSION_PORT
		if (message?.type === 'UNREGISTER_SESSION_PORT') {
			if (!message.requestId) {
				log.error('No requestId provided for UNREGISTER_SESSION_PORT', false);
				return { success: false, error: 'No requestId provided' };
			}

			unregisterPort(message.requestId);
			// Also unregister from new system
			sessionPortManager.removeRequest(message.requestId);
			return { success: true };
		}

		// Handle STORE_SESSION_HASH
		if (message?.type === 'STORE_SESSION_HASH') {
			if (!message.payload || typeof message.payload !== 'string') {
				log.error('Invalid payload for STORE_SESSION_HASH', false);
				return { success: false, error: 'Invalid payload' };
			}

			memoryHash = message.payload;
			
			// Store profile data if provided with the hash
			if (message.profileData) {
				currentProfileData = message.profileData;
			}
			
			sessionToken = await generateSessionToken();

			// Send broadcast after returning response
			setTimeout(async () => {
				await browser.runtime.sendMessage({
					type: 'SESSION_TOKEN_BROADCAST',
					token: sessionToken.token,
					expiresAt: sessionToken.expiresAt
				});
			}, 0);

			return {
				success: true,
				token: sessionToken.token,
				expiresAt: sessionToken.expiresAt
			};
		}

		// Handle REFRESH_SESSION
		if (message?.type === 'REFRESH_SESSION') {
			if (sessionToken && message.token === sessionToken.token) {
				sessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
				return {
					success: true,
					token: sessionToken.token,
					expiresAt: sessionToken.expiresAt
				};
			} else {
				clearSession('Invalid or expired refresh request');
				return { success: false, error: 'Unauthorized' };
			}
		}

		// Handle SESSION_TOKEN_BROADCAST
		if (message?.type === 'SESSION_TOKEN_BROADCAST') {
			// This is handled by the client context
			return undefined;
		}

		// Handle other security messages
		if (message?.type === SECURITY_MESSAGE) {
			// Add handling for other security messages here
			return undefined;
		}

		// If no handler found, return undefined to let other listeners handle it
		return undefined;
	} catch (error) {
		log.error('Error handling security message', false, {
			error: error instanceof Error ? error.message : 'Unknown error',
			message: message?.type,
			requestId: message?.requestId
		});
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// Handles all EIP-6963 and EIP-1193 related messages
async function handleEIP6963Message(message: any, sender: Runtime.MessageSender): Promise<any> {
	try {
		const requestId = message.id || getSafeUUID();
		const origin = getRequestOrigin(message, sender);

		// Handle EIP-1193 methods
		if (message.method?.startsWith('eth_')) {
			return await handleEIP1193Method(message, sender, requestId);
		}

		// Handle EIP-6963 requests
		if (EIP6963_REQUEST === message.type) {
			return await handleEIP6963Request(message, sender, requestId, origin);
		}

		// Handle EIP-6963 responses
		if (EIP6963_RESPONSE === message.type) {
			return await handleEIP6963Response(message, sender, requestId, origin);
		}

		// Handle EIP-6963 events
		if (EIP6963_ANNOUNCE === message.type) {
			return await handleEIP6963Event(message, sender, requestId, origin);
		}

		return undefined;
	} catch (error) {
		log.error('Error handling EIP-6963 message:', false, error);
		return {
			type: EIP6963_RESPONSE,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'EIP-6963 error'
			}
		};
	}
}

// Handles signing-related messages
async function handleSigningMessage(
	message: any,
	sender: Runtime.MessageSender
): Promise<YakklResponse> {
	try {
		if (!message || typeof message !== 'object') {
			log.warn('Invalid signing message', false, { message });
			return {
				type: 'YAKKL_RESPONSE:EIP6963',
				id: message?.requestId || 'unknown',
				error: {
					code: -32602,
					message: 'Invalid message format'
				}
			};
		}

		const { requestId, type, params, token } = message;
		if (!requestId || !type || !params || !token) {
			log.warn('Missing required fields in signing message', false, { message });
			return {
				type: 'YAKKL_RESPONSE:EIP6963',
				id: requestId || 'unknown',
				error: {
					code: -32602,
					message: 'Missing required fields'
				}
			};
		}

		// Validate session token
		try {
			await validateSession(token, 'signing');
		} catch (error) {
			log.error('Session validation failed', false, { error });
			return {
				type: 'YAKKL_RESPONSE:EIP6963',
				id: requestId,
				error: {
					code: -32000,
					message: error instanceof Error ? error.message : 'Session validation failed'
				}
			};
		}

		// Handle the signing request
		const signingManagerInstance = await getSigningManager();
		const result = await signingManagerInstance.handleSigningRequest(
			requestId,
			type,
			params,
			token
		);
		log.info('Signing request completed', false, { result });

		return {
			type: 'YAKKL_RESPONSE:EIP6963',
			id: requestId,
			method: type,
			result: result.result
		};
	} catch (error) {
		log.error('Error handling signing message', false, { error });
		return {
			type: 'YAKKL_RESPONSE:EIP6963',
			id: message?.requestId || 'unknown',
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			}
		};
	}
}

// Handles runtime messages (tabs, popouts, notifications, etc.)
async function handleRuntimeMessage(message: any, sender: Runtime.MessageSender): Promise<any> {
	try {
		log.info('unifiedMessageListener - handleRuntimeMessage - message:', false, message);

		switch (message.type) {
			case 'getActiveTab': {
				try {
					let activeTab: ActiveTab | null = null;
					const tabs = await browser.tabs.query({ active: true });

					if (tabs.length > 0) {
						const realTab = tabs.find((t) => !t.url?.startsWith('chrome-extension://'));
						if (realTab) {
							const win = await browser.windows.get(realTab.windowId);
							activeTab = {
								tabId: realTab.id,
								windowId: realTab.windowId,
								windowType: win.type,
								url: realTab.url,
								title: realTab.title,
								favIconUrl: realTab.favIconUrl,
								dateTime: new Date().toISOString()
							};
						}
					}

					if (activeTab && activeTab.tabId) {
						return { success: true, activeTab: activeTab };
					} else {
						log.error('No active tab found:', true);
						return { success: false, error: 'No active tab found.' };
					}
				} catch (err) {
					log.error('Error getting active tab:', true, err);
					return { success: false, error: err };
				}
			}

			case 'popout': {
				showPopup('');
				return { success: true };
			}

			case 'ping': {
				return { success: true, message: 'Pong' };
			}

			case 'clipboard-timeout': {
				// Start the timeout but return immediately
				setTimeout(async () => {
					try {
						browser.scripting.executeScript({
							target: { tabId: message.tabId },
							func: async () => {
								try {
									await navigator.clipboard.writeText(message.redactText);
								} catch (error) {
									log.error('Failed to write to clipboard:', false, error);
								}
							}
						});
					} catch (error) {
						log.error('Failed to write to clipboard:', false, error);
					}
				}, message.timeout);

				return { success: true, message: 'Clipboard timeout scheduled' };
			}

			case 'createNotification': {
				const { notificationId, title, messageText } = message.payload;

				// Testing to see where this may have come from
				if (title === 'Security Notification') {
					return { success: false, message: 'Security Notification canceled' };
				}

				await browser.notifications.create(notificationId as string, {
					type: 'basic',
					iconUrl: browser.runtime.getURL('/images/logoBullLock48x48.png'),
					title: title || 'Notification',
					message: messageText || 'Default message.'
				});

				return { success: true, message: 'Notification sent' };
			}

			case 'startLockIconTimer': {
				startLockIconTimer();
				return { success: true, message: 'Lock icon timer started.' };
			}

			case 'stopLockIconTimer': {
				stopLockIconTimer();
				return { success: true, message: 'Lock icon timer stopped.' };
			}

			case 'setIconLock': {
				await setIconLock();
				return { success: true, message: 'Lock icon set.' };
			}

			case 'setIconUnlock': {
				await setIconUnlock();
				return { success: true, message: 'Unlock icon set.' };
			}

			default: {
				// Not handled by this listener
				log.info(
					'unifiedMessageListener - handleRuntimeMessage - default (passed through):',
					false,
					message
				);
				return undefined;
			}
		}
	} catch (error: any) {
		log.error('Error handling runtime message:', false, error);
		return {
			success: false,
			error: error?.message || 'Unknown error occurred.'
		};
	}
}

// Helper function to extract origin from request or sender
function getRequestOrigin(request?: any, sender?: Runtime.MessageSender): string {
	try {
		if (request?.origin) return request.origin;
		if (sender?.url) return new URL(sender.url).origin;
		if (sender?.tab?.url) return new URL(sender.tab.url).origin;
		return '';
	} catch (error) {
		log.error('Error getting request origin:', false, error);
		return '';
	}
}

// Handles storing session hash and generating token
async function handleStoreSessionHash(payload: any) {
	try {
		if (!payload || typeof payload !== 'string') {
			log.warn('Invalid payload for session hash storage', false, { payload });
			return { success: false, error: 'Invalid payload' };
		}

		memoryHash = payload;
		sessionToken = await generateSessionToken();

		// Broadcast the new session token
		try {
			await browser.runtime.sendMessage({
				type: 'SESSION_TOKEN_BROADCAST',
				token: sessionToken.token,
				expiresAt: sessionToken.expiresAt
			});
		} catch (error) {
			log.warn('Failed to broadcast session token', false, { error });
		}

		log.info('Session hash stored and token generated', false, {
			token: sessionToken.token,
			expiresAt: sessionToken.expiresAt
		});

		return {
			success: true,
			token: sessionToken.token,
			expiresAt: sessionToken.expiresAt
		};
	} catch (error) {
		log.error('Error storing session hash', false, {
			error: error instanceof Error ? error.message : 'Unknown error',
			payload
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Handles session refresh requests
export async function handleRefreshSession(token: string) {
	try {
		// Verify this is being called from the background context
		if (!isBackgroundContext()) {
			log.warn('Attempt to refresh session from non-background context');
			return { success: false, error: 'Unauthorized context' };
		}

		if (!token) {
			log.warn('No token provided for session refresh', false);
			return { success: false, error: 'No token provided' };
		}

		// Check if the token matches and is not expired
		if (sessionToken && token === sessionToken.token) {
			// Extend the session
			sessionToken.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
			log.info('Session refreshed', false, {
				expiresAt: sessionToken.expiresAt,
				token: sessionToken.token
			});

			// Broadcast the new session token - client context will handle storing it
			try {
				await browser.runtime.sendMessage({
					type: 'SESSION_TOKEN_BROADCAST',
					token: sessionToken.token,
					expiresAt: sessionToken.expiresAt
				});
			} catch (error) {
				log.warn('Failed to broadcast session token', false, { error });
			}

			return {
				success: true,
				token: sessionToken.token,
				expiresAt: sessionToken.expiresAt
			};
		} else {
			log.warn('Invalid or expired refresh request', false, {
				providedToken: token,
				currentToken: sessionToken?.token
			});
			clearSession('Invalid refresh token');
			return { success: false, error: 'Invalid or expired token' };
		}
	} catch (error) {
		log.error('Error refreshing session', false, {
			error: error instanceof Error ? error.message : 'Unknown error',
			token
		});
		return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
	}
}

// Handles EIP-1193 method calls
async function handleEIP1193Method(
	message: any,
	sender: Runtime.MessageSender,
	requestId: string
): Promise<any> {
	try {
		const { method, params } = message;
		const origin = getRequestOrigin(message, sender);

		const request: BackgroundPendingRequest = {
			resolve: () => {},
			reject: () => {},
			port: sender as Runtime.Port,
			data: {
				id: requestId,
				method,
				params,
				timestamp: Date.now(),
				type: EIP6963_REQUEST,
				origin
			}
		};

		// Add request to request manager
		requestManager.addRequest(requestId, request);

		// Show EIP-6963 popup for user interaction
		await showEIP6963Popup(method, params, sender as Runtime.Port, requestId);

		// Wait for response from request manager
		const response = await requestManager.getRequest(requestId);

		if (response?.error) {
			throw new Error(response.error.message);
		}

		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			result: response?.result
		};
	} catch (error) {
		log.error('Error handling EIP-1193 method:', false, error);
		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'EIP-1193 method error'
			}
		};
	}
}

// Handles EIP-6963 requests
async function handleEIP6963Request(
	message: any,
	sender: Runtime.MessageSender,
	requestId: string,
	origin: string
): Promise<any> {
	try {
		const { type, payload } = message;

		const request: BackgroundPendingRequest = {
			resolve: () => {},
			reject: () => {},
			port: sender as Runtime.Port,
			data: {
				id: requestId,
				method: type,
				params: [payload],
				timestamp: Date.now(),
				type,
				origin
			}
		};

		// Add request to request manager
		requestManager.addRequest(requestId, request);

		// Show EIP-6963 popup for user interaction
		await showEIP6963Popup(type, [payload], sender as Runtime.Port, requestId);

		// Wait for response from request manager
		const response = await requestManager.getRequest(requestId);

		if (response?.error) {
			throw new Error(response.error.message);
		}

		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			result: response?.result
		};
	} catch (error) {
		log.error('Error handling EIP-6963 request:', false, error);
		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'EIP-6963 request error'
			}
		};
	}
}

// Handles EIP-6963 responses
async function handleEIP6963Response(
	message: any,
	sender: Runtime.MessageSender,
	requestId: string,
	origin: string
): Promise<any> {
	try {
		const { type, result, error } = message;

		// Update request in request manager
		requestManager.updateRequest(requestId, {
			data: {
				id: requestId,
				method: type,
				params: [],
				timestamp: Date.now(),
				type
			},
			result,
			error
		});

		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			success: true
		};
	} catch (error) {
		log.error('Error handling EIP-6963 response:', false, error);
		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'EIP-6963 response error'
			}
		};
	}
}

// Handles EIP-6963 events
async function handleEIP6963Event(
	message: any,
	sender: Runtime.MessageSender,
	requestId: string,
	origin: string
): Promise<any> {
	try {
		const { type, event, data } = message;

		// Handle different event types
		switch (event) {
			case 'accountsChanged':
				// Handle accounts changed event
				const accounts = await getYakklCurrentlySelected();
				return {
					type: EIP6963_ANNOUNCE,
					event: 'accountsChanged',
					data: accounts
				};

			case 'chainChanged':
				// Handle chain changed event
				return {
					type: EIP6963_ANNOUNCE,
					event: 'chainChanged',
					data: data
				};

			case 'disconnect':
				// Handle disconnect event
				return {
					type: EIP6963_ANNOUNCE,
					event: 'disconnect',
					data: data
				};

			default:
				return undefined;
		}
	} catch (error) {
		log.error('Error handling EIP-6963 event:', false, error);
		return {
			type: EIP6963_RESPONSE,
			id: requestId,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'EIP-6963 event error'
			}
		};
	}
}

// Unregisters a port from both systems
export function unregisterPort(requestId: string) {
	// Verify this is being called from the background context
	if (!isBackgroundContext()) {
		return { success: false, error: 'Unauthorized context' };
	}

	log.info('Unregistering port', false, { requestId });
	sessionPorts.delete(requestId);

	// Also unregister from new system
	sessionPortManager.removeRequest(requestId);

	return { success: true };
}

// Gets the current session token from the background context
export function getBackgroundSessionToken(): SessionToken | null {
	try {
		// Verify this is being called from the background context
		if (!isBackgroundContext()) {
			throw new Error('Unauthorized context');
		}

		if (!sessionToken) {
			log.debug('No active session token found');
			return null;
		}

		// Verify the token hasn't expired
		if (Date.now() > sessionToken.expiresAt) {
			log.debug('Session token has expired');
			clearSession('Token expired');
			return null;
		}

		return sessionToken;
	} catch (error) {
		log.error('Error accessing session token:', false, error);
		return null;
	}
}
