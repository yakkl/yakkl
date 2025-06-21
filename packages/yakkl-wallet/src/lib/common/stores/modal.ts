// $lib/stores/modal.ts
import { writable } from 'svelte/store';

export const modal = writable<boolean>(false);
export const modalName = writable<string | null>(null);

export function openModal(name: string) {
  modal.set(true);
  modalName.set(name);
}

export function closeModal() {
  modal.set(false);
  modalName.set(null);
  // Force a complete reset to ensure no lingering state
  setTimeout(() => {
    modal.set(false);
    modalName.set(null);
  }, 10);
}
