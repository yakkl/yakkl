// portListeners.ts - Complete production-ready implementation
import {
	DEFAULT_PERSONA,
	YAKKL_DAPP,
	YAKKL_ETH,
	YAKKL_EXTERNAL,
	YAKKL_INTERNAL,
	YAKKL_PROVIDER_EIP6963,
	YAKKL_SPLASH
} from '$lib/common/constants';
import type { YakklCurrentlySelected } from '$lib/common/interfaces';
import { getObjectFromLocalStorage, setObjectInLocalStorage } from '$lib/common/storage';
import { setIconUnlock } from '$lib/utilities/utilities';
import browser from 'webextension-polyfill';
import type { Runtime } from 'webextension-polyfill';
import { showPopup } from '$contexts/background/extensions/chrome/ui';
import { estimateGas, getBlock } from '$contexts/background/extensions/chrome/legacy';
import { supportedChainId } from '$lib/common/utils';
import { onPortInternalListener } from '$lib/common/listeners/ui/portListeners';
import { onEthereumListener } from '$lib/common/listeners/background/backgroundListeners';
import { log } from '$lib/common/logger-wrapper';
import { addDAppActivity } from '../../activities/dapp-activity';
import type { DAppActivity } from '../../activities/dapp-activity';
import { portManager } from '$lib/managers/PortManager';
import { onUnifiedMessageHandler } from '$contexts/background/extensions/chrome/unifiedMessageRouter';
import { sessionPortManager } from '$lib/managers/SessionPortManager';
import { showPopupForMethod } from '$lib/managers/DAppPopupManager';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { backgroundJWTValidator as BackgroundJWTValidatorService } from '@yakkl/security';
import { EnhancedKeyManager } from '$lib/sdk/security/EnhancedKeyManager';
import { showEIP6963Popup } from '$contexts/background/extensions/chrome/eip-6963';

// Initialize timer manager
const timerManager = UnifiedTimerManager.getInstance();

// Define a type-safe timer type that works in both Node and browser environments
type IntervalId = string;

// Port metadata storage using WeakMap for type safety
interface PortMetadata {
	healthCheckInterval?: IntervalId;
	connectionId: string;
	lastActivity: number;
	connectionInfo: {
		name: string;
		tabId?: number;
		url?: string;
		timestamp: string;
	};
}

const portMetadata = new WeakMap<Runtime.Port, PortMetadata>();

// Type for port message handlers
type PortMessageHandler = (message: any, port: Runtime.Port) => void | Promise<void>;

// Request state interface
export interface RequestState {
	data: unknown;
	status: 'pending' | 'approved' | 'rejected' | 'completed';
	timestamp: number;
	requiresApproval: boolean;
}

// Active requests
export let requestsExternal = new Map<string, RequestState>();

// Function to clear all external requests
export function clearAllExternalRequests() {
	requestsExternal.clear();
	completedRequestsHistory.clear();
}

// Completed requests history (cleared after 5 minutes)
const completedRequestsHistory = new Map<string, RequestState>();
const HISTORY_EXPIRY = 5 * 60 * 1000; // 5 minutes

// Cleanup function for completed requests
function cleanupRequest(requestId: string) {
	const request = requestsExternal.get(requestId);
	if (request) {
		// Always remove from active requests
		requestsExternal.delete(requestId);

		// Only move to history if completed and not rejected
		if (request.status === 'completed') {
			completedRequestsHistory.set(requestId, request);
		}
	}
}

// Cleanup expired history entries
function cleanupExpiredHistory() {
	const now = Date.now();
	for (const [requestId, request] of completedRequestsHistory.entries()) {
		if (now - request.timestamp > HISTORY_EXPIRY) {
			completedRequestsHistory.delete(requestId);
		}
	}
}

// Set up periodic cleanup using UnifiedTimerManager
timerManager.addInterval('cleanup-expired-history', cleanupExpiredHistory, HISTORY_EXPIRY);
timerManager.startInterval('cleanup-expired-history');

// Port collections
export const portsExternal = new Map<number, Runtime.Port>();
export let portsDapp: Runtime.Port[] = [];
export let portsInternal: Runtime.Port[] = [];
const connectionToPortMap = new Map<string, Runtime.Port>();
const portToConnectionMap = new Map<Runtime.Port, string>();

// Port Listeners...

