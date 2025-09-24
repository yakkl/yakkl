// dapp.ts - Complete implementation with unified architecture support
import { requestManager } from './eip-6963';
import { log } from '$lib/common/logger-wrapper';
import { verifyDomainConnected } from './verifyDomainConnectedBackground';
// import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { portManager } from '$lib/managers/PortManager';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';

// Port registry to track connected ports
interface PortRegistry {
	contentScripts: Map<number, Runtime.Port>; // tabId -> port
	dappPorts: Map<string, Runtime.Port>; // portId -> port
	unifiedPorts: Map<string, Runtime.Port>; // portId -> port
}

const portRegistry: PortRegistry = {
	contentScripts: new Map(),
	dappPorts: new Map(),
	unifiedPorts: new Map()
};

// Generate unique port IDs
let portIdCounter = 0;
function generatePortId(): string {
	return `dapp-port-${Date.now()}-${portIdCounter++}`;
}

// Main DApp listener function
export async function onDappListener(event: any, port: Runtime.Port): Promise<void> {
	const portId = generatePortId();

	try {
		log.info('Dapp - onDappListener - event: Starting', false, {
			event,
			port,
			portId,
			sender: port.sender,
			timestamp: new Date().toISOString()
		});

		// Register the port
		portRegistry.dappPorts.set(portId, port);

		// Handle port disconnection
		port.onDisconnect.addListener(() => {
			log.debug('Dapp port disconnected:', false, { portId });
			portRegistry.dappPorts.delete(portId);
		});

		// Route messages based on method
		switch (event?.method) {
			case 'get_warning':
				await handleGetWarning(event, port);
				break;

			case 'get_params':
				await handleGetParams(event, port);
				break;

			case 'error':
				await handleError(event, port);
				break;

			default:
				await handleDefaultMessage(event, port, portId);
				break;
		}
	} catch (error) {
		log.error('Dapp - Error in onDappListener:', false, error);
		sendErrorResponse(port, event?.id, error);
	}
}

// Handle get_warning method
async function handleGetWarning(event: any, port: Runtime.Port): Promise<void> {
	try {
		const warningData = await requestManager.getRequest(event.id);

		if (warningData) {
			port.postMessage({
				method: 'get_warning',
				data: warningData,
				timestamp: Date.now()
			});
		} else {
			log.warn('Dapp - get_warning - No warning data found for request:', false, event.id);
			port.postMessage({
				method: 'get_warning',
				data: null,
				error: 'No warning data found'
			});
		}
	} catch (error) {
		log.error('Error handling get_warning:', false, error);
		sendErrorResponse(port, event.id, error);
	}
}

// Handle get_params method
async function handleGetParams(event: any, port: Runtime.Port): Promise<void> {
	try {
		if (!event.id) {
			log.error('Dapp - get_params - No event ID is present.');
			sendErrorResponse(port, null, new Error('No event ID provided'));
			return;
		}

		const request = await requestManager.getRequest(event.id);

		if (request) {
			// Verify domain connection status
      log.info('Dapp - get_params - request:', false, request);
      let isConnected = false;
      if (request.data && request.data.metaData && request.data.metaData.metaData && request.data.metaData.metaData.domain) {
        isConnected = await verifyDomainConnected(request.data.metaData.metaData.domain);
      } else {
        log.error('Dapp - get_params - request.data.metaData.metaData is not present.');
        sendErrorResponse(port, event.id, new Error('Request data is missing metaData - domain information'));
        return;
      }

			log.info('Dapp - get_params - isConnected:', false, {
				isConnected,
				request: request,
				domain: request.data.metaData.metaData.domain
			});

			// Update connection status in the request
			request.data.metaData.metaData.isConnected = isConnected;

			// Send the response
			port.postMessage({
				id: event.id,
				jsonrpc: '2.0',
				method: 'get_params',
				type: 'YAKKL_RESPONSE:EIP6963',
				result: request,
				timestamp: Date.now()
			});
		} else {
			// No request found, send empty params
			port.postMessage({
				id: event.id,
				jsonrpc: '2.0',
				method: 'get_params',
				type: 'YAKKL_RESPONSE:EIP6963',
				result: { params: [] },
				timestamp: Date.now()
			});
		}
	} catch (error) {
		log.error('Error handling get_params:', false, error);
		sendErrorResponse(port, event.id, error);
	}
}

