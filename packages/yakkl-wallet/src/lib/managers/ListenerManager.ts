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
		const wrappedHandler = (...args: any[]) => {
			const [message, sender, sendResponse] = args;

			// // DEBUG: Log all messages coming through ListenerManager
			// if (message?.type === 'popout') {
			// 	console.error('[ListenerManager] Popout message received in wrapper:', {
			// 		context: this.context,
			// 		targetContext: message?.targetContext,
			// 		messageType: message?.type,
			// 		willHandle: !message.targetContext || message.targetContext === this.context
			// 	});
			// }

			// Check if message should be handled in this context
			if (message && message.targetContext && message.targetContext !== this.context) {
				// Return undefined to indicate we're not handling this message
				return undefined;
			}

			// Handle the async response pattern for Chrome extension messaging
			// This is critical for proper message passing!
			const handleAsync = async () => {
				try {
					const result = await handler(...args);
					// Only send response if we have a valid result
					if (result !== undefined && sendResponse && typeof sendResponse === 'function') {
						sendResponse(result);
					}
					return result;
				} catch (error) {
					const errorResponse = {
						success: false,
						error: error instanceof Error ? error.message : 'Handler error'
					};
					if (sendResponse && typeof sendResponse === 'function') {
						sendResponse(errorResponse);
					}
					return errorResponse;
				}
			};

			// Start the async handling
			const resultPromise = handleAsync();

			// Check if this is a Chrome runtime message handler with sendResponse
			// If so, return true to indicate we'll send a response asynchronously
			if (sendResponse && typeof sendResponse === 'function') {
				// Return true to keep the message channel open for async response
				return true;
			}

			// For other types of listeners, return the promise
			return resultPromise;
		};

		if (event?.hasListener && event.hasListener(wrappedHandler)) {
			event.removeListener(wrappedHandler);
		}
		if (event?.addListener) {
			event.addListener(wrappedHandler);
			this.listeners.add({ event, handler: wrappedHandler });
		}
	}

	remove(event: any, handler: Function) {
		if (event?.hasListener && event.hasListener(handler)) {
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
