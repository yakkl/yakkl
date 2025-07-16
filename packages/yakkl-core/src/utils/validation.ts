/**
 * Validation utilities for mods and other components
 */

import type { Mod, ModManifest } from '../mods/types';

/**
 * Validate a mod implementation
 */
export function validateMod(mod: Mod): boolean {
  try {
    // Check required properties
    if (!mod.manifest) {
      throw new Error('Mod missing manifest');
    }

    if (!mod.manifest.id || !mod.manifest.name || !mod.manifest.version) {
      throw new Error('Mod manifest missing required fields');
    }

    // Check required methods
    const requiredMethods = ['initialize', 'destroy', 'isLoaded', 'isActive'];
    for (const method of requiredMethods) {
      if (typeof mod[method] !== 'function') {
        throw new Error(`Mod missing required method: ${method}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Mod validation failed:', error);
    return false;
  }
}

/**
 * Validate mod manifest
 */
export function validateManifest(manifest: ModManifest): boolean {
  try {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Manifest missing required fields');
    }

    if (typeof manifest.id !== 'string' || manifest.id.length === 0) {
      throw new Error('Invalid manifest ID');
    }

    if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
      throw new Error('Invalid manifest name');
    }

    if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Invalid manifest version');
    }

    return true;
  } catch (error) {
    console.error('Manifest validation failed:', error);
    return false;
  }
}