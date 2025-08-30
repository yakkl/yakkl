/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
	BlockTag,
	BigNumberish,
	TransactionResponse,
	TransactionRequest,
	Deferrable,
	Block,
	BlockWithTransactions,
	TransactionReceipt,
	Filter,
	Log,
	EventType,
	Listener,
	FeeData
} from '$lib/common';
import { BigNumber } from '$lib/common';
import { AbstractProvider, type Provider } from '$managers/Provider';
import { RPCInfura } from './RPCInfura';
import { RPCBase } from '$managers/RPCBase';
import { providerRoutingManager } from '$lib/managers/ProviderRoutingManager';
import { log } from '$lib/common/logger-wrapper';
import eventManager from '$lib/managers/EventManager';
import type { Signer } from '$lib/managers/Signer';
import { TypeAdapterUtils } from '$lib/sdk/types/adapters';

interface InfuraOptions {
	apiKey?: string | null;
	blockchains?: string[];
	chainIds?: number[];
	blockchain?: string;
	chainId?: number;
}

export class Infura extends AbstractProvider {
	private rpcInfura: RPCInfura | null = null;

	async initializeProvider(): Promise<any | null> {
		try {
			this.rpcInfura = new RPCInfura(this.chainId);
			return this.rpcInfura;
		} catch (error) {
			log.error('[Infura] Failed to initialize provider', false, error);
			throw error;
		}
	}

	async getProviderURL(): Promise<string> {
		const config = await RPCBase.getProviderConfig('infura', this.chainId);
		if (!config) {
			throw new Error('No Infura configuration found');
		}
		return config.baseURL;
	}

	getProviderEthers(): any {
		// We don't use ethers - return null
		return null;
	}

	private async ensureRPC(): Promise<RPCInfura> {
		if (!this.rpcInfura) {
			this.rpcInfura = new RPCInfura(this.chainId);
		}
		return this.rpcInfura;
	}

