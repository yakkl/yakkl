/**
 * AlchemyProvider - Plugin for Alchemy RPC
 *
 * Extends the base provider with Alchemy-specific features:
 * - Enhanced APIs (getNFTs, getTokenBalances, etc.)
 * - Websocket subscriptions
 * - Trace APIs
 */

import { BaseProvider, ProviderType, ProviderConfig } from '../ProviderInterface';

interface AlchemyConfig extends ProviderConfig {
  apiKey: string;
  network?: string;
}

export class AlchemyProvider extends BaseProvider {
  readonly type = ProviderType.ALCHEMY;
  readonly name = 'Alchemy';
  private url: string;
  private wsUrl?: string;
  private ws?: WebSocket;
  private connected = false;

  constructor(config: AlchemyConfig) {
    super(config);

    // Build URL from network and API key
    const network = config.network || 'eth-mainnet';
    this.url = `https://${network}.g.alchemy.com/v2/${config.apiKey}`;

    // WebSocket URL for subscriptions
    if (typeof WebSocket !== 'undefined') {
      this.wsUrl = `wss://${network}.g.alchemy.com/v2/${config.apiKey}`;
    }
  }

  async connect(): Promise<void> {
    // Test connection
    await this.getBlockNumber();
    this.connected = true;

    // Connect WebSocket if available
    if (this.wsUrl && typeof WebSocket !== 'undefined') {
      this.connectWebSocket();
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async call(method: string, params: any[]): Promise<any> {
    return this.trackRequest(async () => {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'RPC Error');
      }

      return data.result;
    });
  }

  // Alchemy-specific methods

  /**
   * Get NFTs for an address
   */
  async getNFTs(owner: string, options?: {
    contractAddresses?: string[];
    withMetadata?: boolean;
    pageKey?: string;
  }): Promise<any> {
    return this.call('alchemy_getNFTs', [{
      owner,
      ...options
    }]);
  }

  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string, contractAddresses?: string[]): Promise<any> {
    return this.call('alchemy_getTokenBalances', [
      address,
      contractAddresses || 'DEFAULT_TOKENS'
    ]);
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(contractAddress: string): Promise<any> {
    return this.call('alchemy_getTokenMetadata', [contractAddress]);
  }

  /**
   * Get asset transfers (transaction history)
   */
  async getAssetTransfers(params: {
    fromAddress?: string;
    toAddress?: string;
    category?: string[];
    withMetadata?: boolean;
    excludeZeroValue?: boolean;
    maxCount?: string;
    pageKey?: string;
  }): Promise<any> {
    return this.call('alchemy_getAssetTransfers', [params]);
  }

  /**
   * Enhanced transaction receipts
   */
  async getTransactionReceipts(params: {
    blockNumber?: string;
    blockHash?: string;
  }): Promise<any> {
    return this.call('alchemy_getTransactionReceipts', [params]);
  }

  /**
   * Simulate transaction execution
   */
  async simulateExecution(transaction: any, blockNumber?: string): Promise<any> {
    return this.call('alchemy_simulateExecution', [
      transaction,
      blockNumber || 'latest'
    ]);
  }

  /**
   * Batch support for Alchemy
   */
  async batch(requests: Array<{ method: string; params: any[] }>): Promise<any[]> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        requests.map((req, index) => ({
          jsonrpc: '2.0',
          id: index,
          method: req.method,
          params: req.params
        }))
      )
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid batch response');
    }

    // Sort by ID and extract results
    data.sort((a, b) => a.id - b.id);
    return data.map(item => {
      if (item.error) {
        throw new Error(item.error.message);
      }
      return item.result;
    });
  }

  /**
   * Subscribe to events (WebSocket)
   */
  subscribe(event: string, callback: (data: any) => void): void {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    // Send subscription request
    const subscriptionId = Date.now().toString();
    this.ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: subscriptionId,
      method: 'eth_subscribe',
      params: [event]
    }));

    // Handle incoming messages
    this.ws.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      if (data.params && data.params.subscription === subscriptionId) {
        callback(data.params.result);
      }
    });
  }

  /**
   * Connect WebSocket for subscriptions
   */
  private connectWebSocket(): void {
    if (!this.wsUrl) return;

    this.ws = new WebSocket(this.wsUrl);

    this.ws.addEventListener('open', () => {
      console.log('Alchemy WebSocket connected');
    });

    this.ws.addEventListener('error', (error) => {
      console.error('Alchemy WebSocket error:', error);
      this.stats.lastError = new Error('WebSocket error');
    });

    this.ws.addEventListener('close', () => {
      console.log('Alchemy WebSocket disconnected');
      // Attempt reconnection after delay
      if (this.connected) {
        setTimeout(() => this.connectWebSocket(), 5000);
      }
    });
  }
}