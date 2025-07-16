class EIP6963Provider implements EIP1193Provider {
	private readonly stream: PostMessageStream;
	private readonly requestMap: Map<string, { resolve: Function; reject: Function }>;
	private requestId: number;
	private readonly info: EIP6963ProviderInfo;

	constructor(info: EIP6963ProviderInfo) {
		this.info = info;
		this.stream = new PostMessageStream(window.location.origin);
		this.requestMap = new Map();
		this.requestId = 0;
		this.setupEventListeners();
	}

	private setupEventListeners(): void {
		window.addEventListener('eip6963:requestProvider', this.handleRequestProvider.bind(this));
		this.stream.on('data', this.handleStreamData.bind(this));
	}

	private handleStreamData(data: any): void {
		if (!this.isValidResponse(data)) return;

		const { id, result, error } = data;
		const request = this.requestMap.get(id);
		if (!request) return;

		if (error) {
			request.reject(new ProviderRpcError(error.code, error.message));
		} else {
			request.resolve(result);
		}
		this.requestMap.delete(id);
	}

	private isValidResponse(data: any): boolean {
		return (
			data &&
			typeof data === 'object' &&
			typeof data.id === 'string' &&
			(data.result !== undefined || data.error !== undefined)
		);
	}

	public async request(args: { method: string; params?: unknown[] }): Promise<unknown> {
		if (!args || typeof args.method !== 'string') {
			throw new ProviderRpcError(-32602, 'Invalid request');
		}

		const id = (++this.requestId).toString();

		return new Promise((resolve, reject) => {
			this.requestMap.set(id, { resolve, reject });

			this.stream.write({
				id,
				method: args.method,
				params: args.params,
				type: 'YAKKL_REQUEST:EIP6963'
			});

			// Set timeout for request
			setTimeout(() => {
				if (this.requestMap.has(id)) {
					this.requestMap.delete(id);
					reject(new ProviderRpcError(-32603, 'Request timeout'));
				}
			}, 30000); // 30 second timeout
		});
	}

	public announce(): void {
		const announceEvent = new CustomEvent('eip6963:announceProvider', {
			detail: {
				info: this.info,
				provider: this
			}
		});
		window.dispatchEvent(announceEvent);
	}

	// Additional EIP-1193 methods
	public on(eventName: string, listener: (...args: any[]) => void): void {
		this.stream.on(eventName, listener);
	}

	public removeListener(eventName: string, listener: (...args: any[]) => void): void {
		this.stream.removeListener(eventName, listener);
	}
}

// Secure stream implementation
class PostMessageStream extends EventEmitter {
	private readonly origin: string;
	private readonly messageHandler: (event: MessageEvent) => void;

	constructor(origin: string) {
		super();
		this.origin = origin;
		this.messageHandler = this.handleMessage.bind(this);
		window.addEventListener('message', this.messageHandler);
	}

	private handleMessage(event: MessageEvent): void {
		if (event.origin !== this.origin) return;
		if (!event.data || typeof event.data !== 'object') return;

		this.emit('data', event.data);
	}

	public write(data: unknown): void {
		window.postMessage(data, this.origin);
	}

	public destroy(): void {
		window.removeEventListener('message', this.messageHandler);
	}
}
