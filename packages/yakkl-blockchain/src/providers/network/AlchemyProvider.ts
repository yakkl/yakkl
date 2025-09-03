/**
 * Alchemy provider implementation
 */

import { BaseProvider } from '../base/BaseProvider';
import type {
  Block,
  BlockTag,
  BlockWithTransactions,
  FeeData,
  Filter,
  Log,
  NetworkProviderConfig,
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse
} from '../types';

interface AlchemyConfig extends NetworkProviderConfig {
  apiKey: string;
  network?: string;
}

// Network name to Alchemy network mapping
const NETWORK_MAP: Record<number, string> = {
  1: 'eth-mainnet',
  5: 'eth-goerli',
  11155111: 'eth-sepolia',
  137: 'polygon-mainnet',
  80001: 'polygon-mumbai',
  42161: 'arb-mainnet',
  421613: 'arb-goerli',
  10: 'opt-mainnet',
  420: 'opt-goerli',
  8453: 'base-mainnet',
  84531: 'base-goerli'
};

export class AlchemyProvider extends BaseProvider {
  private apiKey: string;
  private baseUrl: string = '';

  constructor(config: AlchemyConfig) {
    super({
      ...config,
      name: 'Alchemy',
      blockchains: config.blockchains || ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'],
      chainIds: config.chainIds || [1, 5, 11155111, 137, 80001, 42161, 421613, 10, 420, 8453, 84531]
    });
    
    this.apiKey = config.apiKey;
    this.updateBaseUrl();
  }

  private updateBaseUrl(): void {
    const network = NETWORK_MAP[this.currentChainId] || 'eth-mainnet';
    this.baseUrl = `https://${network}.g.alchemy.com/v2/${this.apiKey}`;
  }

  private async makeRpcCall(method: string, params: any[] = []): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();
    
    if (data.error) {
      throw this.handleRpcError(data.error);
    }

