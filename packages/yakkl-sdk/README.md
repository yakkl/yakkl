# @yakkl/sdk

Developer SDK for integrating YAKKL wallet into applications.

## Installation

```bash
npm install @yakkl/sdk
# or
yarn add @yakkl/sdk
# or
pnpm add @yakkl/sdk
```

## Quick Start

### Basic Wallet Connection

```typescript
import { WalletClient } from '@yakkl/sdk';

const client = new WalletClient();

// Connect to wallet
await client.connect();

// Get accounts
const accounts = await client.getAccounts();
console.log('Connected accounts:', accounts);

// Get balance
const balance = await client.getBalance(accounts[0].address);
console.log('Balance:', balance);

// Send transaction
const txHash = await client.sendTransaction({
  from: accounts[0].address,
  to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3',
  value: '1000000000000000' // 0.001 ETH
});
```

### RPC Handler

```typescript
import { RPCHandler, createYAKKLRPCHandler } from '@yakkl/sdk';

// Create RPC handler
const handler = createYAKKLRPCHandler();

// Handle RPC request
const response = await handler.handle({
  jsonrpc: '2.0',
  id: 1,
  method: 'eth_accounts',
  params: []
});

// Register custom method
handler.register('custom_method', async (params) => {
  return { success: true, data: params };
});
```

## Features

### 🔌 Wallet Client API
High-level API for wallet interactions:
- Account management
- Transaction sending
- Message signing
- Network switching
- Balance queries
- Transaction history

### 📡 RPC Methods
Complete Ethereum JSON-RPC implementation plus YAKKL extensions:
- Standard Ethereum methods
- EIP-1193 provider interface
- YAKKL-specific methods
- Custom method registration
- Middleware support

### 🎨 Embedded Wallets
Embed YAKKL wallet directly in your application:
```typescript
import { createEmbeddedWallet } from '@yakkl/sdk';

const wallet = await createEmbeddedWallet({
  container: '#wallet-container',
  theme: 'dark',
  features: ['swap', 'bridge', 'nft']
});
```

### 🧩 Mod Development
Create custom modules for YAKKL wallet:
```typescript
import { ModBuilder } from '@yakkl/sdk';

const mod = new ModBuilder()
  .setName('My DeFi Mod')
  .setVersion('1.0.0')
  .addHook('beforeTransaction', async (tx) => {
    // Custom logic
    return tx;
  })
  .build();
```

### 🏷️ White Label Solutions
Customize YAKKL for your brand:
```typescript
import { createWhiteLabelWallet } from '@yakkl/sdk';

const wallet = await createWhiteLabelWallet({
  branding: {
    name: 'MyWallet',
    logo: 'https://example.com/logo.png',
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6'
    }
  },
  features: ['basic', 'defi', 'nft'],
  customDomain: 'wallet.myapp.com'
});
```

## API Reference

### WalletClient

#### Constructor
```typescript
new WalletClient(config?: WalletClientConfig)
```

#### Methods
- `connect(): Promise<boolean>` - Connect to wallet
- `disconnect(): Promise<void>` - Disconnect wallet
- `getAccounts(): Promise<WalletAccount[]>` - Get connected accounts
- `getBalance(address: string): Promise<string>` - Get account balance
- `sendTransaction(params): Promise<string>` - Send transaction
- `signMessage(address: string, message: string): Promise<string>` - Sign message
- `switchNetwork(chainId: number): Promise<void>` - Switch network

### RPC Methods

#### Standard Ethereum Methods
All standard Ethereum JSON-RPC methods are supported:
- `eth_accounts`
- `eth_requestAccounts`
- `eth_sendTransaction`
- `personal_sign`
- `eth_signTypedData_v4`
- `wallet_switchEthereumChain`
- `wallet_addEthereumChain`
- And more...

#### YAKKL-Specific Methods
Extended methods for YAKKL features:
- `yakkl_getVersion` - Get wallet version
- `yakkl_getFeatures` - Get enabled features
- `yakkl_getSupportedChains` - Get supported chains
- `yakkl_simulateTransaction` - Simulate transaction
- `yakkl_getSwapQuote` - Get swap quote
- `yakkl_getPortfolioValue` - Get portfolio value

### Error Codes

```typescript
import { RPC_ERROR_CODES } from '@yakkl/sdk';

// Standard errors
RPC_ERROR_CODES.USER_REJECTED // 4001
RPC_ERROR_CODES.UNAUTHORIZED // 4100
RPC_ERROR_CODES.UNSUPPORTED_METHOD // 4200

// YAKKL-specific errors
RPC_ERROR_CODES.WALLET_LOCKED // 5001
RPC_ERROR_CODES.INVALID_CHAIN // 5002
RPC_ERROR_CODES.FEATURE_DISABLED // 5004
```

## Examples

### DApp Integration
```typescript
import { WalletClient, YakklProvider } from '@yakkl/sdk';

// Create provider for Web3 libraries
const provider = createYakklProvider();

// Use with ethers.js
import { BrowserProvider } from 'ethers';
const ethersProvider = new BrowserProvider(provider);

// Use with web3.js
import Web3 from 'web3';
const web3 = new Web3(provider);
```

### Event Handling
```typescript
import { EventBridge } from '@yakkl/sdk';

const bridge = createEventBridge();

// Listen for account changes
bridge.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts);
});

// Listen for chain changes
bridge.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
});

// Listen for transactions
bridge.on('transaction', (tx) => {
  console.log('Transaction:', tx);
});
```

### Custom RPC Methods
```typescript
import { RPCHandler } from '@yakkl/sdk';

const handler = new RPCHandler();

// Register custom DeFi methods
handler.register('defi_getPoolInfo', async (params) => {
  const { poolAddress } = params;
  // Fetch pool info
  return { tvl: '1000000', apy: '5.2' };
});

handler.register('defi_stake', async (params) => {
  const { amount, poolAddress } = params;
  // Execute staking
  return { txHash: '0x...' };
});
```

## TypeScript Support

Full TypeScript support with detailed types:

```typescript
import type {
  WalletAccount,
  WalletTransaction,
  RPCRequest,
  RPCResponse,
  EmbeddedWalletConfig,
  ModConfig
} from '@yakkl/sdk';
```

## Security

- All sensitive operations require user approval
- Private keys never leave the wallet
- Secure communication via encrypted channels
- Regular security audits

## Support

- [Documentation](https://docs.yakkl.com/sdk)
- [API Reference](https://api.yakkl.com/docs)
- [GitHub Issues](https://github.com/yakkl/yakkl-sdk/issues)
- [Discord Community](https://discord.gg/yakkl)

## License

MIT © YAKKL, Inc.