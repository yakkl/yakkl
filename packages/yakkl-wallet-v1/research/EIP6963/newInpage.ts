// src/inpage.ts
import { ProviderRegistry } from './ProviderRegistry';

// Your existing window.ethereum injection code here...

// Initialize EIP-6963 support
window.addEventListener('DOMContentLoaded', () => {
	try {
		// Initialize the provider registry
		const registry = ProviderRegistry.getInstance();

		// Announce providers immediately
		window.dispatchEvent(new Event('eip6963:requestProvider'));
	} catch (error) {
		console.error('Failed to initialize EIP-6963 support:', error);
	}
});