// Handle error method
async function handleError(event: any, port: Runtime.Port): Promise<void> {
	try {
		if (!port) {
			log.error('Dapp - Error case: Sender port is invalid.');
			return;
		}

		port.postMessage({
			id: event.id,
			jsonrpc: '2.0',
			method: event.method,
			type: 'YAKKL_RESPONSE:EIP6963',
			error: event.response?.data || { code: -32603, message: 'Internal error' },
			timestamp: Date.now()
		});
	} catch (error) {
		log.error('Error handling error method:', false, error);
	}
}

// Handle default messages
async function handleDefaultMessage(event: any, port: Runtime.Port, portId: string): Promise<void> {
	try {
		if (!port) {
			log.error('Dapp - Default case: Sender port is invalid.');
			return;
		}

		log.info('Dapp - onDappListener - default case', false, {
			event,
			port,
			portId
		});

		if (!event.id) {
			log.warn('Dapp - Default case: No request ID to forward response.', false, { event });
			return;
		}

		// Check if this is a response that needs to be forwarded to a content script
		if (shouldForwardToContentScript(event)) {
			await forwardToContentScript(event, port);
			return;
		}

		// Standard response handling
		const response: any = {
			id: event.id,
			type: 'YAKKL_RESPONSE:EIP6963',
			jsonrpc: '2.0',
			timestamp: Date.now()
		};

		if (event.error) {
			response.error = event.error;
		} else {
			response.result = event.result;
		}

		log.info('Dapp - Default case forwarding:', false, response);
		port.postMessage(response);

		// Add a small delay to ensure the port is idle
		await new Promise((resolve) => {
			const timerManager = UnifiedTimerManager.getInstance();
			const timerId = `port-delay-${event.id || Date.now()}`;
			timerManager.addTimeout(timerId, () => {
				resolve(undefined);
				timerManager.removeTimeout(timerId);
			}, 100);
			timerManager.startTimeout(timerId);
		});
	} catch (error) {
		log.error('Error handling default message:', false, error);
		sendErrorResponse(port, event.id, error);
	}
}

// Check if a message should be forwarded to content script
function shouldForwardToContentScript(event: any): boolean {
	// Messages with specific targets or that came from UI should be forwarded
	return event.target === 'content' || event.source === 'ui' || event.forward === true;
}

// Forward message to content script
async function forwardToContentScript(message: any, fromPort: Runtime.Port): Promise<void> {
	try {
		const tabId = fromPort.sender?.tab?.id;

		if (!tabId) {
			log.error('Cannot forward to content script: no tab ID', false);
			return;
		}

		// Find the content script port for this tab
		const contentPort = await findContentScriptPort(tabId);

		if (contentPort) {
			log.debug('Forwarding message to content script:', false, {
				tabId,
				message
			});

			contentPort.postMessage({
				...message,
				source: 'background',
				forwarded: true,
				timestamp: Date.now()
			});
		} else {
			log.error('No content script port found for tab:', false, { tabId });
		}
	} catch (error) {
		log.error('Error forwarding to content script:', false, error);
	}
}

// Find content script port for a specific tab
async function findContentScriptPort(tabId: number): Promise<Runtime.Port | undefined> {
	// Check our local registry first
	const registeredPort = portRegistry.contentScripts.get(tabId);
	if (registeredPort) {
		return registeredPort;
	}

	// Use the centralized port manager
	return portManager.getContentScriptPort(tabId);
}

