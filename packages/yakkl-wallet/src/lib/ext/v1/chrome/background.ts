// Export only the types needed by other modules
import type { Runtime } from 'webextension-polyfill';
import type { PendingRequestData } from '$lib/common/interfaces';

export type RuntimePort = Runtime.Port;

export type BackgroundPendingRequest = {
	resolve: (value: any) => void;
	reject: (reason: any) => void;
	port: RuntimePort;
	data: PendingRequestData;
	error?: {
		code: number;
		message: string;
	};
	result?: any;
};