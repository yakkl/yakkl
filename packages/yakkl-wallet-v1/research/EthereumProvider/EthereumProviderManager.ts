class EthereumProviderManager {
	private readonly providers: Map<string, LegacyWindowEthereum>;
	private previousProvider: LegacyWindowEthereum | undefined;
	private currentProvider: LegacyWalletProvider;
	private static instance: EthereumProviderManager;

	private constructor() {
		this.providers = new Map();
		this.currentProvider = new YakklWalletProvider();
		this.initializeProvider();
	}

	public static getInstance(): EthereumProviderManager {
		if (!EthereumProviderManager.instance) {
			EthereumProviderManager.instance = new EthereumProviderManager();
		}
		return EthereumProviderManager.instance;
	}

	private initializeProvider(): void {
		if (typeof window === 'undefined') return;

		try {
			// Store existing provider if present
			if (window.ethereum) {
				this.previousProvider = window.ethereum;
				this.providers.set('previous', window.ethereum);
			}

			const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');

			if (descriptor?.configurable) {
				this.setupProviderProxy();
			} else {
				this.forceProviderReplacement();
			}
		} catch (error) {
			console.error('Failed to initialize provider:', error);
			// Implement fallback behavior
		}
	}

	private setupProviderProxy(): void {
		const handler = this.createProxyHandler();
		const proxy = new Proxy(this.currentProvider, handler);

		Object.defineProperty(window, 'ethereum', {
			value: proxy,
			writable: false,
			configurable: true,
			enumerable: true
		});
	}

	private createProxyHandler(): ProxyHandler<any> {
		return {
			get: (target: any, prop: string | symbol, receiver: any) => {
				// Handle special cases for certain properties
				if (prop === 'providers') {
					return Array.from(this.providers.values());
				}
				return Reflect.get(target, prop, receiver);
			},
			set: (target: any, prop: string | symbol, value: any): boolean => {
				return Reflect.set(target, prop, value);
			},
			deleteProperty: () => true // Prevent deletion
		};
	}

	private forceProviderReplacement(): void {
		try {
			delete (window as any).ethereum;
			this.setupProviderProxy();
		} catch (error) {
			console.error('Failed to force provider replacement:', error);
		}
	}

	public addProvider(name: string, provider: LegacyWindowEthereum): void {
		if (!name || !provider) throw new Error('Invalid provider details');
		this.providers.set(name, provider);
	}

	public removeProvider(name: string): void {
		this.providers.delete(name);
	}

	public switchProvider(name: string): void {
		const provider = this.providers.get(name);
		if (!provider) throw new Error(`Provider ${name} not found`);
		this.currentProvider = provider;
	}
}
