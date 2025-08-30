/**
 * DecimalMath - Re-export from @yakkl/core
 * This file maintains backward compatibility while the code has been moved to @yakkl/core
 * 
 * MIGRATION NOTE: This file now re-exports from @yakkl/core
 * All the original functionality has been preserved, but the implementation
 * now lives in the shared @yakkl/core package to allow reuse across projects.
 */

// Import from @yakkl/core
import { DecimalMath as CoreDecimalMath } from '@yakkl/core';

// Re-export for backward compatibility
export const DecimalMath = CoreDecimalMath;
