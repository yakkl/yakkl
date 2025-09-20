/**
 * Content-script safe exports from common
 * 
 * This file provides safe exports for content scripts that don't include:
 * - IndexedDB or localStorage dependencies
 * - Cache services
 * - Store dependencies
 * 
 * Content scripts should import from here instead of the main index.ts
 */

// Safe exports that don't trigger storage/cache imports
export * from '$lib/common/interfaces';
export * from '$lib/common/types';
export * from '$lib/common/constants';
export * from '$lib/common/errors';
// DO NOT export encryption - it imports stores
// export * from '$lib/common/encryption';
export * from '$lib/common/loggerColor';
export * from '$lib/common/math';
// DO NOT export misc - it can import stores
// export * from '$lib/common/misc';
export * from '$lib/common/network';
export { isExtensionContextValid } from '$lib/common/utils';
// DO NOT export storage - it uses localStorage
// export * from '$lib/common/storage';
export * from '$lib/common/evm';
export * from '$lib/managers/EventManager';
export * from '$lib/common/icon';
export * from '$lib/common/bignumber';
export * from '$lib/common/debug-error';
// DO NOT export wallet or lockWallet - they import stores
// export * from '$lib/common/wallet';
// export * from '$lib/common/lockWallet';

// Export only the specific utility function that content scripts need
export { 
  generateUniqueId
} from '$lib/common/utils';