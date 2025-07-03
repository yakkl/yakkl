// stores/extension.svelte.ts
import { isExtensionContextValid } from '../utils';

class ExtensionState {
	#isValid = $state(isExtensionContextValid());
	#checkInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.startMonitoring();
	}

	get isValid() {
		return this.#isValid;
	}

	private startMonitoring() {
		// Check every few seconds
		this.#checkInterval = setInterval(() => {
			const currentlyValid = isExtensionContextValid();
			if (this.#isValid !== currentlyValid) {
				this.#isValid = currentlyValid;

				if (!currentlyValid) {
					this.handleInvalidation();
				}
			}
		}, 2000);
	}

	private handleInvalidation() {
		console.warn('Extension context invalidated - cleaning up');
		// Clean up any ongoing operations
		if (this.#checkInterval) {
			clearInterval(this.#checkInterval);
			this.#checkInterval = null;
		}
	}

	destroy() {
		if (this.#checkInterval) {
			clearInterval(this.#checkInterval);
		}
	}
}

export const extensionState = new ExtensionState();
