// Communication Flow Examples

// 1. User Connects Wallet
async function connectWalletFlow() {
	// 1. dApp calls window.ethereum.request
	const dAppRequest = {
		method: 'eth_requestAccounts'
	};

	// 2. Inpage Script receives request
	// InpageScript -> ContentScript
	window.postMessage(
		{
			type: 'YAKKL_REQUEST:EIP6963',
			id: '1',
			method: 'eth_requestAccounts'
		},
		window.location.origin
	);

	// 3. Content Script enriches and forwards request
	// ContentScript -> Background
	const enrichedRequest = {
		type: 'YAKKL_REQUEST:EIP6963',
		id: '1',
		method: 'eth_requestAccounts',
		metadata: {
			url: 'https://app.example.com',
			title: 'Example DApp',
			favicon: 'https://app.example.com/favicon.ico',
			timestamp: 1234567890
		}
	};

	// 4. Background Service processes request
	// Background -> Content Script
	const response = {
		type: 'YAKKL_RESPONSE:EIP6963',
		id: '1',
		result: ['0x1234...']
	};

	// 5. Content Script forwards response
	// ContentScript -> Inpage Script
	window.postMessage(response, window.location.origin);

	// 6. Inpage Script updates state and notifies dApp
	// Provider emits events
	this.emit('accountsChanged', ['0x1234...']);
	this.emit('connect', { chainId: '0x1' });
}

// 2. Send Transaction Flow
async function sendTransactionFlow() {
	// 1. dApp initiates transaction
	const transaction = {
		from: '0x1234...',
		to: '0x5678...',
		value: '0x1234'
	};

	// 2. Request flows through providers
	// dApp -> Inpage -> Content Script -> Background
	const txRequest = {
		type: 'YAKKL_REQUEST:EIP6963',
		id: '2',
		method: 'eth_sendTransaction',
		params: [transaction]
	};

	// 3. Background Service handles transaction
	// Shows popup for user confirmation
	await showPopup();

	// 4. After user confirms, process transaction
	const txHash = '0x9876...';

	// 5. Response flows back
	// Background -> Content Script -> Inpage -> dApp
	const response = {
		type: 'YAKKL_RESPONSE:EIP6963',
		id: '2',
		result: txHash
	};
}

// 3. Chain Switching Flow
async function switchChainFlow() {
	// 1. dApp requests chain switch
	const chainId = '0x89'; // Polygon

	// 2. Request flows through system
	const request = {
		type: 'YAKKL_REQUEST:EIP6963',
		id: '3',
		method: 'wallet_switchEthereumChain',
		params: [{ chainId }]
	};

	// 3. Background handles switch
	// After switch completes, notify all layers
	const response = {
		type: 'YAKKL_RESPONSE:EIP6963',
		id: '3',
		result: null
	};

	// 4. Provider emits chain changed event
	this.emit('chainChanged', chainId);
}
