// src/providers/EIP6963Provider.ts
import { v4 as uuidv4 } from 'uuid';
import { BaseProvider } from './base/BaseProvider';
import { MessageStream } from '../communication/MessageStream';
import type { EIP6963ProviderInfo, EIP6963ProviderDetail, EIP1193Provider } from '../types/eip6963';
import type { ProviderMessage } from '../types/messages';

export class EIP6963Provider extends BaseProvider implements EIP1193Provider {
	private readonly info: EIP6963ProviderInfo;
	private readonly stream: MessageStream;
	private readonly origin: string;

	constructor(origin: string = window.location.origin) {
		super();
		this.origin = origin;
		this.info = {
			uuid: uuidv4(),
			name: 'Yakkl Smart Wallet',
			icon: 'data:image/svg+xml;base64,...', // Your base64 encoded icon
			rdns: 'com.yakkl'
		};
		this.stream = new MessageStream(this.origin);
		this.initialize();
	}

	private initialize(): void {
		this.stream.on('message', this.handleStreamMessage.bind(this));
		window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));
	}

	private handleStreamMessage(message: ProviderMessage): void {
		if (message.type !== 'YAKKL_RESPONSE:EIP6963') return;

		const request = this.pendingRequests.get(message.id);
		if (!request) return;

		this.pendingRequests.delete(message.id);

		if (message.error) {
			request.reject(
				this.createError(message.error.code, message.error.message, message.error.data)
			);
		} else {
			request.resolve(message.result);
			this.handleResponse(message);
		}
	}

	private handleResponse(message: ProviderMessage): void {
		if (message.method === 'eth_requestAccounts' && Array.isArray(message.result)) {
			this.updateState({
				accounts: message.result as string[],
				isConnected: true
			});
		}
	}

	private handleRequestProvider(): void {
		this.announce();
	}

	public announce(): void {
		const detail: EIP6963ProviderDetail = {
			info: this.info,
			provider: this
		};

		const event = new CustomEvent('eip6963:announceProvider', { detail });
		window.dispatchEvent(event);
	}

	protected async sendRequest(method: string, params?: unknown[] | object): Promise<unknown> {
		const id = (++this.requestId).toString();

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingRequests.delete(id);
				reject(this.createError(-32603, 'Request timeout'));
			}, 30000);

			this.pendingRequests.set(id, {
				resolve: (value) => {
					clearTimeout(timeout);
					resolve(value);
				},
				reject: (error) => {
					clearTimeout(timeout);
					reject(error);
				}
			});

			this.stream.send({
				type: 'YAKKL_REQUEST:EIP6963',
				id,
				method,
				params
			});
		});
	}
}