// This section registers when the content and background services are connected.
/**
 * Main port connection listener
 * Properly generates connection IDs and keeps them separate from request IDs
 */
export async function onPortConnectListener(port: Runtime.Port) {
	try {
		// Generate a unique connection ID for this port instance
		const connectionId = generateConnectionId();

		// Store the bidirectional mapping
		connectionToPortMap.set(connectionId, port);
		portToConnectionMap.set(port, connectionId);

		// Create metadata for this connection
		const connectionInfo = {
			connectionId: connectionId,
			portName: port.name,
			connectedAt: Date.now(),
			tabId: port.sender?.tab?.id,
			url: port.sender?.url,
			origin: port.sender?.url ? new URL(port.sender.url).origin : undefined
		};

		log.debug('Port connection established:', false, connectionInfo);

		// Handle specific port types
		switch (port.name) {
			case 'yakkl':
				await setIconUnlock();
				if (!port.onMessage.hasListener(onPortInternalListener)) {
					port.onMessage.addListener(onPortInternalListener);
				}
				registerInternalPort(connectionId, port, connectionInfo);
				break;

						case 'jwt-validator':
				// Handle JWT validator port connections
				log.info('[PortListener] JWT validator port connected', false, {
					connectionId,
					tabId: connectionInfo.tabId,
					url: connectionInfo.url
				});

				// JWT validator port registration not needed with new yakkl-security implementation
				// The JWT validator now uses browser messaging APIs directly

				// Also register it internally for tracking
				registerInternalPort(connectionId, port, connectionInfo);
				break;

			case YAKKL_SPLASH:
				if (!port.onMessage.hasListener(onPopupLaunchListener)) {
					port.onMessage.addListener(onPopupLaunchListener);
				}
				// If you need registerSplashPort, implement it
				// Otherwise, just register as internal
				registerInternalPort(connectionId, port, connectionInfo);
				break;

			case YAKKL_INTERNAL:
				if (!port.onMessage.hasListener(onPortInternalListener)) {
					port.onMessage.addListener(onPortInternalListener);
				}
				registerInternalPort(connectionId, port, connectionInfo);
				break;

			// Unified handling for DApp and EIP6963 ports
			case YAKKL_EXTERNAL:
			case YAKKL_PROVIDER_EIP6963:
			case YAKKL_DAPP:
				// Use the unified handler for all these ports
				if (!port.onMessage.hasListener(onUnifiedMessageHandler)) {
					port.onMessage.addListener(onUnifiedMessageHandler);
				}

				// Register in appropriate collection based on type
				if (port.sender && port.sender.tab && port.name === YAKKL_EXTERNAL) {
					const tabId = port.sender.tab.id;
					if (tabId !== undefined) {
						portsExternal.set(tabId, port);
						portManager.registerExternalPort(tabId, port, connectionId);
					}
				} else if (port.name === YAKKL_DAPP || port.name === YAKKL_PROVIDER_EIP6963) {
					// Register as DApp port
					if (!portsDapp.includes(port)) {
						portsDapp.push(port);
					}
					// Pass port object, not connection ID
					portManager.registerDappPort(connectionId, port);
				}
				break;

			case YAKKL_ETH:
				if (!port.onMessage.hasListener(onEthereumListener)) {
					port.onMessage.addListener(onEthereumListener);
				}
				// Only register if you actually use ETH ports
				registerInternalPort(connectionId, port, connectionInfo);
				break;

			default:
				log.info(`Unknown port name: ${port.name}`, false, {
					port: port.name,
					connectionInfo
				});
				break;
		}

		// Set up disconnect handler with proper connection ID
		port.onDisconnect.addListener(() => {
			log.debug('Port disconnecting:', false, {
				portName: port.name,
				tabId: port.sender?.tab?.id,
				connectionId: connectionId,
				timestamp: new Date().toISOString(),
				lastError: browser.runtime.lastError
			});

			onPortDisconnectListener(port, connectionId);
		});
	} catch (error) {
		log.error('Failed to set up port connection:', false, {
			error,
			portName: port.name,
			url: port.sender?.url
		});
	}
}

/**
 * Main port disconnect listener
 * Handles all cleanup when a port disconnects
 * Now includes connection ID for proper tracking
 */
