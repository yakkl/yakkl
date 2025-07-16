// src/types/ethereum.ts
import type { EventEmitter } from 'events';

export interface RequestArguments {
	method: string;
	params?: unknown[] | object;
}

export interface ProviderRpcError extends Error {
	code: number;
	data?: unknown;
}

export interface LegacyWindowEthereum {
	isMetaMask?: boolean;
	isYakkl?: boolean;
	isConnected: () => boolean;
	request: (args: RequestArguments) => Promise<unknown>;
	on: (eventName: string, handler: (...args: any[]) => void) => void;
	removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
	selectedAddress?: string | null;
	chainId?: string;
	networkVersion?: string;
}

export interface ProviderMessage {
	id: string;
	type: string;
	method?: string;
	params?: unknown[] | object;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

export interface WalletState {
	isConnected: boolean;
	accounts: string[];
	chainId: number;
	networkVersion: string;
}
