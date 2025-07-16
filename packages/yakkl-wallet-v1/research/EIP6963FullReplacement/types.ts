// src/types/ethereum.ts
export interface RequestArguments {
	method: string;
	params?: unknown[] | object;
}

export interface ProviderRpcError extends Error {
	code: number;
	data?: unknown;
}

export interface EthereumProvider {
	isMetaMask?: boolean;
	isYakkl?: boolean;
	isConnected(): boolean;
	request(args: RequestArguments): Promise<unknown>;
	on(eventName: string, handler: (...args: any[]) => void): void;
	removeListener(eventName: string, handler: (...args: any[]) => void): void;
}

export interface ChainInfo {
	chainId: number;
	networkVersion: string;
	networkName: string;
}

export interface WalletState {
	isConnected: boolean;
	accounts: string[];
	chainId: number;
	networkVersion: string;
}
