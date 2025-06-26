# Preview 2.0 API Documentation

## 📋 Overview

This document provides comprehensive API documentation for Preview 2.0 services, stores, and component interfaces. All APIs follow consistent patterns for error handling, type safety, and extensibility.

## 🔧 Service APIs

### BaseService

Foundation class for all services providing common functionality.

```typescript
abstract class BaseService {
  protected async request<T>(message: ExtensionMessage): Promise<ServiceResponse<T>>
  protected handleResponse<T>(response: any): ServiceResponse<T>
  protected handleError(error: any): ServiceResponse<never>
  protected createErrorResponse(message: string): ServiceResponse<never>
  protected hasFeature(feature: string): boolean
}
```

**Types:**
```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface ExtensionMessage {
  type: string;
  data: any;
}
```

---

### WalletService

Manages wallet accounts, chains, and core wallet functionality.

#### `getInstance(): WalletService`
Returns singleton instance of the service.

#### `getAccounts(): Promise<ServiceResponse<Preview2Account[]>>`
Retrieves all wallet accounts.

**Response:**
```typescript
interface Preview2Account {
  address: string;
  ens: string | null;
  username: string;
  avatar: string | null;
  isActive: boolean;
  balance: number;
  plan: PlanType;
}
```

**Example:**
```typescript
const walletService = WalletService.getInstance();
const result = await walletService.getAccounts();

if (result.success) {
  console.log('Accounts:', result.data);
} else {
  console.error('Error:', result.error);
}
```

#### `getCurrentAccount(): Promise<ServiceResponse<Preview2Account | null>>`
Gets the currently active account.

#### `switchAccount(address: string): Promise<ServiceResponse<boolean>>`
Switches to a different account.

**Parameters:**
- `address`: Target account address

#### `getChains(): Promise<ServiceResponse<Preview2Chain[]>>`
Retrieves available blockchain networks.

**Response:**
```typescript
interface Preview2Chain {
  key: string;
  name: string;
  network: string;
  icon: string;
  isTestnet: boolean;
  rpcUrl: string;
  chainId: number;
}
```

#### `switchChain(chainId: number): Promise<ServiceResponse<boolean>>`
Switches to a different blockchain network.

---

### TokenService

Handles token data, pricing, and portfolio management.

#### `getTokens(address: string, chainId: number): Promise<ServiceResponse<Preview2Token[]>>`
Retrieves tokens for a specific account and chain.

**Response:**
```typescript
interface Preview2Token {
  symbol: string;
  name: string;
  icon: string;
  value: number;
  qty: number;
  price: number;
  change24h?: number;
  address?: string;
  decimals: number;
  color: string;
}
```

#### `getTokenPrices(symbols: string[]): Promise<ServiceResponse<TokenPrices>>`
Gets current prices for specified tokens.

**Response:**
```typescript
interface TokenPrices {
  [symbol: string]: {
    price: number;
    change24h: number;
    lastUpdated: string;
  };
}
```

#### `refreshTokenData(address: string): Promise<ServiceResponse<boolean>>`
Forces refresh of token data for an account.

---

### TransactionService

Manages transactions, gas estimation, and transaction history.

#### `sendTransaction(txData: TransactionData): Promise<ServiceResponse<Transaction>>`
Sends a transaction.

**Parameters:**
```typescript
interface TransactionData {
  to: string;
  amount: string;
  token: string;
  gasLimit?: string;
  gasPrice?: string;
}
```

**Response:**
```typescript
interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  gasUsed?: string;
  fee?: string;
}
```

#### `estimateGas(txData: TransactionData): Promise<ServiceResponse<GasEstimate>>`
Estimates gas costs for a transaction.

**Response:**
```typescript
interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  totalCost: string;
  currency: string;
}
```

#### `getTransactionHistory(address: string, limit?: number): Promise<ServiceResponse<Transaction[]>>`
Retrieves transaction history for an account.

---

### BuyService

Handles fiat-to-crypto purchases.

#### `getSupportedCurrencies(): Promise<ServiceResponse<string[]>>`
Gets list of supported fiat currencies.

#### `getSupportedCryptoCurrencies(): Promise<ServiceResponse<string[]>>`
Gets list of supported cryptocurrencies for purchase.

