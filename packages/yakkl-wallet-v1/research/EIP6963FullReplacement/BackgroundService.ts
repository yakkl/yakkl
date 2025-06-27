// src/background/BackgroundService.ts
import { browser } from 'webextension-polyfill';
import { TransactionHandler } from './handlers/TransactionHandler';
import { AccountHandler } from './handlers/AccountHandler';
import type { ProviderMessage } from '../types/messages';
import type { Runtime } from 'webextension-polyfill';

export class BackgroundService {
	private readonly ports: Map<string, Runtime.Port>;
	private readonly transactionHandler: TransactionHandler;
	private readonly accountHandler: AccountHandler;
	private static instance: BackgroundService;

	private constructor() {
		this.ports = new Map();
		this.transactionHandler = new TransactionHandler();
		this.accountHandler = new AccountHandler();
		this.initialize();
	}

	public static getInstance(): BackgroundService {
		if (!BackgroundService.instance) {
			BackgroundService.instance = new BackgroundService();
		}
		return BackgroundService.instance;
	}

	private initialize(): void {
		browser.runtime.onConnect.addListener(this.handleConnect.bind(this));
		browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
		this.setupAlarms();
	}

	private handleConnect(port: Runtime.Port): void {
		const tabId = port.sender?.tab?.id?.toString();
		if (!tabId) return;

		this.ports.set(tabId, port);
		port.onMessage.addListener(this.handlePortMessage.bind(this, tabId));
		port.onDisconnect.addListener(() => {
			this.ports.delete(tabId);
		});
	}

	private async handlePortMessage(tabId: string, message: ProviderMessage): Promise<void> {
		try {
			const response = await this.processMessage(message);
			this.sendResponse(tabId, {
				id: message.id,
				type: 'YAKKL_RESPONSE:EIP6963',
				result: response
			});
		} catch (error) {
			this.sendResponse(tabId, {
				id: message.id,
				type: 'YAKKL_RESPONSE:EIP6963',
				error: {
					code: (error as any).code || -32603,
					message: (error as Error).message
				}
			});
		}
	}

	private async processMessage(message: ProviderMessage): Promise<unknown> {
		switch (message.method) {
			case 'eth_requestAccounts':
				return this.accountHandler.handleRequest(message);

			case 'eth_sendTransaction':
				return this.transactionHandler.handleRequest(message);

			case 'eth_signTransaction':
				return this.transactionHandler.handleSignRequest(message);

			case 'eth_chainId':
				return this.accountHandler.getChainId();

			default:
				throw new Error(`Unsupported method: ${message.method}`);
		}
	}

	private sendResponse(tabId: string, response: any): void {
		const port = this.ports.get(tabId);
		if (port) {
			port.postMessage(response);
		}
	}

	private setupAlarms(): void {
		browser.alarms.create('stateCleanup', { periodInMinutes: 5 });
		browser.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
	}

	private async handleAlarm(alarm: browser.Alarms.Alarm): Promise<void> {
		if (alarm.name === 'stateCleanup') {
			await this.cleanup();
		}
	}

	private async cleanup(): Promise<void> {
		// Implement cleanup logic
	}

	private async handleMessage(message: any, sender: Runtime.MessageSender): Promise<void> {
		// Handle one-time messages
	}
}
