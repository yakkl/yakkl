// $lib/shared/container.ts
import { BrowserAccessor } from './BrowserAccessor';
import { StorageService } from './StorageService';

/**
 * Simple dependency injection container
 */
export class Container {
	private static instance: Container;
	private services: Map<string, any> = new Map();

	private constructor() {
		// Register core services
		this.register('browserAccessor', BrowserAccessor.getInstance());
		this.register('storageService', new StorageService());
	}

	public static getInstance(): Container {
		if (!Container.instance) {
			Container.instance = new Container();
		}
		return Container.instance;
	}

	public register<T>(name: string, instance: T): void {
		this.services.set(name, instance);
	}

	public get<T>(name: string): T {
		const service = this.services.get(name);
		if (!service) {
			throw new Error(`Service "${name}" not found in container`);
		}
		return service as T;
	}

	/**
	 * Initialize all services
	 */
	public async initialize(): Promise<void> {
		// Get the browser accessor
		const browserAccessor = this.get<BrowserAccessor>('browserAccessor');
		await browserAccessor.initialize();

		// Initialize storage service
		const storageService = this.get<StorageService>('storageService');
		await storageService.initialize();

		// Initialize other services as needed
	}
}

// Usage:
// const container = Container.getInstance();
// await container.initialize();
// const storageService = container.get<StorageService>('storageService');
