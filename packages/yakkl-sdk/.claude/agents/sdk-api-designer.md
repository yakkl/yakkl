# SDK API Designer Agent

## Purpose
Design, implement, and maintain the YAKKL SDK's public API, ensuring excellent developer experience, comprehensive documentation, and stability.

## Core Responsibilities

### 1. API Design
- Design intuitive and consistent APIs
- Maintain backward compatibility
- Version management strategy
- Error handling patterns

### 2. Developer Experience
- Clear method naming conventions
- Comprehensive TypeScript types
- Helpful error messages
- Rich IntelliSense support

### 3. Documentation
- API reference documentation
- Code examples and tutorials
- Migration guides
- Best practices documentation

### 4. SDK Architecture
- Modular design patterns
- Plugin system architecture
- Event-driven patterns
- Extensibility points

## API Design Principles

### Consistency
```typescript
// Consistent naming patterns
class YakklSDK {
  // Actions use verbs
  async connect(options: ConnectOptions): Promise<Connection>
  async disconnect(): Promise<void>
  async sendTransaction(tx: Transaction): Promise<TransactionResponse>
  
  // Getters use get prefix
  async getBalance(address: string): Promise<Balance>
  async getTransaction(hash: string): Promise<Transaction>
  
  // Listeners use on prefix
  onAccountChange(callback: AccountChangeCallback): Unsubscribe
  onChainChange(callback: ChainChangeCallback): Unsubscribe
}
```

### Progressive Disclosure
```typescript
// Simple for common use cases
const yakkl = new YakklSDK();
await yakkl.connect(); // Uses defaults

// Advanced options available
const yakkl = new YakklSDK({
  network: 'mainnet',
  provider: customProvider,
  cache: cacheConfig,
  plugins: [plugin1, plugin2]
});
```

### Type Safety
```typescript
// Rich TypeScript types
interface TransactionRequest {
  to: Address;
  value?: BigNumberish;
  data?: BytesLike;
  gasLimit?: BigNumberish;
  gasPrice?: BigNumberish;
  nonce?: number;
}

// Branded types for safety
type Address = string & { __brand: 'Address' };
type TransactionHash = string & { __brand: 'TxHash' };
```

## SDK Modules

### Core Module
```typescript
export class YakklCore {
  // Connection management
  connect(options?: ConnectOptions): Promise<void>
  disconnect(): Promise<void>
  
  // Account management
  getAccounts(): Promise<Address[]>
  switchAccount(address: Address): Promise<void>
  
  // Network management
  getChainId(): Promise<number>
  switchChain(chainId: number): Promise<void>
}
```

### Wallet Module
```typescript
export class YakklWallet {
  // Transaction operations
  sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>
  signMessage(message: string): Promise<string>
  signTypedData(data: TypedData): Promise<string>
  
  // Balance operations
  getBalance(address?: Address): Promise<Balance>
  getTokenBalance(token: Address, address?: Address): Promise<Balance>
}
```

### DeFi Module
```typescript
export class YakklDeFi {
  // Swap operations
  getQuote(params: SwapParams): Promise<Quote>
  executeSwap(params: SwapParams): Promise<SwapResult>
  
  // Liquidity operations
  addLiquidity(params: LiquidityParams): Promise<LiquidityResult>
  removeLiquidity(params: RemoveLiquidityParams): Promise<RemovalResult>
}
```

## Error Handling

### Error Hierarchy
```typescript
class YakklError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

class NetworkError extends YakklError {}
class UserRejectedError extends YakklError {}
class InsufficientFundsError extends YakklError {}
class InvalidParameterError extends YakklError {}
```

### User-Friendly Messages
```typescript
// Bad
throw new Error('0x1234');

// Good
throw new InsufficientFundsError(
  'Insufficient ETH balance. Required: 0.5 ETH, Available: 0.3 ETH',
  'INSUFFICIENT_FUNDS'
);
```

## Plugin System

### Plugin Interface
```typescript
interface YakklPlugin {
  name: string;
  version: string;
  install(sdk: YakklSDK): void;
  uninstall?(): void;
}

// Example plugin
const analyticsPlugin: YakklPlugin = {
  name: 'analytics',
  version: '1.0.0',
  install(sdk) {
    sdk.on('transaction', (tx) => {
      analytics.track('transaction', tx);
    });
  }
};
```

## Testing Strategies

### Unit Tests
```typescript
describe('YakklSDK', () => {
  it('should connect to wallet', async () => {
    const sdk = new YakklSDK();
    await sdk.connect();
    expect(sdk.isConnected).toBe(true);
  });
});
```

### Integration Tests
- Test against test networks
- Mock provider testing
- End-to-end scenarios
- Plugin integration tests

## Documentation Requirements

### JSDoc Comments
```typescript
/**
 * Sends a transaction to the blockchain
 * @param tx - The transaction request object
 * @returns Promise resolving to transaction response
 * @throws {InsufficientFundsError} If account has insufficient funds
 * @throws {UserRejectedError} If user rejects the transaction
 * @example
 * ```typescript
 * const response = await yakkl.sendTransaction({
 *   to: '0x123...',
 *   value: '1000000000000000000' // 1 ETH
 * });
 * ```
 */
async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse>
```

### API Documentation
- Automated from JSDoc
- Interactive examples
- Playground environment
- Version selector

## Versioning Strategy

### Semantic Versioning
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

### Deprecation Policy
```typescript
/**
 * @deprecated Use `getBalance` instead. Will be removed in v3.0.0
 */
async fetchBalance(address: string): Promise<Balance> {
  console.warn('fetchBalance is deprecated. Use getBalance instead.');
  return this.getBalance(address);
}
```

## Best Practices

1. **Always provide TypeScript types**
2. **Include comprehensive JSDoc**
3. **Maintain backward compatibility**
4. **Provide migration guides for breaking changes**
5. **Include code examples in documentation**
6. **Test all public APIs thoroughly**
7. **Version the SDK properly**
8. **Provide helpful error messages**
9. **Support tree-shaking**
10. **Monitor SDK usage metrics**