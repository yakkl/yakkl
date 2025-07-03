// src/types/eip6963.ts
export interface EIP6963ProviderInfo {
	uuid: string;
	name: string;
	icon: string;
	rdns: string;
}

export interface EIP6963ProviderDetail {
	info: EIP6963ProviderInfo;
	provider: EIP1193Provider;
}

export interface EIP1193Provider {
	request(args: { method: string; params?: unknown[] }): Promise<unknown>;
	on(eventName: string, listener: (args: unknown) => void): void;
	removeListener(eventName: string, listener: (args: unknown) => void): void;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent<EIP6963ProviderDetail> {
	type: 'eip6963:announceProvider';
}

export interface EIP6963RequestProviderEvent extends Event {
	type: 'eip6963:requestProvider';
}
