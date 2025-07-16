# Preview 2.0 Architecture Documentation

## 🏗️ System Overview

Preview 2.0 implements a modern, scalable architecture designed for maintainability, testability, and extensibility. The system follows clean architecture principles with clear separation of concerns.

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pages     │  │ Components  │  │   Modals    │         │
│  │ +page.svelte│  │ Portfolio   │  │ SendModal   │         │
│  │             │  │ Activity    │  │ BuyModal    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                      Store Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Account     │  │    Token    │  │    Plan     │         │
│  │   Store     │  │   Store     │  │   Store     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Transaction │  │    Chain    │  │     UI      │         │
│  │   Store     │  │   Store     │  │   Store     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Wallet    │  │    Token    │  │Transaction  │         │
│  │  Service    │  │  Service    │  │  Service    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │     Buy     │  │Subscription │  │CryptoPayment│         │
│  │  Service    │  │  Service    │  │  Service    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    Feature Layer                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Basic    │  │     Pro     │  │  Payment    │         │
│  │  Features   │  │  Features   │  │  Features   │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │ Send    │ │  │ │ Swap    │ │  │ │  Buy    │ │         │
│  │ │ Receive │ │  │ │   AI    │ │  │ │ Subscribe││         │
│  │ │ Balance │ │  │ │Analytics│ │  │ │ Gateway │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 Background/Extension                        │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Core Components

### 1. UI Layer

**Responsibility**: User interface and interaction handling

**Components**:
- **Pages**: Route-level components (`+page.svelte`)
- **Components**: Reusable UI elements
- **Modals**: Dialog-based interactions
- **Layouts**: Structural templates

**Patterns**:
- Reactive state bindings with Svelte 5 runes
- Component composition over inheritance
- Props-down, events-up communication
- Conditional rendering based on feature access

```typescript
// Example: Feature-gated component
{#if canUseFeature('swap_tokens')}
  <SwapInterface />
{:else}
  <UpgradePrompt feature="swap_tokens" />
{/if}
```

### 2. Store Layer

**Responsibility**: Client-side state management and reactivity

**Architecture**:
- **Writable Stores**: Mutable state containers
- **Derived Stores**: Computed values from other stores
- **Custom Stores**: Domain-specific state logic
- **Store Composition**: Multiple stores working together

**Key Stores**:
```typescript
// Account management
export const accountStore = createAccountStore();
export const currentAccount = derived(accountStore, $store => $store.currentAccount);

// Token portfolio
export const tokenStore = createTokenStore(); 
export const totalPortfolioValue = derived(tokenStore, $store => 
  $store.tokens.reduce((sum, token) => sum + token.value, 0)
);

// Feature access control
export const planStore = createPlanStore();
export const canUseFeature = (feature: string) => 
  hasFeature(get(planStore).plan.type, feature);
```

**Store Lifecycle**:
1. **Initialization**: Load from persistence layer
2. **Hydration**: Populate with fresh data
3. **Updates**: React to user actions and external events
4. **Persistence**: Save critical state changes
5. **Cleanup**: Dispose resources on unmount

### 3. Service Layer

**Responsibility**: Business logic and external communication

**Base Service Pattern**:
```typescript
abstract class BaseService {
  protected async request<T>(
    message: ExtensionMessage
  ): Promise<ServiceResponse<T>> {
    try {
      const response = await browser_ext.runtime.sendMessage(message);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

**Service Implementation**:
```typescript
export class WalletService extends BaseService {
  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async getAccounts(): Promise<ServiceResponse<Preview2Account[]>> {
    return this.request({
      type: 'GET_ACCOUNTS',
      data: {}
    });
  }
}
```

**Service Categories**:
- **Core Services**: Wallet, Token, Transaction
- **Feature Services**: Swap, AI, Analytics
- **Payment Services**: Buy, Subscription, Gateway
- **Utility Services**: Migration, Validation, Backup

### 4. Feature Layer

**Responsibility**: Feature-specific implementations and access control

**Feature Structure**:
```
features/
├── basic/               # Free tier features
│   ├── send/           # Token sending
│   │   ├── send.service.ts
│   │   ├── send.store.ts
│   │   └── SendComponent.svelte
│   ├── receive/        # Payment requests
│   └── balance/        # Portfolio viewing
├── pro/                # Premium features
│   ├── swap/           # Token swapping
│   ├── ai/             # AI assistant
│   └── analytics/      # Advanced analytics
└── payment/            # Revenue features
    ├── buy/            # Crypto purchases
    ├── subscription/   # Plan management
    └── crypto-payment/ # Merchant gateway
