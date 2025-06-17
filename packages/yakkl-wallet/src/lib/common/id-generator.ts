import { log } from '$lib/managers/Logger';

// Prefix for all EIP-related IDs
const EIP_ID_PREFIX = 'eip6963';

// Counter for generating sequential IDs
let idCounter = 0;

/**
 * Generates a unique ID for EIP requests and responses
 * Format: eip6963_{timestamp}_{counter}
 * @returns A unique string ID
 */
export function generateEipId(): string {
  const timestamp = Date.now();
  const counter = idCounter++;
  const id = `${EIP_ID_PREFIX}_${timestamp}_${counter}`;

  log.debug('Generated EIP ID:', false, { id });
  return id;
}

/**
 * Validates if a given ID is in the correct EIP format
 * @param id The ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function isValidEipId(id: string | number): boolean {
  if (typeof id === 'number') {
    return false;
  }

  const parts = id.split('_');
  return parts.length === 3 &&
         parts[0] === EIP_ID_PREFIX &&
         !isNaN(Number(parts[1])) &&
         !isNaN(Number(parts[2]));
}

/**
 * Converts an existing ID to the EIP format if it's not already in that format
 * @param id The ID to convert
 * @returns A valid EIP ID
 */
export function ensureEipId(id: string | number): string {
  if (typeof id === 'string' && isValidEipId(id)) {
    return id;
  }

  // If the ID is not in the correct format, generate a new one
  // but log a warning about the invalid ID
  log.warn('Invalid EIP ID format, generating new ID', false, {
    originalId: id,
    newId: generateEipId()
  });

  return generateEipId();
}
