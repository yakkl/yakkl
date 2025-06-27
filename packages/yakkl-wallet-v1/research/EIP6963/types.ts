// src/types/eip6963.ts
export interface EIP6963ProviderInfo {
	uuid: string; // Unique identifier for this provider instance
	name: string; // Human-readable name of the provider
	icon: string; // Base64 encoded or HTTPS URL to provider icon
	rdns: string; // Reverse DNS naming (e.g., "com.yakkl")
}

export interface EIP6963ProviderDetail {
	info: EIP6963ProviderInfo;
	provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent<EIP6963ProviderDetail> {
	type: 'eip6963:announceProvider';
}

export interface EIP6963RequestProviderEvent extends Event {
	type: 'eip6963:requestProvider';
}

// EIP-1193 Interface
export interface EIP1193Provider {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
	on(eventName: string, listener: (args: unknown) => void): void;
	removeListener(eventName: string, listener: (args: unknown) => void): void;
	emit(eventName: string, args: unknown): void;
}

// Additional provider state interface
export interface ProviderState {
	isConnected: boolean;
	accounts: string[];
	chainId: number;
	networkVersion: string;
}

export interface ProviderRpcError extends Error {
	code: number;
	data?: unknown;
}