#### `getBuyQuote(quoteRequest: BuyQuoteRequest): Promise<ServiceResponse<BuyQuote>>`
Gets a purchase quote.

**Parameters:**
```typescript
interface BuyQuoteRequest {
  amount: number;
  currency: string;
  cryptoCurrency: string;
  paymentMethod?: string;
}
```

**Response:**
```typescript
interface BuyQuote {
  amount: number;
  cryptoAmount: number;
  cryptoCurrency: string;
  rate: number;
  fees: {
    network: number;
    service: number;
    total: number;
  };
  total: number;
  estimatedTime: string;
  quoteId: string;
  expiresAt: string;
}
```

#### `initiatePurchase(quote: BuyQuote): Promise<ServiceResponse<PurchaseOrder>>`
Initiates a crypto purchase.

**Response:**
```typescript
interface PurchaseOrder {
  orderId: string;
  status: 'created' | 'pending' | 'completed' | 'failed';
  paymentUrl?: string;
  instructions?: string;
}
```

---

### SubscriptionService

Manages user subscriptions and plan upgrades.

#### `getAvailablePlans(): Promise<ServiceResponse<SubscriptionPlan[]>>`
Gets available subscription plans.

**Response:**
```typescript
interface SubscriptionPlan {
  type: PlanType;
  name: string;
  price: number;
  currency: string;
  billing: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
  savings?: string;
}
```

#### `getCurrentSubscription(): Promise<ServiceResponse<UserSubscription | null>>`
Gets current user subscription details.

**Response:**
```typescript
interface UserSubscription {
  planType: PlanType;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEndsAt?: string;
}
```

#### `subscribe(planType: PlanType, billingCycle: 'monthly' | 'yearly'): Promise<ServiceResponse<SubscriptionResult>>`
Creates a new subscription.

#### `cancelSubscription(): Promise<ServiceResponse<boolean>>`
Cancels current subscription.

#### `updatePaymentMethod(paymentMethod: PaymentMethod): Promise<ServiceResponse<boolean>>`
Updates subscription payment method.

---

### CryptoPaymentService

Handles merchant payment processing.

#### `createPaymentRequest(request: PaymentRequest): Promise<ServiceResponse<PaymentLink>>`
Creates a payment request for merchants.

**Parameters:**
```typescript
interface PaymentRequest {
  amount: number;
  currency: string;
  acceptedCrypto: string[];
  description?: string;
  metadata?: Record<string, any>;
  expiresIn?: number; // seconds
}
```

**Response:**
```typescript
interface PaymentLink {
  id: string;
  url: string;
  qrCode: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'completed' | 'expired';
  expiresAt: string;
}
```

#### `getPaymentStatus(paymentId: string): Promise<ServiceResponse<PaymentStatus>>`
Checks payment status.

#### `processPayment(paymentData: CryptoPayment): Promise<ServiceResponse<PaymentResult>>`
Processes a crypto payment.

---

## 🗃️ Store APIs

### Account Store

Manages account state and operations.

```typescript
interface AccountStoreState {
  accounts: Preview2Account[];
  currentAccount: Preview2Account | null;
  loading: LoadingState;
  error: ErrorState;
}
```

#### Methods:
- `loadAccounts(): Promise<void>` - Load all accounts
- `switchAccount(address: string): Promise<void>` - Switch active account
- `addAccount(account: Preview2Account): void` - Add new account
- `removeAccount(address: string): void` - Remove account
- `reset(): void` - Reset to initial state

#### Derived Stores:
```typescript
export const currentAccount: Readable<Preview2Account | null>;
export const accounts: Readable<Preview2Account[]>;
export const isLoadingAccounts: Readable<boolean>;
```

**Usage:**
```typescript
import { accountStore, currentAccount } from './stores/account.store';

// Load accounts
await accountStore.loadAccounts();

// Subscribe to current account
const unsubscribe = currentAccount.subscribe(account => {
  console.log('Current account:', account);
});

// Switch account
await accountStore.switchAccount('0x123...');
```

---

### Token Store

Manages token portfolio and pricing data.

