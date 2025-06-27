// src/lib/extensions/chrome/methodClassification.ts

/**
 * Checks if a method is a read-only operation that doesn't modify blockchain state
 */
export function isReadMethod(method: string): boolean {
	const readMethods = [
		// Account query methods
		'eth_accounts',
		'eth_getBalance',
		'eth_getTransactionCount',
		'eth_getCode',
		'eth_getStorageAt',

		// Block query methods
		'eth_blockNumber',
		'eth_getBlockByHash',
		'eth_getBlockByNumber',
		'eth_getBlockTransactionCountByHash',
		'eth_getBlockTransactionCountByNumber',
		'eth_getUncleCountByBlockHash',
		'eth_getUncleCountByBlockNumber',
		'eth_getUncleByBlockHashAndIndex',
		'eth_getUncleByBlockNumberAndIndex',

		// Transaction query methods
		'eth_getTransactionByHash',
		'eth_getTransactionByBlockHashAndIndex',
		'eth_getTransactionByBlockNumberAndIndex',
		'eth_getTransactionReceipt',

		// Gas and fee methods
		'eth_gasPrice',
		'eth_feeHistory',
		'eth_maxPriorityFeePerGas',

		// Mining and network methods
		'eth_mining',
		'eth_hashrate',
		'eth_getWork',
		'net_version',
		'net_listening',
		'net_peerCount',
		'web3_clientVersion',
		'web3_sha3',

		// Chain and sync methods
		'eth_chainId',
		'eth_syncing',
		'eth_protocolVersion',

		// Filter and log methods
		'eth_getLogs',
		'eth_getFilterChanges',
		'eth_getFilterLogs',
		'eth_newFilter',
		'eth_newBlockFilter',
		'eth_newPendingTransactionFilter',
		'eth_uninstallFilter',

		// Proof methods
		'eth_getProof',

		// Custom YAKKL methods
		'yakkl_getTransactionHistory',
		'yakkl_trackActivity'
	];

	return readMethods.includes(method);
}

/**
 * Checks if a method is a write operation that modifies blockchain state or requires user approval
 */
export function isWriteMethod(method: string): boolean {
	const writeMethods = [
		// Transaction methods
		'eth_sendTransaction',
		'eth_sendRawTransaction',

		// Signing methods
		'eth_sign',
		'personal_sign',
		'eth_signTransaction',
		'eth_signTypedData',
		'eth_signTypedData_v3',
		'eth_signTypedData_v4',
		'personal_ecRecover',

		// Account management
		'eth_requestAccounts',
		'eth_coinbase',

		// Wallet methods
		'wallet_addEthereumChain',
		'wallet_switchEthereumChain',
		'wallet_requestPermissions',
		'wallet_getPermissions',
		'wallet_revokePermissions',
		'wallet_watchAsset',
		'wallet_registerOnboarding',

		// Personal namespace
		'personal_listAccounts',
		'personal_newAccount',
		'personal_unlockAccount',
		'personal_sendTransaction',
		'personal_lockAccount',

		// Mining methods
		'eth_submitWork',
		'eth_submitHashrate'
	];

	return writeMethods.includes(method);
}

/**
 * Checks if a method is a simulation that doesn't modify state but requires computation
 */
export function isSimulationMethod(method: string): boolean {
	const simulationMethods = [
		'eth_estimateGas',
		'eth_call',
		'debug_traceCall',
		'debug_traceTransaction',
		'debug_traceBlockByNumber',
		'debug_traceBlockByHash',
		'eth_createAccessList'
	];

	return simulationMethods.includes(method);
}

/**
 * Gets the category of a method for routing purposes
 */
export function getMethodCategory(method: string): 'read' | 'write' | 'simulation' | 'unknown' {
	if (isReadMethod(method)) return 'read';
	if (isWriteMethod(method)) return 'write';
	if (isSimulationMethod(method)) return 'simulation';
	return 'unknown';
}
