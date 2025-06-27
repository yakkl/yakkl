// background.ts - Complete implementation with unified port handling and message deduplication
import { ensureProcessPolyfill } from '$lib/common/process';
ensureProcessPolyfill();

import { initializeEIP6963 } from './eip-6963';
import { addBackgroundListeners } from '$lib/common/listeners/background/backgroundListeners';
import { log } from '$lib/managers/Logger';
import browser from 'webextension-polyfill';
import { onAlarmListener } from '$lib/common/listeners/background/alarmListeners';
import type { Runtime } from 'webextension-polyfill';
import { type ActiveTab } from '$lib/common';
import { initializePermissions } from '$lib/permissions';
import { initializeStorageDefaults, watchLockedState } from '$lib/common/backgroundUtils';
import { getObjectFromLocalStorage } from '$lib/common/backgroundSecuredStorage';
import { SecurityLevel } from '$lib/permissions/types';
import { getAlchemyProvider } from '$lib/managers/providers/network/ethereum_provider/alchemy';
import type { PendingRequestData } from '$lib/common/interfaces';
import { extractSecureDomain } from '$lib/common/security';
import { sendErrorResponse } from '$lib/extensions/chrome/errorResponseHandler';
import {
	isSimulationMethod,
	isWriteMethod,
	isReadMethod
} from '$lib/extensions/chrome/methodClassification';
import { handleReadOnlyRequest } from '$lib/common/listeners/background/readMethodHandler';
import { handleSimulationRequest } from '$lib/common/listeners/background/simulationMethodHandler';
import { handleWriteRequest } from '$lib/common/listeners/background/writeMethodHandler';
import { initContextTracker } from './context';

// Type definitions for our unified architecture
export type RuntimePort = Runtime.Port;

export interface PortInfo {
	port: RuntimePort;
	type: 'unified' | 'legacy';
	lastActivity: number;
	metadata: {
		tabId?: number;
		url?: string;
		isContentScript: boolean;
	};
}

// Connection manager class to handle all port connections
class ConnectionManager {
	private ports: Map<string, PortInfo> = new Map();
	private portIdCounter = 0;
	private processedMessages = new Map<string, number>();
	private MESSAGE_DEDUP_THRESHOLD = 500; // ms

	// Register a new port connection
	public registerPort(port: RuntimePort, sender?: Runtime.MessageSender): string {
		const portId = `port-${this.portIdCounter++}`;

		const portInfo: PortInfo = {
			port,
			type: this.detectPortType(port.name),
			lastActivity: Date.now(),
			metadata: {
				tabId: sender?.tab?.id,
				url: sender?.url || sender?.tab?.url,
				isContentScript: sender?.url?.startsWith('chrome-extension://') === false
			}
		};

		this.ports.set(portId, portInfo);

		log.debug('Port registered:', false, {
			portId,
			type: portInfo.type,
			metadata: portInfo.metadata
		});

		return portId;
	}

	// Detect the type of port based on its name
	private detectPortType(portName: string): 'unified' | 'legacy' {
		if (portName === 'yakkl-unified') {
			return 'unified';
		}
		return 'legacy';
	}

	// Get port info by ID
	public getPort(portId: string): PortInfo | undefined {
		return this.ports.get(portId);
	}

	// Remove a port
	public removePort(portId: string): void {
		this.ports.delete(portId);
		log.debug('Port removed:', false, { portId });
	}

	// Update port activity
	public updateActivity(portId: string): void {
		const portInfo = this.ports.get(portId);
		if (portInfo) {
			portInfo.lastActivity = Date.now();
		}
	}

	// Clean up inactive ports
	public cleanupInactivePorts(maxInactiveTime: number = 300000): void {
		// 5 minutes
		const now = Date.now();
		for (const [portId, portInfo] of this.ports.entries()) {
			if (now - portInfo.lastActivity > maxInactiveTime) {
				this.removePort(portId);
			}
		}
	}

