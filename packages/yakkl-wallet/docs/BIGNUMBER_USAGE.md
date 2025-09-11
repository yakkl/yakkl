# BigNumber Usage Guidelines

## Overview
To prevent BigNumber display errors, all math operations in YAKKL should use the utilities from `@yakkl/core`.

## Critical Rule: NO BIG NUMBER DISPLAY ERRORS
Always use proper BigNumber formatting utilities when displaying values in the UI.

## Import Locations

### From @yakkl/core
```typescript
import { 
  BigNumber, 
  BigNumberish,
  formatBigNumberForDisplay,
  parseUnits,
  formatUnits 
} from '@yakkl/core';
```

### Legacy Imports (Backward Compatible)
```typescript
// These re-export from @yakkl/core
import { BigNumber } from '$lib/common/bignumber';
```

## Common Operations

### 1. Creating BigNumbers
```typescript
// From string
const amount = BigNumber.from("1000000000000000000"); // 1 ETH in wei

// From number (be careful with precision)
const smallAmount = BigNumber.from(100);

// From hex
const hexAmount = BigNumber.from("0xde0b6b3a7640000");
```

### 2. Converting Units
```typescript
// ETH to Wei
const weiAmount = parseUnits("1.5", 18); // 1.5 ETH

// Wei to ETH
const ethAmount = formatUnits(weiAmount, 18); // "1.5"

// Token with different decimals
const usdcAmount = parseUnits("100", 6); // 100 USDC (6 decimals)
```

### 3. Displaying in UI
```typescript
// ALWAYS use formatBigNumberForDisplay for UI
const displayValue = formatBigNumberForDisplay(bigNumber, {
  decimals: 18,
  maxDecimals: 4,
  locale: 'en-US'
});

// For fiat values
const fiatDisplay = formatFiatValue(bigNumber, {
  currency: CurrencyCode.USD,
  locale: 'en-US',
  decimalPlaces: 2,
  smallThreshold: 0.01 // Shows "< $0.01" for tiny amounts
});
```

### 4. Mathematical Operations
```typescript
const a = BigNumber.from("1000");
const b = BigNumber.from("500");

// Addition
const sum = a.add(b); // 1500

// Subtraction
const difference = a.sub(b); // 500

// Multiplication
const product = a.mul(b); // 500000

// Division (be careful with decimals)
const quotient = a.div(b); // 2

// Comparison
const isGreater = a.gt(b); // true
const isEqual = a.eq(b); // false
```

### 5. Gas Calculations
```typescript
// Gas price in Gwei
const gasPrice = parseUnits("20", 9); // 20 Gwei

// Calculate gas cost
const gasLimit = BigNumber.from(21000);
const gasCost = gasPrice.mul(gasLimit);

// Display gas cost in ETH
const gasCostEth = formatUnits(gasCost, 18);
```

## Common Pitfalls to Avoid

### ❌ DON'T: Display raw BigNumber objects
```typescript
// WRONG - Shows "[object Object]" or scientific notation
<div>{bigNumber}</div>
```

### ✅ DO: Format before display
```typescript
// CORRECT
<div>{formatBigNumberForDisplay(bigNumber)}</div>
```

### ❌ DON'T: Use JavaScript numbers for large values
```typescript
// WRONG - Loses precision
const wei = 1000000000000000000; // Becomes 1e+18
```

### ✅ DO: Use strings or BigNumber
```typescript
// CORRECT
const wei = BigNumber.from("1000000000000000000");
```

### ❌ DON'T: Divide without considering decimals
```typescript
// WRONG - Integer division loses decimals
const half = amount.div(2);
```

### ✅ DO: Scale up before division
```typescript
// CORRECT - Maintain precision
const scaled = amount.mul(1e6);
const half = scaled.div(2).div(1e6);
```

## Responsive Font Sizing for Large Values

For very large numbers, implement responsive font sizing:

```typescript
function getResponsiveFontSize(value: BigNumber): string {
  const length = value.toString().length;
  
  if (length > 20) return 'text-xs';
  if (length > 15) return 'text-sm';
  if (length > 10) return 'text-base';
  return 'text-lg';
}
```

## Testing Extreme Values

Always test with:
- Very large numbers: `BigNumber.from("999999999999999999999999999")`
- Very small numbers: `BigNumber.from("1")`
- Zero: `BigNumber.from(0)`
- Negative values (if applicable): `BigNumber.from("-1000")`

## Files Using BigNumber (Key Locations)

### Core Math Utilities
- `@yakkl/core/src/utils/BigNumber.ts` - Main implementation
- `@yakkl/core/src/utils/BigNumberishUtils.ts` - Utility functions
- `@yakkl/core/src/utils/math/BigNumberishMath.ts` - Math operations

### Wallet Integration
- `$lib/common/bignumber.ts` - Re-exports from core
- `$lib/common/TokenAmount.ts` - Token amount handling
- `$lib/common/computeTokenValue.ts` - Token value calculations
- `$lib/utilities/gas.ts` - Gas calculations

## Migration Status
✅ BigNumber utilities are centralized in `@yakkl/core`
✅ Wallet re-exports maintain backward compatibility
✅ All formatting functions available

## Best Practices Summary
1. Always import from `@yakkl/core` for new code
2. Use `formatBigNumberForDisplay()` for ALL UI displays
3. Test with extreme values
4. Handle precision carefully in division
5. Use strings for large number literals
6. Implement responsive sizing for large displays