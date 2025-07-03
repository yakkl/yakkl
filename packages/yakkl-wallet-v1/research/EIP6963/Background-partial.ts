// src/background/background.ts
import type { EIP6963ProviderDetail, ProviderMessage } from '../types/eip6963';

class BackgroundService {
	private ports: Map<string, Runtime.Port>;
	private providerDetails: Map<string, EIP6963ProviderDetail>;

	constructor() {
		this.ports = new Map();
		this.providerDetails = new Map();
		this.initialize();
	}

	private initialize(): void {
		// Listen for connection attempts
		browser.runtime.onConnect.addListener(this.handleConnect.bind(this));

		// Listen for provider registration
		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
	}

	private handleConnect(port: Runtime.Port): void {
		if (port.name === 'YAKKL_PROVIDER_EIP6963') {
			const tabId = port.sender?.tab?.id;
			if (tabId) {
				this.ports.set(tabId.toString(), port);
				port.onMessage.addListener(this.handlePortMessage.bind(this, tabId));
				port.onDisconnect.addListener(() => {
					this.ports.delete(tabId.toString());
				});
			}
		}
	}

	private async handlePortMessage(tabId: number, message: ProviderMessage): Promise<void> {
		try {
			switch (message.type) {
				case 'YAKKL_REQUEST:EIP6963': {
					const result = await this.handleProviderRequest(message);
					this.sendResponse(tabId, {
						type: 'YAKKL_RESPONSE:EIP6963',
						id: message.id,
						result
					});
					break;
				}

				case 'PROVIDER_REGISTRATION': {
					this.providerDetails.set(message.data.uuid, message.data);
					break;
				}
			}
		} catch (error) {
			this.sendResponse(tabId, {
				type: 'YAKKL_RESPONSE:EIP6963',
				id: message.id,
				error: {
					code: -32603,
					message: (error as Error).message
				}
			});
		}
	}

	private async handleProviderRequest(message: ProviderMessage): Promise<unknown> {
		// Implement your request handling logic here
		// This should integrate with your existing wallet logic
		const { method, params } = message;

		switch (method) {
			case 'eth_requestAccounts':
				return this.handleAccountRequest();

			case 'eth_sendTransaction':
				return this.handleTransaction(params);

			// Add other method handlers

			default:
				throw new Error(`Unsupported method: ${method}`);
		}
	}

	private sendResponse(tabId: number, response: any): void {
		const port = this.ports.get(tabId.toString());
		if (port) {
			port.postMessage(response);
		}
	}

	// Implement your existing wallet functionality here
	private async handleAccountRequest(): Promise<string[]> {
		// Your existing account request logic
	}

	private async handleTransaction(params: unknown): Promise<string> {
		// Your existing transaction handling logic
	}
}

// Initialize the background service
const backgroundService = new BackgroundService();
