// src/types/messages.ts
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

export interface StreamMessage {
	type: string;
	data: unknown;
}

export type MessageHandler = (message: ProviderMessage) => Promise<void>;