	// Check if a message is a duplicate
	public isDuplicateMessage(message: any): boolean {
		if (!message || !message.type) return false;

		// Skip deduplication for activity and response messages
		if (
			message.type === 'USER_ACTIVITY' ||
			message.type === 'ui_context_activity' ||
			message.type.includes('RESPONSE')
		) {
			return false;
		}

		// Create a hash based on message type and id
		const messageId = `${message.type}:${message.id || ''}:${message.contextId || ''}`;
		const now = Date.now();

		// Check if we've seen this message recently
		const lastSeen = this.processedMessages.get(messageId);
		if (lastSeen && now - lastSeen < this.MESSAGE_DEDUP_THRESHOLD) {
			return true; // Duplicate message
		}

		// Track this message
		this.processedMessages.set(messageId, now);
		return false;
	}

	// Clean up old message tracking entries
	public cleanupProcessedMessages(): void {
		const now = Date.now();
		const cutoffTime = now - 60000; // 1 minute

		for (const [messageId, timestamp] of this.processedMessages.entries()) {
			if (timestamp < cutoffTime) {
				this.processedMessages.delete(messageId);
			}
		}

		// Keep map at reasonable size
		if (this.processedMessages.size > 5000) {
			const entriesToDelete = this.processedMessages.size - 4000;
			const entries = Array.from(this.processedMessages.entries())
				.sort((a, b) => a[1] - b[1])
				.slice(0, entriesToDelete)
				.map((entry) => entry[0]);

			for (const messageId of entries) {
				this.processedMessages.delete(messageId);
			}
		}
	}
}

// Create our connection manager instance
const connectionManager = new ConnectionManager();

// Pending requests tracking
export type BackgroundPendingRequest = {
	resolve: (value: any) => void;
	reject: (reason: any) => void;
	port: RuntimePort;
	data: PendingRequestData;
	error?: {
		code: number;
		message: string;
	};
	result?: any;
};

export const pendingRequests = new Map<string, BackgroundPendingRequest>();

// Track processed requests to prevent duplicates
const processedBackgroundRequests = new Set<string>();

// Debug helper - redirects to context.ts
export function getIdleManagerStatus() {
	// Import from context.ts
	const { getIdleStatus } = require('./context');
	return getIdleStatus();
}

// Update global debug object to point to the new implementation
if (typeof self !== 'undefined' && (self as any).YAKKLDebug) {
	// If debug API already exists, update it
	(self as any).YAKKLDebug = {
		...(self as any).YAKKLDebug,
		idleManager: {
			getStatus: getIdleManagerStatus
		}
	};
}

// Main port connection handler
browser.runtime.onConnect.addListener((port: RuntimePort) => {
	const sender = port.sender;
	const portId = connectionManager.registerPort(port, sender);

	log.debug('Background: Port connected:', false, {
		portId,
		portName: port.name,
		sender: sender,
		timestamp: new Date().toISOString()
	});

	// Set up message listener for this port
	port.onMessage.addListener(async (message: any) => {
		try {
			connectionManager.updateActivity(portId);

			// Extract actual message content if nested
			const actualMessage = message.message || message;

			// Check for duplicate messages to prevent handling flood
			if (connectionManager.isDuplicateMessage(actualMessage)) {
				log.debug('Background: Dropping duplicate message:', false, {
					type: actualMessage.type
				});
				return;
			}

			log.debug('Background: Message received on port:', false, {
				portId,
				type: actualMessage.type,
				timestamp: new Date().toISOString()
			});

			// Handle different message sources
			if (actualMessage.source === 'content' || actualMessage.source === 'provider') {
				log.debug('Background: Handling provider message:', false, {
					portId,
					type: actualMessage.type,
					timestamp: new Date().toISOString()
				});
				await handleProviderMessage(actualMessage, port, portId);
			} else {
				// Handle other message types based on the message itself
				log.debug('Background: Handling general message:', false, {
					portId,
					type: actualMessage.type,
					timestamp: new Date().toISOString()
				});
				await handleGeneralMessage(actualMessage, port, portId);
			}
		} catch (error) {
			log.error('Error handling port message:', false, error);
			sendErrorResponse(port, message.id, error);
		}
	});

	// Handle port disconnection
	port.onDisconnect.addListener(() => {
		log.debug('Background: Port disconnected:', false, {
			portId,
			timestamp: new Date().toISOString()
		});

		connectionManager.removePort(portId);

		// Clean up any pending requests for this port
		cleanupPendingRequestsForPort(port);
	});
});

