// src/lib/permissions/security.ts

import browser from 'webextension-polyfill';
import { SecurityLevel } from './types';
import { log } from '$lib/managers/Logger';

const SECURITY_LEVEL_KEY = 'walletSecurityLevel';

/**
 * Get the user's current security level preference
 * Defaults to MEDIUM if not set
 */
export async function getSecurityLevel(): Promise<SecurityLevel> {
	try {
		const result = await browser.storage.local.get(SECURITY_LEVEL_KEY);
		const level = result[SECURITY_LEVEL_KEY];

		// Validate the level is a valid SecurityLevel
		if (level && Object.values(SecurityLevel).includes(level as SecurityLevel)) {
			return level as SecurityLevel;
		}

		// Default to MEDIUM
		return SecurityLevel.MEDIUM;
	} catch (error) {
		log.error('Failed to get security level, defaulting to MEDIUM', false, error);
		return SecurityLevel.MEDIUM;
	}
}

/**
 * Set the security level preference
 */
export async function setSecurityLevel(level: SecurityLevel): Promise<void> {
	try {
		await browser.storage.local.set({ [SECURITY_LEVEL_KEY]: level });
		log.debug('Security level updated', false, { level });
	} catch (error) {
		log.error('Failed to set security level', false, { level, error });
		throw error;
	}
}

/**
 * Get the expiry days based on security level
 */
export function getExpiryDays(securityLevel: SecurityLevel): number {
	switch (securityLevel) {
		case SecurityLevel.HIGH:
			return 0.5; // 12 hours
		case SecurityLevel.MEDIUM:
			return 7; // 7 days
		case SecurityLevel.STANDARD:
			return 365; // 1 year
		default:
			return 7; // Default to 7 days
	}
}
