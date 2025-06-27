// storage-types.ts
export interface StorageRequest {
	type: 'storage';
	action: 'get' | 'set' | 'remove' | 'clear' | 'sync';
	key?: string;
	value?: any;
	storageType?: 'local' | 'remote' | 'both'; // Add support for remote storage
	options?: {
		encrypt?: boolean;
		compress?: boolean;
		ttl?: number;
		priority?: 'high' | 'low';
	};
}

export interface StorageResponse {
	success: boolean;
	data?: any;
	source?: 'local' | 'remote' | 'cache';
	error?: {
		code: string;
		message: string;
		details?: any;
	};
	metadata?: {
		timestamp: number;
		synced?: boolean;
		lastModified?: number;
	};
}