```

**Feature Configuration**:
```typescript
export const FEATURES = {
  BASIC: [
    'view_balance',
    'send_tokens', 
    'receive_tokens',
    'transaction_history'
  ],
  PRO: [
    ...BASIC_FEATURES,
    'swap_tokens',
    'ai_assistant',
    'buy_crypto_card',
    'advanced_analytics'
  ],
  ENTERPRISE: [
    ...PRO_FEATURES,
    'white_label',
    'priority_support',
    'custom_integrations'
  ]
};
```

## 🔄 Data Flow Patterns

### 1. User Action Flow

```
User Input → Component → Store → Service → Background → Blockchain
                ↓
            UI Update ← Store Update ← Service Response ← Background Response
```

Example: Sending a transaction
```typescript
// 1. User clicks send button
onClick={() => showSendModal = true}

// 2. User fills form and submits
const handleSend = async (txData) => {
  // 3. Update UI state
  uiStore.setGlobalLoading(true, 'Sending transaction...');
  
  // 4. Call service
  const result = await TransactionService.getInstance().sendTransaction(txData);
  
  // 5. Update stores based on result
  if (result.success) {
    transactionStore.addPendingTransaction(result.data);
    uiStore.showSuccess('Transaction sent!');
  } else {
    uiStore.showError('Transaction failed', result.error);
  }
  
  // 6. Reset UI state
  uiStore.setGlobalLoading(false);
  showSendModal = false;
};
```

### 2. Store Synchronization

**Cross-Store Dependencies**:
```typescript
// Token store reacts to account changes
const tokenStore = derived(
  [accountStore, chainStore], 
  async ([$account, $chain]) => {
    if ($account && $chain) {
      return await TokenService.getInstance().getTokens(
        $account.address, 
        $chain.chainId
      );
    }
    return [];
  }
);

// UI store reacts to loading states
const globalLoading = derived(
  [accountStore, tokenStore, transactionStore],
  ([$account, $tokens, $transactions]) => {
    return $account.loading.isLoading || 
           $tokens.loading.isLoading || 
           $transactions.loading.isLoading;
  }
);
```

### 3. Service Communication

**Background Service Integration**:
```typescript
// Service layer abstracts background communication
class TokenService extends BaseService {
  async getTokens(address: string, chainId: number): Promise<ServiceResponse<Token[]>> {
    // Standardized message format
    return this.request({
      type: 'GET_TOKENS',
      data: { address, chainId }
    });
  }
}

// Background handles the actual blockchain interaction
// This is in the existing background service worker
background.onMessage((message, sender, sendResponse) => {
  if (message.type === 'GET_TOKENS') {
    getTokensFromBlockchain(message.data)
      .then(tokens => sendResponse({ success: true, data: tokens }))
      .catch(error => sendResponse({ success: false, error: error.message }));
  }
});
```

## 🎯 Design Patterns

### 1. Singleton Services

Services use singleton pattern for shared state and resource management:

```typescript
export class WalletService extends BaseService {
  private static instance: WalletService;
  
  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }
}
```

### 2. Factory Pattern for Stores

Store creation uses factory pattern for consistency:

```typescript
function createAccountStore() {
  const { subscribe, set, update } = writable(initialAccountState);
  
  return {
    subscribe,
    loadAccounts: async () => {
      update(state => ({ ...state, loading: { isLoading: true } }));
      const result = await WalletService.getInstance().getAccounts();
      
      if (result.success) {
        set({ 
          accounts: result.data, 
          currentAccount: result.data[0],
          loading: { isLoading: false },
          error: { hasError: false }
        });
      }
    },
    reset: () => set(initialAccountState)
  };
}
```

### 3. Observer Pattern for Reactivity

Svelte's reactivity system implements observer pattern:

```typescript
// Stores automatically notify subscribers
$: if ($currentAccount) {
  tokenStore.refresh(); // Automatically refresh tokens when account changes
}

