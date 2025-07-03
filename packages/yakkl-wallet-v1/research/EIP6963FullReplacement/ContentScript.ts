// src/content/ContentScript.ts
import { browser } from 'webextension-polyfill';
import { PortStream } from '../communication/PortStream';
import type { ProviderMessage } from '../types/messages';

class ContentScript {
	private port: Runtime.Port | null;
	private stream: PortStream | null;
	private initialized: boolean;
	private readonly injectedScripts: Set<string>;

	constructor() {
		this.port = null;
		this.stream = null;
		this.initialized = false;
		this.injectedScripts = new Set();
		this.initialize();
	}

	private async initialize(): Promise<void> {
		try {
			// Connect to background service
			this.port = browser.runtime.connect({ name: 'YAKKL_PROVIDER_EIP6963' });
			this.stream = new PortStream(this.port);

			// Set up message listeners
			this.setupMessageListeners();

			// Inject inpage script
			await this.injectScript();

			this.initialized = true;
		} catch (error) {
			console.error('Failed to initialize content script:', error);
		}
	}

	private setupMessageListeners(): void {
		// Listen for messages from the page
		window.addEventListener('message', this.handleWindowMessage.bind(this));

		// Listen for messages from the background
		this.stream?.on('message', this.handleBackgroundMessage.bind(this));

		// Handle disconnection
		this.stream?.on('disconnect', this.handleDisconnect.bind(this));
	}

	private async injectScript(): Promise<void> {
		if (document.contentType !== 'text/html') return;

		try {
			const container = document.head || document.documentElement;
			const scriptElement = document.createElement('script');

			scriptElement.setAttribute('async', 'false');
			scriptElement.src = browser.runtime.getURL('inpage.js');

			// Ensure script is injected only once
			const scriptId = 'yakkl-provider-script';
			if (this.injectedScripts.has(scriptId)) return;

			scriptElement.id = scriptId;
			scriptElement.onload = () => {
				scriptElement.remove();
				this.injectedScripts.add(scriptId);
			};

			container.insertBefore(scriptElement, container.children[0]);
		} catch (error) {
			console.error('Failed to inject inpage script:', error);
		}
	}

	private handleWindowMessage(event: MessageEvent): void {
		// Ensure message is from our window
		if (event.source !== window) return;

		// Verify origin
		if (event.origin !== window.location.origin) return;

		const message = event.data;

		// Handle different message types
		switch (message?.type) {
			case 'YAKKL_REQUEST:EIP6963':
				this.handleProviderRequest(message);
				break;

			case 'YAKKL_REQUEST':
				this.handleLegacyRequest(message);
				break;
		}
	}

	private handleProviderRequest(message: ProviderMessage): void {
		if (!this.stream) return;

		try {
			// Add metadata to the message
			const enrichedMessage = this.enrichMessage(message);

			// Forward to background
			this.stream.send(enrichedMessage);
		} catch (error) {
			this.sendResponse(message.id, {
				error: {
					code: -32603,
					message: (error as Error).message
				}
			});
		}
	}

	private handleLegacyRequest(message: ProviderMessage): void {
		if (!this.stream) return;

		try {
			// Convert legacy request to EIP-6963 format
			const convertedMessage = this.convertLegacyRequest(message);

			// Forward to background
			this.stream.send(convertedMessage);
		} catch (error) {
			this.sendResponse(message.id, {
				error: {
					code: -32603,
					message: (error as Error).message
				}
			});
		}
	}

	private handleBackgroundMessage(message: ProviderMessage): void {
		// Forward response to the page
		window.postMessage(message, window.location.origin);
	}

	private handleDisconnect(): void {
		this.initialized = false;
		this.stream = null;
		this.port = null;

		// Attempt to reconnect
		setTimeout(() => {
			if (!this.initialized) {
				this.initialize();
			}
		}, 1000);
	}

	private enrichMessage(message: ProviderMessage): ProviderMessage {
		return {
			...message,
			metadata: {
				url: window.location.href,
				title: document.title,
				favicon: this.getFavicon(),
				timestamp: Date.now()
			}
		};
	}

	private convertLegacyRequest(message: ProviderMessage): ProviderMessage {
		return {
			...message,
			type: 'YAKKL_REQUEST:EIP6963',
			version: '1.0.0'
		};
	}

	private sendResponse(id: string, response: any): void {
		window.postMessage(
			{
				type: 'YAKKL_RESPONSE',
				id,
				...response
			},
			window.location.origin
		);
	}

	private getFavicon(): string {
		const links = document.getElementsByTagName('link');
		for (const link of links) {
			if (link.rel.includes('icon')) {
				return link.href;
			}
		}
		return window.location.origin + '/favicon.ico';
	}
}

// Initialize content script
const contentScript = new ContentScript();
