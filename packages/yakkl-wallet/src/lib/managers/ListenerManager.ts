// ListenerManager.ts
import type { ListenerContext } from './GlobalListenerManager';

type ListenerEntry = {
	event: any; // Event source (e.g., browser.runtime.onMessage)
	handler: Function; // Listener function
};

export class ListenerManager {
	private listeners: Set<ListenerEntry> = new Set();
	private context: ListenerContext;

	constructor(context: ListenerContext) {
		this.context = context;
	}

	add(event: any, handler: Function) {
		const wrappedHandler = async (...args: any[]) => {
			const [message] = args;

			// Check if message should be handled in this context
			if (message.targetContext && message.targetContext !== this.context) {
				return false;
			}

			return await handler(...args);
		};

		if (event.hasListener(wrappedHandler)) {
			event.removeListener(wrappedHandler);
		}
		event.addListener(wrappedHandler);
		this.listeners.add({ event, handler: wrappedHandler });
	}

	remove(event: any, handler: Function) {
		if (event.hasListener(handler)) {
			event.removeListener(handler);
			this.listeners.delete({ event, handler });
		}
	}

	removeAll(context?: string) {
		this.listeners.forEach(({ event, handler }) => {
			event.removeListener(handler);
		});
		this.listeners.clear();
	}
}