    return data.result;
  }

  async getNetwork(): Promise<{ name: string; chainId: number }> {
    const chainId = await this.getChainId();
    const name = this.getNetworkName(chainId);
    return { name, chainId };
  }

  private getNetworkName(chainId: number): string {
    const networkNames: Record<number, string> = {
      1: 'mainnet',
      5: 'goerli',
      11155111: 'sepolia',
      137: 'matic',
      80001: 'maticmum',
      42161: 'arbitrum',
      421613: 'arbitrum-goerli',
      10: 'optimism',
      420: 'optimism-goerli',
      8453: 'base',
      84531: 'base-goerli'
    };
    return networkNames[chainId] || 'unknown';
  }

  async getChainId(): Promise<number> {
    const result = await this.makeRpcCall('eth_chainId');
    return parseInt(result, 16);
  }

  async getBlockNumber(): Promise<number> {
    const result = await this.makeRpcCall('eth_blockNumber');
    return parseInt(result, 16);
  }

  async getBlock(blockHashOrBlockTag: BlockTag | string): Promise<Block | null> {
    const params = [
      this.formatBlockTag(blockHashOrBlockTag),
      false // Don't include transactions
    ];
    const result = await this.makeRpcCall('eth_getBlockByNumber', params);
    return result ? this.formatBlock(result) : null;
  }

  async getBlockWithTransactions(blockHashOrBlockTag: BlockTag | string): Promise<BlockWithTransactions | null> {
    const params = [
      this.formatBlockTag(blockHashOrBlockTag),
      true // Include transactions
    ];
    const result = await this.makeRpcCall('eth_getBlockByNumber', params);
    return result ? this.formatBlockWithTransactions(result) : null;
  }

  async getBalance(address: string, blockTag?: BlockTag): Promise<bigint> {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : 'latest'
    ];
    const result = await this.makeRpcCall('eth_getBalance', params);
    return BigInt(result);
  }

  async getTransactionCount(address: string, blockTag?: BlockTag): Promise<number> {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : 'latest'
    ];
    const result = await this.makeRpcCall('eth_getTransactionCount', params);
    return parseInt(result, 16);
  }

  async getCode(address: string, blockTag?: BlockTag): Promise<string> {
    const params = [
      address,
      blockTag ? this.formatBlockTag(blockTag) : 'latest'
    ];
    return await this.makeRpcCall('eth_getCode', params);
  }

  async call(transaction: TransactionRequest, blockTag?: BlockTag): Promise<string> {
    const params = [
      this.formatTransaction(transaction),
      blockTag ? this.formatBlockTag(blockTag) : 'latest'
    ];
    return await this.makeRpcCall('eth_call', params);
  }

  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const params = [this.formatTransaction(transaction)];
    const result = await this.makeRpcCall('eth_estimateGas', params);
    return BigInt(result);
  }

  async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
    // Note: This requires a signed transaction
    // In a real implementation, you'd need to sign the transaction first
    throw new Error('sendTransaction requires transaction signing - use with a Signer');
  }

  async getTransaction(transactionHash: string): Promise<TransactionResponse | null> {
    const result = await this.makeRpcCall('eth_getTransactionByHash', [transactionHash]);
    return result ? this.formatTransaction(result) : null;
  }

  async getTransactionReceipt(transactionHash: string): Promise<TransactionReceipt | null> {
    const result = await this.makeRpcCall('eth_getTransactionReceipt', [transactionHash]);
    return result ? this.formatReceipt(result) : null;
  }

  async getGasPrice(): Promise<bigint> {
    const result = await this.makeRpcCall('eth_gasPrice');
    return BigInt(result);
  }

  async getFeeData(): Promise<FeeData> {
    const [gasPrice, block] = await Promise.all([
      this.getGasPrice(),
      this.getBlock('latest')
    ]);

    let maxFeePerGas = null;
    let maxPriorityFeePerGas = null;
    let lastBaseFeePerGas = null;

    if (block && block.baseFeePerGas) {
      lastBaseFeePerGas = BigInt(block.baseFeePerGas.toString());
      // EIP-1559 fee calculation
      maxPriorityFeePerGas = BigInt(1500000000); // 1.5 gwei default
      maxFeePerGas = lastBaseFeePerGas * 2n + maxPriorityFeePerGas;
    }

    return {
      gasPrice,
      lastBaseFeePerGas,
      maxFeePerGas,
      maxPriorityFeePerGas
    };
  }

  async getLogs(filter: Filter): Promise<Log[]> {
    const params = [this.formatFilter(filter)];
    const result = await this.makeRpcCall('eth_getLogs', params);
    return result.map((log: any) => this.formatLog(log));
  }

  async switchChain(chainId: number): Promise<void> {
    await super.switchChain(chainId);
    this.updateBaseUrl();
  }

  // Formatting helpers
  private formatBlockTag(blockTag: BlockTag | string): string {
    if (typeof blockTag === 'string') {
      return blockTag;
    }
    if (typeof blockTag === 'number') {
      return `0x${blockTag.toString(16)}`;
    }
    return 'latest';
  }

  private formatTransaction(tx: any): any {
    const formatted: any = {};
    if (tx.to) formatted.to = tx.to;
    if (tx.from) formatted.from = tx.from;
    if (tx.value) formatted.value = `0x${BigInt(tx.value).toString(16)}`;
    if (tx.data) formatted.data = tx.data;
    if (tx.gasLimit) formatted.gas = `0x${BigInt(tx.gasLimit).toString(16)}`;
    if (tx.gasPrice) formatted.gasPrice = `0x${BigInt(tx.gasPrice).toString(16)}`;
    if (tx.nonce !== undefined) formatted.nonce = `0x${tx.nonce.toString(16)}`;
    return formatted;
  }

  private formatBlock(block: any): Block {
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

  private formatBlockWithTransactions(block: any): BlockWithTransactions {
    const formatted = this.formatBlock(block) as any;
    formatted.transactions = block.transactions.map((tx: any) => this.formatTransaction(tx));
    return formatted;
  }

  private formatReceipt(receipt: any): TransactionReceipt {
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
      logs: receipt.logs.map((log: any) => this.formatLog(log)),
      logsBloom: receipt.logsBloom,
      status: parseInt(receipt.status, 16)
    };
  }

  private formatLog(log: any): Log {
    return {
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: log.blockNumber ? parseInt(log.blockNumber, 16) : undefined,
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      transactionIndex: log.transactionIndex ? parseInt(log.transactionIndex, 16) : undefined,
      logIndex: log.logIndex ? parseInt(log.logIndex, 16) : undefined,
      removed: log.removed || false
    };
  }

  private formatFilter(filter: Filter): any {
    const formatted: any = {};
    if (filter.address) formatted.address = filter.address;
    if (filter.topics) formatted.topics = filter.topics;
    if (filter.fromBlock) formatted.fromBlock = this.formatBlockTag(filter.fromBlock);
    if (filter.toBlock) formatted.toBlock = this.formatBlockTag(filter.toBlock);
    return formatted;
  }
}