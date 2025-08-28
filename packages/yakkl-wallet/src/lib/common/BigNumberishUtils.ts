/**
 * BigNumberishUtils - Re-export from @yakkl/core
 * This file maintains backward compatibility while the code has been moved to @yakkl/core
 * 
 * MIGRATION NOTE: This file now re-exports from @yakkl/core
 * All the original functionality has been preserved, but the implementation
 * now lives in the shared @yakkl/core package to allow reuse across projects.
 */

// Import everything from @yakkl/core to work around SSR module resolution
import * as YakklCore from '@yakkl/core';

// Re-export the namespace
export const BigNumberishUtils = YakklCore.BigNumberishUtils;

// For backward compatibility, also export as default
export default YakklCore.BigNumberishUtils;