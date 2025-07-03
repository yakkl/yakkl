// Updated portManager.ts
import type { Runtime } from 'webextension-polyfill';
import { log } from '$lib/managers/Logger';

interface PortRegistration {
	port: Runtime.Port;
	connectionId: string;
	registeredAt: number;
	metadata?: any;
}

class PortManager {
	private static instance: PortManager;

	private externalPorts: Map<number, PortRegistration> = new Map();
	private dappPorts: Map<string, PortRegistration> = new Map();
	private internalPorts: Map<string, PortRegistration> = new Map();
	private contentScriptPorts: Map<number, PortRegistration> = new Map();

	private constructor() {}

	static getInstance(): PortManager {
		if (!PortManager.instance) {
			PortManager.instance = new PortManager();
		}
		return PortManager.instance;
	}

	// Register different types of ports
	registerExternalPort(tabId: number, port: Runtime.Port, connectionId?: string): void {
		const registration: PortRegistration = {
			port,
			connectionId: connectionId || `external-${tabId}-${Date.now()}`,
			registeredAt: Date.now()
		};
		this.externalPorts.set(tabId, registration);
		log.debug('Registered external port:', false, {
			tabId,
			connectionId: registration.connectionId
		});
	}

	registerDappPort(portId: string, port: Runtime.Port): void {
		const registration: PortRegistration = {
			port,
			connectionId: portId,
			registeredAt: Date.now()
		};
		this.dappPorts.set(portId, registration);
		log.debug('Registered DApp port:', false, { portId });
	}

	// Add the missing registerInternalPort method
	registerInternalPort(portId: string, port: Runtime.Port): void {
		const registration: PortRegistration = {
			port,
			connectionId: portId,
			registeredAt: Date.now()
		};
		this.internalPorts.set(portId, registration);
		log.debug('Registered internal port:', false, { portId });
	}

	registerContentScriptPort(tabId: number, port: Runtime.Port): void {
		const registration: PortRegistration = {
			port,
			connectionId: `content-${tabId}-${Date.now()}`,
			registeredAt: Date.now()
		};
		this.contentScriptPorts.set(tabId, registration);
		log.debug('Registered content script port:', false, { tabId });
	}

	// Get ports
	getExternalPort(tabId: number): Runtime.Port | undefined {
		return this.externalPorts.get(tabId)?.port;
	}

	getContentScriptPort(tabId: number): Runtime.Port | undefined {
		// Try content script ports first, then external ports
		return this.contentScriptPorts.get(tabId)?.port || this.externalPorts.get(tabId)?.port;
	}

	// Remove ports
	removeExternalPort(tabId: number): void {
		this.externalPorts.delete(tabId);
		log.debug('Removed external port:', false, { tabId });
	}

	removeContentScriptPort(tabId: number): void {
		this.contentScriptPorts.delete(tabId);
		log.debug('Removed content script port:', false, { tabId });
	}

	// Add these missing methods
	removeDappPort(port: Runtime.Port): void {
		// Find the port in our collection and remove it
		for (const [portId, registration] of this.dappPorts.entries()) {
			if (registration.port === port) {
				this.dappPorts.delete(portId);
				log.debug('Removed DApp port:', false, { portId });
				break;
			}
		}
	}

	removeInternalPort(port: Runtime.Port): void {
		// Find the port in our collection and remove it
		for (const [portId, registration] of this.internalPorts.entries()) {
			if (registration.port === port) {
				this.internalPorts.delete(portId);
				log.debug('Removed internal port:', false, { portId });
				break;
			}
		}
	}

	// Utility methods
	broadcastToContentScripts(message: any): void {
		// Broadcast to all content script ports
		for (const [tabId, registration] of this.contentScriptPorts) {
			try {
				registration.port.postMessage(message);
			} catch (error) {
				log.error('Failed to send to content script:', false, { tabId, error });
				this.removeContentScriptPort(tabId);
			}
		}

		// Also broadcast to external ports
		for (const [tabId, registration] of this.externalPorts) {
			try {
				registration.port.postMessage(message);
			} catch (error) {
				log.error('Failed to send to external port:', false, { tabId, error });
				this.removeExternalPort(tabId);
			}
		}
	}

	// Clean up disconnected ports
	cleanupDisconnectedPorts(): void {
		const now = Date.now();

		// Clean external ports
		for (const [tabId, registration] of this.externalPorts) {
			try {
				registration.port.postMessage({ type: 'ping' });
			} catch (error) {
				this.removeExternalPort(tabId);
			}
		}

		// Clean content script ports
		for (const [tabId, registration] of this.contentScriptPorts) {
			try {
				registration.port.postMessage({ type: 'ping' });
			} catch (error) {
				this.removeContentScriptPort(tabId);
			}
		}

		// Clean DApp ports
		for (const [portId, registration] of this.dappPorts) {
			try {
				registration.port.postMessage({ type: 'ping' });
			} catch (error) {
				this.dappPorts.delete(portId);
			}
		}

		// Clean internal ports
		for (const [portId, registration] of this.internalPorts) {
			try {
				registration.port.postMessage({ type: 'ping' });
			} catch (error) {
				this.internalPorts.delete(portId);
			}
		}
	}
}

export const portManager = PortManager.getInstance();
