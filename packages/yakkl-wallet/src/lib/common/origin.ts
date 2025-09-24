// import type { RuntimePort } from "$lib/extensions/chrome/background";
import { log } from '$lib/common/logger-wrapper';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

const pendingMessages = new Map<
	string,
	{
		message: any;
		timestamp: number;
		attempts: number;
	}
>();

export function getWindowOrigin(): string {
	try {
		// Get the current window's origin
		const origin = window.location.origin;

		// Handle various null/invalid origin cases
		if (!origin || origin === 'null' || origin === 'undefined') {
			return '*'; // Use wildcard for null origins
		}

		// Check for special cases that should use wildcard
		if (
			window.location.protocol === 'data:' ||
			window.location.protocol === 'blob:' ||
			window.location.protocol === 'file:' ||
			window.location.href.startsWith('moz-extension:') ||
			window.location.href.startsWith('chrome-extension:')
		) {
			return '*';
		}

		return origin;
	} catch (error) {
		log.debug('[OriginDetection] Error getting window origin:', false, error);
		return '*'; // Fallback to wildcard
	}
}

/**
 * Get the current window's origin safely
 */
export function getCurrentOrigin(): string {
	try {
		const origin = window.location.origin;

		// Handle null or invalid origins
		if (!origin || origin === 'null' || origin === 'undefined') {
			return 'null';
		}

		return origin;
	} catch (error) {
		log.debug('[Origin] Error getting current origin:', false, error);
		return 'null';
	}
}

/**
 * Validate if a given origin matches the current window origin
 * @param origin The origin to validate
 * @returns boolean indicating if the origin is valid
 */
export function isValidOrigin(origin: string): boolean {
	try {
		const windowOrigin = getCurrentOrigin(); // getWindowOrigin();
		// If we can't determine the window origin, reject the message
		if (!windowOrigin) return false;
		return origin === windowOrigin;
	} catch (error) {
		log.warn('Error validating origin, defaulting to false', false, error);
		return false;
	}
}

/**
 * Get the target origin for postMessage
 * @returns The target origin for postMessage or null if it cannot be determined
 */
// export function getTargetOrigin(): string | null {
//   try {
//     // Check if window and location exist
//     if (typeof window !== 'undefined' && window.location) {
//       // log.debug('getTargetOrigin - window.location', false, window.location, window);
//       // If we're in a frame with a null origin, reject the message
//       if (window.location.origin === 'null') {
//         return null;
//       }
//       // If we can't determine the origin, reject the message
//       if (!window.location.origin) {
//         return null;
//       }
//       return window.location.origin;
//     }
//     return null;
//   } catch (error) {
//     log.warn('Error getting target origin', false, error);
//     return null;
//   }
// }

export function getTargetOrigin(): string {
	try {
		const currentOrigin = getCurrentOrigin();

		// For null origins, use wildcard
		if (currentOrigin === 'null') {
			return '*';
		}

		// For extension contexts, use wildcard
		if (
			window.location.protocol === 'chrome-extension:' ||
			window.location.protocol === 'moz-extension:' ||
			window.location.protocol === 'data:' ||
			window.location.protocol === 'blob:' ||
			window.location.protocol === 'file:'
		) {
			return '*';
		}

		// For sandboxed iframes, use wildcard
		try {
			if (window.parent !== window && window.parent.location.origin === 'null') {
				return '*';
			}
		} catch (e) {
			// Cross-origin access denied, likely sandboxed
			return '*';
		}

		// Return the current origin for normal web contexts
		return currentOrigin;
	} catch (error) {
		log.debug('[OriginUtils] Error determining target origin:', false, error);
		return '*';
	}
}

// NOTE: This is used in the content script and inpage script only.
// Example: safePostMessage(msg, origin, { targetWindow: iframe.contentWindow });
// Use this format when needing to send a message to a specific iframe (parent or child). Otherwise, use the default format below.
// Note: Cleaning up pending messages is handled in the content script
// export function safePostMessage(
//   message: any,
//   targetOrigin: string | null,
//   options?: {
//     targetWindow?: Window | null;
//     allowRetries?: boolean;
//     retryKey?: string;
//     context?: 'content' | 'inpage' | 'ports';
//   }) {
//   try {
//     const recipient = options?.targetWindow ?? window;

//     // log.debug('safePostMessage - attempting to send message:', false, {
//     //   message,
//     //   targetOrigin,
//     //   options,
//     //   windowOrigin: getWindowOrigin(),
//     //   isFrameAccessible: isFrameAccessible(recipient),
//     //   context: options?.context,
//     //   timestamp: new Date().toISOString()
//     // });

