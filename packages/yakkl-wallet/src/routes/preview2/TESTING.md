# Preview 2.0 Testing Guide

## 🚨 Test Compilation Issues Fixed

The test files have been updated to work with Vitest instead of Jest, removing dependencies on `@testing-library/jest-dom` matchers that caused TypeScript compilation errors.

## 🛠️ Test Setup

### Prerequisites
```bash
# Install dependencies
npm install vitest @testing-library/svelte jsdom
```

### Configuration Files
- `vitest.config.ts` - Main test configuration
- `lib/tests/setup.ts` - Test environment setup with mocks
- Coverage thresholds set to 60% for initial implementation

## 🧪 Test Categories

### 1. Component Tests (`components.test.ts`)
Tests UI components with user interactions:
- Modal rendering and behavior
- Button states and interactions
- Form validation
- Feature access control

### 2. Store Tests (`stores.test.ts`)
Tests state management:
- Store initialization
- Data loading and updates
- Cross-store dependencies
- Reactive computations

### 3. Service Tests (`services.test.ts`)
Tests business logic:
- API communication
- Error handling
- Data transformation
- Feature validation

### 4. End-to-End Tests (`e2e.test.ts`)
Tests complete user workflows:
- Migration process
- Transaction flows
- Payment workflows
- Error recovery

## 🔧 Fixed Assertion Methods

### Before (Jest-DOM)
```typescript
expect(element).toBeInTheDocument();
expect(element).toHaveClass('className');
expect(element).toBeDisabled();
expect(array).toHaveLength(5);
```

### After (Vitest Compatible)
```typescript
expect(element).toBeTruthy();
expect(element.classList.contains('className')).toBe(true);
expect(element.disabled).toBe(true);
expect(array.length).toBe(5);
```

## 🚀 Running Tests

### Basic Commands
```bash
# Run all tests
npm run test:preview2

# Run with coverage
npm run test:preview2 -- --coverage

# Run specific test file
npm run test:preview2 -- components.test.ts

# Watch mode for development
npm run test:preview2 -- --watch
```

### Test Scripts (add to package.json)
```json
{
  "scripts": {
    "test:preview2": "cd src/routes/preview2 && vitest",
    "test:preview2:coverage": "cd src/routes/preview2 && vitest --coverage",
    "test:preview2:ui": "cd src/routes/preview2 && vitest --ui"
  }
}
```

## 🎯 Test Examples

### Component Testing
```typescript
describe('SendModal', () => {
  it('should validate recipient address', async () => {
    render(SendModal, { props: defaultProps });
    
    const recipientInput = screen.getByPlaceholderText('0x...');
    await fireEvent.input(recipientInput, { target: { value: 'invalid' } });
    
    // Fixed assertion
    expect(recipientInput.classList.contains('border-red-400')).toBe(true);
  });
});
```

### Store Testing
```typescript
describe('Account Store', () => {
  it('should load accounts successfully', async () => {
    await accountStore.loadAccounts();
    
    const state = get(accountStore);
    expect(state.accounts.length).toBeGreaterThan(0);
    expect(state.currentAccount).toBeTruthy();
  });
});
```

### Service Testing
```typescript
describe('WalletService', () => {
  it('should get accounts successfully', async () => {
    const result = await walletService.getAccounts();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });
});
```

## 📊 Coverage Requirements

- **Components**: 60% minimum coverage
- **Services**: 80% recommended for business logic
- **Stores**: 70% for state management
- **E2E**: Focus on critical user paths

## 🐛 Common Issues & Solutions

### 1. Module Resolution
```typescript
// If imports fail, check vitest.config.ts aliases
resolve: {
  alias: {
    '$lib': resolve(__dirname, '../../../lib'),
    '$services': resolve(__dirname, 'lib/services')
  }
}
```

### 2. Mock Setup
```typescript
// Services and stores are mocked in setup.ts
// Add new mocks as needed for external dependencies
vi.mock('../services/wallet.service', () => ({
  WalletService: {
    getInstance: () => mockImplementation
  }
}));
```

### 3. Async Testing
```typescript
// Wait for async operations
await fireEvent.click(button);
await waitFor(() => {
  expect(screen.getByText('Success')).toBeTruthy();
});
```

## 🔮 Future Improvements

### 1. Visual Testing
- Add Playwright for visual regression tests
- Screenshot comparisons for UI consistency
- Cross-browser compatibility testing

### 2. Performance Testing
- Bundle size analysis
- Load time measurements
- Memory usage monitoring

### 3. Integration Testing
- Real API endpoint testing
- Blockchain interaction tests
- Extension environment testing

The test suite now compiles successfully and provides a solid foundation for ensuring Preview 2.0 quality and reliability.