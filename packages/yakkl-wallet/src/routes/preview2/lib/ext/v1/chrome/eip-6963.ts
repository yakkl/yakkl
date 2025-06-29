import { log } from '$lib/managers/Logger';
import type { Runtime } from 'webextension-polyfill';
import { ProviderRpcError } from '$lib/common';
import browser from 'webextension-polyfill';
import { UnifiedTimerManager } from '$lib/managers/UnifiedTimerManager';
import { initializePermissions } from '$lib/permissions';
import {
	getBlock,
	getLatestBlock,
	getGasPrice,
	getBalance,
	getCode,
	getNonce,
	getTransactionReceipt,
	getTransaction,
	getLogs
} from './legacy';
import type { Block, BlockTag } from 'alchemy-sdk';
import type { YakklCurrentlySelected } from '$lib/common/interfaces';
import { STORAGE_YAKKL_CURRENTLY_SELECTED, YAKKL_PROVIDER_EIP6963 } from '$lib/common/constants';
// import { KeyManager } from '$lib/managers/KeyManager';
import { estimateGas as estimateGasLegacy } from './legacy';
import { requestManager } from './requestManager';
import type { PendingRequestData } from '$lib/common/interfaces';
import { activeTabBackgroundStore } from '$lib/common/stores';
import { get } from 'svelte/store';
import { extractSecureDomain } from '$lib/common/security';
import {
	getAddressesForDomain,
	getDomainForRequestId,
	revokeDomainConnection,
	verifyDomainConnected
} from '$lib/extensions/chrome/verifyDomainConnectedBackground';
import type { BackgroundPendingRequest } from './background';
import { isReadMethod, isWriteMethod, isSimulationMethod } from './methodClassification';
import { handleReadOnlyRequest } from '$lib/common/listeners/background/readMethodHandler';
import { handleSimulationRequest } from '$lib/common/listeners/background/simulationMethodHandler';
import { handleWriteRequest } from '$lib/common/listeners/background/writeMethodHandler';
import { sendErrorResponse } from '$lib/extensions/chrome/errorResponseHandler';
import { MessageAnalyzer } from './messageAnalyzer';
import { showPopupForMethod } from '$lib/managers/DAppPopupManager';

export { requestManager };

type RuntimePort = Runtime.Port;

// Map to track active connections
const eip6963Ports = new Map<string, RuntimePort>();

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

interface EIP6963Message {
	action: string;
	requestId: string;
	result?: any;
	error?: {
		code: number;
		message: string;
	};
}
const messageAnalyzer = new MessageAnalyzer();
// Add before the handleEIP6963Request function
type PermissionlessMethod = () => Promise<unknown> | unknown;
type PermissionRequiredMethod = () => Promise<unknown>;

interface PermissionlessMethods {
	[key: string]: PermissionlessMethod;
}

interface PermissionRequiredMethods {
	[key: string]: PermissionRequiredMethod;
}

// Add before handleEIP6963Request
const EIP1193_ERRORS = {
	USER_REJECTED: { code: 4001, message: 'User rejected the request' },
	UNAUTHORIZED: { code: 4100, message: 'Unauthorized' },
	UNSUPPORTED_METHOD: { code: 4200, message: 'Method not supported' },
	DISCONNECTED: { code: 4900, message: 'Disconnected' },
	CHAIN_DISCONNECTED: { code: 4901, message: 'Chain disconnected' },
	INVALID_PARAMS: { code: -32602, message: 'Invalid parameters' },
	INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
};

// Track active requests to prevent duplicates
const activeRequests = new Map<
	string,
	{
		timestamp: number;
		promise: Promise<any>;
	}
>();

// Clean up old requests every 5 minutes using UnifiedTimerManager
const timerManager = UnifiedTimerManager.getInstance();
timerManager.addInterval(
	'eip6963-cleanup',
	() => {
		const now = Date.now();
		for (const [requestId, request] of activeRequests.entries()) {
			if (now - request.timestamp > 5 * 60 * 1000) {
				activeRequests.delete(requestId);
			}
		}
	},
	5 * 60 * 1000
);
timerManager.startInterval('eip6963-cleanup');

