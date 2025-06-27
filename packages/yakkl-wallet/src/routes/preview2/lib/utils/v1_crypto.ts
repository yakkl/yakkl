// src/lib/utils/crypto.ts

import type { EncryptedPermissionStore } from '$lib/permissions/types';

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	return btoa(String.fromCharCode(...uint8Array));
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Create a domain-specific encryption key using the domain as seed
 * @param origin Domain origin (e.g., "https://app.uniswap.org")
 */
export async function createDomainKey(origin: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const domainData = encoder.encode(origin);

	// Create key material from domain
	const keyMaterial = await crypto.subtle.digest('SHA-256', domainData);

	// Import as AES-GCM key
	return await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, [
		'encrypt',
		'decrypt'
	]);
}

/**
 * Encrypt data using AES-GCM with domain-specific key
 */
export async function encryptWithDomainKey(
	data: any,
	origin: string
): Promise<EncryptedPermissionStore> {
	const key = await createDomainKey(origin);
	const encoder = new TextEncoder();
	const dataString = JSON.stringify(data);
	const dataBuffer = encoder.encode(dataString);

	// Generate random IV
	const iv = crypto.getRandomValues(new Uint8Array(12));

	// Encrypt the data
	const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

	// Return base64-encoded encrypted data and IV
	return {
		encrypted: arrayBufferToBase64(encryptedBuffer),
		iv: arrayBufferToBase64(iv)
	};
}

/**
 * Decrypt data using AES-GCM with domain-specific key
 */
export async function decryptWithDomainKey<T>(
	encryptedStore: EncryptedPermissionStore,
	origin: string
): Promise<T> {
	const key = await createDomainKey(origin);

	// Convert base64 to ArrayBuffer
	const encryptedBuffer = base64ToArrayBuffer(encryptedStore.encrypted);
	const iv = base64ToArrayBuffer(encryptedStore.iv);

	// Decrypt the data
	const decryptedBuffer = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv },
		key,
		encryptedBuffer
	);

	// Convert decrypted data to object
	const decoder = new TextDecoder();
	const decryptedString = decoder.decode(decryptedBuffer);
	return JSON.parse(decryptedString) as T;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
	const array = new Uint8Array(16);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