// Handle provider-specific messages
async function handleProviderMessage(message: any, port: RuntimePort, portId: string) {
	// Skip duplicate requests
	if (message.id && processedBackgroundRequests.has(message.id)) {
		log.debug('Background: Skipping duplicate request:', false, {
			requestId: message.id,
			method: message.method
		});
		return;
	}

	if (message.id) {
		processedBackgroundRequests.add(message.id);
	}

	// Handle different message types
	switch (message.type) {
		case 'YAKKL_REQUEST:EIP6963':
		case 'YAKKL_REQUEST:EIP1193':
			// Route to appropriate handler based on method type
			const method = message.method;

			if (!method) {
				log.warn('No method specified in provider message:', false, message);
				sendErrorResponse(port, message.id, new Error('Method is required'));
				return;
			}

			try {
				if (isSimulationMethod(method)) {
					await handleSimulationRequest(message, port);
				} else if (isWriteMethod(method)) {
					await handleWriteRequest(message, port);
				} else if (isReadMethod(method)) {
					await handleReadOnlyRequest(message, port);
				} else {
					log.warn('Unknown provider method:', false, { method });
					sendErrorResponse(port, message.id, new Error(`Unknown method: ${method}`));
				}
			} catch (error) {
				log.error('Error handling provider message:', false, error);
				sendErrorResponse(port, message.id, error);
			}
			break;

		case 'CONNECTION_TEST':
			// Respond to connection test
			port.postMessage({
				type: 'CONNECTION_TEST_RESPONSE',
				id: message.id
			});
			break;

		case 'clientReady':
			// Client is ready, just acknowledge
			port.postMessage({
				type: 'clientReady_response',
				id: message.id,
				success: true
			});
			break;

		default:
			// Handle through unified message handler
			await handleUnknownMessage(message, port, portId);
	}
}

// Handle general messages (not provider-specific)
async function handleGeneralMessage(message: any, port: RuntimePort, portId: string) {
	// Extract actual message if needed
	const actualMessage = message.message || message;

	// List of one-way messages that should always get immediate responses
	const oneWayMessages = [
		'clientReady',
		'ui_context_initialized',
		'ui_context_activity',
		'ui_context_closing',
		'SET_LOGIN_VERIFIED',
		'USER_ACTIVITY'
	];

	// Check if this is a one-way message type
	if (oneWayMessages.includes(actualMessage.type)) {
		// Send immediate acknowledgment response
		try {
			port.postMessage({
				type: `${actualMessage.type}_response`,
				id: actualMessage.id || actualMessage.messageId,
				success: true
			});
		} catch (err) {
			// If port is closed, ignore the error
		}
	}

	// Then proceed with regular message handling
	switch (actualMessage.type) {
		case 'SECURITY_CONFIG_REQUEST':
			// Handle security configuration requests
			const securityLevel = await getSecurityLevel();
			port.postMessage({
				type: 'SECURITY_CONFIG_RESPONSE',
				securityLevel,
				injectIframes: shouldInjectIframes(securityLevel)
			});
			break;

		case 'YAKKL_RESPONSE:EIP6963':
		case 'YAKKL_RESPONSE:EIP1193':
			await handleProviderResponse(actualMessage, port, portId);
			break;

		case 'clientReady':
			// Client is ready, already acknowledged above
			break;

		case 'ui_context_initialized':
		case 'ui_context_activity':
		case 'ui_context_closing':
		case 'SET_LOGIN_VERIFIED':
		case 'USER_ACTIVITY':
		case 'IDLE_MANAGER_START':
		case 'GET_IDLE_STATUS':
			// These are handled by context tracker, no need to handle again
			break;

		default:
			// Try legacy handlers or handle unknown message
			await handleUnknownMessage(actualMessage, port, portId);
	}
}

