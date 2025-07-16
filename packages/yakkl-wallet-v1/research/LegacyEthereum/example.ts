// src/index.ts
import { ProviderManager } from './providers/ProviderManager';

// Initialize the provider
window.addEventListener('DOMContentLoaded', () => {
	try {
		const manager = ProviderManager.getInstance();

		// Announce provider is ready
		window.dispatchEvent(new Event('ethereum#initialized'));
	} catch (error) {
		console.error('Failed to initialize Yakkl provider:', error);
	}
});

// Example usage in a dApp:
async function connectWallet() {
	try {
		const accounts = await window.ethereum.request({
			method: 'eth_requestAccounts'
		});
		console.log('Connected accounts:', accounts);
	} catch (error) {
		console.error('Failed to connect:', error);
	}
}

// Listen for account changes
window.ethereum.on('accountsChanged', (accounts: string[]) => {
	console.log('Accounts changed:', accounts);
});

// Listen for chain changes
window.ethereum.on('chainChanged', (chainId: string) => {
	console.log('Chain changed:', chainId);
});
