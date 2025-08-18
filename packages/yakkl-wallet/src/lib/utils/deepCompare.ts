/**
 * Deep comparison utility for comparing complex objects and detecting actual changes
 * Used to prevent unnecessary store updates that cause reactive re-renders
 */

/**
 * Deep comparison function that handles various data types including BigInt, Date, and nested objects
 * Returns true if objects are deeply equal, false if they differ
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  // Strict equality check (handles primitive types and same reference)
  if (obj1 === obj2) return true;
  
  // Null/undefined checks
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  // Type check
  if (typeof obj1 !== typeof obj2) return false;
  
  // Handle BigInt specifically
  if (typeof obj1 === 'bigint') return obj1 === obj2;
  
  // Handle Date objects
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }
  
  // Handle Arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  // One is array, other is not
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  // Handle primitive types (string, number, boolean)
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  // Handle objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  // Different number of keys
  if (keys1.length !== keys2.length) return false;
  
  // Check each key exists in both objects and values are equal
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Compare two objects and return true if they are different
 * This is the inverse of deepEqual for cleaner usage in conditional statements
 */
export function hasChanged(obj1: any, obj2: any): boolean {
  return !deepEqual(obj1, obj2);
}

/**
 * Compare specific properties of two objects
 * Returns true if any of the specified properties have changed
 */
export function hasChangedProperties(obj1: any, obj2: any, properties: string[]): boolean {
  if (!obj1 || !obj2) return true;
  
  for (const prop of properties) {
    if (!deepEqual(obj1[prop], obj2[prop])) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get a hash/fingerprint of an object for quick comparison
 * This is useful for comparing large objects where deep comparison might be expensive
 */
export function getObjectHash(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Handle BigInt serialization
    if (typeof value === 'bigint') {
      return { __type: 'bigint', value: value.toString() };
    }
    // Handle Date serialization
    if (value instanceof Date) {
      return { __type: 'date', value: value.toISOString() };
    }
    // Sort object keys for consistent hashing
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sortedKeys = Object.keys(value).sort();
      const sortedObj: any = {};
      for (const k of sortedKeys) {
        sortedObj[k] = value[k];
      }
      return sortedObj;
    }
    return value;
  });
}

/**
 * Compare objects using hash-based comparison for better performance on large objects
 * Use this for quick comparison when you need to detect any change
 */
export function hasChangedByHash(obj1: any, obj2: any): boolean {
  try {
    return getObjectHash(obj1) !== getObjectHash(obj2);
  } catch (error) {
    // Fallback to deep comparison if hashing fails
    console.warn('Hash comparison failed, falling back to deep comparison:', error);
    return hasChanged(obj1, obj2);
  }
}

/**
 * Specialized comparison for wallet cache data that handles common edge cases
 */
export function compareWalletCacheData(cache1: any, cache2: any): boolean {
  if (!cache1 || !cache2) return cache1 !== cache2;
  
  // Quick check for different structure
  if (typeof cache1 !== typeof cache2) return true;
  
  // Compare critical fields that indicate real changes
  const criticalFields = [
    'activeChainId',
    'activeAccountAddress', 
    'chainAccountCache',
    'portfolioRollups',
    'transactionRollups',
    'accountMetadata',
    'lastSync'
  ];
  
  return hasChangedProperties(cache1, cache2, criticalFields);
}

/**
 * Specialized comparison for token data
 */
export function compareTokenData(tokens1: any[], tokens2: any[]): boolean {
  if (!Array.isArray(tokens1) || !Array.isArray(tokens2)) return true;
  if (tokens1.length !== tokens2.length) return true;
  
  // Compare each token - focus on fields that matter for display
  for (let i = 0; i < tokens1.length; i++) {
    const token1 = tokens1[i];
    const token2 = tokens2[i];
    
    if (!token1 || !token2) return true;
    
    // Critical token fields that indicate real changes
    const criticalTokenFields = [
      'address', 'symbol', 'name', 'decimals', 
      'balance', 'price', 'value', 'isNative', 'chainId'
    ];
    
    if (hasChangedProperties(token1, token2, criticalTokenFields)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Specialized comparison for transaction data
 */
export function compareTransactionData(tx1: any, tx2: any): boolean {
  if (!tx1 || !tx2) return tx1 !== tx2;
  
  const criticalTxFields = [
    'hash', 'to', 'from', 'value', 'blockNumber', 
    'timestamp', 'status', 'chainId'
  ];
  
  return hasChangedProperties(tx1, tx2, criticalTxFields);
}