// New function to handle unknown message types
async function handleUnknownMessage(message: any, port: RuntimePort, portId: string) {
	// Log unknown message types, but only once per type to avoid log flooding
	const seenUnknownMessageTypes = new Map<string, number>();
	const now = Date.now();

	// Only log unknown message types once per minute
	if (
		!seenUnknownMessageTypes.has(message.type) ||
		now - seenUnknownMessageTypes.get(message.type)! > 60000
	) {
		log.debug('Unknown message type received:', false, {
			type: message.type,
			portId
		});
		seenUnknownMessageTypes.set(message.type, now);
	}

	// Keep the map size reasonable
	if (seenUnknownMessageTypes.size > 100) {
		const oldestTypesToRemove = Array.from(seenUnknownMessageTypes.entries())
			.sort((a, b) => a[1] - b[1])
			.slice(0, 50)
			.map((entry) => entry[0]);

		for (const type of oldestTypesToRemove) {
			seenUnknownMessageTypes.delete(type);
		}
	}
}

// Add this new function to handle provider responses
async function handleProviderResponse(response: any, port: RuntimePort, portId: string) {
	const { id, result, error } = response;

	log.debug('Handling provider response:', false, {
		id,
		hasResult: result !== undefined,
		hasError: error !== undefined,
		portId,
		timestamp: new Date().toISOString()
	});

	// Find the pending request
	const pendingRequest = pendingRequests.get(id);
	if (!pendingRequest) {
		log.warn('No pending request found for response:', false, { id });
		return;
	}

	// Forward the response back through the original port that made the request
	const originalPort = pendingRequest.port;

	try {
		log.debug('Forwarding response to original port:', false, {
			id,
			originalPortName: originalPort.name,
			currentPortName: port.name,
			timestamp: new Date().toISOString()
		});

		originalPort.postMessage(response);

		// Clean up the pending request
		pendingRequests.delete(id);

		log.debug('Response forwarded successfully', false, { id });
	} catch (error) {
		log.error('Failed to forward response:', false, {
			id,
			error,
			originalPortDisconnected: !originalPort.name
		});

		// If the original port is disconnected, clean up
		pendingRequests.delete(id);
	}
}

// Helper function to get tab information for a port
async function getTabInfoForPort(portInfo: any): Promise<{
	domain: string;
	url: string;
	title: string;
	icon: string;
}> {
	try {
		if (portInfo?.metadata?.tabId) {
			const tab = await browser.tabs.get(portInfo.metadata.tabId);
			return {
				domain: extractSecureDomain(tab.url || ''),
				url: tab.url || '',
				title: tab.title || 'Unknown',
				icon: tab.favIconUrl || '/images/failIcon48x48.png'
			};
		}
	} catch (error) {
		log.error('Error getting tab info:', false, error);
	}

	// Return defaults if we can't get tab info
	return {
		domain: 'Unknown',
		url: '',
		title: 'Unknown',
		icon: '/images/failIcon48x48.png'
	};
}

// Helper function to get approval message for different methods
function getApprovalMessage(method: string, params?: any[]): string {
	switch (method) {
		case 'personal_sign':
			return params?.[0] ? String(params[0]) : 'Sign Message';
		case 'eth_signTypedData_v4':
			return 'Sign Typed Data';
		case 'eth_sendTransaction':
			return 'Send Transaction';
		default:
			return 'Approve Request';
	}
}

// Clean up pending requests for a disconnected port
function cleanupPendingRequestsForPort(port: RuntimePort) {
	for (const [id, request] of pendingRequests.entries()) {
		if (request.port === port) {
			pendingRequests.delete(id);
			log.debug('Cleaned up pending request:', false, { id });
		}
	}
}

interface SecuritySettings {
	level: SecurityLevel;
	lastUpdated?: number;
	// Add any other security settings properties here
}

// Create a dedicated function for getting security settings
async function getSecuritySettings(): Promise<SecuritySettings | null> {
	try {
		const data = await getObjectFromLocalStorage('securitySettings');

		// Validate the structure
		if (!data || typeof data !== 'object') {
			return null;
		}

		// Check if 'level' exists and is a valid SecurityLevel
		if ('level' in data && Object.values(SecurityLevel).includes((data as any).level)) {
			return data as SecuritySettings;
		}

		return null;
	} catch (error) {
		console.error('Error retrieving security settings:', error);
		return null;
	}
}

