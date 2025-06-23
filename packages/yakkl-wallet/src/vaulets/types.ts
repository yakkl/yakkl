// types.ts
export type VaultletManifest = {
	id: string; // Unique vaultlet ID
	name: string; // Display name
	description?: string; // Optional human-readable desc
	version: string; // Semver
	author?: string; // Optional dev name
	permissions?: string[]; // E.g. ["snap_notify", "fetch"]
	entry: string; // The main JS code (or module path)
	icon?: string; // Optional base64/icon URL
};
