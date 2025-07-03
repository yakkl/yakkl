# Migration Guide: Adding EIP-6963 Support

## Step 1: Prepare Your Codebase

1. Add new type definitions:

```typescript
// Add EIP-6963 types to your existing types
import { EIP6963ProviderInfo, EIP6963ProviderDetail } from './types/eip6963';
```
