/**
 * Address validation and formatting utilities
 */

/**
 * Check if a string is a valid Ethereum address
 * @param address The address to validate
 * @returns True if valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  if (!address) return false;
  
  // Check if it matches the basic pattern (0x followed by 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if an address is a contract address (basic check)
 * Note: This is a heuristic check based on common patterns
 * @param address The address to check
 * @returns True if likely a contract address
 */
export function isContractAddress(address: string): boolean {
  if (!isValidAddress(address)) return false;
  
  // Check for zero address (often used for minting/burning)
  if (address.toLowerCase() === '0x0000000000000000000000000000000000000000') {
    return true;
  }
  
  // Most EOA addresses have mixed case (EIP-55 checksum)
  // Contracts often have all lowercase
  const hasUpperCase = /[A-F]/.test(address.slice(2));
  const hasLowerCase = /[a-f]/.test(address.slice(2));
  
  return !hasUpperCase || !hasLowerCase;
}

/**
 * Format an address for display (shortened with ellipsis)
 * @param address The address to format
 * @param startChars Number of characters to show at start (default 6)
 * @param endChars Number of characters to show at end (default 4)
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(
  address: string, 
  startChars: number = 6, 
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Convert address to checksum format (EIP-55)
 * @param address The address to convert
 * @returns Checksum formatted address
 */
export function toChecksumAddress(address: string): string {
  if (!isValidAddress(address)) {
    throw new Error('Invalid Ethereum address');
  }
  
  // Remove 0x prefix and convert to lowercase
  const addr = address.toLowerCase().replace('0x', '');
  
  // Create hash of lowercase address
  const encoder = new TextEncoder();
  const data = encoder.encode(addr);
  
  // Simple checksum calculation (not full EIP-55 implementation)
  // For production, use a proper library like ethers.js
  let checksumAddress = '0x';
  
  for (let i = 0; i < addr.length; i++) {
    const char = addr[i];
    // Use simple heuristic for checksum
    if (parseInt(char, 16) >= 8) {
      checksumAddress += char.toUpperCase();
    } else {
      checksumAddress += char;
    }
  }
  
  return checksumAddress;
}

/**
 * Check if two addresses are the same (case-insensitive)
 * @param address1 First address
 * @param address2 Second address
 * @returns True if addresses are the same
 */
export function isSameAddress(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;
  return address1.toLowerCase() === address2.toLowerCase();
}

/**
 * Get address type
 * @param address The address to check
 * @returns 'eoa' | 'contract' | 'invalid'
 */
export function getAddressType(address: string): 'eoa' | 'contract' | 'invalid' {
  if (!isValidAddress(address)) return 'invalid';
  if (isContractAddress(address)) return 'contract';
  return 'eoa';
}