//     // If we have a null origin, this likely means the frame was blocked by CSP
//     if (!targetOrigin) {
//       const messageKey = `${message.type}-${message.id}`;

//       log.warn('Cannot send message - frame may have been blocked by CSP', false, {
//         messageType: message.type,
//         messageId: message.id,
//         timestamp: new Date().toISOString()
//       });

//       if (options?.context === 'content' && options?.allowRetries && options.retryKey) {
//         // For EIP-6963 responses, store for potential retry
//         if (message.type === 'YAKKL_RESPONSE:EIP6963') {
//           const pendingMessage = pendingMessages.get(messageKey);
//           if (!pendingMessage || pendingMessage.attempts < MAX_RETRY_ATTEMPTS) {
//             const attempts = (pendingMessage?.attempts || 0) + 1;
//             pendingMessages.set(messageKey, {
//               message: {
//                 ...message,
//                 error: {
//                   code: 4900,
//                   message: 'Frame blocked by Content Security Policy'
//                 }
//               },
//               timestamp: Date.now(),
//               attempts
//             });

//             // Schedule retry if we haven't exceeded max attempts
//             if (attempts < MAX_RETRY_ATTEMPTS) {
//               setTimeout(() => {
//                 const stored = pendingMessages.get(messageKey);
//                 if (stored && Date.now() - stored.timestamp < RETRY_DELAY * MAX_RETRY_ATTEMPTS) {
//                   log.debug('Retrying message send:', false, {
//                     messageKey,
//                     attempt: attempts,
//                     timestamp: new Date().toISOString()
//                   });
//                   safePostMessage(stored.message, getTargetOrigin(), options);
//                 }
//               }, RETRY_DELAY * attempts);
//             }
//           }
//         }
//       }
//       return;
//     }

//     // Verify frame is still accessible before sending
//     if (!isFrameAccessible(recipient)) {
//       log.debug('Frame is no longer accessible, message not sent', false, {
//         messageType: message.type,
//         messageId: message.id,
//         timestamp: new Date().toISOString()
//       });
//       return;
//     }

//     // Try to send the message
//     try {
//       recipient.postMessage(message, targetOrigin);

//       log.debug('safePostMessage: Message sent successfully:', false, {
//         messageType: message.type,
//         messageId: message.id,
//         message,
//         targetOrigin,
//         timestamp: new Date().toISOString()
//       });

//     } catch (error) {
//       log.error('Error sending message:', false, {
//         error,
//         messageType: message.type,
//         messageId: message.id,
//         targetOrigin,
//         timestamp: new Date().toISOString()
//       });
//     }
//   } catch (error) {
//     log.error('Error in safePostMessage:', false, {
//       error,
//       messageType: message.type,
//       messageId: message.id,
//       targetOrigin,
//       timestamp: new Date().toISOString()
//     });
//   }
// }

export function safePostMessage(
	message: any,
	targetOrigin?: string,
	options?: {
		context?: string;
		allowRetries?: boolean;
		retryKey?: string;
		maxRetries?: number;
	}
): boolean {
	const { context = 'unknown', allowRetries = true, retryKey, maxRetries = 2 } = options || {};

	// Determine target origin
	const finalTargetOrigin = targetOrigin || getTargetOrigin();

	let attempts = 0;

	const attemptPostMessage = (origin: string): boolean => {
		attempts++;

		try {
			log.debug(`[SafePostMessage] Attempt ${attempts} from ${context}:`, false, {
				messageType: message.type,
				messageId: message.id,
				targetOrigin: origin,
				currentOrigin: getCurrentOrigin(),
				protocol: window.location.protocol,
				isNull: getCurrentOrigin() === 'null'
			});

			window.postMessage(message, origin);
			return true;
		} catch (error) {
			if (error instanceof Error) {
				if (error.message.includes("does not match the recipient window's origin")) {
					log.debug(`[SafePostMessage] Origin mismatch (attempt ${attempts}):`, false, {
						error: error.message,
						triedOrigin: origin,
						currentOrigin: getCurrentOrigin()
					});

					// Try with wildcard if we haven't already and retries are allowed
					if (allowRetries && origin !== '*' && attempts <= maxRetries) {
						return attemptPostMessage('*');
					}
				} else if (error.message.includes('Extension context invalidated')) {
					log.warn(`[SafePostMessage] Extension context invalidated in ${context}`);
					return false;
				}
			}

			log.warn(`[SafePostMessage] Failed attempt ${attempts} from ${context}:`, false, {
				error: error instanceof Error ? error.message : error,
				messageType: message.type,
				messageId: message.id,
				targetOrigin: origin,
				currentOrigin: getCurrentOrigin()
			});

			return false;
		}
	};

	return attemptPostMessage(finalTargetOrigin);
}