```typescript
interface TokenStoreState {
  tokens: Preview2Token[];
  loading: LoadingState;
  error: ErrorState;
  lastUpdate: Date | null;
}
```

#### Methods:
- `refresh(): Promise<void>` - Refresh token data
- `setTokens(tokens: Preview2Token[]): void` - Set token list
- `addToken(token: Preview2Token): void` - Add custom token
- `removeToken(symbol: string): void` - Remove token
- `reset(): void` - Reset state

#### Derived Stores:
```typescript
export const tokens: Readable<Preview2Token[]>;
export const totalPortfolioValue: Readable<number>;
export const tokensByValue: Readable<Preview2Token[]>;
export const isLoadingTokens: Readable<boolean>;
```

---

### Plan Store

Manages subscription plans and feature access.

```typescript
interface PlanStoreState {
  plan: UserPlan;
  availablePlans: SubscriptionPlan[];
  loading: boolean;
  error: string | null;
}
```

#### Methods:
- `loadPlan(): Promise<void>` - Load current plan
- `upgradePlan(planType: PlanType): Promise<void>` - Upgrade subscription
- `cancelPlan(): Promise<void>` - Cancel subscription
- `canUseFeature(feature: string): boolean` - Check feature access

#### Global Functions:
```typescript
export function canUseFeature(feature: string): boolean;
export function hasFeature(planType: PlanType, feature: string): boolean;
export function getUpgradeMessage(feature: string): string;
```

---

### UI Store

Manages UI state, modals, and notifications.

```typescript
interface UIStoreState {
  modals: {
    send: boolean;
    receive: boolean;
    buy: boolean;
    swap: boolean;
    subscription: boolean;
  };
  notifications: Notification[];
  theme: 'light' | 'dark' | 'auto';
  loading: {
    global: boolean;
    message?: string;
  };
}
```

#### Methods:
- `openModal(modal: string): void` - Open modal
- `closeModal(modal: string): void` - Close modal
- `closeAllModals(): void` - Close all modals
- `addNotification(notification: NotificationData): string` - Add notification
- `removeNotification(id: string): void` - Remove notification
- `setTheme(theme: string): void` - Set UI theme
- `setGlobalLoading(loading: boolean, message?: string): void` - Set loading state

#### Convenience Methods:
```typescript
// Notification helpers
uiStore.showSuccess(title: string, message: string): void;
uiStore.showError(title: string, message: string): void;
uiStore.showWarning(title: string, message: string): void;
uiStore.showInfo(title: string, message: string): void;

// Transaction feedback
uiStore.showTransactionPending(hash: string): void;
uiStore.showTransactionSuccess(hash: string): void;
uiStore.showTransactionFailed(hash: string): void;
```

---

## 🎨 Component APIs

### SendModal

Transaction sending interface with validation and gas estimation.

```typescript
interface SendModalProps {
  show: boolean;
  tokens: Preview2Token[];
  chain: Preview2Chain | null;
  mode: 'send' | 'swap';
  onClose: () => void;
  onSend: (transaction: Transaction) => void;
}
```

**Events:**
- `close` - Modal closed
- `send` - Transaction submitted
- `error` - Error occurred

**Usage:**
```svelte
<SendModal
  show={showSendModal}
  tokens={tokenList}
  chain={currentChain}
  mode="send"
  onClose={() => showSendModal = false}
  onSend={handleTransactionSent}
/>
```

---

### ReceiveModal

Payment request generation with QR codes.

```typescript
interface ReceiveModalProps {
  show: boolean;
  onClose: () => void;
}
```

**Features:**
- Address display and copying
- Payment request generation
- QR code generation
- Amount specification
- Token selection

---

### BuyModal

Crypto purchase workflow with quotes and payment processing.

```typescript
interface BuyModalProps {
  show: boolean;
  onClose: () => void;
}
```

**Workflow:**
1. Amount and currency selection
2. Payment method selection
3. Quote generation
4. Payment processing
5. Purchase confirmation

---

### TokenPortfolio

Portfolio display with sorting and filtering.

```typescript
interface TokenPortfolioProps {
  tokens: Preview2Token[];
  loading?: boolean;
  maxRows?: number;
  className?: string;
}
```