// Add at the top with other imports
const processedEIP6963Requests = new Set<string>();

/**
 * Get the origin from a request
 * This needs to be implemented based on how your extension receives requests
 */
function getRequestOrigin(request?: any, sender?: browser.Runtime.MessageSender): string {
	try {
		// If we have a sender with a URL, extract the origin
		if (sender && sender.url) {
			return new URL(sender.url).origin;
		}

		// If request contains origin information
		if (request && request.origin) {
			return request.origin;
		}

		// If request contains metadata with domain
		if (request && request.metaDataParams && request.metaDataParams.domain) {
			// Ensure it's a proper origin with protocol
			const domain = request.metaDataParams.domain;
			if (domain.startsWith('http://') || domain.startsWith('https://')) {
				return domain;
			}
			return `https://${domain}`;
		}

		// Default to a placeholder if we can't determine the origin
		log.warn('Could not determine request origin, using placeholder', false, { request, sender });
		return 'unknown-origin';
	} catch (error) {
		log.error('Error getting request origin', false, error);
		return 'unknown-origin';
	}
}

// Add to existing listeners in backgroundListeners.ts
export async function onEIP6963MessageListener(
	message: any,
	sender: Runtime.MessageSender
): Promise<any> {
	try {
		// Type guard to check for EIP-6963 message
		const isEIP6963Message = (msg: any): msg is EIP6963Message =>
			msg &&
			typeof msg === 'object' &&
			typeof msg.action === 'string' &&
			typeof msg.requestId === 'string';

		if (!isEIP6963Message(message)) {
			// Let other handlers try to process it
			log.info('EIP6963 - onMessage - not an EIP6963 message so passing through', false, {
				message
			});
			return undefined; // Return undefined to let the message pass through
		}

		log.info('Received EIP6963 message', false, message);

		if (message.action === 'resolveEIP6963Request') {
			const success = resolveEIP6963Request(message.requestId, message.result);
			log.debug('EIP6963: resolveEIP6963Request', false, {
				success,
				requestId: message.requestId
			});
			return {
				type: 'YAKKL_RESPONSE:EIP6963',
				result: success,
				requestId: message.requestId
			};
		}

		if (message.action === 'rejectEIP6963Request') {
			const success = rejectEIP6963Request(message.requestId, message.error);
			log.debug('EIP6963: rejectEIP6963Request', false, {
				success,
				requestId: message.requestId,
				error: message.error
			});
			return {
				type: 'YAKKL_RESPONSE:EIP6963',
				result: success,
				requestId: message.requestId,
				error: message.error
			};
		}

		// If we got here but message is EIP-6963, still respond with an error
		throw new Error('Unknown EIP6963 action');
	} catch (error) {
		log.error('Error handling EIP-6963 message', false, error);
		return {
			type: 'YAKKL_RESPONSE:EIP6963',
			error: {
				code: 4200,
				message: error instanceof Error ? error.message : String(error)
			}
		};
	}
}