// Updated registerContentScriptPort function
export function registerContentScriptPort(tabId: number, port: Runtime.Port): void {
	log.debug('Registering content script port:', false, { tabId });

	// Register in local registry
	portRegistry.contentScripts.set(tabId, port);

	// Also register in port manager
	portManager.registerContentScriptPort(tabId, port);

	port.onDisconnect.addListener(() => {
		log.debug('Content script port disconnected:', false, { tabId });
		portRegistry.contentScripts.delete(tabId);
		portManager.removeContentScriptPort(tabId);
	});
}

// Send error response
function sendErrorResponse(port: Runtime.Port | null, id: string | null, error: any): void {
	if (!port) {
		log.error('Cannot send error response: no port available');
		return;
	}

	const errorResponse = {
		id: id || 'unknown',
		jsonrpc: '2.0',
		method: 'error',
		type: 'YAKKL_RESPONSE:EIP6963',
		error: {
			code: error.code || -32603,
			message: error.message || 'Internal error',
			data: error.data
		},
		timestamp: Date.now()
	};

	try {
		port.postMessage(errorResponse);
	} catch (e) {
		log.error('Failed to send error response:', false, e);
	}
}

// Handle unified port messages (for future compatibility)
export async function handleUnifiedPortMessage(message: any, port: Runtime.Port): Promise<void> {
	const portId = generatePortId();

	try {
		log.debug('Handling unified port message:', false, {
			message,
			portId
		});

		// Register the unified port
		portRegistry.unifiedPorts.set(portId, port);

		// Route based on message content
		if (message.method && message.id) {
			// This looks like a DApp message, route it through the DApp handler
			await onDappListener(message, port);
		} else if (message.type === 'stream') {
			// Handle stream messages
			await handleStreamMessage(message, port);
		} else {
			// Forward to appropriate handler based on message type
			await routeUnifiedMessage(message, port);
		}
	} catch (error) {
		log.error('Error handling unified port message:', false, error);
		sendErrorResponse(port, message.id, error);
	}
}

// Handle stream messages
async function handleStreamMessage(message: any, port: Runtime.Port): Promise<void> {
	try {
		log.debug('Handling stream message:', false, message);

		// Stream messages should be forwarded directly to content scripts
		const targetTabId = message.tabId || port.sender?.tab?.id;

		if (targetTabId) {
			const contentPort = await findContentScriptPort(targetTabId);

			if (contentPort) {
				contentPort.postMessage({
					...message,
					source: 'background',
					timestamp: Date.now()
				});
			}
		}
	} catch (error) {
		log.error('Error handling stream message:', false, error);
	}
}

// Route unified messages to appropriate handlers
async function routeUnifiedMessage(message: any, port: Runtime.Port): Promise<void> {
	try {
		const { type, method, target } = message;

		if (target === 'content' || type === 'forward') {
			await forwardToContentScript(message, port);
		} else if (type === 'request' || method) {
			await onDappListener(message, port);
		} else {
			log.warn('Unknown unified message type:', false, message);
		}
	} catch (error) {
		log.error('Error routing unified message:', false, error);
	}
}

// Clean up inactive ports periodically using UnifiedTimerManager
const timerManager = UnifiedTimerManager.getInstance();
timerManager.addInterval(
	'dapp-port-cleanup',
	() => {
		const now = Date.now();

		// Clean up inactive DApp ports
		for (const [portId, port] of portRegistry.dappPorts.entries()) {
			try {
				// Try to send a ping to check if port is still active
				port.postMessage({ type: 'ping', timestamp: now });
			} catch (error) {
				// Port is dead, remove it
				portRegistry.dappPorts.delete(portId);
			}
		}

		// Clean up inactive unified ports
		for (const [portId, port] of portRegistry.unifiedPorts.entries()) {
			try {
				port.postMessage({ type: 'ping', timestamp: now });
			} catch (error) {
				portRegistry.unifiedPorts.delete(portId);
			}
		}
	},
	60000
); // Every minute
timerManager.startInterval('dapp-port-cleanup');

// Export the registry for debugging
export { portRegistry };
