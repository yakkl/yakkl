/**
 * ERC20 token implementation
 */

import { BaseToken } from './BaseToken';
import type { TokenInfo, TokenMetadata } from './types';
import type { BigNumberish, IProvider } from '../providers/types';

// ERC20 ABI for the methods we need
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)'
];

export class ERC20Token extends BaseToken {
  constructor(info: TokenInfo, metadata?: TokenMetadata, provider?: IProvider) {
    super(info, metadata, provider);
  }

  /**
   * Get token name from contract (IERC20 method)
   */
  async getName(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('name', [])
    });

    return this.decodeFunctionResult('name', data) as string;
  }

  /**
   * Get token symbol from contract (IERC20 method)
   */
  async getSymbol(): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('symbol', [])
    });

    return this.decodeFunctionResult('symbol', data) as string;
  }

  /**
   * Get token decimals from contract (IERC20 method)
   */
  async getDecimals(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('decimals', [])
    });

    return Number(this.decodeFunctionResult('decimals', data));
  }

  /**
   * Get total supply of the token
   */
  async totalSupply(): Promise<BigNumberish> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('totalSupply', [])
    });

    return BigInt(data);
  }

  /**
   * Get balance of an address
   */
  async balanceOf(account: string): Promise<BigNumberish> {
    return this.getBalance(account);
  }

  /**
   * Get balance implementation
   */
  async getBalance(address: string): Promise<BigNumberish> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    // For native tokens, use provider's getBalance
    if (this.isNative) {
      return await this.provider.getBalance(address);
    }

    // For ERC20 tokens, call balanceOf
    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('balanceOf', [address])
    });

    return BigInt(data);
  }

  /**
   * Transfer tokens to another address
   */
  async transfer(to: string, amount: BigNumberish): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData('transfer', [to, amount.toString()])
    });

    return tx.hash;
  }

  /**
   * Get allowance for a spender
   */
  async allowance(owner: string, spender: string): Promise<BigNumberish> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const data = await this.provider.call({
      to: this.address,
      data: this.encodeFunctionData('allowance', [owner, spender])
    });

    return BigInt(data);
  }

  /**
   * Approve a spender to use tokens
   */
  async approve(spender: string, amount: BigNumberish): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData('approve', [spender, amount.toString()])
    });

    return tx.hash;
  }

  /**
   * Transfer tokens from one address to another (requires approval)
   */
  async transferFrom(from: string, to: string, amount: BigNumberish): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const tx = await this.provider.sendTransaction({
      to: this.address,
      data: this.encodeFunctionData('transferFrom', [from, to, amount.toString()])
    });

    // Wait for transaction and check status
    const receipt = await this.provider.waitForTransaction(tx.hash);
    return receipt.status === 1;
  }

  /**
   * Encode function data for contract calls
   * This is a simplified version - in production, use ethers.js or similar
   */
  private encodeFunctionData(functionName: string, args: any[]): string {
    // Function selector (first 4 bytes of keccak256 hash)
    const functionSignatures: Record<string, string> = {
      'name': '0x06fdde03',
      'symbol': '0x95d89b41',
      'decimals': '0x313ce567',
      'totalSupply': '0x18160ddd',
      'balanceOf': '0x70a08231',
      'transfer': '0xa9059cbb',
      'allowance': '0xdd62ed3e',
      'approve': '0x095ea7b3',
      'transferFrom': '0x23b872dd'
    };

    let data = functionSignatures[functionName];
    if (!data) {
      throw new Error(`Unknown function: ${functionName}`);
    }

    // Encode arguments (simplified - handles addresses and uint256)
    for (const arg of args) {
      if (typeof arg === 'string' && arg.startsWith('0x')) {
        // Address - pad to 32 bytes
        data += arg.slice(2).padStart(64, '0');
      } else {
        // Number/BigInt - convert to hex and pad
        const hex = BigInt(arg).toString(16);
        data += hex.padStart(64, '0');
      }
    }

    return data;
  }

  /**
   * Decode function result from contract call
   * This is a simplified version - in production, use ethers.js or similar
   */
  private decodeFunctionResult(functionName: string, data: string): any {
    // Remove '0x' prefix if present
    const hexData = data.startsWith('0x') ? data.slice(2) : data;

    switch (functionName) {
      case 'name':
      case 'symbol':
        // String decoding (simplified - assumes short strings)
        // In production, properly decode dynamic strings
        const length = parseInt(hexData.slice(64, 128), 16);
        const stringData = hexData.slice(128, 128 + length * 2);
        return Buffer.from(stringData, 'hex').toString('utf8');
      
      case 'decimals':
        // uint8 - last byte
        return parseInt(hexData.slice(-2), 16);
      
      case 'totalSupply':
      case 'balanceOf':
      case 'allowance':
        // uint256
        return BigInt('0x' + hexData);
      
      case 'transfer':
      case 'approve':
      case 'transferFrom':
        // bool
        return hexData === '0'.repeat(63) + '1';
      
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  /**
   * Create an ERC20 token instance from an address
   */
  static async fromAddress(
    address: string,
    chainId: number,
    provider: IProvider
  ): Promise<ERC20Token> {
    // Create a temporary instance to fetch metadata
    const temp = new ERC20Token(
      {
        address,
        chainId,
        name: '',
        symbol: '',
        decimals: 18
      },
      {},
      provider
    );

    // Fetch actual metadata from chain
    const [name, symbol, decimals] = await Promise.all([
      temp.getName(),
      temp.getSymbol(),
      temp.getDecimals()
    ]);

    // Create the real instance with fetched metadata
    return new ERC20Token(
      {
        address,
        chainId,
        name,
        symbol,
        decimals
      },
      {},
      provider
    );
  }
}