export function initializeEIP6963() {
	if (!browser) return;

	try {
		// Initialize the permissions system
		initializePermissions();

		browser.runtime.onConnect.addListener((port: RuntimePort) => {
			if (port.name !== YAKKL_PROVIDER_EIP6963) return;

			log.debug('EIP6963: Port connected:', false, {
				portName: port.name,
				port: port,
				timestamp: new Date().toISOString()
			});

			const portId = `eip6963_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
			eip6963Ports.set(portId, port);

			// Use the exported onEIP6963Listener directly
			port.onMessage.addListener(async (message: unknown) => {
				await onEIP6963PortListener(message, port);
			});

			port.onDisconnect.addListener(() => {
				eip6963Ports.delete(portId);

				if (browser.runtime.lastError) {
					log.error('EIP-6963 port error on disconnect', false, browser.runtime.lastError);
				}
			});
		});
	} catch (error) {
		log.error('Failed to initialize EIP-6963 handler', true, error);
	}
}

// Helper function to handle getBlock
async function handleGetBlock(
	chainId: number,
	block: BlockTag | Promise<BlockTag>
): Promise<Block | undefined> {
	return await getBlock(chainId, block, undefined);
}

// Helper function to handle estimateGas
async function handleEstimateGas(chainId: any, params: any[]): Promise<unknown | undefined> {
	return await estimateGasLegacy(chainId, params[0]);
}

// Define read-only methods that don't require approval
export const READONLY_METHODS = [
	// Account and Address Methods
	'eth_accounts',
	'eth_coinbase',
	'eth_getBalance',
	'eth_getCode',
	'eth_getStorageAt',
	'eth_getTransactionCount',

	// Block Methods
	'eth_blockNumber',
	'eth_getBlockByHash',
	'eth_getBlockByNumber',
	'eth_getBlockTransactionCountByHash',
	'eth_getBlockTransactionCountByNumber',
	'eth_getUncleByBlockHashAndIndex',
	'eth_getUncleByBlockNumberAndIndex',
	'eth_getUncleCountByBlockHash',
	'eth_getUncleCountByBlockNumber',

	// Chain and Network Methods
	'eth_chainId',
	'net_version',
	'eth_protocolVersion',

	// Compiler Methods
	'eth_compileLLL',
	'eth_compileSerpent',
	'eth_compileSolidity',
	'eth_getCompilers',

	// Filter Methods
	'eth_getFilterChanges',
	'eth_getFilterLogs',
	'eth_getLogs',
	'eth_newBlockFilter',
	'eth_newFilter',
	'eth_newPendingTransactionFilter',
	'eth_uninstallFilter',

	// Gas and Mining Methods
	'eth_gasPrice',
	'eth_hashrate',
	'eth_mining',

	// Transaction Methods
	'eth_getTransactionByBlockHashAndIndex',
	'eth_getTransactionByBlockNumberAndIndex',
	'eth_getTransactionByHash',
	'eth_getTransactionReceipt',

	// Work Methods
	'eth_getWork',
	'eth_submitHashrate',
	'eth_submitWork',

	// State Methods
	'eth_syncing'
];

// Function to handle read-only methods
export async function handleReadOnlyMethod(
	method: string,
	params: any[] = [],
	requestId?: string
): Promise<any> {
	try {
		switch (method) {
			case 'eth_chainId':
				return await getCurrentlySelectedChainId(requestId);
			case 'eth_accounts':
				return await getCurrentlySelectedAccounts(requestId);
			case 'net_version':
				return await getCurrentlySelectedNetworkVersion(requestId);
			case 'eth_blockNumber':
				return await getCurrentlySelectedBlockNumber(requestId);
			case 'eth_getBalance':
				return await getCurrentlySelectedBalance(params[0], requestId);
			case 'eth_getCode':
				return await getCurrentlySelectedCode(params[0], requestId);
			case 'eth_getStorageAt':
				return await getCurrentlySelectedStorageAt(params[0], params[1], requestId);
			case 'eth_getTransactionCount':
				return await getCurrentlySelectedTransactionCount(params[0], requestId);
			case 'eth_gasPrice':
				return await getCurrentlySelectedGasPrice(requestId);
			case 'eth_getBlockByHash':
				return await getCurrentlySelectedBlockByHash(params[0], params[1], requestId);
			case 'eth_getBlockByNumber':
				return await getCurrentlySelectedBlockByNumber(params[0], params[1], requestId);
			case 'eth_getTransactionByHash':
				return await getCurrentlySelectedTransactionByHash(params[0], requestId);
			case 'eth_getTransactionReceipt':
				return await getCurrentlySelectedTransactionReceipt(params[0], requestId);
			case 'eth_getLogs':
				return await getCurrentlySelectedLogs(params[0], requestId);
			default:
				throw new ProviderRpcError(4200, `Method ${method} not supported`);
		}
	} catch (error) {
		log.error('Error handling read-only method:', false, {
			method,
			error,
			timestamp: new Date().toISOString()
		});
		throw error;
	}
}

// Helper function to handle getBlockByNumber
async function getCurrentlySelectedBlockByNumber(
	blockNumber: string,
	fullTx: boolean,
	requestId?: string
): Promise<any> {
	try {
		const shortcuts = await getCurrentlySelectedData(requestId);
		const block = await getBlock(shortcuts.chainId, blockNumber, fullTx ? true : false);
		return block;
	} catch (error) {
		log.error('Error getting block by number:', false, {
			error,
			blockNumber,
			requestId,
			timestamp: new Date().toISOString()
		});
		throw error;
	}
}

// Function to handle write methods that require approval
export async function handleWriteMethod(
	method: string,
	port: Runtime.Port,
	params: any[] = [],
	requestId?: string
): Promise<any> {
	try {
		switch (method) {
			case 'eth_requestAccounts':
				return await handleRequestAccounts(port, requestId);
			case 'eth_sendTransaction':
				return await handleSendTransaction(port, params, requestId);
			case 'eth_sign':
				return await handleSign(port, params, requestId);
			case 'personal_sign':
				return await handlePersonalSign(port, params, requestId);
			case 'eth_signTypedData_v4':
				return await handleSignTypedDataV4(port, params, requestId);
			case 'wallet_addEthereumChain':
				return await handleAddEthereumChain(port, params, requestId);
			case 'wallet_switchEthereumChain':
				return await handleSwitchEthereumChain(port, params, requestId);
			case 'wallet_requestPermissions':
				return await handleRequestPermissions(port, params, requestId);
			case 'wallet_revokePermissions':
				return await handleRevokePermissions(port, params, requestId);
			case 'wallet_getPermissions':
				return await handleGetPermissions(port, requestId);
			default:
				throw new ProviderRpcError(4200, `Method ${method} not supported`);
		}
	} catch (error) {
		log.error('Error handling write method:', false, {
			method,
			error,
			timestamp: new Date().toISOString()
		});
		throw error;
	}
}

// Primary EIP-6963 Port Listener
export async function onEIP6963PortListener(message: any, port: Runtime.Port): Promise<void> {
	try {
		messageAnalyzer.analyze(message);
		// First, let's understand what we received
		log.debug('EIP6963 handler received raw message', false, {
			message,
			messageType: typeof message,
			hasMethod: 'method' in message,
			hasType: 'type' in message,
			timestamp: new Date().toISOString()
		});

		// Try to extract method from various possible locations
		let method = message.method;
		let id = message.id;

		// Fallback: Check if method is nested in data or payload
		if (!method && message.data?.method) {
			method = message.data.method;
			log.debug('Found method in message.data', false, { method });
		}

		// Fallback: Check if this is a wrapped message
		if (!method && message.payload?.method) {
			method = message.payload.method;
			log.debug('Found method in message.payload', false, { method });
		}

		// Fallback: Check if type contains method information (e.g., "YAKKL_REQUEST:eth_accounts")
		if (!method && message.type && typeof message.type === 'string') {
			const typeMatch = message.type.match(/:(eth_[a-zA-Z0-9_]+)/);
			if (typeMatch) {
				method = typeMatch[1];
				log.debug('Extracted method from type', false, { type: message.type, method });
			}
		}

		// Fallback: Check for action field (some systems use action instead of method)
		if (!method && message.action) {
			method = message.action;
			log.debug('Using action as method', false, { action: message.action });
		}

		// Special case: handle non-RPC messages
		if (!method && message.type) {
			switch (message.type) {
				case 'ping':
				case 'PING':
				case 'connection_test':
					// Handle ping/connection test
					port.postMessage({
						type: 'pong',
						id: id || message.id || Date.now().toString(),
						timestamp: Date.now()
					});
					log.debug('Handled ping message', false);
					return;

				case 'init':
				case 'INIT':
				case 'handshake':
					// Handle initialization
					port.postMessage({
						type: 'init_ack',
						id: id || message.id || Date.now().toString(),
						status: 'ready'
					});
					log.debug('Handled init message', false);
					return;

				default:
				// Log unknown message types for debugging
				// log.warn('Unknown message type without method', false, {
				//   type: message.type,
				//   message
				// });
			}
		}

		// After all fallbacks, validate we have a method
		if (!method) {
			log.error('No method found in EIP6963 message after all fallbacks', false, {
				message,
				checkedLocations: [
					'message.method',
					'message.data.method',
					'message.payload.method',
					'message.type (extraction)',
					'message.action'
				]
			});

			// If we have an ID, send a proper error response
			if (id) {
				sendErrorResponse(port, id, new Error('Method is required'));
			} else {
				// Without an ID, we can't send a proper response
				// Log it and potentially close the connection
				log.error('Cannot send error response - no request ID', false);
			}
			return;
		}

		// Now we definitely have a method, continue with normal processing
		log.debug('EIP6963 handler processing message', false, {
			method,
			id,
			timestamp: new Date().toISOString()
		});

		// Skip duplicate requests check remains the same
		if (id && processedEIP6963Requests.has(id)) {
			log.debug('EIP6963: Skipping duplicate request:', false, {
				requestId: id,
				method,
				timestamp: new Date().toISOString()
			});
			return;
		}

		if (id) {
			processedEIP6963Requests.add(id);
		}

		// Route based on method type
		if (isSimulationMethod(method)) {
			log.debug('Routing to simulation handler:', false, { method });
			await handleSimulationRequest(message, port);
		} else if (isWriteMethod(method)) {
			log.debug('Routing to write handler:', false, { method });
			await handleWriteRequest(message, port);
		} else if (isReadMethod(method)) {
			log.debug('Routing to read handler:', false, { method });
			await handleReadOnlyRequest(message, port);
		} else {
			log.warn('Unknown EIP6963 method:', false, { method });
			if (id) {
				sendErrorResponse(port, id, new Error(`Unknown method: ${method}`));
			}
		}
	} catch (error) {
		log.error('Error in EIP6963 handler:', false, error);
		if (message?.id) {
			sendErrorResponse(port, message.id, error);
		}
	}
}

async function switchEthereumChain(params: any, requestId?: string): Promise<null> {
	try {
		const newChainId = parseInt(params[0].chainId, 16);
		// Update chain through appropriate mechanism
		broadcastToEIP6963Ports('chainChanged', `0x${newChainId.toString(16)}`, requestId);
		return null;
	} catch (error) {
		log.error('Error in wallet_switchEthereumChain', false, error);
		throw new ProviderRpcError(4901, 'Failed to switch chain');
	}
}

async function addEthereumChain(
	params: any,
	port: Runtime.Port,
	requestId?: string
): Promise<null> {
	return (await showEIP6963Popup('wallet_addEthereumChain', params, port, requestId)) as null;
}

async function getBlockByNumber(params: any, port: Runtime.Port, requestId?: string): Promise<any> {
	const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
	const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
	if (!yakklCurrentlySelected?.shortcuts?.chainId) {
		throw new ProviderRpcError(4100, 'Wallet not initialized');
	}
	return await showEIP6963Popup('eth_getBlockByNumber', params, port, requestId);
}

async function estimateGas(
	params: any,
	apiKey: string,
	port: Runtime.Port,
	requestId?: string
): Promise<any> {
	const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
	const yakklCurrentlySelected = result[STORAGE_YAKKL_CURRENTLY_SELECTED] as YakklCurrentlySelected;
	if (!yakklCurrentlySelected?.shortcuts?.chainId) {
		throw new ProviderRpcError(4100, 'Wallet not initialized');
	}
	return await showEIP6963Popup('eth_estimateGas', params, port, requestId);
}

// Add parameter validation
function validateParams(method: string, params: any[]): boolean {
	try {
		switch (method) {
			case 'eth_sendTransaction':
				return params.length === 1 && typeof params[0] === 'object';
			case 'eth_sign':
				return (
					params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string'
				);
			case 'personal_sign':
				return (
					params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string'
				);
			case 'eth_signTypedData_v4':
				return (
					params.length === 2 && typeof params[0] === 'string' && typeof params[1] === 'string'
				);
			case 'wallet_switchEthereumChain':
				return (
					params.length === 1 &&
					typeof params[0] === 'object' &&
					typeof params[0].chainId === 'string'
				);
			case 'wallet_addEthereumChain':
				return (
					params.length === 1 &&
					typeof params[0] === 'object' &&
					typeof params[0].chainId === 'string'
				);
			case 'wallet_requestPermissions':
				return (
					params.length === 1 &&
					Array.isArray(params[0]) &&
					params[0].every((p) => typeof p === 'object' && typeof p.eth_accounts === 'object')
				);
			case 'wallet_revokePermissions':
				return (
					params.length === 1 &&
					Array.isArray(params[0]) &&
					params[0].every((p) => typeof p === 'object' && typeof p.eth_accounts === 'object')
				);
			case 'wallet_getPermissions':
				return params.length === 0; // No parameters needed
			// Add more method validations as needed
			default:
				return true; // Default to true for methods without specific validation
		}
	} catch (error) {
		log.error('Parameter validation error', false, { method, params, error });
		return false;
	}
}

// Helper functions to get data from currentlySelected.shortcuts
export async function getCurrentlySelectedData(requestId?: string) {
	try {
		const result = await browser.storage.local.get(STORAGE_YAKKL_CURRENTLY_SELECTED);
		const yakklCurrentlySelected = result[
			STORAGE_YAKKL_CURRENTLY_SELECTED
		] as YakklCurrentlySelected;
		if (!yakklCurrentlySelected?.shortcuts) {
			throw new ProviderRpcError(4100, 'Wallet shortcuts not initialized');
		}

		return yakklCurrentlySelected.shortcuts;
	} catch (error) {
		log.error('Error getting currently selected data', false, error);
		throw new ProviderRpcError(4100, 'Error getting currently selected data');
	}
}

// Read-only method handlers
async function getCurrentlySelectedChainId(requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_chainId');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return `0x${shortcuts.chainId.toString(16)}`;
}

export async function getCurrentlySelectedAccounts(requestId?: string): Promise<string[]> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_accounts');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	const id = shortcuts.id;
	const persona = shortcuts.persona;
	const domain = await getDomainForRequestId(requestId);
	const addresses = await getAddressesForDomain(domain);
	log.info('getCurrentlySelectedAccounts', false, { id, persona, addresses });
	return addresses;
}

async function getCurrentlySelectedNetworkVersion(requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_chainId');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return shortcuts.chainId.toString();
}

async function getCurrentlySelectedBlockNumber(requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_blockNumber');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	const block = await getLatestBlock(shortcuts.chainId);
	return block.number.toString();
}

async function getCurrentlySelectedBalance(address: string, requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getBalance');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	const balance = await getBalance(shortcuts.chainId, address);
	return balance.toString();
}

async function getCurrentlySelectedCode(address: string, requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getCode');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getCode(shortcuts.chainId, address);
}

async function getCurrentlySelectedStorageAt(
	address: string,
	position: string,
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getStorageAt');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getCode(shortcuts.chainId, address); // Implement actual storage getter
}

async function getCurrentlySelectedTransactionCount(
	address: string,
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getTransactionCount');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	const nonce = await getNonce(shortcuts.chainId, address);
	return nonce.toString();
}

async function getCurrentlySelectedGasPrice(requestId?: string): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_gasPrice');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	const gasPrice = await getGasPrice(shortcuts.chainId);
	return gasPrice.toString();
}

async function getCurrentlySelectedBlockByHash(
	hash: string,
	fullTx: boolean,
	requestId?: string
): Promise<any> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getBlockByHash');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getBlock(shortcuts.chainId, hash, fullTx ? true : false);
}

async function getCurrentlySelectedTransactionByHash(
	hash: string,
	requestId?: string
): Promise<any> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getTransactionByHash');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getTransaction(shortcuts.chainId, hash);
}

async function getCurrentlySelectedTransactionReceipt(
	hash: string,
	requestId?: string
): Promise<any> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getTransactionReceipt');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getTransactionReceipt(shortcuts.chainId, hash);
}

async function getCurrentlySelectedLogs(params: any, requestId?: string): Promise<any> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_getLogs');
	}
	const shortcuts = await getCurrentlySelectedData(requestId);
	return await getLogs(shortcuts.chainId, params);
}

// Write method handlers
export async function handleSendTransaction(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_sendTransaction');
	}
	return showEIP6963Popup('eth_sendTransaction', params, port, requestId) as Promise<string>;
}

export async function handleRequestAccounts(
	port: Runtime.Port,
	requestId?: string
): Promise<string[]> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_requestAccounts');
	}
	log.warn('Requesting accounts', false, { method: 'eth_requestAccounts', requestId });
	return showEIP6963Popup('eth_requestAccounts', [], port, requestId) as Promise<string[]>;
}

export async function handleSign(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_sign');
	}
	return showEIP6963Popup('eth_sign', params, port, requestId) as Promise<string>;
}

export async function handlePersonalSign(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for personal_sign');
	}
	return showEIP6963Popup('personal_sign', params, port, requestId) as Promise<string>;
}

export async function handleSignTypedDataV4(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<string> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for eth_signTypedData_v4');
	}
	return showEIP6963Popup('eth_signTypedData_v4', params, port, requestId) as Promise<string>;
}

export async function handleAddEthereumChain(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<null> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for wallet_addEthereumChain');
	}
	return showEIP6963Popup('wallet_addEthereumChain', params, port, requestId) as null;
}

export async function handleSwitchEthereumChain(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<null> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for wallet_switchEthereumChain');
	}
	return showEIP6963Popup('wallet_switchEthereumChain', params, port, requestId) as null;
}

// Add new handlers for permission methods
export async function handleRequestPermissions(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<any> {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for wallet_requestPermissions');
	}
	try {
		// Validate parameters
		if (!validateParams('wallet_requestPermissions', params)) {
			throw new ProviderRpcError(
				EIP1193_ERRORS.INVALID_PARAMS.code,
				'Invalid parameters for wallet_requestPermissions'
			);
		}

		// Show popup for permission request
		return await showEIP6963Popup('wallet_requestPermissions', params, port, requestId);
	} catch (error) {
		log.error('Error handling wallet_requestPermissions:', false, error);
		throw error;
	}
}

export async function handleRevokePermissions(
	port: Runtime.Port,
	params: any[],
	requestId?: string
): Promise<any> {
	try {
		// Validate parameters
		if (!validateParams('wallet_revokePermissions', params)) {
			throw new ProviderRpcError(
				EIP1193_ERRORS.INVALID_PARAMS.code,
				'Invalid parameters for wallet_revokePermissions'
			);
		}

		// Get the origin from the port
		const origin = port.sender?.url ? new URL(port.sender.url).origin : null;
		if (!origin) {
			throw new ProviderRpcError(
				EIP1193_ERRORS.INVALID_PARAMS.code,
				'Could not determine origin for permission revocation'
			);
		}

		// Revoke permissions automatically
		await revokeDomainConnection(origin); // This will remove the domain connection

		// Return success
		return true;
	} catch (error) {
		log.error('Error handling wallet_revokePermissions:', false, error);
		throw error;
	}
}

export async function handleGetPermissions(port: Runtime.Port, requestId?: string): Promise<any> {
	try {
		// Validate parameters
		if (!validateParams('wallet_getPermissions', [])) {
			throw new ProviderRpcError(
				EIP1193_ERRORS.INVALID_PARAMS.code,
				'Invalid parameters for wallet_getPermissions'
			);
		}

		// Get the origin from the port
		const origin = port.sender?.url ? new URL(port.sender.url).origin : null;
		if (!origin) {
			throw new ProviderRpcError(
				EIP1193_ERRORS.INVALID_PARAMS.code,
				'Could not determine origin for permission check'
			);
		}

		// Check if the domain is connected
		const isConnected = await verifyDomainConnected(origin);

		// If connected, return the standard eth_accounts permission
		if (isConnected) {
			return [
				{
					parentCapability: 'eth_accounts',
					caveats: []
				}
			];
		}

		// If not connected, return empty array
		return [];
	} catch (error) {
		log.error('Error handling wallet_getPermissions:', false, error);
		throw error;
	}
}

// Request handling functions
export function resolveEIP6963Request(requestId: string, result: any): void {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for resolveEIP6963Request');
	}
	const request = requestManager.getRequest(requestId);
	if (!request) {
		throw new ProviderRpcError(4100, 'Request not found');
	}
	request.resolve(result);
	requestManager.removeRequest(requestId);
}

export function rejectEIP6963Request(requestId: string, error: any): void {
	if (!requestId) {
		throw new ProviderRpcError(4100, 'Request ID is required for rejectEIP6963Request');
	}
	const request = requestManager.getRequest(requestId);
	if (!request) {
		throw new ProviderRpcError(4100, 'Request not found');
	}
	request.reject(error);
	requestManager.removeRequest(requestId);
}

// Event broadcasting function
export function broadcastToEIP6963Ports(event: string, data: any, requestId?: string): void {
	eip6963Ports.forEach((port) => {
		try {
			if (port.sender) {
				port.postMessage({
					type: 'YAKKL_EVENT:EIP6963',
					event,
					data
				});
			}
		} catch (error) {
			log.error('Error broadcasting to port', false, error);
		}
	});
}

export async function showEIP6963Popup(
	method: string,
	params: any[],
	port: RuntimePort,
	requestId?: string,
	pinnedLocation: string = 'M'
): Promise<any> {
	// Use the provided request ID or throw an error if none provided
	if (!requestId) {
		throw new Error('Request ID is required for EIP-6963 popup');
	}

	// Check if we already have a pending request with this ID
	const existingRequest = requestManager.getRequest(requestId);
	if (existingRequest) {
		log.info(`Reusing existing request for ID: ${requestId}`, false, {
			method,
			requestManager: requestManager,
			existingRequest: existingRequest
		});

		return new Promise<any>((resolve, reject) => {
			existingRequest.resolve = resolve;
			existingRequest.reject = reject;
		});
	}

	// Check for duplicate requests with the same method and params
	const activeRequests = requestManager.getActiveRequests();
	const duplicateRequest = activeRequests.find(
		(req) =>
			req.data.method === method &&
			JSON.stringify(req.data.params) === JSON.stringify(params) &&
			req.data.timestamp > Date.now() - 5000 // Only consider requests from the last 5 seconds
	);

	if (duplicateRequest) {
		log.info(`Found duplicate request for method: ${method}`, false, {
			originalId: duplicateRequest.data.id,
			newId: requestId
		});
		return new Promise<any>((resolve, reject) => {
			duplicateRequest.resolve = resolve;
			duplicateRequest.reject = reject;
		});
	}

	// Show popup
	const activeTab = get(activeTabBackgroundStore);
	const url = activeTab?.url || '';
	const domain = url ? extractSecureDomain(url) : 'NO DOMAIN - NOT ALLOWED';

	// Ensure params is an array and contains the correct data
	const requestParams = Array.isArray(params) ? params : [params];

	log.debug('----------- EIP-6963: Request params: ------------', false, {
		requestParams: requestParams,
		method: method,
		params: params
	});

	const requestData: PendingRequestData = {
		id: requestId,
		method,
		params: requestParams,
		timestamp: Date.now(),
		requiresApproval: true,
		metaData: {
			method: method,
			params: requestParams,
			metaData: {
				domain: domain,
				isConnected: await verifyDomainConnected(domain),
				icon: activeTab?.favIconUrl || '/images/failIcon48x48.png',
				title: activeTab?.title || 'Not Available',
				origin: url,
				message:
					requestParams && requestParams.length > 0 ? String(requestParams[0]) : 'Not Available'
			}
		}
	};

	// Create a new request with proper resolve/reject handlers
	const request: BackgroundPendingRequest = {
		resolve: (result) => {
			port.postMessage({
				type: 'YAKKL_RESPONSE:EIP6963',
				jsonrpc: '2.0',
				id: requestId,
				method,
				result
			});
		},
		reject: (error) => {
			port.postMessage({
				type: 'YAKKL_RESPONSE:EIP6963',
				jsonrpc: '2.0',
				id: requestId,
				method,
				error: {
					code: -32603,
					message: error?.message || 'Internal error'
				}
			});
		},
		port: port as Runtime.Port,
		data: requestData
	};

	// Add request to request manager
	requestManager.addRequest(requestId, request);

	// Show popup based on method
	let popupUrl = `/dapp/popups/approve.html?requestId=${requestId}&source=eip6963&method=${method}`;

	// Show the popup
	showPopupForMethod(method, requestId, 'M');

	// Return a promise that resolves when the user approves or rejects
	return new Promise<any>((resolve, reject) => {
		const request = requestManager.getRequest(requestId);
		if (request) {
			request.resolve = resolve;
			request.reject = reject;
		}
	});
}