// Derived stores create reactive chains
export const portfolioValue = derived(
  [tokens, currentAccount],
  ([$tokens, $account]) => {
    return $tokens
      .filter(token => token.accountAddress === $account?.address)
      .reduce((sum, token) => sum + token.value, 0);
  }
);
```

### 4. Strategy Pattern for Features

Feature access uses strategy pattern:

```typescript
interface FeatureStrategy {
  isAvailable(plan: PlanType): boolean;
  getUpgradeMessage(): string;
}

class SwapFeatureStrategy implements FeatureStrategy {
  isAvailable(plan: PlanType): boolean {
    return plan === PlanType.PRO || plan === PlanType.ENTERPRISE;
  }
  
  getUpgradeMessage(): string {
    return 'Upgrade to Pro to unlock token swapping';
  }
}

// Usage
const swapStrategy = new SwapFeatureStrategy();
if (swapStrategy.isAvailable(userPlan)) {
  // Show swap interface
}
```

## 🔐 Security Architecture

### 1. Input Validation

**Client-Side Validation**:
```typescript
function validateTransactionData(txData: TransactionData): ValidationResult {
  const errors: string[] = [];
  
  if (!isValidAddress(txData.to)) {
    errors.push('Invalid recipient address');
  }
  
  if (!isValidAmount(txData.amount)) {
    errors.push('Invalid amount');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Service-Level Validation**:
```typescript
class TransactionService extends BaseService {
  async sendTransaction(txData: TransactionData): Promise<ServiceResponse<Transaction>> {
    // Validate input
    const validation = validateTransactionData(txData);
    if (!validation.isValid) {
      return this.createErrorResponse(validation.errors.join(', '));
    }
    
    // Additional security checks
    if (!this.hasFeature('send_tokens')) {
      return this.createErrorResponse('Feature not available');
    }
    
    return this.request({
      type: 'SEND_TRANSACTION',
      data: txData
    });
  }
}
```

### 2. Feature Access Control

**Multi-Layer Security**:
```typescript
// 1. UI Layer: Hide unavailable features
{#if canUseFeature('swap_tokens')}
  <SwapButton />
{:else}
  <UpgradePrompt />
{/if}

// 2. Service Layer: Validate access
async swapTokens(swapData: SwapData): Promise<ServiceResponse<Swap>> {
  if (!hasFeature(this.userPlan, 'swap_tokens')) {
    throw new FeatureNotAvailableError('Swap feature requires Pro plan');
  }
  // ... implementation
}

// 3. Background Layer: Final validation
// Background service validates user plan before executing
```

### 3. Data Encryption

**Sensitive Data Protection**:
```typescript
class SecureStorage {
  static async store(key: string, data: any): Promise<void> {
    const encrypted = await encrypt(JSON.stringify(data));
    await browser_ext.storage.local.set({ [key]: encrypted });
  }
  
  static async retrieve(key: string): Promise<any> {
    const result = await browser_ext.storage.local.get(key);
    if (result[key]) {
      const decrypted = await decrypt(result[key]);
      return JSON.parse(decrypted);
    }
    return null;
  }
}
```

## 📦 Module Dependencies

### 1. Dependency Graph

```
UI Components
    ↓
Stores ← Services ← Features
    ↓       ↓        ↓
Types   Utils   Config
```

### 2. Import Rules

**Allowed Dependencies**:
- UI components can import stores and utilities
- Stores can import services and types
- Services can import utilities and configuration
- Features are self-contained modules

**Forbidden Dependencies**:
- Services cannot import stores (to avoid circular dependencies)
- Utilities cannot import stores or services
- Configuration files are leaf nodes (no imports)

### 3. Dependency Injection

**Service Dependencies**:
```typescript
class PaymentService extends BaseService {
  constructor(
    private subscriptionService = SubscriptionService.getInstance(),
    private walletService = WalletService.getInstance()
  ) {
    super();
  }
}
```

## 🧪 Testing Architecture

### 1. Test Pyramid

```
         ┌─────────────┐
         │     E2E     │ ← Full user workflows
         │   Tests     │
         └─────────────┘
       ┌─────────────────┐
       │  Integration    │ ← Store + Service interactions  
       │     Tests       │
       └─────────────────┘
     ┌───────────────────────┐
     │    Unit Tests         │ ← Individual functions/components
     └───────────────────────┘
```

### 2. Testing Patterns

**Service Testing**:
```typescript
describe('WalletService', () => {
  let service: WalletService;
  
  beforeEach(() => {
    service = WalletService.getInstance();
    vi.clearAllMocks();
  });
  
  it('should get accounts successfully', async () => {
    const mockAccounts = [{ address: '0x123', ens: 'test.eth' }];
    mockExtensionAPI.runtime.sendMessage.mockResolvedValue({
      success: true,
      data: mockAccounts
    });
    
    const result = await service.getAccounts();
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockAccounts);
  });
});
```

**Store Testing**:
```typescript
describe('Account Store', () => {
  beforeEach(() => {
    accountStore.reset();
  });
  
  it('should load accounts and set current account', async () => {
    await accountStore.loadAccounts();
    
    const state = get(accountStore);
    expect(state.accounts).toHaveLength(1);
    expect(state.currentAccount).toBeTruthy();
    expect(state.loading.isLoading).toBe(false);
  });
});
```

**Component Testing**:
```typescript
describe('SendModal', () => {
  it('should validate recipient address', async () => {
    render(SendModal, {
      props: { show: true, tokens: mockTokens }
    });
    
    const recipientInput = screen.getByPlaceholderText('0x...');
    await fireEvent.input(recipientInput, { target: { value: 'invalid' } });
    
    expect(recipientInput).toHaveClass('border-red-400');
  });
});
```

## 🚀 Performance Considerations

### 1. Bundle Optimization

**Code Splitting**:
```typescript
// Dynamic imports for features
const SwapFeature = lazy(() => import('../features/pro/swap/SwapComponent.svelte'));

// Conditional loading based on plan
{#if canUseFeature('swap_tokens')}
  {#await SwapFeature}
    <LoadingSpinner />
  {:then SwapComponent}
    <svelte:component this={SwapComponent} />
  {/await}
{/if}
```

**Tree Shaking**:
```typescript
// Export only used functions
export { WalletService } from './wallet.service';
export { TokenService } from './token.service';
// Don't export unused services in production
```

### 2. Runtime Optimization

**Reactive Optimization**:
```typescript
// Use derived stores to minimize recalculations
const expensiveCalculation = derived(
  [tokens, prices],
  ([$tokens, $prices], set) => {
    // Only recalculate when dependencies change
    const result = performExpensiveCalculation($tokens, $prices);
    set(result);
  },
  initialValue
);

// Debounce frequent updates
const debouncedTokenRefresh = debounce(tokenStore.refresh, 1000);
```

**Memory Management**:
```typescript
// Cleanup subscriptions
onDestroy(() => {
  unsubscribeTokens();
  unsubscribeAccounts();
  cleanupWebSocket();
});

// Limit stored data
const limitedTransactions = derived(
  transactions,
  $transactions => $transactions.slice(-100) // Keep only last 100
);
```

This architecture provides a solid foundation for building scalable, maintainable, and secure wallet functionality while maintaining clean separation of concerns and enabling future extensibility.