	async getBlockNumber(): Promise<number> {
		try {
			const rpc = await this.ensureRPC();
			const blockNumber = await rpc.getBlockNumber();
			eventManager.emit('blockNumber', { blockNumber });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return blockNumber;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getBlockNumber', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getGasPrice(): Promise<bigint> {
		try {
			const rpc = await this.ensureRPC();
			const gasPrice = await rpc.getGasPrice();
			const price = BigInt(gasPrice.toString());
			eventManager.emit('gasPrice', { price });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return price;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getGasPrice', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getBalance(
		addressOrName: string | Promise<string>,
		blockTag?: BlockTag | Promise<BlockTag> | undefined
	): Promise<bigint> {
		try {
			const address = await addressOrName;
			const resolvedBlockTag = blockTag ? await blockTag : 'latest';
			const blockTagStr = typeof resolvedBlockTag === 'bigint' ? (resolvedBlockTag as bigint).toString() : 
				typeof resolvedBlockTag === 'number' ? (resolvedBlockTag as number).toString() :
				resolvedBlockTag as string;
			
			const rpc = await this.ensureRPC();
			const result = await rpc.getBalance(address, blockTagStr);
			const balance = BigInt(result);
			eventManager.emit('balanceFetched', { address, balance });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return balance;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getBalance', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getCode(
		addressOrName: string | Promise<string>,
		blockTag?: BlockTag | Promise<BlockTag> | undefined
	): Promise<string> {
		try {
			const address = await addressOrName;
			const resolvedBlockTag = blockTag ? await blockTag : 'latest';
			const blockTagStr = typeof resolvedBlockTag === 'bigint' ? (resolvedBlockTag as bigint).toString() : 
				typeof resolvedBlockTag === 'number' ? (resolvedBlockTag as number).toString() :
				resolvedBlockTag as string;
			
			const rpc = await this.ensureRPC();
			const code = await rpc.getCode(address, blockTagStr);
			eventManager.emit('codeFetched', { address, code });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return code;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getCode', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getStorageAt(
		addressOrName: string | Promise<string>,
		position: BigNumberish | Promise<BigNumberish>,
		blockTag?: BlockTag | Promise<BlockTag> | undefined
	): Promise<string> {
		try {
			const address = await addressOrName;
			const pos = await position;
			const resolvedBlockTag = blockTag ? await blockTag : 'latest';
			
			const rpc = await this.ensureRPC();
			const result = await rpc.request('eth_getStorageAt', [address, pos.toString(), resolvedBlockTag]);
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return result;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getStorageAt', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async sendRawTransaction(signedTransaction: string): Promise<TransactionResponse> {
		try {
			const rpc = await this.ensureRPC();
			const hash = await rpc.sendRawTransaction(signedTransaction);
			eventManager.emit('transactionSent', { hash });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			// Return a mock TransactionResponse for compatibility
			return {
				hash,
				wait: async () => this.getTransactionReceipt(hash)
			} as TransactionResponse;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'sendRawTransaction', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
		// This would require signing, which should be handled by the signer
		throw new Error('Use sendRawTransaction with a signed transaction');
	}

	async call(
		transaction: Deferrable<TransactionRequest>,
		blockTag?: BlockTag | Promise<BlockTag> | undefined
	): Promise<string> {
		try {
			const resolvedTx = await this.resolveDeferrable(transaction);
			const resolvedBlockTag = blockTag ? await blockTag : 'latest';
			const blockTagStr = typeof resolvedBlockTag === 'bigint' ? (resolvedBlockTag as bigint).toString() : 
				typeof resolvedBlockTag === 'number' ? (resolvedBlockTag as number).toString() :
				resolvedBlockTag as string;
			
			const rpc = await this.ensureRPC();
			const result = await rpc.ethCall(resolvedTx, blockTagStr);
			eventManager.emit('callResult', { result });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return result;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'call', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async estimateGas(transaction: Deferrable<TransactionRequest>): Promise<bigint> {
		try {
			const resolvedTx = await this.resolveDeferrable(transaction);
			const rpc = await this.ensureRPC();
			const gasEstimate = await rpc.estimateGas(resolvedTx);
			const gas = BigInt(gasEstimate);
			eventManager.emit('estimateGas', { transaction: resolvedTx, gasEstimate: gas });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return gas;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'estimateGas', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getBlock(blockHashOrBlockTag: BlockTag | Promise<BlockTag>): Promise<Block> {
		try {
			const blockTag = await blockHashOrBlockTag;
			const blockTagStr = typeof blockTag === 'bigint' ? (blockTag as bigint).toString() : 
				typeof blockTag === 'number' ? (blockTag as number).toString() :
				blockTag as string;
			
			const rpc = await this.ensureRPC();
			const block = await rpc.getBlock(blockTagStr);
			eventManager.emit('blockFetched', { block });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return block as Block;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getBlock', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getBlockWithTransactions(
		blockHashOrBlockTag: BlockTag | Promise<BlockTag>
	): Promise<BlockWithTransactions> {
		try {
			const blockTag = await blockHashOrBlockTag;
			const blockTagStr = typeof blockTag === 'bigint' ? (blockTag as bigint).toString() : 
				typeof blockTag === 'number' ? (blockTag as number).toString() :
				blockTag as string;
			
			const rpc = await this.ensureRPC();
			const block = await rpc.request('eth_getBlockByNumber', [blockTagStr, true]);
			eventManager.emit('blockWithTransactionsFetched', { block });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return block as BlockWithTransactions;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getBlockWithTransactions', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getTransaction(transactionHash: string): Promise<TransactionResponse> {
		try {
			const rpc = await this.ensureRPC();
			const tx = await rpc.getTransaction(transactionHash);
			eventManager.emit('transactionFetched', { tx });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return tx as TransactionResponse;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getTransaction', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getTransactionCount(
		addressOrName: string | Promise<string>,
		blockTag?: BlockTag | Promise<BlockTag> | undefined
	): Promise<number> {
		try {
			const address = await addressOrName;
			const resolvedBlockTag = blockTag ? await blockTag : 'latest';
			const blockTagStr = typeof resolvedBlockTag === 'bigint' ? (resolvedBlockTag as bigint).toString() : 
				typeof resolvedBlockTag === 'number' ? (resolvedBlockTag as number).toString() :
				resolvedBlockTag as string;
			
			const rpc = await this.ensureRPC();
			const nonce = await rpc.getNonce(address, blockTagStr);
			const count = parseInt(nonce, 16);
			eventManager.emit('transactionCount', { address, count });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return count;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getTransactionCount', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getTransactionHistory(address: string): Promise<any> {
		// Infura doesn't provide transaction history endpoint
		// This would need to be implemented using getLogs or external service
		throw new Error('Transaction history not supported by Infura RPC');
	}

	async getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt> {
		try {
			const rpc = await this.ensureRPC();
			const receipt = await rpc.getTransactionReceipt(transactionHash);
			eventManager.emit('transactionReceipt', { receipt });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return receipt as TransactionReceipt;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getTransactionReceipt', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getLogs(filter: Filter): Promise<Log[]> {
		try {
			const rpc = await this.ensureRPC();
			const logs = await rpc.getLogs(filter);
			eventManager.emit('logsFetched', { logs });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return logs as Log[];
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getLogs', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	async getFeeData(): Promise<FeeData> {
		try {
			const rpc = await this.ensureRPC();
			const gasPrice = await rpc.getGasPrice();
			
			// Get base fee and priority fee for EIP-1559
			const block = await rpc.getBlock('latest');
			const baseFeePerGas = block.baseFeePerGas ? BigInt(block.baseFeePerGas) : null;
			
			const feeData: FeeData = {
				lastBaseFeePerGas: baseFeePerGas || 0n,
				maxFeePerGas: baseFeePerGas ? baseFeePerGas * 2n : 0n,
				maxPriorityFeePerGas: baseFeePerGas ? BigInt('1500000000') : 0n, // 1.5 gwei default
				gasPrice: gasPrice
			};
			
			eventManager.emit('feeData', { feeData });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return feeData;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method: 'getFeeData', error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	// ENS resolution - Infura supports these
	async resolveName(name: string | Promise<string>): Promise<string | null> {
		try {
			const ensName = await name;
			if (!ensName.includes('.')) return null;
			
			// Use eth_call to resolve ENS name
			// This is a simplified version - full ENS resolution is complex
			log.warn('[Infura] ENS resolution not fully implemented');
			return null;
		} catch (error) {
			log.error('[Infura] Error resolving ENS name', false, error);
			return null;
		}
	}

	async lookupAddress(address: string | Promise<string>): Promise<string | null> {
		// Reverse ENS lookup
		log.warn('[Infura] Reverse ENS lookup not implemented');
		return null;
	}

	// Helper to resolve deferrable transaction
	private async resolveDeferrable(transaction: Deferrable<TransactionRequest>): Promise<TransactionRequest> {
		const resolved: Record<string, any> = {};
		for (const [key, value] of Object.entries(transaction)) {
			if (value instanceof Promise) {
				resolved[key] = await value;
			} else {
				resolved[key] = value;
			}
		}
		return resolved as TransactionRequest;
	}

	// Event methods (passthrough to parent)
	on(eventName: EventType, listener: Listener): Provider {
		return super.on(eventName, listener);
	}

	once(eventName: EventType, listener: Listener): Provider {
		return super.once(eventName, listener);
	}

	emit(eventName: EventType, ...args: any[]): boolean {
		return super.emit(eventName, ...args);
	}

	listenerCount(eventName?: EventType | undefined): number {
		return super.listenerCount(eventName);
	}

	listeners(eventName?: EventType | undefined): Listener[] {
		return super.listeners(eventName);
	}

	off(eventName: EventType, listener?: Listener | undefined): Provider {
		return super.off(eventName, listener);
	}

	removeAllListeners(eventName?: EventType | undefined): Provider {
		return super.removeAllListeners(eventName);
	}
	constructor(options: InfuraOptions = {}) {
		const {
			blockchains = ['Ethereum', 'Optimism', 'Polygon', 'Arbitrum'],
			chainIds = [1, 10, 137, 42161, 11155111],
			blockchain = 'Ethereum',
			chainId = 1
		} = options;

		super('infura', blockchains, chainIds, blockchain, chainId);
		
		// Initialize RPC immediately
		this.initializeProvider().catch(error => {
			log.error('[Infura] Failed to initialize in constructor', false, error);
		});
	}

	async connect(): Promise<void> {
		await this.initializeProvider();
		log.info('[Infura] Connected to Infura RPC');
	}

	async request(method: string, params: any[]): Promise<any> {
		try {
			const rpc = await this.ensureRPC();
			const result = await rpc.request(method, params);
			eventManager.emit('requestMade', { provider: this.name, method, params, result });
			// Track successful request
			providerRoutingManager.resetProviderStatus(this.name);
			return result;
		} catch (error) {
			eventManager.emit('error', { provider: this.name, method, error });
			// Track provider failure for automatic failover
			providerRoutingManager.trackProviderFailure(this.name, error);
			throw error;
		}
	}

	setSigner(signer: Signer): void {
		if (!signer) {
			throw new Error('Invalid signer');
		}
		this.signer = signer;
	}

	async setChainId(chainId: number): Promise<void> {
		if (this.chainId === chainId) {
			return; // No change needed
		}
		this.chainId = chainId;
		// Switch the RPC to new chain
		if (this.rpcInfura) {
			await this.rpcInfura.switchChain(chainId);
		} else {
			await this.initializeProvider();
		}
	}
}