// Your main function becomes simpler and more type-safe
async function getSecurityLevel(): Promise<SecurityLevel> {
	const settings = await getSecuritySettings();
	return settings?.level || SecurityLevel.MEDIUM;
}

// Determine if iframes should be injected based on security level
function shouldInjectIframes(securityLevel: SecurityLevel): boolean {
	switch (securityLevel) {
		case SecurityLevel.HIGH:
			return false;
		case SecurityLevel.MEDIUM:
		case SecurityLevel.STANDARD:
			return true;
		default:
			return true;
	}
}

// Setup provider event broadcasting
function setupProviderEvents() {
	const provider = getAlchemyProvider();

	// Listen for provider events and broadcast them
	provider.on('accountsChanged', (accounts: string[]) => {
		broadcastEvent('accountsChanged', accounts);
	});

	provider.on('chainChanged', (chainId: string) => {
		broadcastEvent('chainChanged', chainId);
	});

	provider.on('connect', (connectInfo: { chainId: string }) => {
		broadcastEvent('connect', connectInfo);
	});

	provider.on('disconnect', (error: { code: number; message: string }) => {
		broadcastEvent('disconnect', error);
	});
}

// Broadcast events to all connected ports
function broadcastEvent(eventName: string, data: any) {
	const event = {
		type: 'YAKKL_EVENT:EIP6963',
		event: eventName,
		data
	};

	// Send to all connected ports
	for (const [portId, portInfo] of Object.entries(connectionManager['ports'])) {
		try {
			portInfo.port.postMessage(event);
		} catch (error) {
			log.debug('Failed to send event to port:', false, error);
		}
	}
}

// Initialize background script
async function initializeBackground() {
	try {
		log.debug('Initializing background script...', false);

		if (typeof chrome !== 'undefined' && chrome.sidePanel) {
			log.info('Background initializing: chrome.sidePanel is defined');
			chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); // Using sidepanel as default now
		}

		// Initialize core components
		await initializeStorageDefaults();
		initializePermissions();
		initializeEIP6963();

		// Add listeners
		addBackgroundListeners();
		browser.alarms.onAlarm.addListener(onAlarmListener);

		// Setup provider events
		setupProviderEvents();

		// Start periodic cleanup
		setInterval(() => {
			connectionManager.cleanupInactivePorts();
			connectionManager.cleanupProcessedMessages();
			cleanupOldProcessedRequests();
		}, 60000); // Every minute

		// Watch locked state
		await watchLockedState(2 * 60 * 1000);

		initContextTracker();

		log.debug('Background script initialized successfully', false);
	} catch (error) {
		log.error('Failed to initialize background script:', false, error);
	}
}

// Clean up old processed requests
function cleanupOldProcessedRequests() {
	const now = Date.now();

	// Clean up pending requests older than 5 minutes
	for (const [id, request] of pendingRequests.entries()) {
		if (now - request.data.timestamp > 300000) {
			pendingRequests.delete(id);
			log.debug('Cleaned up stale pending request:', false, { id });
		}
	}

	// Keep processed requests set reasonable size
	if (processedBackgroundRequests.size > 5000) {
		const toRemove = processedBackgroundRequests.size - 4000;
		const iterator = processedBackgroundRequests.values();
		for (let i = 0; i < toRemove; i++) {
			processedBackgroundRequests.delete(iterator.next().value);
		}
	}
}

// Get active tab information - unifiedMessageListener handles this now but keep for possible future use
async function getActiveTab(): Promise<ActiveTab | null> {
	try {
		const tabs = await browser.tabs.query({ active: true });

		if (tabs.length > 0) {
			const realTab = tabs.find((t) => !t.url?.startsWith('chrome-extension://'));
			if (realTab && browser.windows) {
				const win = await browser.windows.get(realTab.windowId);
				return {
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

		return null;
	} catch (error) {
		log.error('Error getting active tab:', false, error);
		return null;
	}
}

// Export the connection manager for testing and debugging
(globalThis as any).connectionManager = connectionManager;

// Initialize immediately on load
initializeBackground();
