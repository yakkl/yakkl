/**
 * EVM Provider implementation for Ethereum and EVM-compatible chains
 */

import { BaseProvider, ProviderError, RpcErrorCode } from './BaseProvider';
import type {
  IEVMProvider,
  ChainInfo,
  ProviderConfig,
  TransactionStatusInfo,
  Block
} from '../interfaces/provider.interface';
import type { Address, HexString } from '../types';
import type { TransactionSignRequest } from '../interfaces/wallet.interface';
import type { SignatureRequest, SignatureResult } from '../interfaces/crypto.interface';

/**
 * EVM Provider implementation
 */
export class EVMProvider extends BaseProvider implements IEVMProvider {
  private accounts: Address[] = [];

  constructor(chainInfo: ChainInfo, config?: ProviderConfig) {
    super(chainInfo, config);
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
  async getBalance(address: Address, tokenAddress?: Address): Promise<string> {
    if (tokenAddress) {
      // ERC20 token balance
      const data = this.encodeERC20Call('balanceOf', [address]);
      const result = await this.call({
        from: address,
        to: tokenAddress,
        data: data as HexString
      });
      return this.decodeUint256(result);
    }
    
    // Native balance
    const balance = await this.rpcRequest('eth_getBalance', [address, 'latest']);
    return balance;
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: TransactionSignRequest): Promise<string> {
    const params = this.formatTransaction(tx);
    
    if (this.config.customProvider) {
      return await this.config.customProvider.request({
        method: 'eth_sendTransaction',
        params: [params]
      });
    }
    
    return await this.rpcRequest('eth_sendTransaction', [params]);
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
  async getTransaction(hash: string): Promise<TransactionStatusInfo> {
    const [tx, receipt] = await Promise.all([
      this.rpcRequest('eth_getTransactionByHash', [hash]),
      this.rpcRequest('eth_getTransactionReceipt', [hash])
    ]);

    if (!tx) {
      throw new ProviderError('Transaction not found', RpcErrorCode.INVALID_REQUEST);
    }

    const currentBlock = await this.getBlockNumber();
    const confirmations = receipt ? currentBlock - parseInt(receipt.blockNumber, 16) : 0;

    return {
      hash,
      status: receipt 
        ? (receipt.status === '0x1' ? 'confirmed' : 'failed')
        : 'pending',
      confirmations,
      blockNumber: receipt ? parseInt(receipt.blockNumber, 16) : undefined,
      timestamp: Date.now(), // Would need to fetch block for actual timestamp
      gasUsed: receipt ? receipt.gasUsed : undefined,
      effectiveGasPrice: receipt ? receipt.effectiveGasPrice : undefined,
      error: receipt && receipt.status === '0x0' ? 'Transaction failed' : undefined
    };
  }

  /**
   * Estimate gas
   */
  async estimateGas(tx: TransactionSignRequest): Promise<string> {
    const params = this.formatTransaction(tx);
    return await this.rpcRequest('eth_estimateGas', [params]);
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<string> {
    return await this.rpcRequest('eth_gasPrice', []);
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
      number: parseInt(block.number, 16),
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: parseInt(block.timestamp, 16),
      transactions: block.transactions,
      gasLimit: block.gasLimit,
      gasUsed: block.gasUsed,
      baseFeePerGas: block.baseFeePerGas
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
  async call(tx: TransactionSignRequest): Promise<string> {
    const params = this.formatTransaction(tx);
    return await this.rpcRequest('eth_call', [params, 'latest']);
  }

  // EVM-specific methods

  /**
   * Get max priority fee per gas
   */
  async getMaxPriorityFeePerGas(): Promise<string> {
    return await this.rpcRequest('eth_maxPriorityFeePerGas', []);
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
   * Get logs
   */
  async getLogs(filter: {
    fromBlock?: string | number;
    toBlock?: string | number;
    address?: Address | Address[];
    topics?: string[];
  }): Promise<any[]> {
    const params = {
      ...filter,
      fromBlock: filter.fromBlock 
        ? (typeof filter.fromBlock === 'number' 
          ? `0x${filter.fromBlock.toString(16)}` 
          : filter.fromBlock)
        : 'latest',
      toBlock: filter.toBlock
        ? (typeof filter.toBlock === 'number'
          ? `0x${filter.toBlock.toString(16)}`
          : filter.toBlock)
        : 'latest'
    };
    
    return await this.rpcRequest('eth_getLogs', [params]);
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
}