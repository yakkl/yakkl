// In a dApp
async function connectWallet() {
	try {
		// This will use your injected provider
		const accounts = await window.ethereum.request({
			method: 'eth_requestAccounts'
		});
		console.log('Connected accounts:', accounts);

		// Your provider is now the active provider
		console.log('Is Yakkl:', window.ethereum.isYakkl); // true

		// Check available providers
		console.log('Available providers:', window.ethereum.providers);
	} catch (error) {
		console.error('Connection failed:', error);
	}
}