export async function onPortDisconnectListener(
	port: Runtime.Port,
	connectionId?: string
): Promise<void> {
	try {
		// If no connection ID provided, try to find it
		if (!connectionId) {
			connectionId = portToConnectionMap.get(port);
		}

		log.debug('Port disconnecting:', false, {
			portName: port.name,
			tabId: port.sender?.tab?.id,
			connectionId: connectionId,
			timestamp: new Date().toISOString(),
			lastError: browser.runtime.lastError
		});

		// Clean up based on port type
		switch (port.name) {
			case YAKKL_EXTERNAL:
				if (port.sender?.tab?.id) {
					portsExternal.delete(port.sender.tab.id);
					portManager.removeExternalPort(port.sender.tab.id);
				}
				break;

			case YAKKL_DAPP:
			case 'yakkl-dapp':
			case YAKKL_PROVIDER_EIP6963:
				const dappIndex = portsDapp.indexOf(port);
				if (dappIndex > -1) {
					portsDapp.splice(dappIndex, 1);
				}
				portManager.removeDappPort(port);

				// Clean up sessions using connection ID
				if (connectionId) {
					sessionPortManager.removeSession(connectionId);
				}
				break;

			case YAKKL_INTERNAL:
			case 'yakkl-internal':
				const internalIndex = portsInternal.indexOf(port);
				if (internalIndex > -1) {
					portsInternal.splice(internalIndex, 1);
				}
				portManager.removeInternalPort(port);
				break;

			case YAKKL_SPLASH:
				// Handle splash port cleanup if needed
				break;

			case YAKKL_ETH:
				// Handle ETH port cleanup if needed
				break;

			default:
				log.debug(`Unknown port disconnected: ${port.name}`);
		}

		// Clean up health check interval if exists
		const metadata = portMetadata.get(port);
		if (metadata && metadata.healthCheckInterval) {
			const healthCheckId = metadata.healthCheckInterval;
			if (healthCheckId.startsWith('port-health-check-')) {
				timerManager.stopInterval(healthCheckId);
				timerManager.removeInterval(healthCheckId);
			}
		}

		// Clean up metadata
		portMetadata.delete(port);

		// Clean up our connection mappings
		if (connectionId) {
			connectionToPortMap.delete(connectionId);
		}
		portToConnectionMap.delete(port);

		log.debug('Port disconnected successfully:', false, {
			portName: port.name,
			connectionId: connectionId
		});
	} catch (error) {
		log.error('Error in port disconnect listener:', false, {
			error,
			portName: port.name,
			connectionId: connectionId
		});
	}
}

// Add these helper functions
function registerSplashPort(connectionId: string, port: Runtime.Port, connectionInfo: any): void {
	// Similar to registerInternalPort
	log.debug('Registered splash port:', false, {
		connectionId: connectionId,
		portName: port.name
	});
}

// If ETH port is not used, remove the case entirely
// Or implement it if needed
function registerEthPort(connectionId: string, port: Runtime.Port, connectionInfo: any): void {
	log.debug('Registered ETH port:', false, {
		connectionId: connectionId,
		portName: port.name
	});
}
/**
 * Generate a proper connection ID for port instances
 * This is completely separate from request IDs
 */