/**
 * Enhanced origin detection for different contexts
 */
export function detectContextType(): 'extension' | 'web' | 'sandboxed' | 'data' | 'unknown' {
	try {
		const protocol = window.location.protocol;
		const origin = getCurrentOrigin();

		if (protocol === 'chrome-extension:' || protocol === 'moz-extension:') {
			return 'extension';
		}

		if (protocol === 'data:' || protocol === 'blob:') {
			return 'data';
		}

		if (origin === 'null') {
			return 'sandboxed';
		}

		if (protocol === 'https:' || protocol === 'http:') {
			return 'web';
		}

		return 'unknown';
	} catch (error) {
		log.debug('[OriginUtils] Error detecting context type:', false, error);
		return 'unknown';
	}
}

/**
 * Check if current context is sandboxed
 */
export function isSandboxedContext(): boolean {
	try {
		const contextType = detectContextType();

		if (contextType === 'sandboxed' || contextType === 'data') {
			return true;
		}

		// Additional checks for sandboxed iframes
		try {
			// Try to access parent - will throw in sandboxed context
			if (window.parent !== window) {
				const parentOrigin = window.parent.location.origin;
				return false; // If we can access parent origin, not sandboxed
			}
		} catch (e) {
			// Can't access parent, likely sandboxed
			return true;
		}

		return false;
	} catch (error) {
		log.debug('[OriginUtils] Error checking if sandboxed:', false, error);
		return true; // Assume sandboxed if we can't determine
	}
}

/**
 * Get safe postMessage configuration for current context
 */
export function getPostMessageConfig(): {
	targetOrigin: string;
	contextType: string;
	isSandboxed: boolean;
	shouldUseWildcard: boolean;
} {
	const contextType = detectContextType();
	const isSandboxed = isSandboxedContext();
	const currentOrigin = getCurrentOrigin();

	// Use wildcard for sandboxed or extension contexts
	const shouldUseWildcard =
		isSandboxed ||
		contextType === 'extension' ||
		contextType === 'data' ||
		currentOrigin === 'null';

	const targetOrigin = shouldUseWildcard ? '*' : currentOrigin;

	return {
		targetOrigin,
		contextType,
		isSandboxed,
		shouldUseWildcard
	};
}

/**
 * Validate postMessage before sending
 */
export function validatePostMessage(
	message: any,
	targetOrigin: string
): {
	isValid: boolean;
	reason?: string;
	suggestedOrigin?: string;
} {
	// Check message format
	if (!message || typeof message !== 'object') {
		return {
			isValid: false,
			reason: 'Invalid message format'
		};
	}

	// Check if we're in a context that supports postMessage
	if (typeof window === 'undefined' || !window.postMessage) {
		return {
			isValid: false,
			reason: 'postMessage not available'
		};
	}

	const config = getPostMessageConfig();

	// If we're trying to use a specific origin but we're in a sandboxed context
	if (targetOrigin !== '*' && config.shouldUseWildcard) {
		return {
			isValid: true, // Still valid, but suggest wildcard
			reason: 'Sandboxed context detected',
			suggestedOrigin: '*'
		};
	}

	return {
		isValid: true
	};
}

/**
 * Debug helper for origin issues
 */
export function debugOriginInfo(): any {
	const config = getPostMessageConfig();

	return {
		currentOrigin: getCurrentOrigin(),
		protocol: window.location.protocol,
		href: window.location.href,
		contextType: config.contextType,
		isSandboxed: config.isSandboxed,
		shouldUseWildcard: config.shouldUseWildcard,
		recommendedTargetOrigin: config.targetOrigin,
		// validOrigins: VALID_ORIGINS,
		timestamp: new Date().toISOString()
	};
}

// export async function getOriginFromPort(port: RuntimePort): Promise<string> {
//   // Try to get the origin from the port's sender
//   if (port.sender?.url) {
//     try {
//       const url = new URL(port.sender.url);
//       return url.origin;
//     } catch (error) {
//       log.warn('Invalid sender URL:', false, { url: port.sender.url });
//     }
//   }

//   // If that fails, try to get it from the tab
//   if (port.sender?.tab?.id) {
//     try {
//       const tab = await browser.tabs.get(port.sender.tab.id);
//       if (tab.url) {
//         const url = new URL(tab.url);
//         return url.origin;
//       }
//     } catch (error) {
//       log.warn('Failed to get tab info:', false, error);
//     }
//   }

//   return '';
// }
