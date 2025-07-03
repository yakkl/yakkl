/**
 * Modal state management for v2
 * Tracks when modals are open to hide floating elements
 */

import { writable } from 'svelte/store';

interface ModalState {
  isOpen: boolean;
  modalType?: string;
  modalId?: string;
}

function createModalStore() {
  const { subscribe, set, update } = writable<ModalState>({
    isOpen: false,
    modalType: undefined,
    modalId: undefined
  });

  return {
    subscribe,
    
    openModal(type: string, id?: string) {
      update(state => ({
        ...state,
        isOpen: true,
        modalType: type,
        modalId: id
      }));
    },
    
    closeModal() {
      set({
        isOpen: false,
        modalType: undefined,
        modalId: undefined
      });
    },
    
    isModalOpen: () => {
      let isOpen = false;
      subscribe(state => { isOpen = state.isOpen; })();
      return isOpen;
    }
  };
}

export const modalStore = createModalStore();

// Derived store for easy checking
export const isModalOpen = writable(false);

modalStore.subscribe(state => {
  isModalOpen.set(state.isOpen);
});