export function generateConnectionId(): string {
	return `port-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Helper functions for registering different port types
function registerInternalPort(connectionId: string, port: Runtime.Port, connectionInfo: any): void {
	// Add to array if not already present
	if (!portsInternal.includes(port)) {
		portsInternal.push(port);
	}

	// Pass port object to portManager
	portManager.registerInternalPort(connectionId, port);

	log.debug('Registered internal port:', false, {
		connectionId: connectionId,
		portName: port.name
	});
}

function registerDappPort(connectionId: string, port: Runtime.Port, connectionInfo: any): void {
	if (!portsDapp.includes(port)) {
		portsDapp.push(port);
	}
	portManager.registerDappPort(connectionId, port);

	log.debug('Registered DApp port:', false, {
		connectionId: connectionId,
		portName: port.name
	});
}

export async function onPortExternalListener(message: any, port: Runtime.Port): Promise<void> {
	let activity: DAppActivity | null = null;
	const requestTimestamp = Date.now();

	try {
		// Extract sender information from the port
		const sender = port.sender;

		// Validate sender
		if (!sender?.tab?.id) {
			throw new Error('Invalid sender in onPortExternalListener');
		}

		// The port is already the correct port for this connection
		const event = message;

		// Validate event structure
		if (!event?.method || !event?.id) {
			throw new Error('Invalid event structure: missing method or id');
		}

		let yakklCurrentlySelected;
		let error = false;
		const externalData = event;
		externalData.sender = sender;

		// Get API key from EnhancedKeyManager
		const keyManager = EnhancedKeyManager.getInstance();
		await keyManager.initialize();
		const apiKey = await keyManager.getKey('alchemy', 'read');

		// Track the activity
		activity = {
			id: event.id,
			persona: DEFAULT_PERSONA,
			timestamp: requestTimestamp,
			method: event.method,
			status: 'pending',
			domain: sender.url || 'unknown',
			params: event.params
		};

		yakklCurrentlySelected = (await getObjectFromLocalStorage(
			'yakklCurrentlySelected'
		)) as YakklCurrentlySelected;
		if (
			!yakklCurrentlySelected ||
			yakklCurrentlySelected.shortcuts?.accountName?.trim().length === 0 ||
			yakklCurrentlySelected.shortcuts?.address?.trim().length === 0
		) {
			if (!error) {
				error = true;
				// Update activity status
				if (activity) {
					activity.status = 'rejected';
					activity.error = {
						code: 4100,
						message: 'Account not initialized'
					};
					await addDAppActivity(activity);
				}

				requestsExternal.set(event.id, {
					data: 'It appears that your currently selected account in Yakkl has not been set or initialized...',
					status: 'rejected',
					timestamp: Date.now(),
					requiresApproval: false
				});

				await showPopupForMethod('warning', event.id);
				return;
			}
		}

		// Determine if request requires approval
		const requiresApproval =
			event.method === 'eth_requestAccounts' ||
			event.method === 'wallet_requestPermissions' ||
			event.method === 'wallet_switchEthereumChain' ||
			event.method === 'eth_sendTransaction' ||
			event.method === 'eth_signTransaction' ||
			event.method === 'eth_estimateGas' ||
			event.method === 'eth_signTypedData_v4' ||
			event.method === 'personal_sign';

		// Store request with appropriate state
		requestsExternal.set(event.id, {
			data: externalData,
			status: requiresApproval ? 'pending' : 'completed',
			timestamp: Date.now(),
			requiresApproval
		});

		await addDAppActivity(activity);

		// Handle each method
		switch (event.method) {
			case 'eth_requestAccounts':
			case 'wallet_requestPermissions':
				try {
					await showEIP6963Popup(event.method, event.params || []);
				} catch (error) {
					log.error('Error using EIP-6963 implementation for eth_requestAccounts:', false, error);
					await showPopupForMethod(event.method, event.id);
				}
				break;

			case 'eth_sendTransaction':
				try {
					await showEIP6963Popup(event.method, event.params || []);
				} catch (error) {
					log.error('Error using EIP-6963 implementation for eth_sendTransaction:', false, error);
					await showPopupForMethod(event.method, event.id);
				}
				break;

			case 'eth_signTypedData_v4':
			case 'personal_sign':
				try {
					await showEIP6963Popup(event.method, event.params || []);
				} catch (error) {
					log.error(
						'Error using EIP-6963 implementation for eth_signTypedData_v4, personal_sign:',
						false,
						error
					);
					await showPopupForMethod(event.method, event.id);
				}
				break;

			case 'eth_estimateGas':
				if (yakklCurrentlySelected?.shortcuts?.chainId) {
					const response = await estimateGas(
						yakklCurrentlySelected.shortcuts.chainId,
						event.params,
						apiKey
					);
					port.postMessage({
						id: event.id,
						method: event.method,
						type: 'YAKKL_RESPONSE',
						result: response
					});

					// Update activity status
					if (activity) {
						activity.status = 'completed';
						activity.result = response;
						await addDAppActivity(activity);
					}

					// Mark request as completed
					const request = requestsExternal.get(event.id);
					if (request) {
						request.status = 'completed';
						cleanupRequest(event.id);
					}
				}
				break;

			case 'eth_getBlockByNumber':
				if (yakklCurrentlySelected?.shortcuts?.chainId) {
					const block = event?.params[0] ?? 'latest';
					const fullTx = event?.params[1] ?? false;
					let value;
					getBlock(yakklCurrentlySelected.shortcuts.chainId, block, fullTx).then((result) => {
						value = result;
						port.postMessage({
							id: event.id,
							method: event.method,
							type: 'YAKKL_RESPONSE',
							result: value
						});
						// Mark request as completed
						const request = requestsExternal.get(event.id);
						if (request) {
							request.status = 'completed';
							cleanupRequest(event.id);
						}
					});
				}
				break;

			case 'wallet_addEthereumChain':
				port.postMessage({
					id: event.id,
					method: event.method,
					type: 'YAKKL_RESPONSE',
					result: null
				});
				// Mark request as completed
				const addChainRequest = requestsExternal.get(event.id);
				if (addChainRequest) {
					addChainRequest.status = 'completed';
					cleanupRequest(event.id);
				}
				break;

			case 'wallet_switchEthereumChain':
				{
					let value = null;
					if (event?.params?.length > 0) {
						const chainId: number = event.params[0];
						const supported = supportedChainId(chainId);
						if (supported) {
							yakklCurrentlySelected = (await getObjectFromLocalStorage(
								'yakklCurrentlySelected'
							)) as YakklCurrentlySelected;
							if (yakklCurrentlySelected?.shortcuts?.chainId) {
								value = yakklCurrentlySelected.shortcuts.chainId === chainId ? null : chainId;
								if (value) {
									yakklCurrentlySelected.shortcuts.chainId = chainId;
									await setObjectInLocalStorage('yakklCurrentlySelected', yakklCurrentlySelected);
								}
							}
						}
					}
					port.postMessage({
						id: event.id,
						method: event.method,
						type: 'YAKKL_RESPONSE',
						result: value
					});
					// Mark request as completed
					const switchChainRequest = requestsExternal.get(event.id);
					if (switchChainRequest) {
						switchChainRequest.status = 'completed';
						cleanupRequest(event.id);
					}
				}
				break;

			case 'eth_chainId':
				yakklCurrentlySelected = (await getObjectFromLocalStorage(
					'yakklCurrentlySelected'
				)) as YakklCurrentlySelected;
				if (yakklCurrentlySelected?.shortcuts?.chainId) {
					const value = yakklCurrentlySelected.shortcuts.chainId;
					port.postMessage({
						id: event.id,
						method: event.method,
						type: 'YAKKL_RESPONSE',
						result: value
					});
				} else {
					port.postMessage({
						id: event.id,
						method: event.method,
						type: 'YAKKL_RESPONSE',
						result: 1
					}); // Default to mainnet
				}
				// Mark request as completed
				const chainIdRequest = requestsExternal.get(event.id);
				if (chainIdRequest) {
					chainIdRequest.status = 'completed';
					cleanupRequest(event.id);
				}
				break;

			case 'net_version':
				yakklCurrentlySelected = (await getObjectFromLocalStorage(
					'yakklCurrentlySelected'
				)) as YakklCurrentlySelected;
				if (yakklCurrentlySelected?.shortcuts?.chainId) {
					const value = yakklCurrentlySelected.shortcuts.chainId.toString();
					port.postMessage({
						id: event.id,
						method: event.method,
						type: 'YAKKL_RESPONSE',
						result: value
					});
				}
				// Mark request as completed
				const request = requestsExternal.get(event.id);
				if (request) {
					request.status = 'completed';
					cleanupRequest(event.id);
				}
				break;

			default:
				break;
		}
	} catch (error: any) {
		log.error('Error in onPortExternalListener:', false, {
			error,
			event: message,
			sender: port.sender,
			activity
		});

		// Send error response
		if (message?.id) {
			port.postMessage({
				id: message.id,
				method: message.method,
				type: 'YAKKL_RESPONSE',
				error: {
					code: error.code || 4200,
					message:
						error.message || 'The requested method is not supported by this Ethereum provider.'
				}
			});
		}

		// Update activity status
		if (activity) {
			activity.status = 'rejected';
			activity.error = {
				code: error.code || 4200,
				message: error.message || 'The requested method is not supported by this Ethereum provider.'
			};
			await addDAppActivity(activity);
		}

		// Mark request as rejected
		const request = message?.id ? requestsExternal.get(message.id) : null;
		if (request) {
			request.status = 'rejected';
			cleanupRequest(message.id);
		}
	}
}

// Has to check the method here too since this function gets called from different places
// This can be refactored for specific popup types instead of the original use of a splash screen
export async function onPopupLaunchListener(message: unknown, port: Runtime.Port): Promise<void> {
	try {
		if (!browser) return;

		// Type guard to check if message has the expected shape
		const m = message as { popup?: string };

		if (!m.popup || m.popup !== 'YAKKL: Splash') {
			return;
		}

		// Now we can use the port directly instead of the custom type
		const result = await browser.storage.session.get('windowId');
		let windowId: number | undefined = undefined;

		if (result) {
			windowId = result.windowId as number;
		}

		if (windowId) {
			try {
				await browser.windows.get(windowId);
				await browser.windows.update(windowId, { focused: true });
				port.postMessage({ popup: 'YAKKL: Launched' });
			} catch {
				// Mark as internal since this is a session management popup
				await showPopup('', '0', 'internal');
				port.postMessage({ popup: 'YAKKL: Launched' });
			}
		} else {
			// Mark as internal since this is a session management popup
			await showPopup('', '0', 'internal');
			port.postMessage({ popup: 'YAKKL: Launched' });
		}
	} catch (error) {
		log.error('onPopupLaunchListener:', false, error);
	}
}

// All dapp popup methods should use this function. If approval is required, it will show the popup and return a promise. If approval is not required, do not use this function.
// export async function showPopupForMethod(method: string, requestId: string, pinnedLocation: string = 'M') {
//   await showDappPopup(`/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`, requestId, method, pinnedLocation);
// }

// Helper function to set up port health monitoring
function setupPortHealthCheck(port: Runtime.Port, connectionId: string): void {
	const healthCheckId = `port-health-check-${connectionId}`;

	// Set up a periodic health check for this port
	const healthCheckFunction = () => {
		try {
			// Try to send a ping message
			port.postMessage({ type: 'health_check', timestamp: Date.now() });

			// Update last activity
			const metadata = portMetadata.get(port);
			if (metadata) {
				metadata.lastActivity = Date.now();
			}
		} catch (error: any) {
			// Port is dead, clean up
			log.debug('Port health check failed, cleaning up:', false, {
				connectionId,
				error: error.message
			});
			timerManager.stopInterval(healthCheckId);
			timerManager.removeInterval(healthCheckId);
			portMetadata.delete(port);
		}
	};

	timerManager.addInterval(healthCheckId, healthCheckFunction, 30000); // Check every 30 seconds
	timerManager.startInterval(healthCheckId);

	// Update metadata with health check ID
	const metadata = portMetadata.get(port);
	if (metadata) {
		metadata.healthCheckInterval = healthCheckId;
	}
}

// Export functions to safely access port collections
export function getExternalPort(tabId: number): Runtime.Port | undefined {
	return portsExternal.get(tabId);
}

export function getAllExternalPorts(): Map<number, Runtime.Port> {
	return new Map(portsExternal);
}

export function getDappPorts(): Runtime.Port[] {
	return [...portsDapp];
}

export function getInternalPorts(): Runtime.Port[] {
	return [...portsInternal];
}

// Clean up function to remove dead ports
export function cleanupDeadPorts(): void {
	const now = Date.now();

	// Clean external ports
	for (const [tabId, port] of portsExternal.entries()) {
		try {
			port.postMessage({ type: 'ping' });
		} catch (error) {
			log.debug('Removing dead external port:', false, { tabId });
			portsExternal.delete(tabId);
			portManager.removeExternalPort(tabId);
		}
	}

	// Clean DApp ports
	portsDapp = portsDapp.filter((port) => {
		try {
			port.postMessage({ type: 'ping' });
			return true;
		} catch (error) {
			log.debug('Removing dead DApp port');
			const metadata = portMetadata.get(port);
			if (metadata) {
				portManager.removeDappPort(port);
			}
			return false;
		}
	});

	// Clean internal ports
	portsInternal = portsInternal.filter((port) => {
		try {
			port.postMessage({ type: 'ping' });
			return true;
		} catch (error) {
			log.debug('Removing dead internal port');
			const metadata = portMetadata.get(port);
			if (metadata) {
				portManager.removeInternalPort(port);
			}
			return false;
		}
	});
}

// Schedule periodic cleanup using UnifiedTimerManager
timerManager.addInterval('cleanup-dead-ports', cleanupDeadPorts, 60000); // Every minute
timerManager.startInterval('cleanup-dead-ports');
