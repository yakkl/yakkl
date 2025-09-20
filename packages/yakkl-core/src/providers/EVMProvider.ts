/**
 * EVM Provider implementation for Ethereum and EVM-compatible chains
 */

import { BaseProvider, ProviderError, RpcErrorCode } from './BaseProvider';
import type {
  EVMProviderInterface,
  ChainInfo,
  ProviderConfig,
  Block,
  BlockTag,
  BlockWithTransactions,
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt,
  FeeData,
  Log,
  Filter,
  ProviderMetadata,
  ProviderCostMetrics,
  ProviderHealthMetrics
} from '../interfaces/provider.interface';
import type { Address, HexString } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';

/**
 * EVM Provider implementation
 */
export class EVMProvider extends BaseProvider implements EVMProviderInterface {
  private accounts: Address[] = [];

  constructor(chainInfo: ChainInfo, config?: ProviderConfig) {
    super(chainInfo, config);
    // Override metadata for EVM-specific features
    this.metadata.name = 'evm-provider';
    this.metadata.features = {
      ...this.metadata.features,
      archive: false,
      trace: false,
      debug: false
    };
  }

  /**
   * Switch to a different chain
   */
  async switchChain(chainId: string | number): Promise<void> {
    try {
      // For injected providers (MetaMask, etc.)
      if (this.config.customProvider) {
        await this.config.customProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${Number(chainId).toString(16)}` }]
        });
        return;
      }

      // For RPC providers, we'd need to reinitialize with new chain info
      throw new ProviderError(
        'Chain switching not supported for RPC providers',
        RpcErrorCode.UNSUPPORTED_METHOD
      );
    } catch (error: any) {
      // Chain not added to wallet
      if (error.code === 4902) {
        throw new ProviderError(
          'Chain not added to wallet',
          RpcErrorCode.CHAIN_DISCONNECTED
        );
      }
      throw error;
    }
  }

  /**
   * Get accounts
   */
  async getAccounts(): Promise<Address[]> {
    if (this.config.customProvider) {
      const accounts = await this.config.customProvider.request({
        method: 'eth_accounts',
        params: []
      });
      return accounts as Address[];
    }
    return this.accounts;
  }

  /**
   * Request accounts (triggers wallet connection)
   */
  async requestAccounts(): Promise<Address[]> {
    if (this.config.customProvider) {
      const accounts = await this.config.customProvider.request({
        method: 'eth_requestAccounts',
        params: []
      });
      this.accounts = accounts as Address[];
      this.emit('accountsChanged', this.accounts);
      return this.accounts;
    }
    throw new ProviderError(
      'No wallet connected',
      RpcErrorCode.UNAUTHORIZED
    );
  }

  /**
   * Get balance
   */
  async getBalance(address: string, blockTag?: BlockTag): Promise<bigint> {
    const balance = await this.rpcRequest('eth_getBalance', [
      address,
      blockTag || 'latest'
    ]);
    return BigInt(balance);
  }

  /**
   * Get token balance (EVM-specific)
   */
  async getTokenBalance(address: Address, tokenAddress: Address): Promise<string> {
    const data = this.encodeERC20Call('balanceOf', [address]);
    const result = await this.call({
      to: tokenAddress,
      data: data as HexString
    });
    return this.decodeUint256(result);
  }

  /**
   * Send transaction
   */
  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    const params = this.formatTransactionRequest(transaction);

    let txHash: string;
    if (this.config.customProvider) {
      txHash = await this.config.customProvider.request({
        method: 'eth_sendTransaction',
        params: [params]
      });
    } else {
      txHash = await this.rpcRequest('eth_sendTransaction', [params]);
    }

    // Return TransactionResponse with basic info
    return {
      hash: txHash,
      from: transaction.from || '',
      to: transaction.to || undefined,
      value: transaction.value || 0n,
      gasLimit: transaction.gasLimit || 0n,
      gasPrice: transaction.gasPrice || undefined,
      maxFeePerGas: transaction.maxFeePerGas || undefined,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas || undefined,
      nonce: transaction.nonce || 0,
      data: transaction.data || '0x',
      chainId: Number(this._chainInfo.chainId),
      blockNumber: undefined,
      blockHash: undefined,
      confirmations: 0,
      wait: async (confirmations?: number) => {
        return this.waitForTransaction(txHash, confirmations);
      }
    };
  }

  /**
   * Sign transaction
   */
  async signTransaction(tx: TransactionSignRequest): Promise<string> {
    const params = this.formatTransaction(tx);
    
    if (this.config.customProvider) {
      return await this.config.customProvider.request({
        method: 'eth_signTransaction',
        params: [params]
      });
    }
    
    throw new ProviderError(
      'Transaction signing requires a connected wallet',
      RpcErrorCode.UNAUTHORIZED
    );
  }

  /**
   * Get transaction
   */
  async getTransaction(hash: string): Promise<TransactionResponse | null> {
    const tx = await this.rpcRequest('eth_getTransactionByHash', [hash]);

    if (!tx) {
      return null;
    }

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || undefined,
      value: BigInt(tx.value || '0'),
      gasLimit: BigInt(tx.gas || tx.gasLimit || '0'),
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
      nonce: parseInt(tx.nonce, 16),
      data: tx.input || tx.data || '0x',
      chainId: tx.chainId ? parseInt(tx.chainId, 16) : Number(this._chainInfo.chainId),
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : undefined,
      blockHash: tx.blockHash || undefined,
      confirmations: tx.blockNumber ? await this.getBlockNumber() - parseInt(tx.blockNumber, 16) : 0,
      wait: async (confirmations?: number) => {
        return this.waitForTransaction(hash, confirmations);
      }
    };
  }

  /**
   * Estimate gas
   */
  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const params = this.formatTransactionRequest(transaction);
    const gas = await this.rpcRequest('eth_estimateGas', [params]);
    return BigInt(gas);
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<bigint> {
    const gasPrice = await this.rpcRequest('eth_gasPrice', []);
    return BigInt(gasPrice);
  }

  /**
   * Sign message
   */
  async signMessage(request: SignatureRequest): Promise<SignatureResult> {
    let signature: string;
    
    if (this.config.customProvider) {
      signature = await this.config.customProvider.request({
        method: 'personal_sign',
        params: [request.data, request.from]
      });
    } else {
      throw new ProviderError(
        'Message signing requires a connected wallet',
        RpcErrorCode.UNAUTHORIZED
      );
    }

    return {
      signature: signature as HexString,
      signatureType: 'personal_sign',
      address: request.from,
      timestamp: Date.now()
    };
  }

  /**
   * Sign typed data
   */
  async signTypedData(request: SignatureRequest): Promise<SignatureResult> {
    let signature: string;
    
    if (this.config.customProvider) {
      signature = await this.config.customProvider.request({
        method: request.type || 'eth_signTypedData_v4',
        params: [request.from, request.data]
      });
    } else {
      throw new ProviderError(
        'Typed data signing requires a connected wallet',
        RpcErrorCode.UNAUTHORIZED
      );
    }

    return {
      signature: signature as HexString,
      signatureType: request.type || 'eth_signTypedData_v4',
      address: request.from,
      timestamp: Date.now()
    };
  }

  /**
   * Get block number
   */
  async getBlockNumber(): Promise<number> {
    const blockNumber = await this.rpcRequest('eth_blockNumber', []);
    return parseInt(blockNumber, 16);
  }

  /**
   * Get block
   */
  async getBlock(blockHashOrNumber: string | number): Promise<Block> {
    const block = await this.rpcRequest('eth_getBlockByNumber', [
      typeof blockHashOrNumber === 'number' 
        ? `0x${blockHashOrNumber.toString(16)}`
        : blockHashOrNumber,
      false // Don't include full transactions
    ]);

    if (!block) {
      throw new ProviderError('Block not found', RpcErrorCode.INVALID_REQUEST);
    }

    return {
      hash: block.hash,
      parentHash: block.parentHash,
      number: parseInt(block.number, 16),
      timestamp: parseInt(block.timestamp, 16),
      gasLimit: BigInt(block.gasLimit),
      gasUsed: BigInt(block.gasUsed),
      miner: block.miner,
      baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : undefined,
      transactions: block.transactions || []
    };
  }

  /**
   * Get transaction count (nonce)
   */
  async getTransactionCount(address: Address): Promise<number> {
    const count = await this.rpcRequest('eth_getTransactionCount', [address, 'latest']);
    return parseInt(count, 16);
  }

  /**
   * Call contract method
   */
  async call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string> {
    const params = this.formatTransactionRequest(transaction);
    return await this.rpcRequest('eth_call', [params, blockTag || 'latest']);
  }

  // EVM-specific methods

  /**
   * Get max priority fee per gas
   */
  async getMaxPriorityFeePerGas(): Promise<bigint> {
    const fee = await this.rpcRequest('eth_maxPriorityFeePerGas', []);
    return BigInt(fee);
  }

  /**
   * Get fee history
   */
  async getFeeHistory(
    blockCount: number,
    newestBlock: string | number,
    rewardPercentiles: number[]
  ): Promise<any> {
    return await this.rpcRequest('eth_feeHistory', [
      `0x${blockCount.toString(16)}`,
      typeof newestBlock === 'number' ? `0x${newestBlock.toString(16)}` : newestBlock,
      rewardPercentiles
    ]);
  }

  /**
   * Resolve ENS name
   */
  async resolveName(ensName: string): Promise<Address | null> {
    try {
      const address = await this.rpcRequest('eth_call', [
        {
          to: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e', // ENS Registry
          data: this.encodeENSResolve(ensName)
        },
        'latest'
      ]);
      return address === '0x' ? null : address as Address;
    } catch {
      return null;
    }
  }

  /**
   * Lookup address (reverse ENS)
   */
  async lookupAddress(address: Address): Promise<string | null> {
    // Implementation would require ENS reverse resolver logic
    return null;
  }

  /**
   * Get code at address
   */
  async getCode(address: Address): Promise<string> {
    return await this.rpcRequest('eth_getCode', [address, 'latest']);
  }

  /**
   * Get storage at position
   */
  async getStorageAt(address: Address, position: string): Promise<string> {
    return await this.rpcRequest('eth_getStorageAt', [address, position, 'latest']);
  }


  /**
   * EIP-1193 request method
   */
  async request(args: { method: string; params?: any[] }): Promise<any> {
    if (this.config.customProvider) {
      return await this.config.customProvider.request(args);
    }
    return await this.rpcRequest(args.method, args.params || []);
  }

  // Helper methods

  private formatTransaction(tx: TransactionSignRequest): any {
    const formatted: any = {
      from: tx.from,
      to: tx.to,
      value: tx.value ? `0x${BigInt(tx.value).toString(16)}` : undefined,
      data: tx.data,
      nonce: tx.nonce ? `0x${tx.nonce.toString(16)}` : undefined
    };

    if (tx.gas) {
      formatted.gas = `0x${BigInt(tx.gas).toString(16)}`;
    }

    if (tx.gasPrice) {
      formatted.gasPrice = `0x${BigInt(tx.gasPrice).toString(16)}`;
    }

    if (tx.maxFeePerGas) {
      formatted.maxFeePerGas = `0x${BigInt(tx.maxFeePerGas).toString(16)}`;
    }

    if (tx.maxPriorityFeePerGas) {
      formatted.maxPriorityFeePerGas = `0x${BigInt(tx.maxPriorityFeePerGas).toString(16)}`;
    }

    return formatted;
  }

  private encodeERC20Call(method: string, params: any[]): string {
    // Simplified encoding - real implementation would use proper ABI encoding
    const methodId = {
      'balanceOf': '0x70a08231',
      'transfer': '0xa9059cbb',
      'approve': '0x095ea7b3'
    }[method];

    if (!methodId) {
      throw new Error(`Unknown ERC20 method: ${method}`);
    }

    // This is simplified - real implementation needs proper encoding
    return methodId + params.map(p => p.slice(2).padStart(64, '0')).join('');
  }

  private decodeUint256(hex: string): string {
    return BigInt(hex).toString();
  }

  private encodeENSResolve(name: string): string {
    // Simplified - real implementation needs proper ENS encoding
    return '0x' + name;
  }

  private formatBlockTag(blockTag: BlockTag | string | number): string {
    if (typeof blockTag === 'string') {
      return blockTag;
    }
    if (typeof blockTag === 'number') {
      return `0x${blockTag.toString(16)}`;
    }
    return 'latest';
  }

  /**
   * Additional required methods
   */
  async getNetwork(): Promise<{ name: string; chainId: number }> {
    const chainId = await this.getChainId();
    const networkNames: Record<number, string> = {
      1: 'mainnet',
      5: 'goerli',
      11155111: 'sepolia',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base'
    };
    return {
      name: networkNames[chainId] || 'unknown',
      chainId
    };
  }

  async getChainId(): Promise<number> {
    const chainId = await this.rpcRequest('eth_chainId', []);
    return parseInt(chainId, 16);
  }

  async getBlockWithTransactions(blockHashOrTag: BlockTag | string): Promise<BlockWithTransactions | null> {
    const blockParam = this.formatBlockTag(blockHashOrTag);
    const block = await this.rpcRequest('eth_getBlockByNumber', [
      blockParam,
      true // Include full transactions
    ]);

    if (!block) {
      return null;
    }

    return {
      hash: block.hash,
      parentHash: block.parentHash,
      number: parseInt(block.number, 16),
      timestamp: parseInt(block.timestamp, 16),
      gasLimit: BigInt(block.gasLimit),
      gasUsed: BigInt(block.gasUsed),
      miner: block.miner,
      baseFeePerGas: block.baseFeePerGas ? BigInt(block.baseFeePerGas) : undefined,
      transactions: block.transactions.map((tx: any) => this.formatTransactionResponse(tx))
    };
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    const receipt = await this.rpcRequest('eth_getTransactionReceipt', [hash]);

    if (!receipt) {
      return null;
    }

    return {
      transactionHash: receipt.transactionHash,
      blockHash: receipt.blockHash,
      blockNumber: parseInt(receipt.blockNumber, 16),
      transactionIndex: parseInt(receipt.transactionIndex, 16),
      from: receipt.from,
      to: receipt.to,
      contractAddress: receipt.contractAddress,
      cumulativeGasUsed: BigInt(receipt.cumulativeGasUsed),
      gasUsed: BigInt(receipt.gasUsed),
      effectiveGasPrice: receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : undefined,
      logs: receipt.logs,
      logsBloom: receipt.logsBloom,
      status: parseInt(receipt.status, 16)
    };
  }

  async waitForTransaction(hash: string, confirmations: number = 1, timeout: number = 60000): Promise<TransactionReceipt> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const receipt = await this.getTransactionReceipt(hash);

      if (receipt) {
        const currentBlock = await this.getBlockNumber();
        const txConfirmations = currentBlock - receipt.blockNumber;

        if (txConfirmations >= confirmations) {
          return receipt;
        }
      }

      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new ProviderError(`Transaction ${hash} timed out`, RpcErrorCode.INTERNAL_ERROR);
  }

  async getFeeData(): Promise<FeeData> {
    const [gasPrice, block] = await Promise.all([
      this.getGasPrice(),
      this.getBlock('latest')
    ]);

    let maxFeePerGas: bigint | undefined;
    let maxPriorityFeePerGas: bigint | undefined;
    let lastBaseFeePerGas: bigint | undefined;

    if (block && block.baseFeePerGas) {
      lastBaseFeePerGas = typeof block.baseFeePerGas === 'bigint'
        ? block.baseFeePerGas
        : BigInt(block.baseFeePerGas);
      // EIP-1559 fee calculation
      maxPriorityFeePerGas = BigInt(1500000000); // 1.5 gwei default
      maxFeePerGas = lastBaseFeePerGas * BigInt(2) + maxPriorityFeePerGas;
    }

    return {
      gasPrice,
      lastBaseFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }

  async getLogs(filter: Filter): Promise<Log[]> {
    const params = {
      ...filter,
      fromBlock: filter.fromBlock
        ? this.formatBlockTag(filter.fromBlock)
        : 'latest',
      toBlock: filter.toBlock
        ? this.formatBlockTag(filter.toBlock)
        : 'latest'
    };

    return await this.rpcRequest('eth_getLogs', [params]);
  }

  getRawProvider(): any {
    return this.config.customProvider || null;
  }

  getEndpoint(): string {
    return this.rpcUrl;
  }

  async getCostMetrics(): Promise<ProviderCostMetrics> {
    // Basic implementation - can be enhanced with actual tracking
    return {
      computeUnitsUsed: 0,
      requestsUsed: 0,
      billingPeriod: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    };
  }

  async getHealthMetrics(): Promise<ProviderHealthMetrics> {
    const start = Date.now();
    try {
      await this.getBlockNumber();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency,
        successRate: 1,
        uptime: 1
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - start,
        successRate: 0,
        uptime: 0,
        lastError: {
          message: (error as Error).message,
          timestamp: new Date()
        }
      };
    }
  }

  async healthCheck(): Promise<ProviderHealthMetrics> {
    return this.getHealthMetrics();
  }

  private formatTransactionResponse(tx: any): TransactionResponse {
    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || undefined,
      value: BigInt(tx.value || '0'),
      gasLimit: BigInt(tx.gas || tx.gasLimit || '0'),
      gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
      nonce: parseInt(tx.nonce, 16),
      data: tx.input || tx.data || '0x',
      chainId: tx.chainId ? parseInt(tx.chainId, 16) : Number(this._chainInfo.chainId),
      blockNumber: tx.blockNumber ? parseInt(tx.blockNumber, 16) : undefined,
      blockHash: tx.blockHash || undefined,
      confirmations: 0,
      wait: async (confirmations?: number) => {
        return this.waitForTransaction(tx.hash, confirmations);
      }
    };
  }

  private formatTransactionRequest(tx: TransactionRequest): any {
    const formatted: any = {};
    if (tx.from) formatted.from = tx.from;
    if (tx.to) formatted.to = tx.to;
    if (tx.value) formatted.value = `0x${tx.value.toString(16)}`;
    if (tx.data) formatted.data = tx.data;
    if (tx.gasLimit) formatted.gas = `0x${tx.gasLimit.toString(16)}`;
    if (tx.gasPrice) formatted.gasPrice = `0x${tx.gasPrice.toString(16)}`;
    if (tx.maxFeePerGas) formatted.maxFeePerGas = `0x${tx.maxFeePerGas.toString(16)}`;
    if (tx.maxPriorityFeePerGas) formatted.maxPriorityFeePerGas = `0x${tx.maxPriorityFeePerGas.toString(16)}`;
    if (tx.nonce !== undefined) formatted.nonce = `0x${tx.nonce.toString(16)}`;
    return formatted;
  }
}