**Features:**
- Grid/list view toggle
- Sort by value, name, or change
- Expandable to show all tokens
- Loading skeletons
- Empty state handling

---

### SubscriptionModal

Plan comparison and subscription management.

```typescript
interface SubscriptionModalProps {
  show: boolean;
  currentPlan?: PlanType;
  onClose: () => void;
  onSubscribe: (plan: PlanType) => void;
}
```

**Features:**
- Plan comparison table
- Feature highlighting
- Billing cycle selection
- Payment method setup
- Subscription confirmation

---

## 🔄 Migration APIs

### Preview2Migration

Orchestrates data migration from legacy to Preview 2.0 format.

```typescript
interface MigrationConfig {
  dryRun?: boolean;
  verbose?: boolean;
  backupData?: boolean;
}

class Preview2Migration {
  constructor(config?: MigrationConfig)
  
  async execute(): Promise<MigrationResult>
  async rollback(rollbackData: any): Promise<RollbackResult>
  getLogs(): string[]
  clearLogs(): void
}
```

**Types:**
```typescript
interface MigrationResult {
  success: boolean;
  report: MigrationReport;
  rollback?: RollbackData;
}

interface MigrationReport {
  success: boolean;
  summary: string;
  details: {
    accounts: number;
    tokens: number;
    transactions: number;
    errors: string[];
  };
  recommendations: string[];
}
```

### MigrationUtils

Utility functions for data conversion and validation.

```typescript
class MigrationUtils {
  static convertAccount(yakklAccount: YakklAccount): Preview2Account
  static convertAccounts(yakklAccounts: YakklAccount[]): Preview2Account[]
  static convertToken(token: Token): Preview2Token
  static convertTokens(tokens: Token[]): Preview2Token[]
  static validateMigration(originalData: any, migratedData: any): ValidationResult
  static createRollbackData(originalData: any): RollbackData
  static executeRollback(rollbackData: any): Promise<RollbackResult>
}
```

---

## 🔑 Authentication & Authorization

### Feature Access Control

```typescript
// Check if user can access a feature
const canSwap = canUseFeature('swap_tokens');

// Get upgrade message for locked features
const upgradeMessage = getUpgradeMessage('ai_assistant');

// Conditionally render based on access
{#if canUseFeature('advanced_analytics')}
  <AnalyticsComponent />
{:else}
  <UpgradePrompt message={getUpgradeMessage('advanced_analytics')} />
{/if}
```

### Plan Management

```typescript
// Get current plan
const currentPlan = get(planStore).plan.type;

// Check plan level
const isPro = currentPlan === PlanType.PRO;
const isEnterprise = currentPlan === PlanType.ENTERPRISE;

// Upgrade plan
await planStore.upgradePlan(PlanType.PRO);
```

---

## 🚨 Error Handling

### Service Error Types

```typescript
interface ServiceError {
  code: string;
  message: string;
  details?: any;
}

// Common error codes
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  SUBSCRIPTION_ERROR: 'SUBSCRIPTION_ERROR'
};
```

### Error Handling Patterns

```typescript
// Service level
try {
  const result = await tokenService.getTokens(address, chainId);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
} catch (error) {
  uiStore.showError('Failed to load tokens', error.message);
  throw error;
}

// Component level
{#await tokenPromise}
  <LoadingSpinner />
{:then tokens}
  <TokenList {tokens} />
{:catch error}
  <ErrorMessage message={error.message} onRetry={retryLoad} />
{/await}
```

---

## 📊 Event System

### Custom Events

```typescript
// Dispatch custom events
const dispatch = createEventDispatcher();

dispatch('transactionSent', {
  hash: '0x123...',
  amount: '1.0',
  token: 'ETH'
});

// Listen for events
<SendModal on:transactionSent={handleTransactionSent} />
```

### Store Events

```typescript
// Subscribe to store changes
const unsubscribe = accountStore.subscribe(state => {
  if (state.currentAccount !== previousAccount) {
    // Account changed, refresh data
    tokenStore.refresh();
  }
});

// Cleanup on destroy
onDestroy(unsubscribe);
```

This API documentation provides a comprehensive reference for all Preview 2.0 functionality, enabling developers to effectively build upon and extend the system.