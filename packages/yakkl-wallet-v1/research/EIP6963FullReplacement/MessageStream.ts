// src/communication/MessageStream.ts
import EventEmitter from 'events';
import type { StreamMessage } from '../types/messages';

export class MessageStream extends EventEmitter {
	private readonly origin: string;
	private readonly messageHandler: (event: MessageEvent) => void;

	constructor(origin: string) {
		super();
		this.origin = origin;
		this.messageHandler = this.handleMessage.bind(this);
		window.addEventListener('message', this.messageHandler);
	}

	public send(message: StreamMessage): void {
		window.postMessage(message, this.origin);
	}

	private handleMessage(event: MessageEvent): void {
		if (event.origin !== this.origin) return;

		try {
			const message = event.data;
			if (this.isValidMessage(message)) {
				this.emit('message', message);
			}
		} catch (error) {
			console.error('Error handling message:', error);
		}
	}

	private isValidMessage(message: unknown): boolean {
		return (
			message !== null &&
			typeof message === 'object' &&
			'type' in message &&
			typeof (message as any).type === 'string'
		);
	}

	public destroy(): void {
		window.removeEventListener('message', this.messageHandler);
		this.removeAllListeners();
	}
}
