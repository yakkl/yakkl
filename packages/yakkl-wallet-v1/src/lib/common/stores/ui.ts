// src/lib/stores/ui.ts
import { writable } from 'svelte/store';

export const showEmergencyKit = writable(false);
export const showEmergencyKitExport = writable(false);
export const showEmergencyKitImport = writable(false);

export const showProfileSettingsModal = writable(false);
